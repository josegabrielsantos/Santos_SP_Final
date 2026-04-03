'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PostCard } from '@/components/post/post-card';
import { CommentsSection } from '@/components/post/comments-section';
import { usePost } from '@/lib/api/posts';
import { useOrganization } from '@/lib/api/organizations';
import { useJoinRoom, useSocketEvent } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useRelatedPapers, useDownloadPaper } from '@/lib/api/papers';
import { useAIInsight, useRelatedPosts } from '@/lib/api/insights';
import { useAppSelector } from '@/store/hooks';
import { Loader2, ArrowLeft } from 'lucide-react';
import { InsightsSidebar } from './components/InsightsSidebar';
import { RelatedInsightsMobile } from './components/RelatedInsights';

export default function PostDiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const { data: post, isLoading, isError } = usePost(postId);

  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;
  const queryClient = useQueryClient();

  // Join post room for real-time updates
  useJoinRoom(postId ? `post:${postId}` : null);

  // Live post like/save count updates from other users
  useSocketEvent<{ postId: string; authorId: string }>('post:updated', (data) => {
    if (data.postId !== postId || data.authorId === userId) return;
    queryClient.invalidateQueries({ queryKey: ['posts', postId] });
  });

  // Live comment count updates
  useSocketEvent<{ postId: string; authorId: string }>('comment:new', (data) => {
    if (data.postId !== postId || data.authorId === userId) return;
    queryClient.invalidateQueries({ queryKey: ['posts', postId] });
  });

  // Fetch org data if this post belongs to an org (for access role computation)
  const orgSlug = typeof post?.organizationId === 'object' && post?.organizationId ? post.organizationId.slug : undefined;
  const { data: org } = useOrganization(orgSlug);

  // Compute org access role
  let orgAccessRole: 'member' | 'follower' | 'none' = 'member';
  let isOrgAdmin = false;
  if (org && userId) {
    const isOwner = org.ownerId?._id === userId;
    const isAdmin = org.adminIds.some((a) => a._id === userId);
    const isMember = org.memberIds.some((m) => m._id === userId);
    const isFollower = org.followerIds?.includes(userId);
    orgAccessRole = (isOwner || isAdmin || isMember) ? 'member' : isFollower ? 'follower' : 'none';
    isOrgAdmin = isOwner || isAdmin;
  } else if (org && !userId) {
    orgAccessRole = 'none';
  }

  // ── Insight data (shared between sidebar + mobile fallback) ────
  const { data: aiInsight, isLoading: loadingAI } = useAIInsight(post?._id);
  const { data: relatedPosts, isLoading: loadingPosts } = useRelatedPosts(post?._id);
  const { data: discoveredData, isLoading: loadingPapers } = useRelatedPapers(post?._id);
  const downloadMutation = useDownloadPaper();

  const discovered = discoveredData?.papers || [];
  const relatedPostsList = relatedPosts || [];

  // Redirect to home if post not found / deleted
  useEffect(() => {
    if (!isLoading && isError) {
      router.replace('/home');
    }
  }, [isLoading, isError, router]);

  return (
    <AuthenticatedLayout
      rightSidebarTop={
        post ? (
          <InsightsSidebar
            aiInsight={aiInsight}
            loadingAI={loadingAI}
            relatedPosts={relatedPostsList}
            loadingPosts={loadingPosts}
            discoveredPapers={discovered}
            loadingPapers={loadingPapers}
            downloadMutation={downloadMutation}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to feed
        </button>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="flex justify-center py-18">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <p className="py-12 text-center text-[14px] text-destructive">
            Failed to load post.
          </p>
        )}

        {/* Article content */}
        {post && (
          <>
            <PostCard post={post} orgAccessRole={orgAccessRole} isOrgAdmin={isOrgAdmin} isDetailView />

            {/* Discussion section */}
            <div className="rounded-lg border border-border/50 bg-white">
              <CommentsSection postId={postId} orgAccessRole={orgAccessRole} commentCount={post.commentCount} isOrgAdmin={isOrgAdmin} />
            </div>

            {/* Mobile/tablet fallback — hidden on xl where sidebar is used */}
            <RelatedInsightsMobile
              aiInsight={aiInsight}
              loadingAI={loadingAI}
              relatedPosts={relatedPostsList}
              loadingPosts={loadingPosts}
              discoveredPapers={discovered}
              loadingPapers={loadingPapers}
              downloadMutation={downloadMutation}
            />
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
