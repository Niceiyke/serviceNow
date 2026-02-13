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
  Save, 
  ClipboardList, 
  HelpCircle, 
  Zap, 
  Plus, 
  User, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  LayoutList, 
  ArrowRight, 
  Trash2,
  Circle,
  CheckCircle,
  XCircle,
  Target,
  ShieldCheck,
  Flag,
  Lock,
  CalendarDays
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Answer {
  text: string;
  isCorrect: boolean;
  isRootCause: boolean;
}

interface WhyStep {
  question: string;
  answers: Answer[];
}

export default function RCFAPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [problemData, setProblemData] = useState({
    root_cause: '',
    rcfa_analysis: '', 
    five_whys: '',
    countermeasure: '',
    function_failure: '',
    failure_mode: ''
  });

  const [fiveWh1H, setFiveW1H] = useState<Record<string, string>>({
    who: '',
    what: '',
    where: '',
    when: '',
    why: '',
    how: ''
  });

  const [whys, setWhys] = useState<WhyStep[]>([
    { question: '', answers: [{ text: '', isCorrect: true, isRootCause: false }] }
  ]);

  const [newAction, setNewAction] = useState({
    description: '',
    assignee_id: '',
    due_date: ''
  });
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);

  const PLACEHOLDERS_5W1H: Record<string, string> = {
    who: "Investigator or affected staff",
    what: "Component or process failure details",
    where: "Specific location or system node",
    when: "Occurrence date",
    why: "Business or operational impact",
    how: "Discovery method or evidence"
  };

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: async () => (await api.get(`/problems/${id}`)).data,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users/')).data,
  });

  useEffect(() => {
    if (problem) {
      setProblemData({
        root_cause: problem.root_cause || '',
        rcfa_analysis: problem.rcfa_analysis || '',
        five_whys: problem.five_whys || '',
        countermeasure: problem.countermeasure || '',
        function_failure: problem.function_failure || '',
        failure_mode: problem.failure_mode || ''
      });

      if (problem.rcfa_analysis) {
        try {
          const parsed = JSON.parse(problem.rcfa_analysis);
          // Format 'when' date for input[type="date"]
          if (parsed.when && parsed.when.includes('T')) {
            parsed.when = parsed.when.split('T')[0];
          }
          setFiveW1H(parsed);
        } catch (e) {
          setFiveW1H(prev => ({ ...prev, what: problem.rcfa_analysis }));
        }
      }

      if (problem.five_whys) {
        try {
          const parsed = JSON.parse(problem.five_whys);
          if (Array.isArray(parsed)) {
            setWhys(parsed);
          }
        } catch (e) {
          setWhys([{ question: 'Original Note', answers: [{ text: problem.five_whys, isCorrect: true, isRootCause: false }] }]);
        }
      }
    }
  }, [problem]);

  const isSetupComplete = !!(
    fiveWh1H.who && fiveWh1H.what && fiveWh1H.where && 
    fiveWh1H.when && fiveWh1H.why && fiveWh1H.how &&
    problemData.function_failure && problemData.failure_mode
  );

  const hasRootCause = whys.some(s => s.answers.some(a => a.isRootCause));

  const updateMutation = useMutation({
    mutationFn: async (data: any) => (await api.patch(`/problems/${id}`, data)).data,
    onSuccess: () => {
      toast.success('Professional Analysis Preserved');
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save analysis');
    }
  });

  const handleSave = () => {
    const rootCauseFound = whys.find(s => s.answers.find(a => a.isRootCause))?.answers.find(a => a.isRootCause)?.text || problemData.root_cause;
    
    const finalData = {
      ...problemData,
      root_cause: rootCauseFound,
      rcfa_analysis: JSON.stringify(fiveWh1H),
      five_whys: JSON.stringify(whys)
    };
    updateMutation.mutate(finalData);
  };

  const createActionMutation = useMutation({
    mutationFn: async (data: any) => (await api.post(`/problems/${id}/actions`, data)).data,
    onSuccess: () => {
      toast.success('Preventative Action Assigned');
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
      setNewAction({ description: '', assignee_id: '', due_date: '' });
      setIsActionDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to assign action');
    }
  });

  const updateActionStatusMutation = useMutation({
    mutationFn: async ({ actionId, status }: { actionId: string, status: string }) => 
      (await api.patch(`/problems/${id}/actions/${actionId}`, { status })).data,
    onSuccess: () => {
      toast.success('Action state updated');
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
    }
  });

  const addWhyStep = () => {
    if (!isSetupComplete) {
      toast.error("Complete Phase 1 prerequisites before starting the causal chain.");
      return;
    }
    if (hasRootCause) {
      toast.error("Root Cause identified. investigation complete.");
      return;
    }

    const lastStep = whys[whys.length - 1];
    const correctAnswer = lastStep?.answers.find(a => a.isCorrect)?.text || '';

    if (whys.length > 0 && !correctAnswer) {
      toast.error("Define the cause (answer) for the current step before extending.");
      return;
    }

    setWhys([...whys, { 
      question: correctAnswer, 
      answers: [{ text: '', isCorrect: true, isRootCause: false }] 
    }]);
  };

  const removeWhyStep = (index: number) => {
    setWhys(whys.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, value: string) => {
    const newWhys = [...whys];
    newWhys[index].question = value;
    setWhys(newWhys);
  };

  const addAnswer = (stepIndex: number) => {
    const newWhys = [...whys];
    newWhys[stepIndex].answers.push({ text: '', isCorrect: false, isRootCause: false });
    setWhys(newWhys);
  };

  const removeAnswer = (stepIndex: number, answerIndex: number) => {
    const newWhys = [...whys];
    newWhys[stepIndex].answers = newWhys[stepIndex].answers.filter((_, i) => i !== answerIndex);
    setWhys(newWhys);
  };

  const updateAnswerText = (stepIndex: number, answerIndex: number, text: string) => {
    const newWhys = [...whys];
    newWhys[stepIndex].answers[answerIndex].text = text;
    
    // Chain Propagation: Update next step's question if this is the correct answer
    if (newWhys[stepIndex].answers[answerIndex].isCorrect && newWhys[stepIndex + 1]) {
      newWhys[stepIndex + 1].question = text;
    }
    
    setWhys(newWhys);
  };

  const setCorrectAnswer = (stepIndex: number, answerIndex: number) => {
    const newWhys = [...whys];
    newWhys[stepIndex].answers.forEach((ans, i) => {
      ans.isCorrect = i === answerIndex;
      if (i !== answerIndex) ans.isRootCause = false;
    });

    // Chain Propagation: Update next step's question
    if (newWhys[stepIndex + 1]) {
      newWhys[stepIndex + 1].question = newWhys[stepIndex].answers[answerIndex].text;
    }

    setWhys(newWhys);
  };

  const setRootCause = (stepIndex: number, answerIndex: number) => {
    const newWhys = [...whys];
    newWhys.forEach(s => s.answers.forEach(a => a.isRootCause = false));
    const ans = newWhys[stepIndex].answers[answerIndex];
    ans.isRootCause = true;
    ans.isCorrect = true; 
    setProblemData(prev => ({ ...prev, root_cause: ans.text }));
    setWhys(newWhys.slice(0, stepIndex + 1));
    toast.success("Root Cause Verified & Chain Locked");
  };

  if (isLoading) return <DashboardLayout>Initialising Forensics Tool...</DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <Link href={`/problems/${id}`} className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Analysis Dashboard
          </Link>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push(`/problems/${id}`)}>Discard</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2 bg-primary hover:bg-primary/90 px-8">
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving...' : 'Commit Analysis'}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-primary/10 pb-6">
          <div className="p-3 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Forensic Analysis Station</h1>
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-black mt-1 italic">Methodical Causal Investigation</p>
          </div>
        </div>

        {/* Phase 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-card/30 border-primary/10 relative overflow-hidden">
            <div className={cn("flex items-center gap-2 mb-6 border-b pb-4", isSetupComplete ? "text-emerald-500 border-emerald-500/10" : "text-amber-500 border-amber-500/10")}>
              {isSetupComplete ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              <h2 className="text-sm font-black uppercase tracking-widest">Phase 1: 5W+1H Situational Analysis</h2>
              {isSetupComplete && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ml-auto">PREREQUISITES MET</Badge>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.keys(fiveWh1H).map((key) => (
                <div key={key} className="space-y-2 group">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", fiveWh1H[key] ? "bg-emerald-500" : "bg-amber-500")} />
                    {key}
                  </Label>
                  <div className="relative">
                    <Input 
                      type={key === 'when' ? 'date' : 'text'}
                      value={fiveWh1H[key]}
                      onChange={(e) => setFiveW1H({...fiveWh1H, [key]: e.target.value})}
                      className={cn(
                        "bg-black/40 border-primary/5 h-10 text-xs focus:border-amber-500/30 transition-all [color-scheme:dark]", 
                        !fiveWh1H[key] && "border-amber-500/20"
                      )}
                    />
                    {!fiveWh1H[key] && key !== 'when' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 pointer-events-none group-focus-within:hidden">
                        {PLACEHOLDERS_5W1H[key]}
                      </span>
                    )}
                    {key === 'when' && !fiveWh1H[key] && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 pointer-events-none flex items-center gap-1">
                        Select Date <CalendarDays className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  {fiveWh1H[key] && (
                    <p className="text-[9px] text-muted-foreground/60 italic px-1">
                      {PLACEHOLDERS_5W1H[key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-sky-500/5 border-sky-500/10 shadow-inner">
            <div className="flex items-center gap-2 text-sky-500 mb-6 border-b border-sky-500/10 pb-4">
              <Target className="w-5 h-5" />
              <h2 className="text-sm font-black uppercase tracking-widest">Failure definition</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-sky-400">Function Failure</Label>
                <Textarea 
                  value={problemData.function_failure}
                  onChange={(e) => setProblemData({...problemData, function_failure: e.target.value})}
                  placeholder="What was the system intended to do that it is not doing? (e.g. 'Database must handle 10k connections')"
                  className={cn("min-h-[80px] bg-black/40 border-primary/5 text-xs leading-relaxed", !problemData.function_failure && "border-sky-500/20")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-sky-400 font-mono italic">Failure Mode (Target)</Label>
                <Textarea 
                  value={problemData.failure_mode}
                  onChange={(e) => setProblemData({...problemData, failure_mode: e.target.value})}
                  placeholder="The specific physical or technical way the function failed. (e.g. 'Connection Pool Exhaustion')"
                  className={cn("min-h-[80px] bg-sky-500/10 border-sky-500/20 text-xs font-bold leading-relaxed", !problemData.failure_mode && "border-sky-500/40")}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Phase 2 */}
        <div className={cn("space-y-6 transition-all duration-500", !isSetupComplete && "opacity-20 pointer-events-none")}>
          <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-primary/10 text-primary"><LayoutList className="w-5 h-5" /></div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">Phase 2: The Causal Chain</h2>
                <p className="text-[10px] text-muted-foreground font-mono">INVESTIGATING Failure Mode: {problemData.failure_mode || '...'}</p>
              </div>
            </div>
            {!hasRootCause && <Button variant="outline" size="sm" onClick={addWhyStep} className="h-8 text-[10px] uppercase font-bold border-primary/20 hover:bg-primary/10 transition-all"><Plus className="w-3 h-3 mr-1" /> Extend Chain</Button>}
          </div>

          {!isSetupComplete && (
            <div className="bg-black/20 p-12 rounded-xl border-2 border-dashed border-amber-500/10 text-center backdrop-blur-sm">
              <Lock className="w-10 h-10 text-amber-500 mx-auto mb-4 opacity-30" />
              <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-500/60 mb-2">Analysis Phase Locked</p>
              <p className="text-[10px] text-muted-foreground max-w-sm mx-auto">Complete the Situational Analysis (Phase 1) and define the Failure Mode to unlock the Causal Chain investigation.</p>
            </div>
          )}

          <div className="flex flex-row items-start gap-8 overflow-x-auto pb-12 min-h-[600px] scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {whys.map((step, stepIdx) => (
              <div key={stepIdx} className="flex flex-row items-center flex-shrink-0">
                <div className="flex flex-col gap-4 w-[350px]">
                  <Card className={cn("p-5 bg-black/60 border-primary/20 shadow-2xl relative transition-all duration-500 backdrop-blur-md", hasRootCause && stepIdx < whys.length - 1 && "opacity-60")}>
                    <div className="flex justify-between items-center mb-4">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px]">LEVEL {stepIdx + 1}</Badge>
                      {step.answers.some(a => a.isRootCause) && <Badge className="bg-emerald-500 text-white text-[8px] animate-pulse">ROOT CAUSE LOCKED</Badge>}
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5 p-3 bg-white/5 rounded-md border border-white/5">
                        <Label className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Why?</Label>
                        <Input value={step.question} onChange={(e) => updateQuestion(stepIdx, e.target.value)} disabled={hasRootCause || stepIdx > 0} className="bg-transparent border-none text-sm font-semibold p-0 h-auto focus-visible:ring-0 disabled:opacity-100 placeholder:italic" placeholder={stepIdx === 0 ? "Why did the failure occur?" : "Derived from previous finding..."} />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-1">
                          <Label className="text-[9px] uppercase font-black text-primary tracking-widest">Hypotheses</Label>
                          {!hasRootCause && <Button variant="ghost" size="icon" className="h-4 w-4 text-primary hover:bg-primary/10" onClick={() => addAnswer(stepIdx)}><Plus className="w-3 h-3" /></Button>}
                        </div>
                        <div className="space-y-3">
                          {step.answers.map((ans, ansIdx) => {
                            const isEndOfPath = stepIdx === whys.length - 1;
                            return (
                              <div key={ansIdx} className={cn(
                                "p-4 rounded-lg border transition-all duration-300 relative group/ans", 
                                ans.isRootCause ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : 
                                ans.isCorrect ? "bg-sky-500/10 border-sky-500/40 border-l-4" : 
                                "bg-destructive/5 border-destructive/10 opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                              )}>
                                <div className="flex items-start gap-3">
                                  <Button variant="ghost" size="icon" className={cn("h-6 w-6 mt-0.5 rounded-full border transition-all", ans.isRootCause ? "bg-emerald-500 text-white border-emerald-400" : ans.isCorrect ? "bg-sky-500/20 text-sky-500 border-sky-500/30" : "text-muted-foreground border-white/10")} onClick={() => setCorrectAnswer(stepIdx, ansIdx)} disabled={hasRootCause}>{ans.isCorrect ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}</Button>
                                  <div className="flex-1 space-y-2">
                                    <Textarea value={ans.text} onChange={(e) => updateAnswerText(stepIdx, ansIdx, e.target.value)} disabled={hasRootCause} className="min-h-[50px] text-xs font-medium bg-transparent border-none p-0 focus-visible:ring-0 resize-none leading-relaxed placeholder:opacity-20" placeholder="Describe hypothesis..." />
                                    <div className="flex items-center gap-2">
                                      {ans.isCorrect && !ans.isRootCause && !hasRootCause && isEndOfPath && <Button variant="ghost" size="sm" className="h-6 px-2 text-[8px] uppercase font-black bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors" onClick={() => setRootCause(stepIdx, ansIdx)}><Flag className="w-2 h-2 mr-1" /> Verified Root Cause</Button>}
                                      {ans.isRootCause && <div className="flex items-center gap-1 text-[8px] uppercase font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded tracking-widest"><Target className="w-2 h-2" /> Forensic Root Cause</div>}
                                      {!ans.isCorrect && <div className="flex items-center gap-1 text-[8px] uppercase font-black text-destructive bg-destructive/10 px-2 py-0.5 rounded tracking-widest"><XCircle className="w-2 h-2" /> False Hypothesis</div>}
                                    </div>
                                  </div>
                                </div>
                                {!hasRootCause && step.answers.length > 1 && (
                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive absolute top-2 right-2 opacity-0 group-hover/ans:opacity-100 transition-all" onClick={() => removeAnswer(stepIdx, ansIdx)}><Trash2 className="w-3 h-3" /></Button>
                                )}
                              </div>
                            )})}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
                {stepIdx < whys.length - 1 && <div className="mx-4 flex flex-col items-center gap-2"><ArrowRight className="w-10 h-10 text-primary/40 animate-pulse" /><span className="text-[7px] font-black uppercase text-primary/40 tracking-[0.3em]">Causal Link</span></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Phase 3 */}
        <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-primary/10 pt-12 transition-all duration-500", !hasRootCause && "opacity-20 pointer-events-none grayscale")}>
          <Card className="lg:col-span-5 p-8 bg-emerald-500/5 border-emerald-500/20 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><ShieldCheck className="w-32 h-32 text-emerald-500" /></div>
            <div className="flex items-center gap-3 text-emerald-500 mb-6 pb-4 border-b border-emerald-500/10">
              <ShieldCheck className="w-6 h-6" />
              <h2 className="text-lg font-black uppercase tracking-tighter italic">Phase 3: Countermeasure</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase text-emerald-400 flex items-center gap-2">Corrective strategy</Label>
                <Textarea value={problemData.countermeasure} onChange={(e) => setProblemData({...problemData, countermeasure: e.target.value})} className="min-h-[150px] bg-black/40 border-emerald-500/20 text-sm font-semibold focus:border-emerald-500/50 leading-relaxed shadow-inner" placeholder="What permanent engineering or process change will be implemented to prevent recurrence?" />
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic border-l-2 border-emerald-500/20 pl-4"> Addressing Verified Root Cause: <span className="text-white font-bold">{problemData.root_cause}</span></p>
            </div>
          </Card>

          <Card className="lg:col-span-7 p-8 bg-black/20 border-primary/10 shadow-xl">
            <div className="flex items-center justify-between mb-8 border-b border-primary/10 pb-4">
              <div className="flex items-center gap-3 text-primary"><LayoutList className="w-6 h-6" /><h2 className="text-lg font-black uppercase tracking-tighter italic">Action Implementation</h2></div>
              <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
                <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90 px-8 font-bold shadow-lg shadow-primary/20">Assign Task</Button></DialogTrigger>
                <DialogContent className="bg-card border-primary/20 sm:max-w-[500px]">
                  <DialogHeader><DialogTitle className="text-xl font-bold uppercase italic tracking-tight">Assign Implementation Task</DialogTitle></DialogHeader>
                  <div className="space-y-6 py-6">
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Description</Label><Textarea placeholder="Define specific work items..." className="bg-black/40 border-primary/10 min-h-[100px] text-sm" value={newAction.description} onChange={(e) => setNewAction({...newAction, description: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Assignee</Label><Select value={newAction.assignee_id} onValueChange={(v) => setNewAction({...newAction, assignee_id: v})}><SelectTrigger className="bg-black/40 border-primary/10 h-10"><SelectValue placeholder="Select Expert" /></SelectTrigger><SelectContent>{users.map((u: any) => (<SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>))}</SelectContent></Select></div>
                      <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Deadline</Label><Input type="date" className="bg-black/40 border-primary/10 h-10 [color-scheme:dark]" value={newAction.due_date} onChange={(e) => setNewAction({...newAction, due_date: e.target.value})} /></div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={() => createActionMutation.mutate(newAction)} disabled={createActionMutation.isPending || !newAction.description || !newAction.assignee_id} className="w-full h-12 font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500">Commit Task to Workflow</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
              {problem?.actions?.map((action: any) => (
                <div key={action.id} className="p-5 rounded-2xl bg-black/40 border border-primary/5 hover:border-primary/20 transition-all group shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant={action.status === 'COMPLETED' ? 'default' : 'outline'} className={cn("text-[9px] uppercase font-black tracking-[0.1em] h-5 px-3", action.status === 'COMPLETED' ? "bg-emerald-500" : "text-primary border-primary/20")}>{action.status}</Badge>
                    {action.status !== 'COMPLETED' && <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10 rounded-full transition-all" onClick={() => updateActionStatusMutation.mutate({ actionId: action.id, status: 'COMPLETED' })}><CheckCircle2 className="w-4 h-4" /></Button>}
                  </div>
                  <p className="text-xs font-bold mb-4 line-clamp-3 leading-relaxed text-foreground/90">{action.description}</p>
                  <div className="flex items-center justify-between border-t border-primary/5 pt-4">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-tighter"><User className="w-3.5 h-3.5 text-primary" />{action.assignee_name}</div>
                    {action.due_date && <div className="text-[10px] text-muted-foreground font-bold flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5 text-primary opacity-70" />{new Date(action.due_date).toLocaleDateString()}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
