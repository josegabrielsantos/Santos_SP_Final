'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DuplicateEntry } from '@/components/paper/duplicate-paper-dialog';

interface ProgressEvent {
  jobId: string;
  current: number;
  total: number;
  fileName: string;
  status: 'processing' | 'done' | 'error' | 'duplicate';
  paperTitle?: string;
  error?: string;
}

interface DuplicateData {
  fileName: string;
  paper: {
    title: string;
    authors: string[];
    abstract: string | null;
    keywords: string[];
    topics: string[];
    doi: string | null;
    year: number | null;
    journal: string | null;
    fileUrl: string | null;
    fileSize: number | null;
  };
  existingMatches: {
    _id: string;
    title: string;
    authors: string[];
    year: number | null;
    doi: string | null;
    journal: string | null;
  }[];
}

interface CompleteEvent {
  jobId: string;
  created: number;
  skipped: number;
  errors: { file: string; reason: string }[];
  duplicates?: DuplicateData[];
  papers: { _id: string; title: string }[];
  orgName: string;
  organizationId: string;
}

export interface PendingDuplicates {
  duplicates: DuplicateEntry[];
  organizationId: string;
  orgName: string;
}

/**
 * Global hook that listens for bulk-upload socket events and shows
 * sonner toasts with live progress. Mount once in a layout component.
 * Returns pending duplicates state for rendering a confirmation dialog.
 */
export function useBulkUploadProgress() {
  const { socket } = useSocket();
  const qc = useQueryClient();
  const activeJobs = useRef<Set<string>>(new Set());
  const [pendingDuplicates, setPendingDuplicates] = useState<PendingDuplicates | null>(null);

  const clearDuplicates = useCallback(() => setPendingDuplicates(null), []);

  const handleProgress = useCallback((data: ProgressEvent) => {
    activeJobs.current.add(data.jobId);

    const pct = Math.round((data.current / data.total) * 100);
    const message =
      data.status === 'processing'
        ? `Analyzing "${data.fileName}"...`
        : data.status === 'done'
          ? `Processed "${data.paperTitle || data.fileName}"`
          : data.status === 'duplicate'
            ? `Duplicate skipped: "${data.paperTitle || data.fileName}"`
            : `Failed: ${data.fileName}`;

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
      const dupCount = data.duplicates?.length ?? 0;

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
            description: `${data.created} paper${data.created !== 1 ? 's' : ''} added${dupCount > 0 ? `, ${dupCount} duplicate${dupCount !== 1 ? 's' : ''} skipped` : ''}${data.errors.length > 0 ? `, ${data.errors.length} failed` : ''} in ${data.orgName}.`,
            duration: 10000,
          },
        );
      } else if (dupCount > 0 && data.created === 0 && data.errors.length === 0) {
        toast.warning(
          `All papers are potential duplicates`,
          {
            id: toastId,
            description: `${dupCount} paper${dupCount !== 1 ? 's' : ''} matched existing entries in ${data.orgName}.`,
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

      // Surface duplicates for confirmation dialog
      if (data.duplicates && data.duplicates.length > 0) {
        setPendingDuplicates({
          duplicates: data.duplicates.map((d) => ({
            label: d.fileName,
            paper: d.paper,
            existingMatches: d.existingMatches,
          })),
          organizationId: data.organizationId,
          orgName: data.orgName,
        });
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

  return { pendingDuplicates, clearDuplicates };
}
