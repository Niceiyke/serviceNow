'use client';

import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, Hammer, CheckCircle2, AlertCircle } from 'lucide-react';

const STATUS_COLUMNS = [
  { id: 'OPEN', label: 'Open', icon: AlertCircle, color: 'text-sky-500' },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: Hammer, color: 'text-amber-500' },
  { id: 'RESOLVED', label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-500' }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function StaffDashboardPage() {
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => (await api.get('/incidents/')).data,
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => (await api.patch(`/incidents/${id}`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident status has been updated.');
    },
    onError: () => toast.error('Failed to update incident status.'),
  });

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Shield className="w-12 h-12 text-primary/30 mb-4" />
        <span className="text-muted-foreground font-medium">Loading incidents...</span>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="flex items-center gap-4 mb-10">
        <Shield className="w-10 h-10 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-[700px]"
      >
        {STATUS_COLUMNS.map((col) => (
          <div key={col.id} className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="uppercase tracking-widest text-xs font-bold flex items-center gap-2">
                <col.icon className={`w-4 h-4 ${col.color}`} />
                {col.label}
              </h2>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px]">
                {incidents.filter((i: any) => i.status === col.id).length}
              </Badge>
            </div>
            
            <div className="flex-1 space-y-6 p-4 rounded-md border border-primary/10 bg-black/10 shadow-inner overflow-y-auto max-h-[800px]">
              {incidents
                .filter((i: any) => i.status === col.id)
                .map((incident: any) => (
                  <motion.div key={incident.id} variants={itemVariants}>
                    <Card className="border-primary/10 hover:border-primary/40 transition-all group overflow-visible bg-card">
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-primary/60 tracking-widest">{incident.incident_key}</span>
                          <Badge variant="outline" className="border-primary/20 text-[9px] uppercase font-bold text-muted-foreground">
                            {incident.priority}
                          </Badge>
                        </div>

                        <Link href={`/incidents/${incident.id}`}>
                          <h3 className="text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {incident.title}
                          </h3>
                        </Link>

                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {incident.description}
                        </p>
                        
                        <div className="flex gap-2 pt-2">
                          {col.id === 'OPEN' && (
                            <Button 
                              size="sm" 
                              className="w-full h-8 text-[9px]" 
                              onClick={() => mutation.mutate({ id: incident.id, status: 'IN_PROGRESS' })}
                              disabled={mutation.isPending}
                            >
                              Start Work
                            </Button>
                          )}
                          {col.id === 'IN_PROGRESS' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full border-primary/20 text-primary hover:bg-primary/10 h-8 text-[9px] uppercase font-bold" 
                              onClick={() => mutation.mutate({ id: incident.id, status: 'RESOLVED' })}
                              disabled={mutation.isPending}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              {incidents.filter((i: any) => i.status === col.id).length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                  <p className="text-[10px] uppercase font-bold tracking-widest">No incidents</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </motion.div>
    </DashboardLayout>
  );
}
