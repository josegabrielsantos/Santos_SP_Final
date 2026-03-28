'use client';

import { CreatePostDialog } from '@/components/post/create-post-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CreatePostTriggerProps {
  orgName?: string;
  defaultOrgId?: string;
}

export function CreatePostTrigger({ orgName, defaultOrgId }: CreatePostTriggerProps) {
  return (
    <CreatePostDialog defaultOrgId={defaultOrgId}>
      <Button
        variant="outline"
        className="gap-2 text-[13px] font-medium border-border hover:bg-muted/50 hover:border-primary/30 hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        {orgName ? `Submit to ${orgName}` : 'Submit Publication'}
      </Button>
    </CreatePostDialog>
  );
}
