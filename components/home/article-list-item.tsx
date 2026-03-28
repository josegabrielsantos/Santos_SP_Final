'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { MessageSquare, Heart, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Post } from '@/lib/types';

const POST_TYPE_LABELS: Record<string, string> = {
  post: 'Article',
  research_paper: 'Research Paper',
  poll: 'Poll',
  announcement: 'Announcement',
  update: 'Update',
};

interface ArticleListItemProps {
  post: Post;
}

export function ArticleListItem({ post }: ArticleListItemProps) {
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

  return (
    <article className="group border-b border-border/40 py-5 first:pt-0 last:border-b-0">
      {/* Type badge */}
      {post.type !== 'post' && (
        <Badge
          variant="secondary"
          className="mb-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0 leading-5"
        >
          {typeLabel}
        </Badge>
      )}

      {/* Title */}
      <Link href={`/posts/${post._id}`}>
        <h3 className="font-heading text-[17px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h3>
      </Link>

      {/* Author · Org · Date */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
        <span className="font-medium">{authorName}</span>
        {orgName && (
          <>
            <span>·</span>
            <Link
              href={`/organizations/${orgSlug}`}
              className="flex items-center gap-1 hover:text-primary transition-colors"
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

      {/* Excerpt */}
      {post.bodyText && (
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground line-clamp-2">
          {post.bodyText}
        </p>
      )}

      {/* Tags + engagement */}
      <div className="mt-3 flex items-center justify-between">
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {post.tags?.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {post.tags && post.tags.length > 4 && (
            <span className="text-[11px] text-muted-foreground/60">
              +{post.tags.length - 4}
            </span>
          )}
        </div>

        {/* Engagement counts */}
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground/70 shrink-0">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {post.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  );
}

export function ArticleListItemSkeleton() {
  return (
    <div className="border-b border-border/40 py-5 first:pt-0 last:border-b-0">
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
