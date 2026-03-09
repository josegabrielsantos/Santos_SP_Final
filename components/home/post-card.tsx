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
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="default">
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {post.author.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {post.author.name}
                </span>
                {post.organization && (
                  <>
                    <span className="text-xs text-muted-foreground">in</span>
                    <span className="text-xs font-medium text-primary">
                      {post.organization}
                    </span>
                  </>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{post.publishedAt}</span>
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
        <div className="mt-3">
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {post.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {post.body}
          </p>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[11px] font-normal"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator className="my-3" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`gap-1.5 text-xs ${liked ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-primary' : ''}`} />
            {likeCount > 0 && likeCount}
          </Button>

          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            {post.commentCount > 0 && post.commentCount}
          </Button>

          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
