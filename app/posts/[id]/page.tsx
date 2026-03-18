'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { PostCard } from '@/components/post/post-card';
import { CommentsSection } from '@/components/post/comments-section';
import { usePost } from '@/lib/api/posts';
import { useOrganization } from '@/lib/api/organizations';
import { usePapersByIds } from '@/lib/api/papers';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, BookOpen, Download } from 'lucide-react';
import type { Paper } from '@/lib/types';

export default function PostDiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const { data: post, isLoading, isError } = usePost(postId);

  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;

  // Fetch org data if this post belongs to an org (for access role computation)
  const orgSlug = typeof post?.organizationId === 'object' && post?.organizationId ? post.organizationId.slug : undefined;
  const { data: org } = useOrganization(orgSlug);

  // Compute org access role
  let orgAccessRole: 'member' | 'follower' | 'none' = 'member';
  if (org && userId) {
    const isOwner = org.ownerId?._id === userId;
    const isAdmin = org.adminIds.some((a) => a._id === userId);
    const isMember = org.memberIds.some((m) => m._id === userId);
    const isFollower = org.followerIds?.includes(userId);
    orgAccessRole = (isOwner || isAdmin || isMember) ? 'member' : isFollower ? 'follower' : 'none';
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
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="flex w-full max-w-5xl flex-col gap-6 px-5 py-7 lg:px-7">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {/* Loading / Error states */}
            {isLoading && (
              <div className="flex justify-center py-18">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {isError && (
              <p className="py-12 text-center text-[17px] text-destructive">
                Failed to load post.
              </p>
            )}

            {/* Post card */}
            {post && (
              <>
                <PostCard post={post} orgAccessRole={orgAccessRole} />

                {/* Comments section */}
                <Card className="overflow-hidden rounded-xl border-border/60 bg-white ">
                  <CommentsSection postId={postId} orgAccessRole={orgAccessRole} commentCount={post.commentCount} />
                </Card>

                {/* Related Papers */}
                {post.paperIds?.length > 0 && (
                  <RelatedPapers paperIds={post.paperIds} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function RelatedPapers({ paperIds }: { paperIds: string[] }) {
  const { data: papers, isLoading } = usePapersByIds(paperIds);
  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!papers?.length) return null;
  return (
    <div>
      <h2 className="mb-3 text-[18px] font-bold text-foreground">Related Papers</h2>
      <div className="flex flex-col gap-3">
        {papers.map((paper: Paper) => (
          <Card key={paper._id} className="border-border/60 bg-white ">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary/60" />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-foreground leading-snug">{paper.title}</p>
                    {paper.authors?.length > 0 && (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{paper.authors.join(', ')}</p>
                    )}
                    {(paper.year || paper.journal) && (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {[paper.year, paper.journal].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
                {paper.fileUrl && (
                  <a
                    href={paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="outline" size="sm" className="gap-1.5 text-[13px]">
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
