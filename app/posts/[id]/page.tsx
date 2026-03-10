'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { PostCard } from '@/components/post/post-card';
import { CommentsSection } from '@/components/post/comments-section';
import { usePost } from '@/lib/api/posts';
import { useOrganization } from '@/lib/api/organizations';
import { useAppSelector } from '@/store/hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-muted/20">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="flex w-full max-w-5xl flex-col gap-6 px-5 py-7 lg:px-7">
            {/* Back button */}
            <Button
              variant="ghost"
              size="default"
              onClick={() => router.back()}
              className="w-fit gap-2.5 text-[17px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </Button>

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
                <Card className="overflow-hidden rounded-xl border-border/60 bg-white shadow-sm">
                  <CommentsSection postId={postId} orgAccessRole={orgAccessRole} />
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
