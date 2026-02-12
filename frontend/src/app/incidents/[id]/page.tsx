'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [incident, setIncident] = useState<any>(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incRes, commRes] = await Promise.all([
          api.get(`/incidents/${resolvedParams.id}`),
          api.get(`/incidents/${resolvedParams.id}/comments`)
        ]);
        setIncident(incRes.data);
        setComments(commRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [resolvedParams.id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await api.patch(`/incidents/${resolvedParams.id}`, { status: newStatus });
      setIncident(response.data);
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const response = await api.post(`/incidents/${resolvedParams.id}/comments`, {
        content: newComment,
        is_internal: false
      });
      setComments([...comments, response.data as never]);
      setNewComment('');
    } catch (err) {
      alert('Failed to post comment');
    }
  };

  if (loading) return <DashboardLayout>Loading...</DashboardLayout>;
  if (!incident) return <DashboardLayout>Incident not found</DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{incident.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge>{incident.incident_key}</Badge>
            <Badge variant="outline">{incident.status}</Badge>
            <Badge variant="outline">{incident.priority}</Badge>
          </div>
        </div>
        
        <div className="w-full md:w-auto">
          <Select onValueChange={handleStatusChange} defaultValue={incident.status}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Update Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{incident.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No comments yet.</p>
                ) : (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-800">{comment.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              
              <form onSubmit={handlePostComment} className="space-y-2 pt-4 border-t">
                <Textarea 
                  placeholder="Add a comment..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button type="submit" className="w-full md:w-auto">Post Comment</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Reporter ID</label>
                <p className="text-sm font-mono break-all">{incident.reporter_id}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Department ID</label>
                <p className="text-sm font-mono break-all">{incident.department_id}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Category ID</label>
                <p className="text-sm font-mono break-all">{incident.category_id}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Assignee ID</label>
                <p className="text-sm font-mono break-all">{incident.assignee_id || 'Unassigned'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Created At</label>
                <p className="text-sm">{new Date(incident.created_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
