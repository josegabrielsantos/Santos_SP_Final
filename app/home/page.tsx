'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { AnnouncementBanner } from '@/components/home/announcement-banner';
import { ArticleListItem, ArticleListItemSkeleton } from '@/components/home/article-list-item';
import { CreatePostTrigger } from '@/components/post/create-post-trigger';
import { usePosts, useFeaturedPosts, useRecommendedPosts } from '@/lib/api/posts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Clock,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileText,
  Users,
  BookOpen,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useJoinRoom, useSocketEvent } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import type { Post } from '@/lib/types';

export default function HomePage() {
  const [latestPage, setLatestPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);
  const { data: latestData, isLoading: latestLoading, isError: latestError } = usePosts({ page: latestPage, limit: 20, sort: 'new' });
  const { data: popularData, isLoading: popularLoading, isError: popularError } = usePosts({ page: popularPage, limit: 20, sort: 'hot' });
  const { data: recData, isLoading: recLoading } = useRecommendedPosts();
  const { data: featuredPosts } = useFeaturedPosts();
  const user = useAppSelector((s) => s.auth.user);
  const queryClient = useQueryClient();
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);

  useJoinRoom('home');

  useSocketEvent('post:new', () => {
    setNewPostsAvailable(true);
  });

  useSocketEvent('post:deleted', () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  });

  const handleRefreshFeed = () => {
    setNewPostsAvailable(false);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    queryClient.invalidateQueries({ queryKey: ['posts', 'recommended'] });
    setLatestPage(1);
    setPopularPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const rightPanel = (
    <div className="flex flex-col gap-4">
      {/* Recommended For You */}
      {recData && recData.posts.length > 0 && (
        <Card className="border border-border/60">
          <CardContent className="p-4">
            <h3 className="text-section-title text-[14px] mb-3">Recommended For You</h3>
            <div className="flex flex-col gap-2.5">
              {recData.posts.slice(0, 5).map((post) => (
                <RecommendedItem key={post._id} post={post} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border border-border/60">
        <CardContent className="p-4">
          <h3 className="text-section-title text-[14px] mb-3">Quick Links</h3>
          <div className="flex flex-col gap-1.5">
            <QuickLink href="/papers" icon={<BookOpen className="h-3.5 w-3.5" />} label="Browse Publications" />
            <QuickLink href="/organizations" icon={<Building2 className="h-3.5 w-3.5" />} label="Research Groups" />
            <QuickLink href="/analytics" icon={<TrendingUp className="h-3.5 w-3.5" />} label="Research Insights" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AuthenticatedLayout rightPanel={rightPanel}>
      {/* Announcement banner */}
      <AnnouncementBanner />

      {/* Featured Articles */}
      {featuredPosts && featuredPosts.length > 0 && (
        <section className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-kain-amber" />
            <h2 className="text-section-title text-[15px]">Featured</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPosts.slice(0, 3).map((fp) => (
              <FeaturedCard key={fp._id} post={fp} />
            ))}
          </div>
        </section>
      )}

      {/* Create post + Feed */}
      <div className="mt-5 flex items-center justify-between">
        <CreatePostTrigger />
      </div>

      {/* Feed tabs */}
      <Tabs defaultValue="latest" className="mt-4" onValueChange={() => setNewPostsAvailable(false)}>
        <TabsList className="w-full justify-start bg-transparent p-0 h-auto border-b border-border/50">
          <TabsTrigger
            value="latest"
            className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2.5 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Clock className="h-3.5 w-3.5" />
            Recent
          </TabsTrigger>
          <TabsTrigger
            value="popular"
            className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2.5 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Most Read
          </TabsTrigger>
        </TabsList>

        {newPostsAvailable && (
          <button
            onClick={handleRefreshFeed}
            className="mt-2 w-full rounded-md border border-primary/20 bg-primary/5 px-4 py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/10"
          >
            New publications available — click to refresh
          </button>
        )}

        {/* Recent tab */}
        <TabsContent value="latest" className="mt-0">
          <Card className="border border-border/50 bg-white">
            <CardContent className="p-5">
              {latestLoading && (
                <div>
                  {[1, 2, 3, 4].map((i) => <ArticleListItemSkeleton key={i} />)}
                </div>
              )}

              {latestError && (
                <p className="py-6 text-center text-[13px] text-destructive">Failed to load publications.</p>
              )}

              <AnimatePresence>
                {latestData?.posts.map((post, i) => (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.12 }}
                  >
                    <ArticleListItem post={post} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {latestData && latestData.posts.length === 0 && !latestLoading && (
                <p className="py-10 text-center text-[13px] text-muted-foreground">
                  No publications yet. Be the first to submit one.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {latestData && latestData.pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                className="text-[12px]"
                onClick={() => setLatestPage((p) => Math.max(1, p - 1))}
                disabled={latestPage <= 1}
              >
                Previous
              </Button>
              <span className="text-[12px] text-muted-foreground">
                Page {latestPage} of {latestData.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-[12px]"
                onClick={() => setLatestPage((p) => Math.min(latestData.pages, p + 1))}
                disabled={latestPage >= latestData.pages}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Most Read tab */}
        <TabsContent value="popular" className="mt-0">
          <Card className="border border-border/50 bg-white">
            <CardContent className="p-5">
              {popularLoading && (
                <div>
                  {[1, 2, 3, 4].map((i) => <ArticleListItemSkeleton key={i} />)}
                </div>
              )}

              {popularError && (
                <p className="py-6 text-center text-[13px] text-destructive">Failed to load publications.</p>
              )}

              <AnimatePresence>
                {popularData?.posts.map((post, i) => (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.12 }}
                  >
                    <ArticleListItem post={post} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {popularData && popularData.posts.length === 0 && !popularLoading && (
                <p className="py-10 text-center text-[13px] text-muted-foreground">
                  No publications yet. Be the first to submit one.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {popularData && popularData.pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                className="text-[12px]"
                onClick={() => setPopularPage((p) => Math.max(1, p - 1))}
                disabled={popularPage <= 1}
              >
                Previous
              </Button>
              <span className="text-[12px] text-muted-foreground">
                Page {popularPage} of {popularData.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-[12px]"
                onClick={() => setPopularPage((p) => Math.min(popularData.pages, p + 1))}
                disabled={popularPage >= popularData.pages}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AuthenticatedLayout>
  );
}

/* ─── Featured card ─────────────────────────────────────────── */

function FeaturedCard({ post }: { post: Post }) {
  const router = useRouter();
  const authorName =
    typeof post.authorId === 'object' ? post.authorId.displayName : 'Unknown';
  const orgName =
    typeof post.organizationId === 'object' && post.organizationId
      ? post.organizationId.name
      : null;

  return (
    <div
      className="card-accent cursor-pointer overflow-hidden rounded-lg border border-border/60 bg-white transition-all hover:shadow-md hover:border-primary/30"
      onClick={() => router.push(`/posts/${post._id}`)}
    >
      <div className="p-4">
        {orgName && (
          <span className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Building2 className="h-3 w-3" />
            {orgName}
          </span>
        )}
        <h3 className="font-heading text-[14px] font-semibold leading-snug text-foreground line-clamp-2">
          {post.title}
        </h3>
        <p className="mt-1.5 text-[12px] text-muted-foreground line-clamp-2">{post.bodyText}</p>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <span>{authorName}</span>
          <span>·</span>
          <span>{post.likeCount} likes</span>
          <span>·</span>
          <span>{post.commentCount} comments</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Recommended item ───────────────────────────────────────── */

function RecommendedItem({ post }: { post: Post }) {
  const router = useRouter();
  return (
    <button
      className="w-full text-left rounded-md p-2 -mx-2 transition-colors hover:bg-muted/50"
      onClick={() => router.push(`/posts/${post._id}`)}
    >
      <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
        {post.title}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {typeof post.authorId === 'object' ? post.authorId.displayName : 'Unknown'}
      </p>
    </button>
  );
}

/* ─── Quick link ─────────────────────────────────────────────── */

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
    >
      {icon}
      {label}
    </button>
  );
}
