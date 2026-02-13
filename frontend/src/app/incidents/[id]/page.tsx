'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scroll, MessageSquare, Shield, Clock, User, Landmark, Ticket, History, ArrowRight } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  const { data: incident, isLoading: isIncidentLoading } = useQuery({
    queryKey: ['incident', resolvedParams.id],
    queryFn: async () => {
      const res = await api.get(`/incidents/${resolvedParams.id}`);
      setEditForm({ title: res.data.title, description: res.data.description });
      return res.data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', resolvedParams.id],
    queryFn: async () => (await api.get(`/incidents/${resolvedParams.id}/comments`)).data,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['timeline', resolvedParams.id],
    queryFn: async () => (await api.get(`/incidents/${resolvedParams.id}/timeline`)).data,
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ['assignees'],
    queryFn: async () => (await api.get('/users/assignees')).data,
    enabled: !!user && ['ADMIN', 'MANAGER', 'STAFF'].includes(user.role),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => (await api.patch(`/incidents/${resolvedParams.id}`, updates)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['incident', resolvedParams.id], data);
      queryClient.invalidateQueries({ queryKey: ['timeline', resolvedParams.id] });
      setIsEditing(false);
      toast.success('Incident has been updated.');
    },
    onError: () => toast.error('Failed to update incident.'),
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => (await api.post(`/incidents/${resolvedParams.id}/comments`, { content, is_internal: false })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', resolvedParams.id] });
      setNewComment('');
      toast.success('Comment has been added.');
    },
    onError: () => toast.error('Failed to add comment.'),
  });

  if (isIncidentLoading) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Ticket className="w-12 h-12 text-primary/30 mb-4" />
        <span className="text-muted-foreground font-medium">Loading incident details...</span>
      </div>
    </DashboardLayout>
  );

  if (!incident) return (
    <DashboardLayout>
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-destructive uppercase tracking-widest">Incident Not Found</h2>
        <p className="text-muted-foreground mt-2">This record could not be located in the system.</p>
        <Button variant="link" onClick={() => router.push('/incidents')} className="mt-4 text-primary">Return to Incident List</Button>
      </div>
    </DashboardLayout>
  );

  const isReporter = user?.id === incident.reporter_id;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-sky-900 text-sky-100 border-sky-500/50';
      case 'IN_PROGRESS': return 'bg-amber-900 text-amber-100 border-amber-500/50';
      case 'RESOLVED': return 'bg-emerald-900 text-emerald-100 border-emerald-500/50';
      case 'CLOSED': return 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
      case 'CANCELLED': return 'bg-rose-900 text-rose-100 border-rose-500/50';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'STATUS_CHANGE': return 'changed status';
      case 'PRIORITY_CHANGE': return 'updated priority';
      case 'ASSIGNMENT': return 'assigned the incident';
      case 'CREATED': return 'created the incident';
      default: return action.toLowerCase().replace('_', ' ');
    }
  };

  return (
    <DashboardLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-primary/10 pb-8">
          <div className="flex-1 space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                 <Input 
                  value={editForm.title} 
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="text-2xl font-bold bg-black/20 border-primary/30 h-12"
                 />
                 <div className="flex gap-2">
                   <Button onClick={() => updateMutation.mutate(editForm)}>Save Changes</Button>
                   <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-muted-foreground uppercase text-xs font-bold">Cancel</Button>
                 </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-bold">{incident.title}</h1>
                  {isReporter && incident.status === 'OPEN' && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="border-primary/20 text-primary hover:bg-primary/10 text-[10px] uppercase font-bold">
                      Edit
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-primary/10 text-primary border-primary/30 font-mono text-[10px]">{incident.incident_key}</Badge>
                  <Badge variant="outline" className={`${getStatusColor(incident.status)} border-px text-[10px] uppercase font-bold`}>
                    {incident.status}
                  </Badge>
                  <Badge variant="outline" className="border-primary/20 text-primary/80 text-[10px] uppercase font-bold">
                    {incident.priority}
                  </Badge>
                </div>
              </>
            )}
          </div>
          
          <div className="w-full md:w-auto">
            <Select onValueChange={(val) => updateMutation.mutate({ status: val })} defaultValue={incident.status}>
              <SelectTrigger className="w-full md:w-[200px] bg-card border-primary/30 text-xs font-bold uppercase">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="border-b border-primary/10 bg-muted/20">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {isEditing ? (
                    <Textarea 
                      value={editForm.description} 
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      rows={8}
                      className="bg-black/20 border-primary/30 text-lg"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-foreground/90 text-lg leading-relaxed">
                      {incident.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Tabs defaultValue="comments" className="w-full">
                <TabsList className="bg-black/20 border border-primary/10 p-1 mb-6">
                  <TabsTrigger value="comments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-6">
                    <MessageSquare className="w-4 h-4" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-6">
                    <History className="w-4 h-4" />
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="focus-visible:outline-none">
                  <Card className="border-primary/10">
                    <CardContent className="space-y-6 pt-6">
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {comments.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic text-center py-4">No comments posted yet.</p>
                        ) : (
                          comments.map((comment: any) => (
                            <div key={comment.id} className="p-4 bg-muted/20 border border-primary/5 rounded-sm relative group">
                              <p className="text-sm text-foreground/90 mb-2 leading-relaxed">{comment.content}</p>
                              <div className="flex justify-between items-center opacity-60">
                                <span className="text-[10px] uppercase font-bold flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  System User
                                </span>
                                <span className="text-[10px] uppercase font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(comment.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <form onSubmit={(e) => { e.preventDefault(); commentMutation.mutate(newComment); }} className="space-y-3 pt-6 border-t border-primary/10">
                        <Textarea 
                          placeholder="Add a comment..." 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="bg-black/20 border-primary/20 focus:border-primary/40 rounded-none min-h-[100px]"
                        />
                        <div className="flex justify-end">
                          <Button type="submit" disabled={commentMutation.isPending}>
                            {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="timeline" className="focus-visible:outline-none">
                  <Card className="border-primary/10">
                    <CardContent className="pt-8 px-8">
                      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-px before:bg-gradient-to-b before:from-primary/50 before:via-primary/20 before:to-transparent">
                        {timeline.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic text-center py-4">No activity history available.</p>
                        ) : (
                          timeline.map((log: any) => (
                            <div key={log.id} className="relative flex items-start gap-6 group">
                              <div className="absolute left-0 mt-1.5 h-10 w-10 flex items-center justify-center rounded-full bg-background border border-primary/30 z-10 group-hover:border-primary group-hover:shadow-[0_0_10px_rgba(var(--primary),0.3)] transition-all">
                                <History className="w-4 h-4 text-primary" />
                              </div>
                              <div className="ml-14 flex-1 pb-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-bold uppercase tracking-tight text-foreground/90">
                                    {log.actor_name} <span className="text-primary/70 ml-1 lowercase font-medium">{getActionLabel(log.action)}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                                    {new Date(log.created_at).toLocaleString()}
                                  </span>
                                </div>
                                {log.old_value || log.new_value ? (
                                  <div className="flex items-center gap-3 text-xs mt-2 p-2 rounded bg-primary/5 border border-primary/10 w-fit">
                                    <span className="text-muted-foreground line-through opacity-50">{log.old_value || 'None'}</span>
                                    <ArrowRight className="w-3 h-3 text-primary" />
                                    <span className="font-bold text-primary">{log.new_value || 'None'}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="space-y-8">
            <Card>
              <CardHeader className="border-b border-primary/10 bg-muted/20">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Incident Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-2">
                      <User className="w-3 h-3" /> Reporter
                    </label>
                    <p className="text-sm ml-5">{incident.reporter_name || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-2">
                      <Landmark className="w-3 h-3" /> Department
                    </label>
                    <p className="text-sm ml-5">{incident.department_name || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-2">
                      <Ticket className="w-3 h-3" /> Category
                    </label>
                    <p className="text-sm ml-5">{incident.category_name || 'Unclassified'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-2">
                      <Shield className="w-3 h-3" /> Assignee
                    </label>
                    {['ADMIN', 'MANAGER', 'STAFF'].includes(user?.role) ? (
                      <div className="mt-1 ml-5">
                        <Select 
                          onValueChange={(val) => updateMutation.mutate({ assignee_id: val === "unassigned" ? null : val })} 
                          defaultValue={incident.assignee_id || "unassigned"}
                        >
                          <SelectTrigger className="w-full bg-black/20 border-primary/20 text-xs h-8">
                            <SelectValue placeholder="Assign To..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {assignees.map((as: any) => (
                              <SelectItem key={as.id} value={as.id}>{as.full_name || as.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <p className="text-sm ml-5 font-bold">{incident.assignee_name || 'Unassigned'}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 pt-4 border-t border-primary/5">
                    <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Created At
                    </label>
                    <p className="text-sm ml-5">{new Date(incident.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 bg-muted/10 border border-primary/10 rounded-md">
              <p className="text-[10px] text-primary uppercase font-bold text-center mb-2">Note</p>
              <p className="text-[11px] text-muted-foreground text-center">
                All changes to this incident are tracked in the system audit log.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
