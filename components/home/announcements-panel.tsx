'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Megaphone, Pin, Loader2 } from 'lucide-react';
import { usePosts } from '@/lib/api/posts';
import { formatDistanceToNow } from 'date-fns';

export function AnnouncementsPanel() {
  const { data, isLoading } = usePosts({ limit: 10, type: 'announcement' });

  return (
    <div className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 border-l border-border/50 bg-white xl:block">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Megaphone className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Announcements</h2>
      </div>

      <ScrollArea className="h-[calc(100vh-3.5rem-3rem)]">
        <div className="flex flex-col gap-0.5 p-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {data?.posts.map((post, idx) => (
            <div key={post._id}>
              <div className="rounded-lg p-3 transition-colors hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Pin className="h-3 w-3 text-primary shrink-0" />
                  <h3 className="text-sm font-medium leading-snug text-foreground line-clamp-1">
                    {post.title}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {post.bodyText}
                </p>
                <span className="mt-1.5 block text-[10px] text-muted-foreground/70">
                  {post.publishedAt
                    ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
                    : ''}
                </span>
              </div>
              {idx < (data?.posts.length ?? 1) - 1 && (
                <Separator className="mx-3" />
              )}
            </div>
          ))}

          {!isLoading && data?.posts.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No announcements yet.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
