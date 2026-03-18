'use client';

import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone, Pin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePosts } from '@/lib/api/posts';
import { formatDistanceToNow } from 'date-fns';

export function AnnouncementsPanel() {
  const router = useRouter();
  const { data, isLoading } = usePosts({ limit: 10, type: 'announcement' });

  return (
    <div className="sticky top-[64px] hidden h-[calc(100vh-64px)] w-80 shrink-0 border-l border-border/50 bg-white xl:block">
      <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3.5">
        <Megaphone className="h-[22px] w-[22px] text-primary" />
        <h2 className="text-[15px] font-semibold text-foreground">Announcements</h2>
      </div>

      <ScrollArea className="h-[calc(100vh-64px-53px)]">
        <div className="flex flex-col p-2.5">
          {isLoading && (
            <div className="flex flex-col">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3.5">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-1.5" />
                  <Skeleton className="h-3 w-2/3" />
                  {i < 4 && <div className="mt-3.5 border-b border-border/50" />}
                </div>
              ))}
            </div>
          )}

          {data?.posts.map((post, idx) => (
            <div key={post._id}>
              <div className="rounded-lg p-3.5 transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/posts/${post._id}`)}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <h3 className="text-[14px] font-medium leading-snug text-foreground line-clamp-1">
                    {post.title}
                  </h3>
                </div>
                <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                  {post.bodyText}
                </p>
                <span className="mt-2 block text-[12px] text-muted-foreground/70">
                  {post.publishedAt
                    ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
                    : ''}
                </span>
              </div>
              {idx < (data?.posts.length ?? 1) - 1 && (
                <div className="mx-3 border-b border-border/50" />
              )}
            </div>
          ))}

          {!isLoading && data?.posts.length === 0 && (
            <p className="px-3.5 py-7 text-center text-[13px] text-muted-foreground">
              No announcements yet.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
