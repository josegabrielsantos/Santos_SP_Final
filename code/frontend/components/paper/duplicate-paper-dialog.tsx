'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';

export interface DuplicateEntry {
  /** File name (for bulk PDF) or row number label (for CSV) */
  label: string;
  /** The new paper that was flagged */
  paper: {
    title: string;
    authors?: string[];
    year?: number | null;
    doi?: string | null;
    journal?: string | null;
    fileUrl?: string | null;
    fileSize?: number | null;
    abstract?: string | null;
    keywords?: string[];
    topics?: string[];
  };
  /** Existing papers it matched against */
  existingMatches: {
    _id: string;
    title: string;
    authors?: string[];
    year?: number | null;
    doi?: string | null;
    journal?: string | null;
  }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  duplicates: DuplicateEntry[];
  onConfirm: (selectedPapers: DuplicateEntry['paper'][]) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function DuplicatePaperDialog({ open, onClose, duplicates, onConfirm, isSubmitting }: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === duplicates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(duplicates.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    const papers = duplicates
      .filter((_, i) => selected.has(i))
      .map((d) => d.paper);
    onConfirm(papers);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelected(new Set());
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[20px]">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Potential Duplicates Detected
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <p className="text-[14px] text-muted-foreground">
            The following {duplicates.length === 1 ? 'paper was' : `${duplicates.length} papers were`} skipped
            because {duplicates.length === 1 ? 'it matches' : 'they match'} existing papers in the system.
            Select any you&apos;d like to upload anyway.
          </p>

          {/* Select all */}
          {duplicates.length > 1 && (
            <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.size === duplicates.length}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Select all ({duplicates.length})
            </label>
          )}

          {/* Duplicate list */}
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border/60 bg-background divide-y divide-border/40">
            {duplicates.map((dup, i) => (
              <label
                key={i}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleSelect(i)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
                />
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  {/* New paper */}
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {dup.paper.title}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {dup.label}
                        {dup.paper.authors?.length ? ` \u00b7 ${dup.paper.authors.slice(0, 3).join(', ')}` : ''}
                        {dup.paper.year ? ` \u00b7 ${dup.paper.year}` : ''}
                      </p>
                    </div>
                  </div>
                  {/* Matched existing paper(s) */}
                  <div className="ml-6 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 px-3 py-2">
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-1">
                      Matches existing:
                    </p>
                    {dup.existingMatches.map((m) => (
                      <p key={m._id} className="text-[12px] text-amber-600 dark:text-amber-300 truncate">
                        {m.title}
                        {m.year ? ` (${m.year})` : ''}
                        {m.doi ? ` \u00b7 DOI: ${m.doi}` : ''}
                      </p>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {selected.size === 0 ? 'Close' : 'Skip All'}
            </Button>
            {selected.size > 0 && (
              <Button onClick={handleConfirm} disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isSubmitting
                  ? 'Creating...'
                  : `Upload ${selected.size} Paper${selected.size !== 1 ? 's' : ''} Anyway`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
