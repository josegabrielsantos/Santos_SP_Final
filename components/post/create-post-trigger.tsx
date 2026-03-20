'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CreatePostDialog } from '@/components/post/create-post-dialog';
import { PenLine } from 'lucide-react';

interface CreatePostTriggerProps {
  orgName?: string;
  defaultOrgId?: string;
}

export function CreatePostTrigger({ orgName, defaultOrgId }: CreatePostTriggerProps) {
  return (
    <CreatePostDialog defaultOrgId={defaultOrgId}>
      <Card className="cursor-pointer rounded-xl border border-border/60 bg-white transition-all hover:shadow-sm hover:border-border/80">
        <CardContent className="flex items-center gap-3.5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <PenLine className="h-5 w-5 text-primary" />
          </div>
          <span className="text-[15px] text-muted-foreground">
            {orgName ? `Share in ${orgName}...` : 'Share a post...'}
          </span>
        </CardContent>
      </Card>
    </CreatePostDialog>
  );
}
