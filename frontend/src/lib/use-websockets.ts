import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const getWsUrl = () => {
  if (typeof window === 'undefined') return '';
  
  const hostname = window.location.hostname;

  // 1. Explicit production mapping for wordlyte.com
  if (hostname === 'service-now.wordlyte.com') {
    return 'wss://api-service-now.wordlyte.com/api/v1/ws';
  }

  // 2. Local development mapping
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:8001/api/v1/ws';
  }

  // 3. Dynamic fallback based on env vars
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  if (apiUrl.startsWith('http')) {
    return apiUrl.replace(/^http/, 'ws') + '/ws';
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/v1/ws`;
};

export const useWebSockets = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      const url = getWsUrl();
      if (!url) return;
      
      console.log('[WS] Attempting connection to:', url);
      
      try {
        socket = new WebSocket(url);

        // Heartbeat interval to keep connection alive
        let heartbeatInterval: NodeJS.Timeout;

        socket.onopen = () => {
          console.log('[WS] Connection established successfully');
          heartbeatInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'PING' }));
            }
          }, 30000); // Ping every 30 seconds
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WS] Message received:', data);

            if (data.type === 'INCIDENT_CREATED' || data.type === 'INCIDENT_UPDATED') {
              console.log('[WS] Force refetching incident queries');
              queryClient.refetchQueries({ 
                queryKey: ['incidents'],
                type: 'active'
              });
              if (data.id) {
                queryClient.invalidateQueries({ queryKey: ['incident', data.id] });
                queryClient.invalidateQueries({ queryKey: ['timeline', data.id] });
              }
              // Also refetch stats on any change
              queryClient.refetchQueries({ queryKey: ['incident-stats'], type: 'active' });
            }

            if (data.type === 'COMMENT_CREATED') {
              console.log('[WS] Force refetching comment queries');
              queryClient.invalidateQueries({ queryKey: ['comments', data.incident_id] });
              queryClient.invalidateQueries({ queryKey: ['timeline', data.incident_id] });
            }

          } catch (err) {
            console.error('[WS] Error parsing message:', err);
          }
        };

        socket.onclose = (event) => {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          console.warn(`[WS] Connection closed (code: ${event.code}). Reconnecting in 3s...`);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = (error) => {
          console.error('[WS] Error observed:', error);
        };
      } catch (err) {
        console.error('[WS] Failed to create WebSocket instance:', err);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [queryClient]);
};
