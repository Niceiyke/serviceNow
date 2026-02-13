'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Box, Zap, Server, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea';

const ICON_MAP: Record<string, any> = {
  'box': Box,
  'zap': Zap,
  'server': Server,
  'shield': Shield,
};

export default function ServiceCatalogPage() {
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [requestDescription, setRequestDescription] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalog-items'],
    queryFn: async () => (await api.get('/catalog/')).data,
  });

  const requestMutation = useMutation({
    mutationFn: async ({ id, description }: { id: string, description: string }) => {
      return (await api.post(`/catalog/${id}/request`, { description })).data;
    },
    onSuccess: (data) => {
      toast.success(`Request submitted: ${data.key}`);
      setSelectedItem(null);
      setRequestDescription('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to submit request");
    }
  });

  const filteredItems = items.filter((item: any) => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRequest = () => {
    if (selectedItem) {
      requestMutation.mutate({ 
        id: selectedItem.id, 
        description: requestDescription 
      });
    }
  };

  const IconComponent = (name: string) => {
    const Icon = ICON_MAP[name] || Box;
    return <Icon className="w-6 h-6" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-primary/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <ShoppingCart className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Service Catalog</h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium mt-1">Browse and Request Services</p>
            </div>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search catalog..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-black/20 border-primary/20"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item: any) => (
              <Card key={item.id} className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-card/50 backdrop-blur-sm border-primary/10">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {IconComponent(item.icon)}
                    </div>
                    <Badge variant="outline" className="border-primary/20 text-xs font-mono">
                      {item.base_priority}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{item.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px]">
                      {item.description}
                    </p>
                  </div>

                  <Button 
                    className="w-full mt-4 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20"
                    onClick={() => setSelectedItem(item)}
                  >
                    Request Service
                  </Button>
                </div>
              </Card>
            ))}
            
            {filteredItems.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                <Box className="w-12 h-12 mb-4" />
                <p>No service items found matching your search.</p>
              </div>
            )}
          </div>
        )}

        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Service: {selectedItem?.name}</DialogTitle>
              <DialogDescription>
                Please provide additional details for your request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Description / Details</label>
                <Textarea 
                  placeholder="Enter specific requirements..." 
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>Cancel</Button>
              <Button onClick={handleRequest} disabled={requestMutation.isPending}>
                {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
