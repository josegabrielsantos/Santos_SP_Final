'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePosts } from '@/lib/api/posts';
import { useAppSelector } from '@/store/hooks';
import { CreateAnnouncementDialog } from '@/components/announcement/create-announcement-dialog';

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'website_admin';
  const { data } = usePosts({ limit: 1, type: 'announcement' });

  const latestAnnouncement = data?.posts?.[0];

  if (dismissed || !latestAnnouncement) {
    // Still show admin create button if no announcements
    if (isAdmin && !latestAnnouncement) {
      return (
        <div className="flex items-center justify-center gap-2 border-b border-kain-amber/10 bg-kain-amber-light/30 px-4 py-2">
          <Megaphone className="h-3.5 w-3.5 text-kain-amber" />
          <span className="text-[12px] text-muted-foreground">No announcements</span>
          <CreateAnnouncementDialog>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px] text-kain-amber hover:text-kain-amber">
              <Plus className="h-3 w-3" />
              Create
            </Button>
          </CreateAnnouncementDialog>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex items-center gap-3 border-b border-kain-amber/15 bg-kain-amber-light/40 px-4 py-2.5">
      <Megaphone className="h-4 w-4 shrink-0 text-kain-amber" />
      <button
        className="flex-1 min-w-0 text-left text-[13px] text-foreground/80 hover:text-foreground transition-colors truncate"
        onClick={() => router.push(`/posts/${latestAnnouncement._id}`)}
      >
        <span className="font-medium">{latestAnnouncement.title}</span>
        {latestAnnouncement.bodyText && (
          <span className="ml-2 text-muted-foreground hidden sm:inline">
            — {latestAnnouncement.bodyText.slice(0, 80)}
            {latestAnnouncement.bodyText.length > 80 ? '…' : ''}
          </span>
        )}
      </button>
      {isAdmin && (
        <CreateAnnouncementDialog>
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px] shrink-0 text-kain-amber hover:text-kain-amber">
            <Plus className="h-3 w-3" />
            New
          </Button>
        </CreateAnnouncementDialog>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
