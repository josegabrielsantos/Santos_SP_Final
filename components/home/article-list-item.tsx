'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  MessageCircle,
  ThumbsUp,
  Building2,
  Play,
  MoreHorizontal,
  Bookmark,
  Trash2,
  Flag,
  EyeOff,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TopicBadge } from '@/components/ui/topic-badge';
import { MediaViewer } from '@/components/post/media-viewer';
import { useAppSelector } from '@/store/hooks';
import { useReportPost, useDeletePost } from '@/lib/api/posts';
import { useAdminToggleHidePost, useAdminDeletePost } from '@/lib/api/admin';
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
import { Input } from '@/components/ui/input';
import type { Post } from '@/lib/types';

const POST_TYPE_LABELS: Record<string, string> = {
  post: 'Article',
  research_paper: 'Research Paper',
  poll: 'Poll',
  announcement: 'Announcement',
  update: 'Update',
};

const POST_TYPE_COLORS: Record<string, string> = {
  post: 'bg-blue-100 text-blue-700 border-blue-200',
  research_paper: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  poll: 'bg-purple-100 text-purple-700 border-purple-200',
  announcement: 'bg-amber-100 text-amber-700 border-amber-200',
  update: 'bg-teal-100 text-teal-700 border-teal-200',
};

function isVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
}

interface ArticleListItemProps {
  post: Post;
  isOrgAdmin?: boolean;
}

export function ArticleListItem({ post, isOrgAdmin = false }: ArticleListItemProps) {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;
  const isWebsiteAdmin = user?.role === 'website_admin';
  const canModeratePost = isWebsiteAdmin || isOrgAdmin;

  const reportPost = useReportPost();
  const deletePost = useDeletePost();
  const adminHidePost = useAdminToggleHidePost();
  const adminDeletePost = useAdminDeletePost();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdminHideConfirm, setShowAdminHideConfirm] = useState(false);
  const [showAdminDeleteConfirm, setShowAdminDeleteConfirm] = useState(false);
  const [adminReason, setAdminReason] = useState('');
  const [adminPending, setAdminPending] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  // Media viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const authorId =
    typeof post.authorId === 'object' ? post.authorId._id : null;
  const authorName =
    typeof post.authorId === 'object' ? post.authorId.displayName : 'Unknown';
  const orgName =
    typeof post.organizationId === 'object' && post.organizationId
      ? post.organizationId.name
      : null;
  const orgSlug =
    typeof post.organizationId === 'object' && post.organizationId
      ? post.organizationId.slug
      : null;
  const publishedDate = post.publishedAt || post.createdAt;
  const typeLabel = POST_TYPE_LABELS[post.type] || 'Article';
  const typeColor = POST_TYPE_COLORS[post.type] || POST_TYPE_COLORS.post;
  const isPostAuthor = userId === authorId;

  // Separate visual media from PDFs
  const visualUrls = post.mediaUrls?.filter((u) => !/\.pdf$/i.test(u)) ?? [];

  const postUrl = `/posts/${post._id}`;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"], [data-interactive], video, .media-area')) return;
    router.push(postUrl);
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // Tag display logic: show first 4, expand on click
  const TAG_PREVIEW_COUNT = 4;
  const hasManyTags = post.tags && post.tags.length > TAG_PREVIEW_COUNT;
  const displayedTags = tagsExpanded ? post.tags : post.tags?.slice(0, TAG_PREVIEW_COUNT);

  return (
    <>
      <article
        onClick={handleCardClick}
        className="group cursor-pointer rounded-lg border border-border/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        {/* Top row: type badge + topic badges + ellipsis */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0 leading-5 border ${typeColor}`}
            >
              {typeLabel}
            </Badge>
            {post.topics?.slice(0, 2).map((t) => (
              <TopicBadge key={t} topicId={t} size="sm" />
            ))}
          </div>

          {/* Ellipsis dropdown */}
          <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/50 -mt-1 -mr-1"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-lg border border-border">
                <DropdownMenuItem className="cursor-pointer gap-2 text-[13px]">
                  <Bookmark className="h-4 w-4" /> Save post
                </DropdownMenuItem>
                {isPostAuthor && (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-[13px] text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete post
                  </DropdownMenuItem>
                )}
                {!isPostAuthor && !canModeratePost && userId && (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-[13px] text-destructive focus:text-destructive"
                    onClick={() => reportPost.mutate(post._id)}
                  >
                    <Flag className="h-4 w-4" /> Report post
                  </DropdownMenuItem>
                )}
                {canModeratePost && !isPostAuthor && (
                  <>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-[13px] text-orange-600 focus:text-orange-600"
                      onClick={() => setShowAdminHideConfirm(true)}
                    >
                      <EyeOff className="h-4 w-4" />
                      {post.status === 'hidden' ? 'Unhide post' : 'Hide post'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-[13px] text-destructive focus:text-destructive"
                      onClick={() => setShowAdminDeleteConfirm(true)}
                    >
                      <ShieldAlert className="h-4 w-4" /> Delete post (Admin)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-heading text-[17px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h3>

        {/* Author · Org · Date */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
          {authorId ? (
            <Link
              href={`/profile/${authorId}`}
              className="font-semibold text-foreground/80 underline decoration-transparent hover:decoration-primary hover:text-primary transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {authorName}
            </Link>
          ) : (
            <span className="font-medium">{authorName}</span>
          )}
          {orgName && (
            <>
              <span>·</span>
              <Link
                href={`/organizations/${orgSlug}`}
                className="flex items-center gap-1 font-semibold text-foreground/80 underline decoration-transparent hover:decoration-primary hover:text-primary transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <Building2 className="h-3 w-3" />
                {orgName}
              </Link>
            </>
          )}
          {publishedDate && (
            <>
              <span>·</span>
              <time>{format(new Date(publishedDate), 'MMM d, yyyy')}</time>
            </>
          )}
        </div>

        {/* Excerpt — compact, 2 lines max */}
        {post.bodyText && (
          <p className="mt-2 text-[14px] leading-relaxed text-foreground/70 line-clamp-2">
            {post.bodyText}
          </p>
        )}

        {/* Media — compact thumbnail row */}
        {visualUrls.length > 0 && (
          <div
            className="media-area mt-2.5 flex gap-1.5 overflow-hidden rounded-lg"
            data-interactive
            onClick={(e) => e.stopPropagation()}
            style={{ height: '180px' }}
          >
            {visualUrls.slice(0, 3).map((url, i) => (
              <button
                key={url}
                onClick={() => openViewer(i)}
                className={`relative overflow-hidden rounded-lg border border-gray-200 bg-muted/30 cursor-pointer ${
                  visualUrls.length === 1 ? 'w-full' : visualUrls.length === 2 ? 'w-1/2' : 'flex-1 min-w-0'
                }`}
              >
                {isVideo(url) ? (
                  <>
                    <video src={url} className="h-full w-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="rounded-full bg-black/60 p-2.5 backdrop-blur-sm">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </div>
                    </div>
                  </>
                ) : (
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes={visualUrls.length === 1 ? '600px' : '200px'}
                  />
                )}
                {i === 2 && visualUrls.length > 3 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 transition-colors hover:bg-black/40">
                    <span className="text-lg font-bold text-white">+{visualUrls.length - 3}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tags + engagement */}
        <div className="mt-3 flex items-center justify-between">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {displayedTags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {hasManyTags && !tagsExpanded && (
              <button
                onClick={(e) => { e.stopPropagation(); setTagsExpanded(true); }}
                className="flex items-center gap-0.5 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                +{post.tags.length - TAG_PREVIEW_COUNT}
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
            {hasManyTags && tagsExpanded && (
              <button
                onClick={(e) => { e.stopPropagation(); setTagsExpanded(false); }}
                className="flex items-center gap-0.5 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Show less
                <ChevronUp className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Engagement counts */}
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground/70 shrink-0">
            <span className="flex items-center gap-1">
              <ThumbsUp className={`h-3.5 w-3.5 ${userId && post.likedBy?.includes(userId) ? 'fill-primary text-primary' : ''}`} />
              {post.likeCount}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href={`/posts/${post._id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {post.commentCount}
            </Link>
          </div>
        </div>
      </article>

      {/* Media Viewer */}
      {visualUrls.length > 0 && (
        <MediaViewer
          urls={visualUrls}
          initialIndex={viewerIndex}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{post.title}&rdquo;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await deletePost.mutateAsync(post._id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin hide confirmation */}
      <AlertDialog open={showAdminHideConfirm} onOpenChange={(open) => { setShowAdminHideConfirm(open); if (!open) setAdminReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {post.status === 'hidden' ? 'Unhide this post?' : 'Hide this post?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {post.status === 'hidden'
                ? `This will make "${post.title}" visible to all users again.`
                : `This will hide "${post.title}" from all users. You can unhide it later.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {post.status !== 'hidden' && (
            <Input
              placeholder="Reason (optional)"
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 text-white hover:bg-orange-700"
              disabled={adminPending}
              onClick={async () => {
                setAdminPending(true);
                try {
                  await adminHidePost.mutateAsync({ postId: post._id, reason: adminReason || undefined });
                } finally {
                  setAdminPending(false);
                  setAdminReason('');
                }
              }}
            >
              {post.status === 'hidden' ? 'Unhide Post' : 'Hide Post'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin delete confirmation */}
      <AlertDialog open={showAdminDeleteConfirm} onOpenChange={(open) => { setShowAdminDeleteConfirm(open); if (!open) setAdminReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{post.title}&rdquo; and all its comments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Reason (optional)"
            value={adminReason}
            onChange={(e) => setAdminReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={adminPending}
              onClick={async () => {
                setAdminPending(true);
                try {
                  await adminDeletePost.mutateAsync({ postId: post._id, reason: adminReason || undefined });
                } finally {
                  setAdminPending(false);
                  setAdminReason('');
                }
              }}
            >
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ArticleListItemSkeleton() {
  return (
    <div className="rounded-lg border border-border/60 bg-white p-5 shadow-sm">
      <div className="h-5 w-3/4 rounded bg-muted/60 animate-pulse" />
      <div className="mt-2 h-3.5 w-1/2 rounded bg-muted/40 animate-pulse" />
      <div className="mt-3 space-y-1.5">
        <div className="h-3.5 w-full rounded bg-muted/30 animate-pulse" />
        <div className="h-3.5 w-5/6 rounded bg-muted/30 animate-pulse" />
      </div>
      <div className="mt-3 flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-muted/40 animate-pulse" />
        <div className="h-5 w-18 rounded-full bg-muted/40 animate-pulse" />
      </div>
    </div>
  );
}
