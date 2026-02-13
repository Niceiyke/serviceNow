'use client';

import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Hammer, CheckCircle2, AlertCircle, Search, Filter, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

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
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('all');
  const [assigneeId, setAssigneeId] = useState('all');
  const [reporterId, setReporterId] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ['assignees'],
    queryFn: async () => (await api.get('/users/assignees')).data,
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users/')).data,
    enabled: !!user && user.role === 'ADMIN',
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', { search, priority, assigneeId, reporterId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (priority !== 'all') params.append('priority', priority);
      if (assigneeId !== 'all') params.append('assignee_id', assigneeId);
      if (reporterId !== 'all') params.append('reporter_id', reporterId);
      
      const response = await api.get(`/incidents/?${params.toString()}`);
      return response.data;
    },
  });

  const resetFilters = () => {
    setSearch('');
    setPriority('all');
    setAssigneeId('all');
    setReporterId('all');
  };

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
      <div className="flex items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <Shield className="w-10 h-10 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={showFilters ? 'bg-primary/10 border-primary' : ''}>
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-card border border-primary/10 rounded-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 shadow-lg">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-primary">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Title, Key..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-black/20 border-primary/20"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-primary">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-xs bg-black/20 border-primary/20">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-primary">Assignee</label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger className="h-9 text-xs bg-black/20 border-primary/20">
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {assignees.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-primary">Reporter</label>
                <Select value={reporterId} onValueChange={setReporterId}>
                  <SelectTrigger className="h-9 text-xs bg-black/20 border-primary/20">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {allUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground text-[10px] uppercase font-bold">
                  <X className="w-3 h-3 mr-1" /> Clear All
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
