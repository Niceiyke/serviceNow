'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tag, Plus, Trash2, Layers } from 'lucide-react';

export function CategoryManagement() {
  const queryClient = useQueryClient();
  const [newCatName, setNewCatName] = useState('');
  const [newCatDept, setNewCatDept] = useState('');
  
  const [newSubName, setNewSubName] = useState('');
  const [targetCatId, setTargetCatId] = useState('');

  const { data: categories = [], isLoading: isCatsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories/')).data,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments/')).data,
  });

  const createCatMutation = useMutation({
    mutationFn: async (data: { name: string; department_id: string }) => (await api.post('/categories/', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewCatName('');
      setNewCatDept('');
      toast.success('Category created successfully.');
    },
  });

  const createSubMutation = useMutation({
    mutationFn: async (data: { name: string; category_id: string }) => (await api.post('/categories/subcategories', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewSubName('');
      setTargetCatId('');
      toast.success('Subcategory added successfully.');
    },
  });

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Creation */}
        <Card className="border-primary/20 bg-muted/5">
          <CardHeader className="border-b border-primary/10">
            <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              New Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={(e) => { e.preventDefault(); createCatMutation.mutate({ name: newCatName, department_id: newCatDept }); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-primary/80">Category Name</label>
                <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required placeholder="e.g. Hardware" className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-primary/80">Owner Department</label>
                <Select value={newCatDept} onValueChange={setNewCatDept} required>
                  <SelectTrigger className="bg-black/20">
                    <SelectValue placeholder="Select Dept" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createCatMutation.isPending}>Create Category</Button>
            </form>
          </CardContent>
        </Card>

        {/* Subcategory Creation */}
        <Card className="border-primary/20 bg-muted/5">
          <CardHeader className="border-b border-primary/10">
            <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              New Subcategory
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={(e) => { e.preventDefault(); createSubMutation.mutate({ name: newSubName, category_id: targetCatId }); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-primary/80">Subcategory Name</label>
                <Input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} required placeholder="e.g. Laptop" className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-primary/80">Parent Category</label>
                <Select value={targetCatId} onValueChange={setTargetCatId} required>
                  <SelectTrigger className="bg-black/20">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createSubMutation.isPending}>Add Subcategory</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="border border-primary/10 rounded-md overflow-x-auto shadow-sm bg-card">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-primary uppercase text-xs font-bold w-1/3">Category</TableHead>
              <TableHead className="text-primary uppercase text-xs font-bold">Subcategories</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCatsLoading ? (
              [...Array(3)].map((_, i) => <TableRow key={i} className="animate-pulse"><TableCell colSpan={2} className="h-12 bg-muted/10" /></TableRow>)
            ) : categories.map((cat: any) => (
              <TableRow key={cat.id} className="border-primary/10">
                <TableCell className="font-bold text-foreground">{cat.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {cat.subcategories?.map((sub: any) => (
                      <span key={sub.id} className="px-2 py-1 bg-muted/30 border border-primary/10 rounded-sm text-[10px] font-medium text-muted-foreground uppercase">
                        {sub.name}
                      </span>
                    )) || <span className="text-xs italic text-muted-foreground opacity-50">None</span>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
