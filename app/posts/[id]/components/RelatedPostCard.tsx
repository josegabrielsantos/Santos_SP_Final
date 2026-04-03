'use client';

import Link from 'next/link';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import { getPostTypeLabel } from '@/lib/utils';
import { RESEARCH_TOPICS } from '@/lib/constants/research-topics';
import type { RelatedPost } from '@/lib/api/insights';

const TOPIC_LABEL_MAP = Object.fromEntries(RESEARCH_TOPICS.map((t) => [t.id, t.label]));

export function RelatedPostCard({ post }: { post: RelatedPost }) {
  return (
    <Link href={`/posts/${post._id}`}>
      <div className="rounded-md border border-border/30 bg-card p-2.5 md:p-3 transition-colors hover:bg-muted/30">
        {/* Title */}
        <h5 className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary">
          {post.title}
        </h5>

        {/* Metadata line */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {post.organizationName && (
            <>
              <span>{post.organizationName}</span>
              <span>&middot;</span>
            </>
          )}
          <span>{getPostTypeLabel(post.type)}</span>
          <span>&middot;</span>
          <span className="flex items-center gap-0.5">
            <ThumbsUp className="h-3 w-3" /> {post.likeCount}
          </span>
          <span>&middot;</span>
          <span className="flex items-center gap-0.5">
            <MessageSquare className="h-3 w-3" /> {post.commentCount}
          </span>
        </div>

        {/* Topic badges */}
        {post.topics?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {TOPIC_LABEL_MAP[topic] || topic}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
