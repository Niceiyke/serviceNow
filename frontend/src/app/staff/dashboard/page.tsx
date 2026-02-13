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
import { 
  Shield, 
  Hammer, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  X,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useWebSockets } from '@/lib/use-websockets';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamWorkload } from '@/components/admin/team-workload';
import { LayoutGrid, Users } from 'lucide-react';

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

const SLATimer = ({ breachAt, status }: { breachAt: string | null, status: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isBreached, setIsBreached] = useState(false);

  useEffect(() => {
    if (!breachAt || status === 'RESOLVED' || status === 'CLOSED' || status === 'CANCELLED') {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const breach = new Date(breachAt);
      const diff = breach.getTime() - now.getTime();

      if (diff <= 0) {
        setIsBreached(true);
        setTimeLeft('SLA BREACHED');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m left`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [breachAt, status]);

  if (!breachAt || status === 'RESOLVED' || status === 'CLOSED' || status === 'CANCELLED') return null;

  return (
    <div className={cn(
      "flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider mt-2",
      isBreached ? "text-red-500 animate-pulse" : "text-amber-500"
    )}>
      <Clock className="w-3 h-3" />
      {timeLeft}
    </div>
  );
};

export default function StaffDashboardPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('all');
  const [assigneeId, setAssigneeId] = useState('all');
  const [reporterId, setReporterId] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
    refetchInterval: 10000, // 10s polling fallback for new incidents
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => (await api.patch(`/incidents/${id}`, { status })).data,
    // Step 1: When mutate is called:
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['incidents'] });

      // Snapshot the previous value
      const previousIncidents = queryClient.getQueryData(['incidents', { search, priority, assigneeId, reporterId }]);

      // Optimistically update to the new value
      queryClient.setQueryData(['incidents', { search, priority, assigneeId, reporterId }], (old: any) => {
        if (!old) return old;
        return old.map((incident: any) => 
          incident.id === id ? { ...incident, status } : incident
        );
      });

      // Return a context object with the snapshotted value
      return { previousIncidents };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err: any, newTodo, context) => {
      queryClient.setQueryData(['incidents', { search, priority, assigneeId, reporterId }], context?.previousIncidents);
      toast.error(err.response?.data?.detail || 'Failed to update incident status.');
    },
    // Always refetch after error or success to sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      // Also invalidate stats as a transition might affect them
      queryClient.invalidateQueries({ queryKey: ['incident-stats'] });
    },
    onSuccess: () => {
      toast.success('Incident status has been updated.');
    },
  });

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDrop = (status: string) => {
    if (draggingId) {
      mutation.mutate({ id: draggingId, status });
      setDraggingId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const resetFilters = () => {
    setSearch('');
    setPriority('all');
    setAssigneeId('all');
    setReporterId('all');
  };

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Operations</h1>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Department Intelligence</p>
          </div>
        </div>
        
        {user?.role === 'MANAGER' && (
          <div className="bg-primary/5 border border-primary/10 p-1 rounded-lg">
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn("text-[10px] uppercase font-bold tracking-widest h-8", showFilters ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
              <Filter className="w-3 h-3 mr-2" />
              Toggle Filters
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="board" className="w-full space-y-10">
        <div className="flex justify-between items-center border-b border-primary/10 pb-4">
          <TabsList className="bg-black/20 border border-primary/10 p-1">
            <TabsTrigger value="board" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-6 text-[10px] uppercase font-black tracking-widest h-8">
              <LayoutGrid className="w-3 h-3" />
              Kanban Board
            </TabsTrigger>
            {user?.role === 'MANAGER' && (
              <TabsTrigger value="team" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-6 text-[10px] uppercase font-black tracking-widest h-8">
                <Users className="w-3 h-3" />
                Team Workload
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="board" className="space-y-10 outline-none">
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {/* ... existing filters ... */}
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

      <div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-[700px]"
      >
        {STATUS_COLUMNS.map((col) => {
          const columnIncidents = incidents.filter((i: any) => i.status === col.id);
          
          return (
            <div 
              key={col.id} 
              className="flex flex-col gap-6"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="uppercase tracking-widest text-xs font-bold flex items-center gap-2">
                  <col.icon className={`w-4 h-4 ${col.color}`} />
                  {col.label}
                </h2>
                <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px]">
                  {columnIncidents.length}
                </Badge>
              </div>
              
              <div className={cn(
                "flex-1 space-y-6 p-4 rounded-md border border-primary/10 bg-black/10 shadow-inner overflow-y-auto max-h-[800px] transition-colors",
                draggingId && "bg-primary/5 border-dashed border-primary/30"
              )}>
                {columnIncidents.map((incident: any) => (
                  <div 
                    key={incident.id} 
                    draggable
                    onDragStart={() => handleDragStart(incident.id)}
                    className={cn(
                      "cursor-grab active:cursor-grabbing transition-all duration-200",
                      draggingId === incident.id ? "opacity-50 scale-95" : "opacity-100 scale-100"
                    )}
                  >
                    <Card className={cn(
                      "border-primary/10 hover:border-primary/40 transition-all group overflow-visible bg-card shadow-sm hover:shadow-md",
                      draggingId === incident.id && "border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    )}>
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-primary/60 tracking-widest">{incident.incident_key}</span>
                          <Badge variant="outline" className="border-primary/20 text-[9px] uppercase font-bold text-muted-foreground">
                            {incident.priority}
                          </Badge>
                        </div>

                        <Link href={`/incidents/${incident.id}`}>
                          <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {incident.title}
                          </h3>
                        </Link>

                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {incident.description}
                        </p>

                        <SLATimer breachAt={incident.sla_breach_at} status={incident.status} />
                        
                        <div className="flex gap-2 pt-2">
                          {col.id === 'OPEN' && (
                            <Button 
                              size="sm" 
                              className="w-full h-8 text-[9px] font-bold uppercase tracking-wider" 
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
                              className="w-full border-primary/20 text-primary hover:bg-primary/10 h-8 text-[9px] uppercase font-bold tracking-wider" 
                              onClick={() => mutation.mutate({ id: incident.id, status: 'RESOLVED' })}
                              disabled={mutation.isPending}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
                
                {columnIncidents.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-30">
                    <p className="text-[10px] uppercase font-bold tracking-widest">No incidents</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
        </TabsContent>

        {user?.role === 'MANAGER' && (
          <TabsContent value="team" className="outline-none">
            <TeamWorkload departmentId={user.department_id} />
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
}
