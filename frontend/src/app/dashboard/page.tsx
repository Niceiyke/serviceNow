'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  const [stats, setStats] = useState({ active: 0, resolved: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/incidents/');
        const incidents = response.data;
        setStats({
          active: incidents.filter((i: any) => i.status !== 'CLOSED' && i.status !== 'RESOLVED').length,
          resolved: incidents.filter((i: any) => i.status === 'RESOLVED').length,
        });
      } catch (err) {}
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Recently Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
