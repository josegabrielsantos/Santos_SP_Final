'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Megaphone, Pin, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePosts, useDeletePost } from '@/lib/api/posts';
import { useAppSelector } from '@/store/hooks';
import { CreateAnnouncementDialog } from '@/components/announcement/create-announcement-dialog';
import { formatDistanceToNow } from 'date-fns';

function timeAgoShort(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function AnnouncementsPanel() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'website_admin';
  const { data, isLoading } = usePosts({ limit: 10, type: 'announcement' });
  const deletePost = useDeletePost();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, postId: string, title: string) => {
    e.stopPropagation();
    setDeleteTarget({ id: postId, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deletePost.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="sticky top-[64px] hidden h-[calc(100vh-64px)] w-80 shrink-0 border-l border-border/50 bg-white xl:block">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3.5">
        <Megaphone className="h-[22px] w-[22px] text-amber-600" />
        <h2 className="text-[15px] font-semibold text-foreground">Announcements</h2>
        {isAdmin && (
          <CreateAnnouncementDialog>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7 rounded-full text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CreateAnnouncementDialog>
        )}
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

          {data?.posts.map((post, idx) => {
            const imageUrl = post.mediaUrls?.find((u) =>
              /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u)
            );

            return (
              <div key={post._id}>
                <div
                  className="group rounded-lg p-3.5 transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/posts/${post._id}`)}
                >
                  {/* Image thumbnail */}
                  {imageUrl && (
                    <div className="mb-2 h-28 w-full overflow-hidden rounded-md border border-border/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-start gap-2.5">
                    <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-medium leading-snug text-foreground line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                        {post.bodyText}
                      </p>
                      <span className="mt-1.5 block text-[12px] text-muted-foreground/70">
                        {post.publishedAt ? timeAgoShort(post.publishedAt) : ''}
                      </span>
                    </div>

                    {/* Delete button for admins */}
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeleteClick(e, post._id, post.title)}
                        title="Delete announcement"
                        className="shrink-0 rounded-md p-1 text-muted-foreground/50 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {idx < (data?.posts.length ?? 1) - 1 && (
                  <div className="mx-3 border-b border-border/50" />
                )}
              </div>
            );
          })}

          {!isLoading && data?.posts.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <Megaphone className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground">No announcements yet.</p>
              {isAdmin && (
                <CreateAnnouncementDialog>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-[13px]">
                    <Plus className="h-3.5 w-3.5" />
                    Create one
                  </Button>
                </CreateAnnouncementDialog>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  You are about to delete <strong className="text-foreground">&ldquo;{deleteTarget.title}&rdquo;</strong>.
                  This will permanently remove the announcement from the platform. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Announcement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
