'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Search, 
  Box, 
  Zap, 
  Server, 
  Shield, 
  Loader2,
  Tag
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const ICON_OPTIONS = [
  { value: 'box', label: 'Box', icon: Box },
  { value: 'zap', label: 'Lightning', icon: Zap },
  { value: 'server', label: 'Server', icon: Server },
  { value: 'shield', label: 'Shield', icon: Shield },
];

export function CatalogManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'box',
    base_priority: 'MEDIUM',
    category_id: '',
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-catalog-items'],
    queryFn: async () => (await api.get('/catalog/')).data,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories/')).data,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post('/catalog/', data)).data,
    onSuccess: () => {
      toast.success('Service item created');
      setIsCreateOpen(false);
      setFormData({ name: '', description: '', icon: 'box', base_priority: 'MEDIUM', category_id: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-catalog-items'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to create item');
    }
  });

  const filteredItems = items.filter((item: any) => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search catalog items..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-primary/10"
          />
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Service Item</DialogTitle>
              <DialogDescription>Add a new item to the user service catalog.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Item Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea 
                  id="desc" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(v) => setFormData({...formData, category_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Base Priority</Label>
                  <Select 
                    value={formData.base_priority} 
                    onValueChange={(v) => setFormData({...formData, base_priority: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Icon</Label>
                <div className="flex gap-4">
                  {ICON_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={formData.icon === opt.value ? 'default' : 'outline'}
                      className="flex-1 gap-2"
                      onClick={() => setFormData({...formData, icon: opt.value})}
                    >
                      <opt.icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.map((item: any) => (
          <Card key={item.id} className="p-4 bg-black/20 border-primary/10">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="p-2 rounded bg-primary/10 text-primary">
                  {item.icon === 'box' && <Box className="w-5 h-5" />}
                  {item.icon === 'zap' && <Zap className="w-5 h-5" />}
                  {item.icon === 'server' && <Server className="w-5 h-5" />}
                  {item.icon === 'shield' && <Shield className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold">{item.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] h-4 uppercase">{item.base_priority}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {categories.find((c: any) => c.id === item.category_id)?.name || 'Generic'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
