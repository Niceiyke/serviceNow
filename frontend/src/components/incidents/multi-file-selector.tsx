'use client';

import { useState } from 'react';
import { X, Paperclip, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MultiFileSelectorProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxSizeMB?: number;
}

export function MultiFileSelector({ files, onFilesChange, maxSizeMB = 10 }: MultiFileSelectorProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => {
        if (file.size > maxSizeMB * 1024 * 1024) {
          alert(`File ${file.name} exceeds ${maxSizeMB}MB limit.`);
          return false;
        }
        return true;
      });
      onFilesChange([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1 flex items-center gap-2">
          <Paperclip className="w-3 h-3" />
          Attachments (Optional)
        </label>
        <p className="text-[9px] text-muted-foreground uppercase font-mono">Max {maxSizeMB}MB per file</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-md px-3 py-1.5 pr-1 transition-all group hover:border-primary/40">
              <FileIcon className="w-3 h-3 text-primary/60" />
              <span className="text-[10px] font-medium truncate max-w-[120px]">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive text-muted-foreground"
                onClick={() => removeFile(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-dashed border-primary/30 hover:border-primary/60 bg-black/10 text-[10px] uppercase font-bold"
            onClick={() => document.getElementById('file-selector')?.click()}
          >
            <Paperclip className="w-3 h-3 mr-2" />
            Add File
          </Button>
        </div>
        
        <input
          id="file-selector"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
