'use client';

import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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

const COLORS = [
  'oklch(0.6 0.18 250)',
  'oklch(0.55 0.2 25)',
  'oklch(0.4 0.1 150)',
  'oklch(0.35 0.15 120)',
  'oklch(0.6 0.12 300)',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
};

export default function DashboardPage() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['incident-stats'],
    queryFn: async () => {
      const res = await api.get('/incidents/stats');
      return res.data;
    },
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'MANAGER'),
  });

  const deptData = stats?.by_department ? Object.entries(stats.by_department).map(([name, value]) => ({ name, value })) : [];
  const statusData = stats?.by_status ? Object.entries(stats.by_status).map(([name, value]) => ({ name, value })) : [];

  return (
    <DashboardLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.div variants={itemVariants} className="mb-8 relative">
          <h1 className="text-3xl font-bold mb-2">System Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.full_name || user?.email}. Monitoring current system status and performance.
          </p>
        </motion.div>

        {stats ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div variants={itemVariants}>
              <Card className="border border-primary/10">
                <CardHeader>
                  <CardTitle className="text-xl">Incidents by Department</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData}>
                      <CartesianGrid stroke="oklch(0.35 0.08 85 / 0.1)" vertical={false} />
                      <XAxis dataKey="name" stroke="oklch(0.7 0.05 85)" fontSize={12} />
                      <YAxis stroke="oklch(0.7 0.05 85)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                      <Bar dataKey="value" fill="oklch(0.78 0.12 85)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border border-primary/10">
                <CardHeader>
                  <CardTitle className="text-xl">Incident Status Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[1, 2, 3].map((i) => (
               <motion.div key={i} variants={itemVariants}>
                 <Card className="animate-pulse bg-muted/20 border border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Loading Data...</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold h-8 bg-muted/30 rounded w-1/2" />
                  </CardContent>
                </Card>
               </motion.div>
             ))}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
