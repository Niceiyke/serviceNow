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
import { Plus, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

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
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const response = await api.get('/incidents/');
      return response.data;
    },
  });

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
          <Button asChild>
            <Link href="/incidents/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Incident
            </Link>
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="border border-primary/10 rounded-md overflow-x-auto shadow-sm bg-card">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-primary/10 hover:bg-transparent">
                <TableHead className="text-primary uppercase text-xs font-bold">Incident Key</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Title</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Status</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Priority</TableHead>
                <TableHead className="text-primary uppercase text-xs font-bold">Created At</TableHead>
                <TableHead className="text-right text-primary uppercase text-xs font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="animate-pulse border-primary/5">
                    <TableCell colSpan={6} className="h-12 bg-muted/10" />
                  </TableRow>
                ))
              ) : incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
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
