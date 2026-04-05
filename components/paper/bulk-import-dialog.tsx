'use client';

import { useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, AlertCircle, FileText, X, Sparkles } from 'lucide-react';
import { useBulkImportPdfs } from '@/lib/api/papers';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  orgName?: string;
}

export function BulkImportDialog({ open, onClose, orgId, orgName }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const importMutation = useBulkImportPdfs();

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const pdfFiles = Array.from(newFiles).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const unique = pdfFiles.filter((f) => !existing.has(`${f.name}-${f.size}`));
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    const count = files.length;
    try {
      const data = await importMutation.mutateAsync({ files, organizationId: orgId });

      // Close dialog immediately — progress is tracked via socket toasts
      handleClose();

      // Show initial toast that will be updated by socket events
      toast.loading(
        `Uploading ${count} paper${count !== 1 ? 's' : ''} to ${orgName || 'organization'}...`,
        {
          id: `bulk-upload-${data.jobId}`,
          description: 'AI is analyzing your papers. You can continue using the app.',
          duration: Infinity,
        },
      );
    } catch {
      toast.error('Failed to start bulk upload. Please try again.');
    }
  };

  const handleClose = () => {
    setFiles([]);
    importMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[20px]">
            <Sparkles className="h-5 w-5 text-primary" />
            Bulk Upload Papers
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
            <svg className="h-9 w-9 shrink-0 text-primary/70 mt-0.5" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="2" width="24" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
              <path d="M12 10h12M12 14h12M12 18h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
              <circle cx="27" cy="27" r="7" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
              <path d="M25 27h4M27 25v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="text-[14px] text-muted-foreground">
              <p className="font-medium text-foreground">AI-Powered PDF Import</p>
              <p className="mt-1 text-[13px]">
                Upload multiple PDF research papers at once. Our AI will automatically extract
                titles, authors, abstracts, keywords, and more from each file. You can continue
                using the app while papers are being processed — you&apos;ll be notified when it&apos;s done.
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-all ${
              dragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border/60 hover:border-primary/50 hover:bg-muted/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="text-[14px] font-medium text-foreground">
              {files.length > 0 ? 'Add more files' : 'Drop PDF files here or click to browse'}
            </p>
            <p className="text-[12px] text-muted-foreground">
              Accepts .pdf files up to 20MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Selected files list */}
          {files.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-foreground">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={() => setFiles([])}
                  className="text-[12px] font-medium text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-white divide-y divide-border/40">
                {files.map((file, i) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-3 py-2.5 group">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploading indicator (only during the initial HTTP request, before dialog closes) */}
          {importMutation.isPending && (
            <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/15 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-[13px] font-semibold text-primary">Uploading files...</p>
                <p className="text-[12px] text-muted-foreground">
                  Sending {files.length} file{files.length !== 1 ? 's' : ''} to the server. Please wait.
                </p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {importMutation.isError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[14px] text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Upload failed. Please check your files and try again.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={importMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={files.length === 0 || importMutation.isPending}
              className="gap-2"
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {importMutation.isPending
                ? 'Uploading...'
                : `Upload ${files.length || ''} Paper${files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
