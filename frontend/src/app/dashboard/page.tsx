'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, statsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/incidents/stats').catch(() => ({ data: null }))
        ]);
        setUser(meRes.data);
        setStats(statsRes.data);
      } catch (err) {}
    };
    fetchData();
  }, []);

  const deptData = stats?.by_department ? Object.entries(stats.by_department).map(([name, value]) => ({ name, value })) : [];
  const statusData = stats?.by_status ? Object.entries(stats.by_status).map(([name, value]) => ({ name, value })) : [];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.full_name || user?.email}</p>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Incidents by Department</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] px-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Incidents by Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] px-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Total Reported</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">...</div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
