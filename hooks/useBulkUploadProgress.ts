'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ProgressEvent {
  jobId: string;
  current: number;
  total: number;
  fileName: string;
  status: 'processing' | 'done' | 'error';
  paperTitle?: string;
  error?: string;
}

interface CompleteEvent {
  jobId: string;
  created: number;
  skipped: number;
  errors: { file: string; reason: string }[];
  papers: { _id: string; title: string }[];
  orgName: string;
  organizationId: string;
}

/**
 * Global hook that listens for bulk-upload socket events and shows
 * sonner toasts with live progress. Mount once in a layout component.
 */
export function useBulkUploadProgress() {
  const { socket } = useSocket();
  const qc = useQueryClient();
  const activeJobs = useRef<Set<string>>(new Set());

  const handleProgress = useCallback((data: ProgressEvent) => {
    activeJobs.current.add(data.jobId);

    const pct = Math.round((data.current / data.total) * 100);
    const message =
      data.status === 'processing'
        ? `Analyzing "${data.fileName}"...`
        : data.status === 'done'
          ? `Processed "${data.paperTitle || data.fileName}"`
          : `Failed: ${data.fileName}`;

    // Use a persistent toast per job that updates in place
    toast.loading(
      `Bulk Upload: ${data.current}/${data.total} (${pct}%) — ${message}`,
      {
        id: `bulk-upload-${data.jobId}`,
        description: data.status === 'error' ? data.error : undefined,
        duration: Infinity,
      },
    );
  }, []);

  const handleComplete = useCallback(
    (data: CompleteEvent) => {
      activeJobs.current.delete(data.jobId);
      const toastId = `bulk-upload-${data.jobId}`;

      if (data.created > 0 && data.skipped === 0) {
        toast.success(
          `Bulk upload complete!`,
          {
            id: toastId,
            description: `${data.created} paper${data.created !== 1 ? 's' : ''} added to ${data.orgName}. An announcement post has been created.`,
            duration: 8000,
          },
        );
      } else if (data.created > 0 && data.skipped > 0) {
        toast.warning(
          `Bulk upload finished with issues`,
          {
            id: toastId,
            description: `${data.created} paper${data.created !== 1 ? 's' : ''} added, ${data.skipped} failed in ${data.orgName}.`,
            duration: 10000,
          },
        );
      } else {
        toast.error(
          `Bulk upload failed`,
          {
            id: toastId,
            description: `All ${data.skipped} file${data.skipped !== 1 ? 's' : ''} failed to process.`,
            duration: 10000,
          },
        );
      }

      // Refresh relevant data
      qc.invalidateQueries({ queryKey: ['papers'] });
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    [qc],
  );

  useEffect(() => {
    if (!socket) return;

    socket.on('bulk-upload:progress', handleProgress);
    socket.on('bulk-upload:complete', handleComplete);

    return () => {
      socket.off('bulk-upload:progress', handleProgress);
      socket.off('bulk-upload:complete', handleComplete);
    };
  }, [socket, handleProgress, handleComplete]);
}
