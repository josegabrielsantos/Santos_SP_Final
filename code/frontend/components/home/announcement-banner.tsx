'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Megaphone, X, Plus, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePosts } from '@/lib/api/posts';
import { useAppSelector } from '@/store/hooks';
import { CreateAnnouncementDialog } from '@/components/announcement/create-announcement-dialog';

function isVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
}

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
          <Megaphone className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] text-muted-foreground">No announcements</span>
          <CreateAnnouncementDialog>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px] text-primary hover:text-primary">
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
      <Megaphone className="h-4 w-4 shrink-0 text-primary" />
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
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px] shrink-0 text-primary hover:text-primary">
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

/**
 * Announcement list for the right sidebar. No card wrapper — the sidebar provides the container.
 * Top half of the sidebar, scrolls independently.
 */
export function AnnouncementBannerCompact() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'website_admin';
  const { data } = usePosts({ limit: 10, type: 'announcement' });

  const announcements = data?.posts ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <h3 className="text-section-title text-[14px]">Announcements</h3>
        </div>
        {isAdmin && (
          <CreateAnnouncementDialog>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-primary hover:text-primary">
              <Plus className="h-3 w-3" />
              New
            </Button>
          </CreateAnnouncementDialog>
        )}
      </div>

      {announcements.length === 0 ? (
        <p className="text-[13px] text-muted-foreground py-4 text-center">No announcements yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {announcements.map((a) => {
            const visualUrls = a.mediaUrls?.filter((u: string) => !/\.pdf$/i.test(u)) ?? [];
            const firstMedia = visualUrls[0];
            return (
              <button
                key={a._id}
                className="w-full text-left rounded-md p-2.5 transition-colors hover:bg-kain-amber-light/30"
                onClick={() => router.push(`/posts/${a._id}`)}
              >
                {firstMedia && (
                  <div className="relative mb-2 w-full h-[100px] overflow-hidden rounded-md bg-muted/30">
                    {isVideo(firstMedia) ? (
                      <>
                        <video
                          src={firstMedia}
                          className="h-full w-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90">
                            <Play className="h-3 w-3 text-foreground ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <Image
                        src={firstMedia}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="280px"
                      />
                    )}
                  </div>
                )}
                <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
                  {a.title}
                </p>
                {a.bodyText && (
                  <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">
                    {a.bodyText.slice(0, 120)}{a.bodyText.length > 120 ? '…' : ''}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
