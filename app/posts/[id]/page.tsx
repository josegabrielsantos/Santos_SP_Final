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
import { usePapersByIds, useRelatedPapers, useDownloadPaper } from '@/lib/api/papers';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, FileText, Download, BookOpen, Calendar, Hash, Eye } from 'lucide-react';
import type { Paper } from '@/lib/types';

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
  // If post has no org, role stays 'member' (unrestricted)

  // Redirect to home if post not found / deleted
  useEffect(() => {
    if (!isLoading && isError) {
      router.replace('/home');
    }
  }, [isLoading, isError, router]);

  return (
    <AuthenticatedLayout>
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

            {/* Related Papers */}
            <RelatedPapers postId={post._id} paperIds={post.paperIds || []} />

            {/* Discussion section */}
            <div className="rounded-lg border border-border/50 bg-white">
              <CommentsSection postId={postId} orgAccessRole={orgAccessRole} commentCount={post.commentCount} isOrgAdmin={isOrgAdmin} />
            </div>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

function PaperItem({ paper, downloadMutation }: { paper: Paper; downloadMutation: ReturnType<typeof useDownloadPaper> }) {
  const handleDownload = async () => {
    try {
      await downloadMutation.mutateAsync(paper._id);
    } catch {
      // Ignore download errors silently
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3 min-w-0">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
        <div className="min-w-0">
          <p className="font-heading text-[14px] font-semibold text-foreground leading-snug">{paper.title}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {[
              paper.authors?.length > 0 ? paper.authors.join(', ') : null,
              paper.journal,
              paper.year,
              paper.doi ? `DOI: ${paper.doi}` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      {paper.fileUrl && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[12px] h-7"
            onClick={() => window.open(paper.fileUrl!, '_blank')}
          >
            <Eye className="h-3 w-3" />
            View
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-[12px] h-7 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => handleDownload()}
            disabled={downloadMutation.isPending}
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        </div>
      )}
    </div>
  );
}

function RelatedPapers({ postId, paperIds }: { postId: string; paperIds: string[] }) {
  const { data: attachedPapers, isLoading: loadingAttached } = usePapersByIds(paperIds);
  const { data: discoveredData, isLoading: loadingDiscovered } = useRelatedPapers(postId);
  const downloadMutation = useDownloadPaper();

  const discovered = discoveredData?.papers || [];
  const attached = attachedPapers || [];
  const isLoading = loadingAttached || loadingDiscovered;

  // Nothing to show at all
  if (!isLoading && attached.length === 0 && discovered.length === 0) return null;

  // Still loading
  if (isLoading && attached.length === 0 && discovered.length === 0) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="rounded-lg border border-border/50 bg-white p-5">
      {/* Attached papers section */}
      {attached.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-primary/60" />
            <h2 className="font-heading text-[15px] font-semibold text-foreground">Attached Papers</h2>
          </div>
          <div className="flex flex-col divide-y divide-border/40">
            {attached.map((paper: Paper) => (
              <PaperItem key={paper._id} paper={paper} downloadMutation={downloadMutation} />
            ))}
          </div>
        </>
      )}

      {/* Auto-discovered papers section */}
      {discovered.length > 0 && (
        <>
          {attached.length > 0 && <div className="my-4 border-t border-border/30" />}
          <div className="flex items-center gap-2 mb-4">
            <Hash className="h-4 w-4 text-primary/60" />
            <h2 className="font-heading text-[15px] font-semibold text-foreground">You Might Also Read</h2>
          </div>
          <div className="flex flex-col divide-y divide-border/40">
            {discovered.map((paper: Paper) => (
              <PaperItem key={paper._id} paper={paper} downloadMutation={downloadMutation} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
