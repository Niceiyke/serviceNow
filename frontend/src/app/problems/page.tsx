'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  XCircle,
  GitBranch,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ProblemManagementPage() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isChangeOpen, setIsChangeOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [newProblem, setNewProblem] = useState({ title: '', description: '', root_cause: '' });
  const [newChange, setNewChange] = useState({ title: '', description: '', risk_level: 'LOW' });

  const { data: problems = [], isLoading, refetch } = useQuery({
    queryKey: ['problems'],
    queryFn: async () => (await api.get('/problems/')).data,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post('/problems/', data)).data,
    onSuccess: () => {
      toast.success('Problem created successfully');
      setIsCreateOpen(false);
      setNewProblem({ title: '', description: '', root_cause: '' });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to create problem");
    }
  });

  const changeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => (await api.post(`/problems/${id}/changes`, data)).data,
    onSuccess: () => {
      toast.success('Change Request submitted');
      setIsChangeOpen(false);
      setNewChange({ title: '', description: '', risk_level: 'LOW' });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to submit change");
    }
  });

  const handleCreateChange = () => {
    if (selectedProblemId) {
      changeMutation.mutate({ id: selectedProblemId, data: newChange });
    }
  };

  const filteredProblems = problems.filter((p: any) => 
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newProblem.title) {
      toast.error("Title is required");
      return;
    }
    createMutation.mutate(newProblem);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'OPEN': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'RCA_IN_PROGRESS': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'RESOLVED': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-primary/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analysis Management</h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium mt-1">Forensic Analysis & Root Cause</p>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search analysis..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-black/20 border-primary/20"
              />
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground">
                  <Plus className="w-4 h-4" />
                  New Analysis
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Analysis Record</DialogTitle>
                  <DialogDescription>
                    Initiate a systematic investigation into a recurring issue.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      placeholder="e.g. Database Connectivity Flapping" 
                      value={newProblem.title}
                      onChange={(e) => setNewProblem({...newProblem, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea 
                      id="desc" 
                      placeholder="Detailed description of the problem..." 
                      className="min-h-[100px]"
                      value={newProblem.description}
                      onChange={(e) => setNewProblem({...newProblem, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rca">Root Cause (Initial Hypothesis)</Label>
                    <Textarea 
                      id="rca" 
                      placeholder="What is suspected to be the cause?" 
                      value={newProblem.root_cause}
                      onChange={(e) => setNewProblem({...newProblem, root_cause: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Analysis'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProblems.map((problem: any) => (
              <Card key={problem.id} className="p-6 hover:border-primary/50 transition-all border-primary/10">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`font-mono ${getStatusColor(problem.status)}`}>
                        {problem.status}
                      </Badge>
                      <Link href={`/problems/${problem.id}`}>
                        <h3 className="text-lg font-semibold hover:text-primary transition-colors cursor-pointer">{problem.title}</h3>
                      </Link>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {problem.description}
                    </p>
                    {problem.root_cause && (
                      <div className="mt-4 p-3 bg-muted/20 rounded-md border border-muted/30">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Root Cause</span>
                        <p className="text-sm font-mono">{problem.root_cause}</p>
                      </div>
                    )}

                    {problem.change_requests && problem.change_requests.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary block">Linked Changes</span>
                        {problem.change_requests.map((change: any) => (
                          <div key={change.id} className="flex items-center gap-2 p-2 rounded bg-primary/5 border border-primary/10 text-xs">
                            <GitBranch className="w-3 h-3 text-primary" />
                            <span className="font-semibold">{change.title}</span>
                            <Badge variant="outline" className="ml-auto text-[9px] h-4">{change.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-between border-primary/20 hover:bg-primary/5"
                      onClick={() => {
                        setSelectedProblemId(problem.id);
                        setIsChangeOpen(true);
                      }}
                    >
                      Raise Change
                      <GitBranch className="w-4 h-4 ml-2" />
                    </Button>
                    <Link href={`/problems/${problem.id}`} className="w-full">
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        View Details
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}

            {filteredProblems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50 border border-dashed border-primary/20 rounded-lg">
                <ShieldAlert className="w-12 h-12 mb-4" />
                <p>No analysis records found.</p>
              </div>
            )}
          </div>
        )}

        <Dialog open={isChangeOpen} onOpenChange={setIsChangeOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Raise Change Request</DialogTitle>
              <DialogDescription>
                Submit a formal request to implement a fix for this analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="change-title">Change Title</Label>
                <Input 
                  id="change-title" 
                  placeholder="e.g. Upgrade DB Drivers to v2.4" 
                  value={newChange.title}
                  onChange={(e) => setNewChange({...newChange, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="change-desc">Implementation Plan</Label>
                <Textarea 
                  id="change-desc" 
                  placeholder="Steps to implement the change..." 
                  className="min-h-[100px]"
                  value={newChange.description}
                  onChange={(e) => setNewChange({...newChange, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <div className="flex gap-2">
                  {['LOW', 'MEDIUM', 'HIGH'].map((level) => (
                    <Button 
                      key={level}
                      variant={newChange.risk_level === level ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-[10px]"
                      onClick={() => setNewChange({...newChange, risk_level: level})}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChangeOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateChange} disabled={changeMutation.isPending}>
                {changeMutation.isPending ? 'Submitting...' : 'Submit Change'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
