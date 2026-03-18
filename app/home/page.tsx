'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { AnnouncementsPanel } from '@/components/home/announcements-panel';
import { PostCard, PostCardSkeleton } from '@/components/post/post-card';
import { motion, AnimatePresence } from 'framer-motion';
import { CreatePostDialog } from '@/components/post/create-post-dialog';
import { usePosts, useFeaturedPosts, useRecommendedPosts } from '@/lib/api/posts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Sparkles, Wand2 } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import type { Post } from '@/lib/types';

export default function HomePage() {
  const [latestPage, setLatestPage] = useState(1);
  const { data: latestData, isLoading: latestLoading, isError: latestError } = usePosts({ page: latestPage, limit: 20 });
  const { data: recData, isLoading: recLoading } = useRecommendedPosts();
  const { data: featuredPosts } = useFeaturedPosts();
  const carouselRef = useRef<HTMLDivElement>(null);
  const user = useAppSelector((s) => s.auth.user);

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const amount = 320;
    carouselRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="flex w-full max-w-5xl flex-col gap-4 px-5 py-6 lg:px-7">
            {/* Featured Posts Carousel */}
            {featuredPosts && featuredPosts.length > 0 && (
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-kain-amber" />
                  <h2 className="text-[15px] font-semibold text-foreground">Featured</h2>
                </div>
                <div className="relative">
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-card p-1 transition-colors hover:bg-muted/50"
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
                    className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-card p-1 transition-colors hover:bg-muted/50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Create post trigger */}
            <CreatePostDialog>
              <Card className="cursor-pointer border border-border bg-card transition-colors hover:bg-muted/20">
                <CardContent className="flex items-center gap-3 p-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user?.avatar ?? undefined} alt={user?.displayName ?? ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                      {user?.displayName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 rounded-full border border-border bg-muted/20 px-4 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-muted/40">
                    What&apos;s on your mind?
                  </span>
                </CardContent>
              </Card>
            </CreatePostDialog>

            {/* Feed tabs */}
            <Tabs defaultValue="foryou">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
                <TabsTrigger
                  value="foryou"
                  className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-5 py-2.5 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <Wand2 className="h-4 w-4" />
                  For You
                </TabsTrigger>
                <TabsTrigger
                  value="latest"
                  className="rounded-none border-b-2 border-transparent px-5 py-2.5 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  Latest
                </TabsTrigger>
              </TabsList>

              {/* For You tab */}
              <TabsContent value="foryou" className="mt-3 flex flex-col gap-3">
                {recLoading && (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => <PostCardSkeleton key={i} />)}
                  </div>
                )}

                {!recLoading && recData && !recData.isPersonalized && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-lg border border-kain-amber/30 bg-kain-amber-light/30 px-4 py-3"
                  >
                    <Wand2 className="h-4 w-4 shrink-0 text-kain-amber" />
                    <p className="text-[13px] text-foreground/70">
                      Your personalized feed is building up. Like, comment, and save posts to improve your recommendations.
                    </p>
                  </motion.div>
                )}

                <AnimatePresence>
                  {recData?.posts.map((post, i) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.15 }}
                    >
                      <PostCard post={post} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {!recLoading && recData?.posts.length === 0 && (
                  <p className="py-12 text-center text-[14px] text-muted-foreground">
                    No posts yet. Be the first to create one!
                  </p>
                )}
              </TabsContent>

              {/* Latest tab */}
              <TabsContent value="latest" className="mt-3 flex flex-col gap-3">
                {latestLoading && (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => <PostCardSkeleton key={i} />)}
                  </div>
                )}

                {latestError && (
                  <p className="py-6 text-center text-[14px] text-destructive">Failed to load posts.</p>
                )}

                <AnimatePresence>
                  {latestData?.posts.map((post, i) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.15 }}
                    >
                      <PostCard post={post} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {latestData && latestData.posts.length === 0 && !latestLoading && (
                  <p className="py-12 text-center text-[14px] text-muted-foreground">
                    No posts yet. Be the first to create one!
                  </p>
                )}

                {/* Pagination */}
                {latestData && latestData.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Button
                      variant="outline"
                      size="default"
                      className="border border-border hover:bg-muted/50 text-[13px]"
                      onClick={() => setLatestPage((p) => Math.max(1, p - 1))}
                      disabled={latestPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-[13px] text-muted-foreground">
                      Page {latestPage} of {latestData.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="default"
                      className="border border-border hover:bg-muted/50 text-[13px]"
                      onClick={() => setLatestPage((p) => Math.min(latestData.pages, p + 1))}
                      disabled={latestPage >= latestData.pages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <AnnouncementsPanel />
      </div>
    </div>
  );
}

/* ─── Featured card ─────────────────────────────────────────── */

function FeaturedCard({ post }: { post: Post }) {
  const router = useRouter();
  const authorName =
    typeof post.authorId === 'object' ? post.authorId.displayName : 'Unknown';
  const postUrl = `/posts/${post._id}`;

  return (
    <div
      className="w-[320px] shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-colors hover:bg-muted/20 border-b-2 border-b-primary"
      onClick={() => router.push(postUrl)}
    >
      <div className="p-3.5">
        <h3 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
          {post.title}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground line-clamp-2">{post.bodyText}</p>
        <div className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <span>{authorName}</span>
          <span>·</span>
          <span>{post.likeCount} likes</span>
        </div>
      </div>
    </div>
  );
}
