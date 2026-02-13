'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Landmark, Plus, BookOpen } from 'lucide-react';

export function DepartmentManagement() {
  const queryClient = useQueryClient();
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments/')).data,
  });

  const mutation = useMutation({
    mutationFn: async (deptData: { name: string; description: string }) => (await api.post('/departments/', deptData)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setNewDeptName('');
      setNewDeptDesc('');
      toast.success('New department has been created.');
    },
    onError: () => toast.error('Failed to create department. Admin privileges required.'),
  });

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name: newDeptName, description: newDeptDesc });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Landmark className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Departments</h2>
      </div>

      <Card className="border-primary/20 bg-muted/5">
        <CardHeader className="border-b border-primary/10">
          <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Create New Department
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCreateDept} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Department Name</label>
                <Input 
                  placeholder="e.g. IT Operations" 
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  required
                  className="bg-black/20 border-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Description</label>
                <Input 
                  placeholder="Department responsibilities..." 
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  className="bg-black/20 border-primary/20"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating...' : 'Create Department'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="border border-primary/10 rounded-md overflow-x-auto shadow-sm bg-card">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-primary/10 hover:bg-transparent">
              <TableHead className="text-primary uppercase text-xs font-bold w-1/3">Name</TableHead>
              <TableHead className="text-primary uppercase text-xs font-bold">Description</TableHead>
              <TableHead className="text-right text-primary uppercase text-xs font-bold w-24">Users</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i} className="animate-pulse border-primary/5">
                  <TableCell colSpan={3} className="h-16 bg-muted/10" />
                </TableRow>
              ))
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12 italic">
                  No departments found.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept: any) => (
                <TableRow key={dept.id} className="border-primary/10 hover:bg-primary/5 transition-colors h-16">
                  <TableCell className="font-bold text-foreground flex items-center gap-3 h-full">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary/60" />
                    </div>
                    {dept.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground leading-relaxed">
                    {dept.description || 'No description provided.'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="border-primary/20 text-primary font-mono text-[10px]">
                      {dept.user_count || 0}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
