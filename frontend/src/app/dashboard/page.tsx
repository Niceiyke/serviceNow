'use client';

import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Clock, TrendingUp, Zap, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  const isAdminOrManager = !!user && ['ADMIN', 'MANAGER'].includes(user.role);

  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useQuery({
    queryKey: ['incident-stats'],
    queryFn: async () => (await api.get('/incidents/stats')).data,
    enabled: !!user && isAdminOrManager,
  });

  if (!isMounted) return <DashboardLayout><div className="p-10 text-primary/20">Mounting...</div></DashboardLayout>;

  if (!user) return <DashboardLayout><div className="p-10">Loading User Profile...</div></DashboardLayout>;

  if (!isAdminOrManager) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mt-20 text-center space-y-6">
          <ShieldCheck className="w-20 h-20 text-primary/20 mx-auto" />
          <h1 className="text-3xl font-bold tracking-tight">Reporter Dashboard</h1>
          <p className="text-muted-foreground">
            The analytics console is available for staff and management roles. 
            Please use the side menu to manage your incidents.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (isStatsLoading) return <DashboardLayout><div className="p-10 animate-pulse text-primary/40">Fetching Performance Intelligence...</div></DashboardLayout>;
  
  if (isStatsError) return <DashboardLayout><div className="p-10 text-destructive font-bold">Error: Could not load dashboard statistics.</div></DashboardLayout>;

  const deptData = stats?.by_department ? Object.entries(stats.by_department).map(([name, value]) => ({ name, value })) : [];
  const statusData = stats?.by_status ? Object.entries(stats.by_status).map(([name, value]) => ({ name, value })) : [];
  const mttrData = stats?.mttr?.by_priority ? Object.entries(stats.mttr.by_priority).map(([name, value]) => ({ name, value })) : [];

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">System Performance</h1>
            <p className="text-muted-foreground">Operational intelligence and resolution velocity.</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 px-6 py-3 rounded-lg text-center">
             <span className="text-[10px] uppercase font-black text-primary/60 block tracking-widest">Global MTTR</span>
             <span className="text-3xl font-mono font-bold">{stats?.mttr?.overall || 0}h</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Clock} label="Mean Time to Resolve" value={`${stats?.mttr?.overall || 0} hrs`} color="text-sky-500" />
          <StatCard icon={Zap} label="Critical MTTR" value={`${stats?.mttr?.by_priority?.CRITICAL || 0} hrs`} color="text-amber-500" />
          <StatCard icon={TrendingUp} label="Total Resolved" value={stats?.by_status?.RESOLVED || 0} color="text-emerald-500" />
          <StatCard icon={AlertTriangle} label="Open Incidents" value={stats?.by_status?.OPEN || 0} color="text-rose-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-primary/10 bg-black/20">
            <CardHeader className="border-b border-primary/5">
              <CardTitle className="text-xs uppercase tracking-[0.2em] font-black opacity-60">Resolution Speed (Priority)</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="#222" horizontal={false} />
                  <XAxis type="number" stroke="#444" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#888" fontSize={10} width={80} />
                  <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#000', border: '1px solid #333'}} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-black/20">
            <CardHeader className="border-b border-primary/5">
              <CardTitle className="text-xs uppercase tracking-[0.2em] font-black opacity-60">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={10}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #333'}} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-primary/10 bg-black/20">
            <CardHeader className="border-b border-primary/5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-[0.2em] font-black opacity-60">30-Day MTTR Trend</CardTitle>
              <Activity className="w-4 h-4 text-primary opacity-40" />
            </CardHeader>
            <CardContent className="h-[300px] pt-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.trend || []}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#222" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#444" 
                    fontSize={10} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#444" fontSize={10} label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: 10, fontSize: 9, fill: '#666' }} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#000', border: '1px solid #333'}}
                    labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    formatter={(val) => [`${val} hrs`, 'Mean Resolution Time']}
                  />
                  <Area type="monotone" dataKey="mttr" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-primary/10 bg-black/20">
            <CardHeader className="border-b border-primary/5">
              <CardTitle className="text-xs uppercase tracking-[0.2em] font-black opacity-60">Department Workload</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#444" fontSize={10} />
                  <YAxis stroke="#444" fontSize={10} />
                  <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#000', border: '1px solid #333'}} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="bg-card border-primary/10 hover:border-primary/30 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 relative">
          <div className="relative flex items-center justify-center">
            <div className={`w-12 h-12 rounded-xl bg-current opacity-10 ${color}`} />
            <Icon className={`absolute w-6 h-6 ${color}`} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
            <h3 className="text-2xl font-bold font-mono tracking-tight">{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
