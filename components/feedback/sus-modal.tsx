'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';

const SUS_QUESTIONS = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system.",
];

const SCALE_LABELS = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SusModal({ open, onClose }: Props) {
  const [responses, setResponses] = useState<(number | null)[]>(Array(10).fill(null));
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = responses.every((r) => r !== null);

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setLoading(true);
    try {
      await axiosInstance.post('/feedback/sus', { responses, comment: comment || null });
      setSubmitted(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResponses(Array(10).fill(null));
    setComment('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[20px]">System Usability Survey</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-[17px] font-semibold text-foreground">Thank you for your feedback!</p>
            <p className="text-[15px] text-muted-foreground">Your responses help us improve UPLB KAIN.</p>
            <Button onClick={handleClose} className="mt-2">Close</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <p className="text-[14px] text-muted-foreground">
              For each statement, select your level of agreement (1 = Strongly Disagree, 5 = Strongly Agree).
            </p>

            {SUS_QUESTIONS.map((question, i) => (
              <div key={i} className="flex flex-col gap-2">
                <p className="text-[15px] font-medium text-foreground">
                  {i + 1}. {question}
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        const next = [...responses];
                        next[i] = val;
                        setResponses(next);
                      }}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border text-[14px] font-medium transition-colors ${
                        responses[i] === val
                          ? 'border-primary bg-primary text-white'
                          : 'border-border/60 bg-white text-foreground hover:border-primary hover:text-primary'
                      }`}
                      title={SCALE_LABELS[val - 1]}
                    >
                      {val}
                    </button>
                  ))}
                  <span className="ml-2 self-center text-[12px] text-muted-foreground">
                    {responses[i] !== null ? SCALE_LABELS[responses[i]! - 1] : ''}
                  </span>
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-foreground">
                Additional comments (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any other feedback about the platform..."
                rows={3}
                maxLength={1000}
                className="w-full resize-none rounded-md border border-border/80 bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">
                {responses.filter((r) => r !== null).length}/10 answered
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || loading}
                className="gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Feedback
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
