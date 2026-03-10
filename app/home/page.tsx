'use client';

import { useState, useRef } from 'react';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { AnnouncementsPanel } from '@/components/home/announcements-panel';
import { PostCard } from '@/components/post/post-card';
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
          <div className="flex w-full max-w-5xl flex-col gap-6 px-5 py-7 lg:px-7">
            {/* Featured Posts Carousel */}
            {featuredPosts && featuredPosts.length > 0 && (
              <div className="relative">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <Sparkles className="h-6 w-6 text-amber-500" />
                  <h2 className="text-[17px] font-semibold text-foreground">Featured</h2>
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
                <CardContent className="flex items-center gap-3.5 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[17px] text-muted-foreground">
                    What&apos;s on your mind? Create a post…
                  </span>
                </CardContent>
              </Card>
            </CreatePostDialog>

            {/* Post feed */}
            {isLoading && (
              <div className="flex justify-center py-14">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            )}

            {isError && (
              <p className="py-7 text-center text-[16px] text-destructive">Failed to load posts.</p>
            )}

            {data?.posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2.5 py-5">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-[14px] text-muted-foreground">
                  Page {page} of {data.pages}
                </span>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page >= data.pages}
                >
                  Next
                </Button>
              </div>
            )}

            {data && data.posts.length === 0 && !isLoading && (
              <p className="py-14 text-center text-[16px] text-muted-foreground">
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
    <Card className="w-[345px] shrink-0 border-border/60 bg-white shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-[17px] font-semibold leading-snug text-foreground line-clamp-2">
          {post.title}
        </h3>
        <p className="mt-1.5 text-[15px] text-muted-foreground line-clamp-2">{post.bodyText}</p>
        <div className="mt-2.5 flex items-center gap-2.5 text-[14px] text-muted-foreground">
          <span>{authorName}</span>
          <span>·</span>
          <span>{post.likeCount} likes</span>
        </div>
      </CardContent>
    </Card>
  );
}
