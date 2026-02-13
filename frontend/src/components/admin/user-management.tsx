'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, UserPlus } from 'lucide-react';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export function UserManagement() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    password: 'password123',
    role: 'REPORTER',
    department_id: null as string | null
  });

  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users/')).data,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments/')).data,
  });

  const createMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => (await api.post('/users/', userData)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('New user account has been created.');
      setIsCreateOpen(false);
      setNewUser({
        email: '',
        full_name: '',
        password: 'password123',
        role: 'REPORTER',
        department_id: null
      });
    },
    onError: () => toast.error('Failed to create user account.'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string, data: any }) => (await api.patch(`/users/${userId}`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User records have been updated.');
    },
    onError: () => toast.error('Failed to update user records.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          User Management
        </h2>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-popover max-w-md border-primary/20">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-widest text-primary text-xl border-b border-primary/10 pb-4">
                Create User
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newUser); }} className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Full Name</Label>
                <Input 
                  placeholder="e.g. John Doe" 
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  required
                  className="bg-black/20 border-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Email Address</Label>
                <Input 
                  type="email" 
                  placeholder="user@company.com" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                  className="bg-black/20 border-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Temporary Password</Label>
                <Input 
                  type="text" 
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                  className="bg-black/20 border-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Role</Label>
                  <Select 
                    value={newUser.role}
                    onValueChange={(val) => setNewUser({...newUser, role: val})}
                  >
                    <SelectTrigger className="bg-black/20 border-primary/20 text-[10px] font-bold uppercase h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPORTER">Reporter</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Department</Label>
                  <Select 
                    value={newUser.department_id || 'unassigned'}
                    onValueChange={(val) => setNewUser({...newUser, department_id: val === 'unassigned' ? null : val})}
                  >
                    <SelectTrigger className="bg-black/20 border-primary/20 text-[10px] font-bold uppercase h-10">
                      <SelectValue placeholder="Select Dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">None</SelectItem>
                      {departments.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-primary/10 rounded-md overflow-x-auto shadow-sm bg-card">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-primary/10 hover:bg-transparent">
              <TableHead className="text-primary uppercase text-xs font-bold">Full Name</TableHead>
              <TableHead className="text-primary uppercase text-xs font-bold">Email</TableHead>
              <TableHead className="text-primary uppercase text-xs font-bold">Role</TableHead>
              <TableHead className="text-primary uppercase text-xs font-bold">Department</TableHead>
              <TableHead className="text-primary uppercase text-xs font-bold">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isUsersLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="animate-pulse border-primary/5">
                  <TableCell colSpan={5} className="h-12 bg-muted/10" />
                </TableRow>
              ))
            ) : users.map((u: any) => (
              <TableRow key={u.id} className="border-primary/10 hover:bg-primary/5 transition-colors group h-12">
                <TableCell className="font-bold text-foreground">{u.full_name || 'N/A'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Select 
                    defaultValue={u.role} 
                    onValueChange={(val) => updateMutation.mutate({ userId: u.id, data: { role: val } })}
                  >
                    <SelectTrigger className="w-[130px] bg-transparent border-primary/10 h-8 text-[10px] font-bold uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPORTER">Reporter</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select 
                    defaultValue={u.department_id || "unassigned"} 
                    onValueChange={(val) => updateMutation.mutate({ userId: u.id, data: { department_id: val === "unassigned" ? null : val } })}
                  >
                    <SelectTrigger className="w-[180px] bg-transparent border-primary/10 h-8 text-[10px] font-bold uppercase">
                      <SelectValue placeholder="No Dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">No Dept</SelectItem>
                      {departments.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-[10px] uppercase font-bold text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
