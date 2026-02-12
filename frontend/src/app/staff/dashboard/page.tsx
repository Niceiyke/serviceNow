'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

const STATUS_COLUMNS = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

export default function StaffDashboardPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    try {
      const response = await api.get('/incidents/');
      setIncidents(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/incidents/${id}`, { status: newStatus });
      toast.success(`Moved to ${newStatus}`);
      fetchIncidents();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <DashboardLayout>Loading Kanban...</DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-8">Staff Kanban Board</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
        {STATUS_COLUMNS.map((status) => (
          <div key={status} className="bg-gray-50 p-4 rounded-xl border flex flex-col">
            <h2 className="font-bold text-gray-600 mb-4 flex items-center justify-between">
              {status.replace('_', ' ')}
              <Badge variant="secondary">
                {incidents.filter((i: any) => i.status === status).length}
              </Badge>
            </h2>
            
            <div className="space-y-4 flex-1 overflow-y-auto">
              {incidents
                .filter((i: any) => i.status === status)
                .map((incident: any) => (
                  <Card key={incident.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-gray-500">{incident.incident_key}</span>
                      <Badge variant={incident.priority === 'CRITICAL' ? 'destructive' : 'outline'} className="text-[10px]">
                        {incident.priority}
                      </Badge>
                    </div>
                    <Link href={`/incidents/${incident.id}`} className="block">
                      <h3 className="font-semibold text-sm mb-2 hover:text-blue-600">{incident.title}</h3>
                    </Link>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{incident.description}</p>
                    
                    <div className="flex gap-2">
                      {status === 'OPEN' && (
                        <Button size="sm" className="w-full text-[10px] h-7" onClick={() => handleQuickStatusChange(incident.id, 'IN_PROGRESS')}>
                          Start Work
                        </Button>
                      )}
                      {status === 'IN_PROGRESS' && (
                        <Button size="sm" variant="outline" className="w-full text-[10px] h-7" onClick={() => handleQuickStatusChange(incident.id, 'RESOLVED')}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
