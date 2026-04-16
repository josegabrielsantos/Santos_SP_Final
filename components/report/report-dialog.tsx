'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Flag, Loader2 } from 'lucide-react';
import { useSubmitReport } from '@/lib/api/reports';

const POST_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Spam or misleading content' },
  { value: 'harassment', label: 'Harassment', description: 'Harassment or bullying' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'off_topic', label: 'Off Topic', description: 'Not relevant to the community' },
  { value: 'inappropriate', label: 'Inappropriate', description: 'Inappropriate or offensive content' },
  { value: 'other', label: 'Other', description: 'Other reason (please specify below)' },
] as const;

const USER_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Spam account or bot behavior' },
  { value: 'harassment', label: 'Harassment', description: 'Harassment or bullying' },
  { value: 'impersonation', label: 'Impersonation', description: 'Impersonating another person' },
  { value: 'inappropriate', label: 'Inappropriate', description: 'Inappropriate behavior or content' },
  { value: 'other', label: 'Other', description: 'Other reason (please specify below)' },
] as const;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'post' | 'user';
  targetId: string;
  targetLabel?: string; // e.g. post title or user name, shown in the description
}

export function ReportDialog({ open, onOpenChange, targetType, targetId, targetLabel }: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const submitReport = useSubmitReport();

  const reasons = targetType === 'post' ? POST_REASONS : USER_REASONS;

  const handleSubmit = () => {
    if (!selectedReason) return;
    if (selectedReason === 'other' && !details.trim()) return;

    submitReport.mutate(
      {
        targetType,
        targetId,
        reason: selectedReason,
        details: details.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedReason(null);
          setDetails('');
        },
      }
    );
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedReason(null);
      setDetails('');
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" />
            Report {targetType === 'post' ? 'Post' : 'User'}
          </DialogTitle>
          <DialogDescription>
            {targetLabel ? (
              <>Why are you reporting <span className="font-semibold text-foreground">&ldquo;{targetLabel}&rdquo;</span>?</>
            ) : (
              <>Why are you reporting this {targetType}?</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {reasons.map((reason) => (
            <button
              key={reason.value}
              type="button"
              onClick={() => setSelectedReason(reason.value)}
              className={`flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-all ${
                selectedReason === reason.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-border/80 hover:bg-muted/30'
              }`}
            >
              <span className="text-[14px] font-medium text-foreground">{reason.label}</span>
              <span className="text-[12px] text-muted-foreground">{reason.description}</span>
            </button>
          ))}
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={selectedReason === 'other' ? 'Please describe the issue (required)...' : 'Additional details (optional)...'}
          rows={3}
          maxLength={500}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-[14px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!selectedReason || (selectedReason === 'other' && !details.trim()) || submitReport.isPending}
            onClick={handleSubmit}
          >
            {submitReport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flag className="h-4 w-4" />
            )}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
