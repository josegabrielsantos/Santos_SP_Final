'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-page-bg px-4 text-center">
      <AlertCircle className="h-16 w-16 text-destructive/40" />
      <div>
        <h1 className="text-[28px] font-bold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-[16px] text-muted-foreground">
          {error.message ?? 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
      <Button onClick={reset} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
