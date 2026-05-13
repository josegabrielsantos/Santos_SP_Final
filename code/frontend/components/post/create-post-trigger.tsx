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
        className="gap-2 text-[13px] font-semibold shadow-sm"
      >
        <Plus className="h-4 w-4" />
        {orgName ? `Submit to ${orgName}` : 'Submit a Post'}
      </Button>
    </CreatePostDialog>
  );
}
