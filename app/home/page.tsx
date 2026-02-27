'use client';

import { useState, useRef } from 'react';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { AnnouncementsPanel } from '@/components/home/announcements-panel';
import { PostCard } from '@/components/post/post-card';
import { CommentsSection } from '@/components/post/comments-section';
import { CreatePostDialog } from '@/components/post/create-post-dialog';
import { usePosts, useFeaturedPosts } from '@/lib/api/posts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Sparkles, Plus } from 'lucide-react';
import type { Post } from '@/lib/types';

export default function HomePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = usePosts({ page, limit: 20 });
  const { data: featuredPosts } = useFeaturedPosts();
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const amount = 320;
    carouselRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <AuthenticatedNavbar />

      <div className="flex">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <main className="flex flex-1 justify-center">
          <div className="flex w-full max-w-3xl flex-col gap-4 px-4 py-6 lg:px-6">
            {/* Featured Posts Carousel */}
            {featuredPosts && featuredPosts.length > 0 && (
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-foreground">Featured</h2>
                </div>
                <div className="relative">
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-white p-1 shadow-sm hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div
                    ref={carouselRef}
                    className="flex gap-3 overflow-x-auto scroll-smooth pb-2"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    {featuredPosts.map((fp) => (
                      <FeaturedCard key={fp._id} post={fp} />
                    ))}
                  </div>
                  <button
                    onClick={() => scrollCarousel('right')}
                    className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-white p-1 shadow-sm hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Create post trigger */}
            <CreatePostDialog>
              <Card className="cursor-pointer border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    What&apos;s on your mind? Create a post…
                  </span>
                </CardContent>
              </Card>
            </CreatePostDialog>

            {/* Post feed */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {isError && (
              <p className="py-6 text-center text-sm text-destructive">Failed to load posts.</p>
            )}

            {data?.posts.map((post) => (
              <div key={post._id}>
                <PostCard
                  post={post}
                  onCommentClick={(id) =>
                    setExpandedComments(expandedComments === id ? null : id)
                  }
                />
                {expandedComments === post._id && (
                  <Card className="border-t-0 border-border/60 bg-white shadow-sm rounded-t-none -mt-1">
                    <CommentsSection postId={post._id} />
                  </Card>
                )}
              </div>
            ))}

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {data.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page >= data.pages}
                >
                  Next
                </Button>
              </div>
            )}

            {data && data.posts.length === 0 && !isLoading && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No posts yet. Be the first to create one!
              </p>
            )}
          </div>
        </main>

        {/* Right Announcements Panel */}
        <AnnouncementsPanel />
      </div>
    </div>
  );
}

/* ─── Featured card (small horizontal card) ─────────────────── */

function FeaturedCard({ post }: { post: Post }) {
  const authorName =
    typeof post.authorId === 'object' ? post.authorId.displayName : 'Unknown';

  return (
    <Card className="w-[280px] shrink-0 border-border/60 bg-white shadow-sm">
      <CardContent className="p-3">
        <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
          {post.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{post.bodyText}</p>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{authorName}</span>
          <span>·</span>
          <span>{post.likeCount} likes</span>
        </div>
      </CardContent>
    </Card>
  );
}
