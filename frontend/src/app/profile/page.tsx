'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, Variants } from 'framer-motion';
import { User, Shield, Landmark, Key, Save } from 'lucide-react';

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: '',
    department_id: '',
    password: ''
  });

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      setForm((prev) => ({
        ...prev,
        full_name: res.data.full_name || '',
        department_id: res.data.department_id || '',
      }));
      return res.data;
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments/')).data,
  });

  const mutation = useMutation({
    mutationFn: async (updateData: any) => (await api.patch('/users/me', updateData)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Your legacy has been preserved.');
      setForm((prev) => ({ ...prev, password: '' }));
    },
    onError: () => {
      toast.error('Failed to update profile settings.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updateData: any = {
      full_name: form.full_name,
      department_id: form.department_id || null
    };
    if (form.password) updateData.password = form.password;
    mutation.mutate(updateData);
  };

  if (isUserLoading) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <User className="w-12 h-12 text-primary/30 mb-4" />
        <span className="text-muted-foreground font-medium">Loading profile...</span>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="max-w-xl mx-auto pb-20"
      >
        <div className="flex items-center gap-4 mb-8">
          <User className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">User Profile</h1>
        </div>

        <Card className="border-primary/20 shadow-xl bg-card">
          <CardHeader className="border-b border-primary/10 bg-muted/20">
            <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Email Address</Label>
                <Input value={user?.email} disabled className="bg-black/40 border-primary/10 text-muted-foreground cursor-not-allowed italic" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Full Name</Label>
                <Input 
                  value={form.full_name} 
                  onChange={(e) => setForm({...form, full_name: e.target.value})} 
                  className="bg-black/20 border-primary/20 focus:border-primary/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1 flex items-center gap-2">
                  <Landmark className="w-3 h-3 text-primary" /> Department
                </Label>
                <Select 
                  value={form.department_id || 'unassigned'}
                  onValueChange={(val) => setForm({...form, department_id: val === 'unassigned' ? '' : val})}
                >
                  <SelectTrigger className="bg-black/20 border-primary/20 text-xs font-bold uppercase h-11">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">No Department</SelectItem>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 pt-6 border-t border-primary/10">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1 flex items-center gap-2">
                  <Key className="w-3 h-3 text-primary" /> New Password
                </Label>
                <Input 
                  type="password" 
                  value={form.password} 
                  onChange={(e) => setForm({...form, password: e.target.value})} 
                  placeholder="Leave blank to keep current password"
                  className="bg-black/20 border-primary/20 focus:border-primary/40"
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 pt-6">
              <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={mutation.isPending}>
                <Save className="w-4 h-4" />
                {mutation.isPending ? 'Updating...' : 'Update Profile'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
