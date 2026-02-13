'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  User as UserIcon, 
  Search, 
  Filter, 
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ActionsManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['global-actions', { statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      return (await api.get(`/problems/actions?${params.toString()}`)).data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ problemId, actionId, status }: { problemId: string, actionId: string, status: string }) => 
      (await api.patch(`/problems/${problemId}/actions/${actionId}`, { status })).data,
    onSuccess: () => {
      toast.success('Action state synchronized');
      queryClient.invalidateQueries({ queryKey: ['global-actions'] });
    }
  });

  const filteredActions = actions.filter((a: any) => 
    a.description.toLowerCase().includes(search.toLowerCase()) ||
    a.assignee_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <DashboardLayout>Loading Action Streams...</DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-primary/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20 text-primary">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Actions Deployment Queue</h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-black mt-1">Global Preventative Task Management</p>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Filter tasks..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-black/20"
              />
            </div>
            <div className="flex bg-black/20 p-1 rounded-lg border border-primary/10">
              {['all', 'PENDING', 'COMPLETED'].map((s) => (
                <Button 
                  key={s}
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "text-[10px] font-bold uppercase h-7 px-4 transition-all",
                    statusFilter === s ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredActions.map((action: any) => (
            <Card key={action.id} className={cn(
              "p-6 bg-card border-primary/10 hover:border-primary/30 transition-all group overflow-hidden relative",
              action.status === 'COMPLETED' && "opacity-60 grayscale-[0.5]"
            )}>
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={action.status === 'COMPLETED' ? 'default' : 'outline'} className={cn(
                      "text-[9px] uppercase font-black tracking-widest px-3 h-5",
                      action.status === 'COMPLETED' ? "bg-emerald-500" : "text-primary border-primary/20 animate-pulse"
                    )}>
                      {action.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">TASK-ID: {action.id.split('-')[0]}</span>
                  </div>
                  
                  <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">{action.description}</h3>
                  
                  <div className="flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                      <UserIcon className="w-3 h-3 text-primary" />
                      Assignee: <span className="text-white ml-1">{action.assignee_name}</span>
                    </div>
                    {action.due_date && (
                      <div className={cn(
                        "flex items-center gap-2 text-xs font-bold uppercase tracking-tighter px-3 py-1.5 rounded-full border",
                        new Date(action.due_date) < new Date() && action.status !== 'COMPLETED' 
                          ? "bg-destructive/10 text-destructive border-destructive/20" 
                          : "bg-white/5 text-muted-foreground border-white/5"
                      )}>
                        <Clock className="w-3 h-3" />
                        Deadline: <span className="ml-1">{new Date(action.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-[180px]">
                  {action.status !== 'COMPLETED' && (
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] h-10 gap-2 shadow-lg shadow-emerald-900/20"
                      onClick={() => updateStatusMutation.mutate({ problemId: action.problem_id, actionId: action.id, status: 'COMPLETED' })}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Complete
                    </Button>
                  )}
                  <Link href={`/problems/${action.problem_id}`}>
                    <Button variant="outline" className="w-full border-primary/20 text-muted-foreground hover:text-primary gap-2 text-[10px] uppercase font-bold h-10">
                      View Problem
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="absolute top-0 right-0 p-2 opacity-[0.02] pointer-events-none">
                <ClipboardList className="w-24 h-24" />
              </div>
            </Card>
          ))}

          {filteredActions.length === 0 && (
            <div className="py-32 text-center text-muted-foreground border-2 border-dashed border-primary/10 rounded-3xl opacity-40">
              <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-black uppercase tracking-[0.3em]">No tasks in queue</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
