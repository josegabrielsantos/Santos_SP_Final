'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share2,
  MoreHorizontal,
  EyeOff,
  Flag,
  Bookmark,
} from 'lucide-react';

export interface PostData {
  id: string;
  author: {
    name: string;
    avatar?: string;
    initials: string;
  };
  organization?: string;
  title: string;
  body: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  type: 'post' | 'announcement' | 'poll' | 'research_paper' | 'update';
}

export function PostCard({ post }: { post: PostData }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  return (
    <Card className="border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <Avatar size="default">
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
              <AvatarFallback className="bg-primary/10 text-[12px] font-semibold text-primary">
                {post.author.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold text-foreground">
                  {post.author.name}
                </span>
                {post.organization && (
                  <>
                    <span className="text-[14px] text-muted-foreground">in</span>
                    <span className="text-[14px] font-medium text-primary">
                      {post.organization}
                    </span>
                  </>
                )}
              </div>
              <span className="text-[14px] text-muted-foreground">{post.publishedAt}</span>
            </div>
          </div>

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
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
              <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                <Flag className="h-4 w-4" />
                Report post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="mt-3.5">
          <h3 className="text-[18px] font-semibold leading-snug text-foreground">
            {post.title}
          </h3>
          <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground line-clamp-3">
            {post.body}
          </p>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[13px] font-normal"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Engagement stats */}
        {(likeCount !== 0 || post.commentCount > 0) && (
          <div className="mt-3.5 flex items-center gap-3 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-primary text-primary' : ''}`} />
              {likeCount} like{likeCount !== 1 ? 's' : ''}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-1.5 flex items-center border-t border-border pt-1.5">
          <button
            onClick={handleLike}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition-all duration-150 ${
              liked ? 'text-primary hover:bg-primary/15' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-primary' : ''}`} />
            Like
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/50 hover:text-foreground"
          >
            <ThumbsDown className="h-4 w-4" />
            Dislike
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/50 hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            Comment
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/50 hover:text-foreground"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
