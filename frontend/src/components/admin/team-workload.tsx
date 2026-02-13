'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { User, Shield, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TeamWorkloadProps {
  departmentId: string;
}

export function TeamWorkload({ departmentId }: TeamWorkloadProps) {
  const queryClient = useQueryClient();

  const { data: teamStats, isLoading } = useQuery({
    queryKey: ['team-workload', departmentId],
    queryFn: async () => (await api.get('/incidents/stats')).data, // This endpoint now returns team_workload
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ['assignees'],
    queryFn: async () => (await api.get('/users/assignees')).data,
  });

  const { data: teamIncidents = [] } = useQuery({
    queryKey: ['team-incidents', departmentId],
    queryFn: async () => (await api.get(`/incidents/?status=OPEN&status=IN_PROGRESS`)).data,
  });

  const reassignMutation = useMutation({
    mutationFn: async ({ incidentId, assigneeId }: { incidentId: string, assigneeId: string }) => 
      (await api.patch(`/incidents/${incidentId}`, { assignee_id: assigneeId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-workload'] });
      queryClient.invalidateQueries({ queryKey: ['team-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident reassigned successfully.');
    },
    onError: () => toast.error('Failed to reassign incident.'),
  });

  if (isLoading) return <div className="p-10 text-center animate-pulse">Analyzing team distribution...</div>;

  const workload = teamStats?.team_workload || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workload.map((member: any) => (
          <Card key={member.name} className="bg-black/20 border-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{member.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Staff Member</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono font-bold text-primary">{member.value}</span>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Active Tasks</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full bg-primary/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${Math.min((member.value / 10) * 100, 100)}%` }} 
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xs uppercase font-black tracking-widest text-primary/60 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Quick Reassignment & Balancing
        </h3>
        
        <div className="border border-primary/10 rounded-md overflow-hidden bg-card">
          <div className="grid grid-cols-12 bg-muted/30 p-3 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-primary/10">
            <div className="col-span-2">Key</div>
            <div className="col-span-4">Incident Title</div>
            <div className="col-span-3">Current Assignee</div>
            <div className="col-span-3 text-right">Reassign To</div>
          </div>
          
          <div className="divide-y divide-primary/5">
            {teamIncidents.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground italic">No active incidents to balance.</div>
            ) : (
              teamIncidents.map((inc: any) => (
                <div key={inc.id} className="grid grid-cols-12 p-3 items-center hover:bg-primary/5 transition-colors">
                  <div className="col-span-2 font-mono text-[10px] text-primary/60">{inc.incident_key}</div>
                  <div className="col-span-4 text-xs font-medium truncate pr-4">{inc.title}</div>
                  <div className="col-span-3 text-[10px] text-muted-foreground italic">{inc.assignee_name || 'Unassigned'}</div>
                  <div className="col-span-3">
                    <Select 
                      onValueChange={(val) => reassignMutation.mutate({ incidentId: inc.id, assigneeId: val })}
                      defaultValue={inc.assignee_id || ""}
                    >
                      <SelectTrigger className="h-8 bg-black/20 border-primary/10 text-[10px] uppercase font-bold">
                        <SelectValue placeholder="Assign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assignees.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
