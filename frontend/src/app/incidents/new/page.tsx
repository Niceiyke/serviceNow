'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Shield, AlertTriangle, FileText, Send } from 'lucide-react';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function NewIncidentPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories/')).data,
  });

  const mutation = useMutation({
    mutationFn: async (newData: any) => (await api.post('/incidents/', newData)).data,
    onSuccess: () => {
      toast.success('Incident has been successfully reported.');
      router.push('/incidents');
    },
    onError: () => {
      toast.error('Failed to report incident. Please check your input.');
    },
  });

  const handleCategoryChange = (val: string) => {
    setSelectedCat(val);
    setSelectedSub('');
  };

  const currentCategory = categories.find((c: any) => c.id === selectedCat);
  const subcategories = currentCategory?.subcategories || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      title,
      description,
      priority,
      category_id: selectedCat,
      subcategory_id: selectedSub || null,
    });
  };

  return (
    <DashboardLayout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="max-w-2xl mx-auto pb-20"
      >
        <div className="flex items-center gap-4 mb-8">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Report New Incident</h1>
        </div>
        
        <Card className="border-primary/20 shadow-xl relative overflow-visible bg-card">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-primary/10 bg-muted/20">
              <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Incident Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Title</label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                  placeholder="Summary of the issue"
                  className="bg-black/20 border-primary/20 focus:border-primary/40"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Description</label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                  rows={6}
                  placeholder="Detailed description of the incident"
                  className="bg-black/20 border-primary/20 focus:border-primary/40"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Category</label>
                  <Select onValueChange={handleCategoryChange} required>
                    <SelectTrigger className="bg-black/20 border-primary/20 text-xs font-bold uppercase">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Subcategory</label>
                  <Select 
                    onValueChange={setSelectedSub} 
                    value={selectedSub}
                    disabled={!selectedCat || subcategories.length === 0}
                  >
                    <SelectTrigger className="bg-black/20 border-primary/20 text-xs font-bold uppercase">
                      <SelectValue placeholder={subcategories.length === 0 ? "N/A" : "Select Subcategory"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((sub: any) => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                  Priority
                </label>
                <Select onValueChange={setPriority} defaultValue="MEDIUM">
                  <SelectTrigger className="bg-black/20 border-primary/20 text-xs font-bold uppercase">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-primary/10 pt-6 bg-muted/10">
              <Button type="button" variant="ghost" onClick={() => router.back()} className="text-muted-foreground uppercase text-[10px] font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Submitting...' : 'Submit Incident'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
