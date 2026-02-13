'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Sidebar } from './sidebar';
import { Menu, Loader2, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const response = await api.get('/auth/me');
        return response.data;
      } catch (err) {
        router.push('/login');
        throw err;
      }
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-primary">
        <Loader2 className="w-12 h-12 animate-spin mb-4 opacity-50" />
        <span className="font-medium tracking-widest text-xs uppercase animate-pulse">Loading System...</span>
      </div>
    );
  }

  if (isError) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        user={user} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Atmosphere overlays */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,oklch(0.45_0.18_25_/_0.03),transparent_40%)]" />
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-sidebar/80 backdrop-blur-md border-b border-primary/10 px-4 py-3 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight uppercase">ServiceNow</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10 z-10">
          <div className="max-w-7xl mx-auto pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
