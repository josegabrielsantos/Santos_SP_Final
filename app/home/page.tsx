'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { AnnouncementBannerCompact } from '@/components/home/announcement-banner';
import { ArticleListItem, ArticleListItemSkeleton } from '@/components/home/article-list-item';
import { CreatePostTrigger } from '@/components/post/create-post-trigger';
import { NumberedPagination } from '@/components/ui/numbered-pagination';
import { usePosts, useFeaturedPosts, useRecommendedPosts } from '@/lib/api/posts';
import { useOrganizations } from '@/lib/api/organizations';
import { usePapers } from '@/lib/api/papers';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Clock,
  TrendingUp,
  Sparkles,
  Building2,
  Search,
  FileText,
  Users,
  BarChart2,
  ArrowRight,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { useJoinRoom, useSocketEvent } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { TopicBadge } from '@/components/ui/topic-badge';
import { RESEARCH_TOPICS } from '@/lib/constants/research-topics';
import type { Post } from '@/lib/types';

export default function HomePage() {
  const [latestPage, setLatestPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);
  const [activeTopic, setActiveTopic] = useState<string | undefined>(undefined);
  const { data: latestData, isLoading: latestLoading, isError: latestError } = usePosts({ page: latestPage, limit: 20, sort: 'new', topic: activeTopic });
  const { data: popularData, isLoading: popularLoading, isError: popularError } = usePosts({ page: popularPage, limit: 20, sort: 'hot', topic: activeTopic });
  const { data: totalPostsData } = usePosts({ page: 1, limit: 1, sort: 'new' });
  const { data: recData, isLoading: recLoading } = useRecommendedPosts();
  const { data: featuredPosts } = useFeaturedPosts();
  const { data: statsOrgs } = useOrganizations({ page: 1, limit: 1 });
  const { data: statsPapers } = usePapers({ page: 1, limit: 1 });
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

  const sidebarTop = <AnnouncementBannerCompact />;

  const sidebarBottom = (
    <div className="flex flex-col gap-4">
      {/* Recommended For You */}
      {recData && recData.posts.length > 0 && (
        <div>
          <h3 className="text-section-title text-[14px] mb-3">Recommended For You</h3>
          <div className="flex flex-col gap-2.5">
            {recData.posts.slice(0, 5).map((post) => (
              <RecommendedItem key={post._id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AuthenticatedLayout rightSidebarTop={sidebarTop} rightSidebarBottom={sidebarBottom}>
      {/* Welcome + Quick Search row — breaks out of layout padding to go edge-to-edge */}
      <div className="relative overflow-hidden -mx-5 -mt-7 mb-5 lg:-mx-7">
        {/* Background image */}
        <Image
          src="/homepage_background.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay */}
        <div className="pointer-events-none absolute inset-0 bg-black/25" />

        <div className="relative mx-auto grid max-w-6xl gap-4 px-5 py-7 md:grid-cols-2 lg:px-7">
          {/* Welcome message */}
          <Card className="border border-white/20 bg-white/55 backdrop-blur-md shadow-sm">
            <CardContent className="p-5">
              <h2 className="font-heading text-[20px] font-bold text-gray-900">
                Welcome, {user?.displayName?.split(' ')[0] || 'Researcher'}!
              </h2>
              <p className="mt-2.5 text-[13px] leading-relaxed text-gray-700">
                Welcome to the Interdisciplinary Studies Center - Food and Nutrition Security (ICS-FaNS) Knowledge Hub, your gateway to pioneering research in food security, nutrition, and agricultural science. This platform is dedicated to empowering researchers, students, and stakeholders by providing seamless access to valuable research, fostering collaboration, and promoting innovation.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-primary/15 px-3 py-2.5 text-center">
                  <p className="text-[18px] font-bold text-primary">{totalPostsData?.total ?? '—'}</p>
                  <p className="text-[10px] font-medium text-gray-600">Posts</p>
                </div>
                <div className="rounded-lg bg-kain-green/15 px-3 py-2.5 text-center">
                  <p className="text-[18px] font-bold text-kain-green">{statsPapers?.total ?? '—'}</p>
                  <p className="text-[10px] font-medium text-gray-600">Papers</p>
                </div>
                <div className="rounded-lg bg-primary/15 px-3 py-2.5 text-center">
                  <p className="text-[18px] font-bold text-primary">{statsOrgs?.total ?? '—'}</p>
                  <p className="text-[10px] font-medium text-gray-600">Organizations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Search links */}
          <Card className="border border-white/20 bg-white/55 backdrop-blur-md shadow-sm">
            <CardContent className="p-5">
            <h3 className="font-heading text-[15px] font-semibold text-gray-900 mb-3">
              Start Exploring
            </h3>
            <div className="flex flex-col gap-2">
              <Link
                href="/search"
                className="flex items-center gap-3 rounded-lg p-2.5 -mx-1 text-[13px] font-medium text-gray-800 transition-colors hover:bg-white/40 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary shrink-0">
                  <Search className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span>Search posts and papers</span>
                  <p className="text-[11px] text-gray-600 font-normal">Find research by keyword, author, or topic</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
              </Link>
              <Link
                href="/papers"
                className="flex items-center gap-3 rounded-lg p-2.5 -mx-1 text-[13px] font-medium text-gray-800 transition-colors hover:bg-white/40 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-kain-green/20 text-kain-green shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span>Browse the paper library</span>
                  <p className="text-[11px] text-gray-600 font-normal">Explore curated research on food and nutrition security</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
              </Link>
              <Link
                href="/organizations"
                className="flex items-center gap-3 rounded-lg p-2.5 -mx-1 text-[13px] font-medium text-gray-800 transition-colors hover:bg-white/40 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span>Join an organization</span>
                  <p className="text-[11px] text-gray-600 font-normal">Connect with research groups and collaborators</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
              </Link>
              <Link
                href="/analytics"
                className="flex items-center gap-3 rounded-lg p-2.5 -mx-1 text-[13px] font-medium text-gray-800 transition-colors hover:bg-white/40 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary shrink-0">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span>Discover research trends</span>
                  <p className="text-[11px] text-gray-600 font-normal">View analytics and insights across FaNS topics</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
              </Link>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

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

      {/* ── Share & Discover section ── */}
      <div className="mt-6 rounded-xl border border-border/60 bg-white p-5">
        {/* Share prompt + button */}
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-[16px] font-semibold text-foreground">
              Share Your Knowledge
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Contribute a post to the community — share findings, insights, or questions.
            </p>
          </div>
          <CreatePostTrigger />
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-border/50" />

        {/* Topic filter */}
        <div>
          <h3 className="text-[13px] font-semibold text-foreground mb-2.5">
            Filter by Topic
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveTopic(undefined); setLatestPage(1); setPopularPage(1); }}
              className={`shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-all ${!activeTopic ? 'border-primary bg-primary text-white font-semibold shadow-sm' : 'border-primary/35 bg-primary/10 text-primary hover:shadow-sm'}`}
            >
              All Topics
            </button>
            {RESEARCH_TOPICS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setActiveTopic(activeTopic === t.id ? undefined : t.id); setLatestPage(1); setPopularPage(1); }}
                className="shrink-0"
              >
                <TopicBadge topicId={t.id} size="md" active={activeTopic === t.id} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed tabs */}
      <Tabs defaultValue="latest" className="mt-5" onValueChange={() => setNewPostsAvailable(false)}>
        <TabsList className="w-full justify-start bg-transparent p-0 h-auto border-b border-border/50">
          <TabsTrigger
            value="latest"
            className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2.5 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Clock className="h-3.5 w-3.5" />
            Read the Latest
          </TabsTrigger>
          <TabsTrigger
            value="popular"
            className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2.5 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            See What's Trending
          </TabsTrigger>
        </TabsList>

        {newPostsAvailable && (
          <button
            onClick={handleRefreshFeed}
            className="mt-2 w-full rounded-md border border-primary/20 bg-primary/5 px-4 py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/10"
          >
            New posts available — click to refresh
          </button>
        )}

        {/* Recent tab */}
        <TabsContent value="latest" className="mt-0">
          {latestLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => <ArticleListItemSkeleton key={i} />)}
            </div>
          )}

          {latestError && (
            <p className="py-6 text-center text-[13px] text-destructive">Failed to load posts.</p>
          )}

          <div className="flex flex-col gap-3">
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
          </div>

          {latestData && latestData.posts.length === 0 && !latestLoading && (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No posts yet. Be the first to submit one.
            </p>
          )}

          {/* Pagination */}
          {latestData && latestData.pages > 1 && (
            <NumberedPagination
              currentPage={latestPage}
              totalPages={latestData.pages}
              onPageChange={setLatestPage}
            />
          )}
        </TabsContent>

        {/* Most Read tab */}
        <TabsContent value="popular" className="mt-0">
          {popularLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => <ArticleListItemSkeleton key={i} />)}
            </div>
          )}

          {popularError && (
            <p className="py-6 text-center text-[13px] text-destructive">Failed to load posts.</p>
          )}

          <div className="flex flex-col gap-3">
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
          </div>

          {popularData && popularData.posts.length === 0 && !popularLoading && (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No posts yet. Be the first to submit one.
            </p>
          )}

          {/* Pagination */}
          {popularData && popularData.pages > 1 && (
            <NumberedPagination
              currentPage={popularPage}
              totalPages={popularData.pages}
              onPageChange={setPopularPage}
            />
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

