'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, File as FileIcon, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  incidentId: string;
  onUploadSuccess?: (attachment: any) => void;
  className?: string;
}

export function FileUploader({ incidentId, onUploadSuccess, className }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/incidents/${incidentId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('File uploaded successfully.');
      if (onUploadSuccess) onUploadSuccess(response.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-all flex flex-col items-center justify-center gap-3",
          dragActive ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/40 bg-black/10",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
        />
        
        {isUploading ? (
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        ) : (
          <Upload className="w-10 h-10 text-primary/40" />
        )}
        
        <div className="text-center">
          <p className="text-sm font-medium">
            {isUploading ? "Uploading file..." : "Drag & drop file here or click to browse"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            Maximum size: 10MB
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-8 text-[10px] uppercase font-bold"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          Select File
        </Button>
      </div>
    </div>
  );
}
