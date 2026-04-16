'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PostCard } from '@/components/post/post-card';
import { usePost } from '@/lib/api/posts';
import { useOrganization, useApprovePost, useRejectPost } from '@/lib/api/organizations';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Check, X, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PendingPostReviewPage() {
  return (
    <Suspense>
      <PendingPostReviewContent />
    </Suspense>
  );
}

function PendingPostReviewContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = params.id as string;
  const orgSlugParam = searchParams.get('org');

  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;

  const { data: post, isLoading: postLoading, isError: postError } = usePost(postId);

  // Derive org slug from the post's organizationId or from query param
  const orgSlug =
    (typeof post?.organizationId === 'object' && post?.organizationId
      ? post.organizationId.slug
      : undefined) || orgSlugParam || undefined;

  const { data: org, isLoading: orgLoading } = useOrganization(orgSlug);

  const orgId = org?._id;
  const orgName = org?.name;

  // Auth guard: must be admin or owner
  const isOwner = userId && org?.ownerId?._id === userId;
  const isAdmin = org?.adminIds.some((a) => a._id === userId);
  const canManage = isOwner || isAdmin;

  // Redirect if not authorized once data loads
  useEffect(() => {
    if (!postLoading && !orgLoading && org && !canManage) {
      router.replace('/home');
    }
  }, [postLoading, orgLoading, org, canManage, router]);

  // Redirect if post is not pending (already moderated)
  useEffect(() => {
    if (post && post.status !== 'pending') {
      if (post.status === 'published') {
        router.replace(`/posts/${postId}`);
      } else {
        router.replace(orgSlug ? `/organizations/${orgSlug}?tab=pending` : '/home');
      }
    }
  }, [post, postId, orgSlug, router]);

  // Approve / Reject mutations
  const approvePost = useApprovePost();
  const rejectPost = useRejectPost();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = () => {
    if (!orgId) return;
    approvePost.mutate(
      { orgId, postId },
      {
        onSuccess: () => {
          toast.success('Post approved and published.');
          router.push(`/organizations/${orgSlug}?tab=pending`);
        },
      }
    );
  };

  const handleReject = () => {
    if (!orgId) return;
    rejectPost.mutate(
      { orgId, postId, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          toast.success('Post rejected.');
          setRejectDialogOpen(false);
          setRejectReason('');
          router.push(`/organizations/${orgSlug}?tab=pending`);
        },
      }
    );
  };

  const isLoading = postLoading || orgLoading;

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col gap-5">
        {/* Back button — always goes to org pending tab */}
        <Link
          href={orgSlug ? `/organizations/${orgSlug}?tab=pending` : '/home'}
          className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {orgName ? `Back to ${orgName} Pending Posts` : 'Back'}
        </Link>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-18">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {postError && (
          <p className="py-12 text-center text-[14px] text-destructive">
            Failed to load post.
          </p>
        )}

        {/* Content */}
        {post && post.status === 'pending' && canManage && (
          <>
            {/* Moderation banner */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[12px] font-semibold px-2.5 py-0.5">
                        Pending Review
                      </Badge>
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Review this post before publishing it to the community.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="default"
                    className="gap-1.5 text-[14px] bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleApprove}
                    disabled={approvePost.isPending}
                  >
                    {approvePost.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className="gap-1.5 text-[14px] text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={rejectPost.isPending}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>

            {/* Full post */}
            <PostCard post={post} isDetailView isReview />
          </>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogOpen(false);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Post</DialogTitle>
            <DialogDescription>
              Reject <span className="font-semibold text-foreground">&ldquo;{post?.title}&rdquo;</span>?
              Optionally provide a reason that will be sent to the author.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-[15px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectPost.isPending}
              onClick={handleReject}
            >
              {rejectPost.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Reject Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
