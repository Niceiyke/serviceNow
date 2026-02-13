'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  ChevronLeft, 
  Clock, 
  GitBranch, 
  Ticket,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  ClipboardList,
  HelpCircle,
  Save,
  Edit2,
  Zap,
  Hammer,
  LayoutList,
  User,
  Target,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  XCircle,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function ProblemDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLinkIncidentOpen, setIsLinkIncidentOpen] = useState(false);
  const [incidentSearch, setIncidentSearch] = useState('');

  // RCA State for Quick Edit
  const [isEditingRCA, setIsEditingRCA] = useState(false);
  const [rcaData, setRcaData] = useState({
    root_cause: '',
    rcfa_analysis: '',
    five_whys: '',
    countermeasure: '',
    function_failure: '',
    failure_mode: ''
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  const { data: problem, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['problem', id],
    queryFn: async () => (await api.get(`/problems/${id}`)).data,
  });

  useEffect(() => {
    if (problem) {
      setRcaData({
        root_cause: problem.root_cause || '',
        rcfa_analysis: problem.rcfa_analysis || '',
        five_whys: problem.five_whys || '',
        countermeasure: problem.countermeasure || '',
        function_failure: problem.function_failure || '',
        failure_mode: problem.failure_mode || ''
      });
    }
  }, [problem]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => (await api.patch(`/problems/${id}`, data)).data,
    onSuccess: () => {
      toast.success('Analysis updated');
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
      setIsEditingRCA(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update analysis');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await api.patch(`/problems/${id}`, { status: 'CANCELLED' })).data,
    onSuccess: () => {
      toast.success('Problem has been cancelled.');
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to cancel problem.');
    }
  });

  const adminStatusMutation = useMutation({
    mutationFn: async (status: string) => (await api.patch(`/problems/${id}`, { status })).data,
    onSuccess: () => {
      toast.success('System override successful.');
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
    }
  });

  const { data: allIncidents = [] } = useQuery({
    queryKey: ['all-incidents'],
    queryFn: async () => (await api.get('/incidents/')).data,
  });

  const linkMutation = useMutation({
    mutationFn: async (incidentId: string) => (await api.post(`/problems/${id}/incidents/${incidentId}`)).data,
    onSuccess: () => {
      toast.success('Incident linked to problem');
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
      setIsLinkIncidentOpen(false);
    }
  });

  if (isLoading) return <DashboardLayout>Loading Detail Stream...</DashboardLayout>;
  if (!problem) return <DashboardLayout>Problem not found</DashboardLayout>;

  const STAGES = ['OPEN', 'DEFINITION', 'ANALYSIS', 'COUNTERMEASURE', 'MONITORING', 'CLOSED'];
  const currentStageIdx = STAGES.indexOf(problem.status);
  const isCancelled = problem.status === 'CANCELLED';

  const isCreator = user?.id === problem.creator_id;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/problems" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Analysis Queue
          </Link>
          
          <div className="flex items-center gap-4">
            {isCreator && problem.status === 'OPEN' && (
              <Button variant="destructive" size="sm" onClick={() => cancelMutation.mutate()} className="gap-2 text-[10px] font-bold uppercase h-8">
                <XCircle className="w-3 h-3" />
                Cancel Analysis
              </Button>
            )}
            
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2 text-[10px] uppercase font-bold text-muted-foreground">
              <RefreshCw className={cn("w-3 h-3", isRefetching && "animate-spin")} />
              Sync Data
            </Button>
          </div>
        </div>

        {/* Workflow Stepper */}
        {!isCancelled && (
          <div className="bg-black/20 p-6 rounded-2xl border border-primary/10 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[800px] px-4 relative">
              <div className="absolute top-[20px] left-0 w-full h-[2px] bg-primary/5 -translate-y-1/2 z-0" />
              {STAGES.map((stage, idx) => {
                const isPast = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                return (
                  <div key={stage} className="relative z-10 flex flex-col items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                      isPast ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]" :
                      isCurrent ? "bg-primary border-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse" :
                      "bg-black border-primary/20 text-muted-foreground"
                    )}>
                      {isPast ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      isCurrent ? "text-primary font-black" : isPast ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-full border shadow-lg transition-all",
              isCancelled ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-primary/10 border-primary/20 text-primary"
            )}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{problem.title}</h1>
                <Badge variant={isCancelled ? "destructive" : "outline"} className={cn(
                  "uppercase font-mono text-[10px] px-3 py-1",
                  !isCancelled && "text-primary border-primary/20 bg-primary/5"
                )}>
                  {problem.status}
                </Badge>
              </div>
              <div className="flex gap-4 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Opened {new Date(problem.created_at).toLocaleDateString()}
                </span>
                {problem.resolved_at && (
                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Resolved {new Date(problem.resolved_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && !isCancelled && (
              <Select value={problem.status} onValueChange={(v) => adminStatusMutation.mutate(v)}>
                <SelectTrigger className="w-[180px] h-10 text-[10px] uppercase font-bold border-emerald-500/20 bg-emerald-500/5 text-emerald-500">
                  <SelectValue placeholder="Admin Override" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            
            <Link href={`/problems/${id}/rcfa`}>
              <Button className="gap-2 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 uppercase font-bold text-xs h-10 px-6">
                <ClipboardList className="w-4 h-4" />
                Open RCFA Tool
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Failures & Countermeasure Card */}
            <Card className="p-6 bg-card/50 border-primary/10">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Analysis Scope & Countermeasure
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Function Failure</span>
                    <p className="text-sm border-l-2 border-primary/20 pl-3 italic text-foreground/80">{problem.function_failure || 'Not defined'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-sky-500">Failure Mode</span>
                    <p className="text-sm border-l-2 border-sky-500/40 pl-3 font-bold">{problem.failure_mode || 'Not defined'}</p>
                  </div>
                </div>
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldCheck className="w-12 h-12" /></div>
                  <span className="text-[10px] uppercase font-bold text-emerald-500 block mb-2">Permanent Countermeasure</span>
                  <p className="text-sm font-semibold leading-relaxed">
                    {problem.countermeasure || 'No countermeasure defined in analysis.'}
                  </p>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-primary/5">
                <h2 className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Analysis Context</h2>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">{problem.description}</p>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 border-primary/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Forensic Analysis Summary
                </h2>
                {!isEditingRCA ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingRCA(true)} className="h-8 text-[10px] font-bold uppercase">
                    <Edit2 className="w-3 h-3 mr-2" /> Quick Update
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingRCA(false)} className="h-8 text-[10px] font-bold uppercase">Cancel</Button>
                    <Button size="sm" onClick={() => updateMutation.mutate(rcaData)} className="h-8 text-[10px] font-bold uppercase" disabled={updateMutation.isPending}>
                      <Save className="w-3 h-3 mr-2" /> Save Summary
                    </Button>
                  </div>
                )}
              </div>

              {isEditingRCA ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Function Failure</Label>
                      <Input value={rcaData.function_failure} onChange={(e) => setRcaData({...rcaData, function_failure: e.target.value})} className="bg-black/20 h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-sky-500 tracking-widest">Failure Mode</Label>
                      <Input value={rcaData.failure_mode} onChange={(e) => setRcaData({...rcaData, failure_mode: e.target.value})} className="bg-black/20 h-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Final Root Cause</Label>
                      <Input value={rcaData.root_cause} onChange={(e) => setRcaData({...rcaData, root_cause: e.target.value})} placeholder="Verified cause..." className="bg-black/20 h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">Countermeasure</Label>
                      <Input value={rcaData.countermeasure} onChange={(e) => setRcaData({...rcaData, countermeasure: e.target.value})} placeholder="Permanent fix..." className="bg-black/20 h-10" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Target className="w-3 h-3 text-destructive" /> Verified Root Cause
                    </h3>
                    <div className="p-4 bg-destructive/5 border border-destructive/10 rounded-md">
                      <p className="text-sm font-semibold">{problem.root_cause || 'Investigation pending root cause identification.'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <HelpCircle className="w-3 h-3 text-sky-500" /> Causal Timeline
                      </h3>
                      <div className="p-4 bg-black/20 rounded-md border border-primary/5 min-h-[150px] space-y-3 shadow-inner">
                        {(() => {
                          try {
                            const whys = JSON.parse(problem.five_whys || '[]');
                            if (!Array.isArray(whys) || whys.length === 0) throw new Error();
                            return whys.map((w: any, i: number) => (
                              <div key={i} className="space-y-1">
                                <p className="text-[10px] font-bold text-primary opacity-70 uppercase tracking-tighter">Level {i+1}</p>
                                <p className="text-xs font-mono italic text-muted-foreground">Q: {w.question || w.why}</p>
                                <div className="flex items-center gap-2 pl-2 border-l border-primary/10">
                                  <ArrowRight className="w-2 h-2 text-sky-500" />
                                  <p className="text-xs font-mono font-bold text-sky-400">
                                    {w.answers?.find((a: any) => a.isCorrect)?.text || w.because || 'No path selected'}
                                  </p>
                                </div>
                              </div>
                            ));
                          } catch (e) {
                            return <p className="text-xs font-mono text-muted-foreground italic">No causal chain documented yet.</p>;
                          }
                        })()}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3 text-amber-500" /> Situational analysis
                      </h3>
                      <div className="p-4 bg-black/20 rounded-md border border-primary/5 min-h-[150px] shadow-inner">
                        {(() => {
                          try {
                            const data = JSON.parse(problem.rcfa_analysis || '{}');
                            const entries = Object.entries(data);
                            if (entries.length === 0) throw new Error();
                            return (
                              <div className="grid grid-cols-2 gap-4">
                                {entries.map(([k, v]: [string, any]) => (
                                  <div key={k} className="space-y-1">
                                    <span className="text-[8px] font-black uppercase text-muted-foreground block tracking-widest">{k}</span>
                                    <p className="text-[10px] font-mono leading-tight">{v || '---'}</p>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch (e) {
                            return <p className="text-xs font-mono text-muted-foreground italic">No situational awareness data.</p>;
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  {problem.actions?.length > 0 && (
                    <div className="pt-6 border-t border-primary/5">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                        <LayoutList className="w-3 h-3 text-primary" />
                        Preventative Actions ({problem.actions.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {problem.actions.map((action: any) => (
                          <div key={action.id} className="flex items-center justify-between p-3 rounded bg-black/30 border border-primary/5 shadow-sm group hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-3">
                              <Badge variant={action.status === 'COMPLETED' ? 'default' : 'outline'} className={cn(
                                "text-[8px] h-4",
                                action.status === 'COMPLETED' ? "bg-emerald-500" : "text-primary border-primary/20"
                              )}>
                                {action.status}
                              </Badge>
                              <span className="text-xs font-medium">{action.description}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                              <User className="w-3 h-3 text-primary/60" />
                              {action.assignee_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Linked Incidents</h2>
                <Dialog open={isLinkIncidentOpen} onOpenChange={setIsLinkIncidentOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-[10px] uppercase font-bold border-primary/20">
                      <Plus className="w-3 h-3" />
                      Link Incident
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-primary/20">
                    <DialogHeader>
                      <DialogTitle>Link Incident to Problem</DialogTitle>
                      <DialogDescription>Search for existing incidents to link to this problem.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search INC-..." value={incidentSearch} onChange={(e) => setIncidentSearch(e.target.value)} className="pl-9 bg-black/20" />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-primary/10">
                        {allIncidents
                          .filter((inc: any) => inc.incident_key.toLowerCase().includes(incidentSearch.toLowerCase()) && inc.problem_id !== id)
                          .map((inc: any) => (
                            <div key={inc.id} className="flex justify-between items-center p-3 rounded border border-primary/10 hover:bg-primary/5 transition-colors">
                              <div>
                                <p className="text-xs font-mono font-bold text-primary">{inc.incident_key}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{inc.title}</p>
                              </div>
                              <Button size="sm" onClick={() => linkMutation.mutate(inc.id)} disabled={linkMutation.isPending}>Link</Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid gap-3">
                {problem.incidents?.map((inc: any) => (
                  <Card key={inc.id} className="p-4 bg-black/20 border-primary/10 flex justify-between items-center group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <Ticket className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                      <div>
                        <Link href={`/incidents/${inc.id}`} className="text-xs font-mono font-bold hover:text-primary transition-colors">{inc.incident_key}</Link>
                        <p className="text-xs text-muted-foreground">{inc.title}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 uppercase">{inc.status}</Badge>
                  </Card>
                ))}
                {!problem.incidents?.length && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-primary/5 rounded-2xl flex flex-col items-center gap-3 opacity-40">
                    <Ticket className="w-8 h-8 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No Linked Incidents</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-card/50 border-primary/10 shadow-xl">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Change Control
              </h2>
              <div className="space-y-4">
                {problem.change_requests?.map((change: any) => (
                  <div key={change.id} className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/10 hover:border-primary/30 transition-all shadow-sm">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[8px] h-4 uppercase font-black tracking-widest border-primary/20">{change.status}</Badge>
                      <span className="text-[8px] text-muted-foreground font-mono">{new Date(change.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs font-bold leading-tight">{change.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed italic">{change.description}</p>
                  </div>
                ))}
                {!problem.change_requests?.length && (
                  <div className="text-center py-8 text-muted-foreground opacity-40 text-xs border border-dashed border-primary/10 rounded-xl">
                    No change requests linked.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-card/50 border-primary/10 shadow-xl">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Risk Profile
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded bg-black/20 border border-white/5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Impact Severity</span>
                  <span className="text-xs font-black font-mono text-red-500">CRITICAL</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded bg-black/20 border border-white/5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Detection Confidence</span>
                  <span className={cn("text-xs font-black font-mono", problem.rcfa_analysis ? "text-emerald-500" : "text-amber-500")}>
                    {problem.rcfa_analysis ? "HIGH" : "LOW"}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
