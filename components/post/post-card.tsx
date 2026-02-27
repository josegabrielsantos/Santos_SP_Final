'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ThumbsUp,
  MessageCircle,
  MoreHorizontal,
  EyeOff,
  Flag,
  Bookmark,
  BarChart3,
  Check,
  FileText,
} from 'lucide-react';
import { useToggleLike, useVotePoll, useReportPost } from '@/lib/api/posts';
import { useAppSelector } from '@/store/hooks';
import type { Post } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface PostCardProps {
  post: Post;
  onCommentClick?: (postId: string) => void;
}

export function PostCard({ post, onCommentClick }: PostCardProps) {
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;

  const toggleLike = useToggleLike();
  const votePoll = useVotePoll();
  const reportPost = useReportPost();

  const liked = userId ? post.likedBy.includes(userId) : false;

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const authorName =
    typeof post.authorId === 'object' ? post.authorId.displayName : 'Unknown';
  const authorAvatar =
    typeof post.authorId === 'object' ? post.authorId.avatar ?? undefined : undefined;
  const orgName =
    typeof post.organizationId === 'object' && post.organizationId
      ? post.organizationId.name
      : undefined;

  const timeAgo = post.publishedAt
    ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
    : formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  const alreadyVoted =
    post.poll && userId
      ? post.poll.options.some((o) => o.voterIds.includes(userId))
      : false;

  const handleVote = () => {
    if (!selectedOptions.length || alreadyVoted) return;
    votePoll.mutate({ postId: post._id, optionIds: selectedOptions });
  };

  const toggleOption = (oid: string) => {
    if (alreadyVoted) return;
    if (post.poll?.isMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(oid) ? prev.filter((id) => id !== oid) : [...prev, oid]
      );
    } else {
      setSelectedOptions([oid]);
    }
  };

  return (
    <Card className="border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="default">
              <AvatarImage src={authorAvatar} alt={authorName} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials(authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{authorName}</span>
                {orgName && (
                  <>
                    <span className="text-xs text-muted-foreground">in</span>
                    <span className="text-xs font-medium text-primary">{orgName}</span>
                  </>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="cursor-pointer gap-2">
                <Bookmark className="h-4 w-4" />
                Save post
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2">
                <EyeOff className="h-4 w-4" />
                Hide post
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                onClick={() => reportPost.mutate(post._id)}
              >
                <Flag className="h-4 w-4" />
                Report post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="mt-3">
          <h3 className="text-base font-semibold leading-snug text-foreground">{post.title}</h3>
          {post.bodyText && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {post.bodyText}
            </p>
          )}
        </div>

        {/* Media */}
        {post.mediaUrls.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {post.mediaUrls.map((url) => (
              <div key={url} className="h-48 w-auto shrink-0 overflow-hidden rounded-md border">
                {url.match(/\.pdf$/i) ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full w-40 flex-col items-center justify-center gap-1 bg-muted/30 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <FileText className="h-8 w-8" />
                    <span className="text-xs font-medium">View PDF</span>
                  </a>
                ) : url.match(/\.(mp4|webm|mov|avi)/i) ? (
                  <video src={url} controls className="h-full w-auto" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-full w-auto object-cover" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Poll */}
        {post.poll && (
          <div className="mt-3 rounded-md border border-border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-primary" />
              {post.poll.question}
            </div>
            <div className="flex flex-col gap-1.5">
              {post.poll.options.map((opt) => {
                const pct =
                  post.poll!.totalVotes > 0
                    ? Math.round((opt.voteCount / post.poll!.totalVotes) * 100)
                    : 0;
                const isSelected = selectedOptions.includes(opt.optionId);
                const votedForThis = userId ? opt.voterIds.includes(userId) : false;

                return (
                  <button
                    type="button"
                    key={opt.optionId}
                    onClick={() => toggleOption(opt.optionId)}
                    disabled={alreadyVoted}
                    className={`relative flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                      isSelected || votedForThis
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    } ${alreadyVoted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {/* Background bar */}
                    {alreadyVoted && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-md bg-primary/10"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {votedForThis && <Check className="h-3.5 w-3.5 text-primary" />}
                      {opt.text}
                    </span>
                    {alreadyVoted && (
                      <span className="relative z-10 text-xs text-muted-foreground">{pct}%</span>
                    )}
                  </button>
                );
              })}
            </div>
            {!alreadyVoted && selectedOptions.length > 0 && (
              <Button
                size="sm"
                className="mt-2 text-xs"
                onClick={handleVote}
                disabled={votePoll.isPending}
              >
                Vote
              </Button>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {post.poll.totalVotes} vote{post.poll.totalVotes !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="my-3" />

        {/* Actions – no Share button */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleLike.mutate(post._id)}
            disabled={!userId || toggleLike.isPending}
            className={`gap-1.5 text-xs ${liked ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-primary' : ''}`} />
            {post.likeCount > 0 && post.likeCount}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => onCommentClick?.(post._id)}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {post.commentCount > 0 && post.commentCount}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
