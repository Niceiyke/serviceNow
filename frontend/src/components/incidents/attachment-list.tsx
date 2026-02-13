'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Download, File as FileIcon, Trash2, Loader2, Paperclip, Eye, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AttachmentListProps {
  incidentId: string;
  canDelete?: boolean;
}

export function AttachmentList({ incidentId, canDelete = false }: AttachmentListProps) {
  const queryClient = useQueryClient();
  const [previewFile, setPreviewFile] = useState<any>(null);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', incidentId],
    queryFn: async () => (await api.get(`/incidents/${incidentId}/attachments`)).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => await api.delete(`/incidents/${attachmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', incidentId] });
      toast.success('Attachment deleted.');
    },
    onError: () => toast.error('Failed to delete attachment.'),
  });

  const handleDownload = async (attachment: any) => {
    try {
      const response = await api.get(`/incidents/download/${attachment.id}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download file.');
    }
  };

  const isImage = (contentType: string) => contentType.startsWith('image/');

  const handlePreview = async (attachment: any) => {
    if (isImage(attachment.content_type)) {
      try {
        const response = await api.get(`/incidents/download/${attachment.id}`, {
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: attachment.content_type }));
        setPreviewFile({ ...attachment, url });
      } catch (err) {
        toast.error('Failed to load preview.');
      }
    } else {
      // For non-images (PDFs, etc), open in new tab
      try {
        const response = await api.get(`/incidents/download/${attachment.id}`, {
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: attachment.content_type }));
        window.open(url, '_blank');
      } catch (err) {
        toast.error('Failed to open file.');
      }
    }
  };

  const closePreview = () => {
    if (previewFile?.url) {
      window.URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
  };

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground animate-pulse"><Loader2 className="w-4 h-4 animate-spin" /> Loading attachments...</div>;

  if (attachments.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] uppercase font-black tracking-widest text-primary/60 flex items-center gap-2">
        <Paperclip className="w-3 h-3" />
        Attachments ({attachments.length})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map((file: any) => (
          <Card key={file.id} className="bg-black/20 border-primary/10 p-3 flex items-center justify-between group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                {isImage(file.content_type) ? (
                   <div className="w-full h-full rounded overflow-hidden flex items-center justify-center">
                      <FileIcon className="w-5 h-5 text-primary/60" />
                   </div>
                ) : (
                  <FileIcon className="w-5 h-5 text-primary/60" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate pr-2" title={file.file_name}>
                  {file.file_name}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-mono">
                  {file.file_size} • {file.uploader_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => handlePreview(file)}
                title={isImage(file.content_type) ? "Preview" : "Open in new tab"}
              >
                {isImage(file.content_type) ? <Eye className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => handleDownload(file)}
                title="Download"
              >
                <Download className="w-4 h-4" />
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(file.id)}
                  disabled={deleteMutation.isPending}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl bg-card border-primary/20 p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-primary/10">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <FileIcon className="w-4 h-4 text-primary" />
              {previewFile?.file_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-black/40 min-h-[300px] max-h-[80vh] overflow-auto p-4">
            {previewFile && isImage(previewFile.content_type) ? (
              <img 
                src={previewFile.url} 
                alt={previewFile.file_name} 
                className="max-w-full h-auto rounded-sm shadow-2xl"
              />
            ) : (
              <div className="text-center space-y-4">
                <FileIcon className="w-16 h-16 text-primary/20 mx-auto" />
                <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
                <Button onClick={() => window.open(previewFile?.url, '_blank')}>Open in New Tab</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
