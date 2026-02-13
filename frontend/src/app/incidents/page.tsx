'use client';

import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Ticket, Search, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
};

export default function IncidentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [assigneeId, setAssigneeId] = useState('all');
  const [reporterId, setReporterId] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ['assignees'],
    queryFn: async () => (await api.get('/users/assignees')).data,
    enabled: !!user && ['ADMIN', 'MANAGER', 'STAFF'].includes(user.role),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users/')).data,
    enabled: !!user && user.role === 'ADMIN',
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', { search, status, priority, assigneeId, reporterId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);
      if (priority !== 'all') params.append('priority', priority);
      if (assigneeId !== 'all') params.append('assignee_id', assigneeId);
      if (reporterId !== 'all') params.append('reporter_id', reporterId);
      
      const response = await api.get(`/incidents/?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setPriority('all');
    setAssigneeId('all');
    setReporterId('all');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-sky-900 text-sky-100 border-sky-500/50';
      case 'IN_PROGRESS': return 'bg-amber-900 text-amber-100 border-amber-500/50';
      case 'RESOLVED': return 'bg-emerald-900 text-emerald-100 border-emerald-500/50';
      case 'CLOSED': return 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
      case 'CANCELLED': return 'bg-rose-900 text-rose-100 border-rose-500/50';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-rose-500 font-bold';
      case 'HIGH': return 'text-amber-500';
      case 'MEDIUM': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Ticket className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Incidents</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={showFilters ? 'bg-primary/10 border-primary' : ''}>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button asChild>
              <Link href="/incidents/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Incident
              </Link>
            </Button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
            <div className="p-6 bg-card border border-primary/10 rounded-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-primary">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Title, Key, Desc..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 text-xs bg-black/20 border-primary/20"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-primary">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 text-xs bg-black/20 border-primary/20">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-primary">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-9 text-xs bg-black/20 border-primary/20">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-primary">Assigned To</label>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger className="h-9 text-xs bg-black/20 border-primary/20">
                      <SelectValue placeholder="All Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {assignees.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-primary">Reporter</label>
                  <Select value={reporterId} onValueChange={setReporterId}>
                    <SelectTrigger className="h-9 text-xs bg-black/20 border-primary/20">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {allUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground text-[10px] uppercase font-bold">
                    <X className="w-3 h-3 mr-1" /> Clear All
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants} className="border border-primary/10 rounded-md overflow-x-auto shadow-sm bg-card">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-primary/10 hover:bg-transparent">
                <TableHead className="text-primary uppercase text-xs font-bold">Incident Key</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Title</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Status</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Priority</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Created By</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Assigned To</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Created At</TableHead>
                <TableHead className="text-right text-primary uppercase text-xs font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="animate-pulse border-primary/5">
                    <TableCell colSpan={8} className="h-12 bg-muted/10" />
                  </TableRow>
                ))
              ) : incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic">
                    No incidents found.
                  </TableCell>
                </TableRow>
              ) : (
                incidents.map((incident: any) => (
                  <TableRow key={incident.id} className="border-primary/10 hover:bg-primary/5 transition-colors group">
                    <TableCell className="font-mono text-xs text-primary/80">{incident.incident_key}</TableCell>
                    <TableCell className="font-semibold">{incident.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${getStatusColor(incident.status)} border-px px-2 py-0 text-[10px] uppercase font-bold`}>
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold ${getPriorityColor(incident.priority)}`}>
                        {incident.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{incident.reporter_name}</TableCell>
                    <TableCell className="text-xs italic text-muted-foreground">{incident.assignee_name || 'Unassigned'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(incident.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" className="text-primary hover:text-foreground text-xs uppercase font-bold" asChild>
                        <Link href={`/incidents/${incident.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
