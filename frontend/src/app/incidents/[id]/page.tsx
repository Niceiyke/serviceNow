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
import { cn } from '@/lib/utils';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileUploader } from '@/components/incidents/file-uploader';
import { AttachmentList } from '@/components/incidents/attachment-list';
import { 
  Scroll, 
  MessageSquare, 
  Shield, 
  Clock, 
  User, 
  Landmark, 
  Ticket, 
  History, 
  ArrowRight, 
  Lock, 
  Send,
  Zap,
  UserCog,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

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
  const [isInternal, setIsInternal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [closureReason, setClosureReason] = useState('');

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
    queryFn: async () => {
      const res = await api.get(`/incidents/${resolvedParams.id}/comments`);
      // Since backend doesn't return author_name in CommentInDB yet, let's fetch users if we need to, 
      // but for now we'll assume the backend will be updated or we'll display "System User"
      return res.data;
    },
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
    mutationFn: async (vars: { content: string, is_internal: boolean }) => (await api.post(`/incidents/${resolvedParams.id}/comments`, vars)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', resolvedParams.id] });
      setNewComment('');
      setIsInternal(false);
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

  const getEventIcon = (action: string) => {
    switch (action) {
      case 'STATUS_CHANGE': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'PRIORITY_CHANGE': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'ASSIGNMENT': return <UserCog className="w-4 h-4 text-sky-500" />;
      case 'CREATED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <Clock className="w-4 h-4 text-primary/60" />;
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
            <Select 
              onValueChange={(val) => {
                if (['CLOSED', 'CANCELLED'].includes(val)) {
                  setPendingStatus(val);
                  setIsClosureDialogOpen(true);
                } else {
                  updateMutation.mutate({ status: val });
                }
              }} 
              value={incident.status}
              disabled={['CLOSED', 'CANCELLED'].includes(incident.status)}
            >
              <SelectTrigger className="w-full md:w-[200px] bg-card border-primary/30 text-xs font-bold uppercase text-primary disabled:opacity-50">
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

        <Dialog open={isClosureDialogOpen} onOpenChange={setIsClosureDialogOpen}>
          <DialogContent className="bg-card border-primary/20">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-widest font-bold text-primary">
                Confirm {pendingStatus?.toLowerCase()}
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <p className="text-xs text-muted-foreground uppercase font-medium tracking-tight">
                A professional justification is required to {pendingStatus?.toLowerCase()} this incident. 
                This will be logged as a permanent system comment.
              </p>
              <Textarea 
                placeholder="Provide detailed justification..." 
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                className="bg-black/40 border-primary/20 min-h-[120px] text-sm resize-none"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setIsClosureDialogOpen(false); setClosureReason(''); }} className="text-[10px] uppercase font-bold">
                Cancel
              </Button>
              <Button 
                disabled={!closureReason.trim() || updateMutation.isPending}
                onClick={() => {
                  updateMutation.mutate({ status: pendingStatus, status_comment: closureReason });
                  setIsClosureDialogOpen(false);
                  setClosureReason('');
                }}
                className="gap-2"
              >
                Confirm {pendingStatus}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <CardContent className="pt-6 space-y-8">
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

                  <div className="pt-6 border-t border-primary/5 space-y-6">
                    <AttachmentList incidentId={resolvedParams.id} canDelete={['ADMIN', 'MANAGER', 'STAFF'].includes(user?.role) || isReporter} />
                    
                    {!['CLOSED', 'CANCELLED'].includes(incident.status) && (
                      <div className="max-w-md">
                        <FileUploader 
                          incidentId={resolvedParams.id} 
                          onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: ['attachments', resolvedParams.id] })} 
                        />
                      </div>
                    )}
                  </div>
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
                  <Card className="border-primary/10 bg-black/5">
                    <CardContent className="space-y-8 pt-8">
                      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-primary/20">
                        {comments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 opacity-40">
                            <MessageSquare className="w-12 h-12 mb-4" />
                            <p className="text-sm font-medium uppercase tracking-widest">No communication logs</p>
                          </div>
                        ) : (
                          comments.map((comment: any) => (
                            <div key={comment.id} className={cn(
                              "relative pl-4 border-l-2 transition-all",
                              comment.is_internal 
                                ? "border-amber-500/50 bg-amber-500/5 py-4 px-6 rounded-r-md" 
                                : "border-primary/20 py-2"
                            )}>
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold uppercase tracking-tight text-foreground">
                                      {comment.author_name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block font-mono">
                                      {new Date(comment.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                {comment.is_internal && (
                                  <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[9px] font-bold uppercase py-0 px-2 h-5">
                                    <Lock className="w-2.5 h-2.5 mr-1" /> Internal
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                {comment.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="pt-6 border-t border-primary/10">
                        {['CLOSED', 'CANCELLED'].includes(incident.status) ? (
                          <div className="bg-muted/30 border border-primary/10 p-6 text-center rounded-sm">
                            <Lock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                            <p className="text-xs uppercase font-black tracking-[0.2em] text-muted-foreground/60">
                              Incident {incident.status}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              This record is finalized. Further communication is restricted.
                            </p>
                          </div>
                        ) : (
                          <form onSubmit={(e) => { e.preventDefault(); commentMutation.mutate({ content: newComment, is_internal: isInternal }); }} className="space-y-4">
                            <Textarea 
                              placeholder="Type your message or internal note..." 
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="bg-black/40 border-primary/20 focus:border-primary/60 rounded-sm min-h-[120px] text-sm resize-none"
                            />
                            <div className="flex justify-between items-center">
                              {['ADMIN', 'MANAGER', 'STAFF'].includes(user?.role) ? (
                                <div className="flex items-center space-x-3 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                                  <Checkbox 
                                    id="internal" 
                                    checked={isInternal} 
                                    onCheckedChange={(checked) => setIsInternal(!!checked)}
                                    className="border-primary/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                  />
                                  <Label htmlFor="internal" className="text-[10px] font-bold uppercase text-muted-foreground cursor-pointer flex items-center gap-2 select-none">
                                    <Lock className="w-3 h-3" />
                                    Mark as Internal Note
                                  </Label>
                                </div>
                              ) : <div />}
                              <Button type="submit" disabled={commentMutation.isPending || !newComment.trim()} className="gap-2 px-8">
                                {commentMutation.isPending ? 'Processing...' : (
                                  <>
                                    <Send className="w-4 h-4" />
                                    Post Message
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="timeline" className="focus-visible:outline-none">
                  <Card className="border-primary/10 bg-black/5">
                    <CardContent className="pt-10 px-10 pb-10">
                      <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:h-full before:w-px before:bg-gradient-to-b before:from-primary/40 before:via-primary/10 before:to-transparent">
                        {timeline.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 opacity-40">
                            <History className="w-12 h-12 mb-4" />
                            <p className="text-sm font-medium uppercase tracking-widest">No activity recorded</p>
                          </div>
                        ) : (
                          timeline.map((log: any) => (
                            <div key={log.id} className="relative flex items-start gap-8 group">
                              <div className="absolute left-0 mt-1 h-10 w-10 flex items-center justify-center rounded-full bg-background border border-primary/20 z-10 group-hover:border-primary/60 group-hover:scale-110 transition-all duration-300">
                                {getEventIcon(log.action)}
                              </div>
                              <div className="ml-14 flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-foreground">
                                      {log.actor_name}
                                    </span>
                                    <span className="text-[9px] uppercase font-black text-muted-foreground/60 tracking-widest border border-primary/10 px-2 py-0.5 rounded bg-muted/20">
                                      {getActionLabel(log.action)}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono text-muted-foreground tracking-widest opacity-60">
                                    {new Date(log.created_at).toLocaleString()}
                                  </span>
                                </div>
                                {log.old_value || log.new_value ? (
                                  <div className="flex items-center gap-4 text-[10px] font-mono mt-3 p-2.5 rounded-sm bg-black/20 border border-primary/5 w-fit group-hover:border-primary/20 transition-colors">
                                    <span className="text-muted-foreground/40 line-through truncate max-w-[150px] uppercase">{log.old_value || 'None'}</span>
                                    <ArrowRight className="w-3 h-3 text-primary/40" />
                                    <span className="font-bold text-primary truncate max-w-[250px] uppercase">{log.new_value || 'None'}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] font-mono text-muted-foreground/40 uppercase mt-1 italic">
                                    System record updated
                                  </div>
                                )}
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
                          disabled={['CLOSED', 'CANCELLED'].includes(incident.status)}
                        >
                          <SelectTrigger className="w-full bg-black/20 border-primary/20 text-xs h-8 disabled:opacity-50">
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
