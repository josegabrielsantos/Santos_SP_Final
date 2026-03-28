'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PostCard } from '@/components/post/post-card';
import { CreatePostTrigger } from '@/components/post/create-post-trigger';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useOrganization,
  useOrgPosts,
  useOrgMembers,
  useRequestJoin,
  useLeaveOrg,
  useApproveJoin,
  useRejectJoin,
  usePromoteAdmin,
  useDemoteAdmin,
  useFollowOrg,
  useUnfollowOrg,
  useRemoveMember,
  useOrgPendingPosts,
  useApprovePost,
  useRejectPost,
} from '@/lib/api/organizations';
import { useOrgAnalytics } from '@/lib/api/analytics';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppSelector } from '@/store/hooks';
import { useJoinRoom, useSocketEvent } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  FileText,
  Loader2,
  LogOut,
  UserPlus,
  UserMinus,
  ShieldCheck,
  ShieldMinus,
  Check,
  X,
  Clock,
  Heart,
  HeartOff,
  Image as ImageIcon,
  Inbox,
  BarChart2,
  Settings,
  UploadCloud,
  BookOpen,
  Download,
} from 'lucide-react';
import { BulkImportDialog } from '@/components/paper/bulk-import-dialog';
import { useOrgPapers } from '@/lib/api/papers';
import { CitationButton } from '@/components/paper/citation-button';
import { PaperCard } from '@/components/paper/paper-card';
import type { Paper, UserSummary } from '@/lib/types';

function initials(name: string) {
  return name
    .split(/[\s()]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/* ── Loading skeleton for the full page ── */
function OrgPageSkeleton() {
  return (
    <AuthenticatedLayout>
          <div className="flex flex-col gap-5">
            {/* Header card skeleton */}
            <div className="border border-border rounded-xl overflow-hidden bg-white">
              <Skeleton className="h-52 w-full rounded-none" />
              <div className="p-7 pt-16 flex flex-col gap-3">
                <Skeleton className="h-6 w-56 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <div className="flex gap-5 mt-1">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-22 rounded" />
                </div>
              </div>
            </div>
            {/* Tab bar skeleton */}
            <Skeleton className="h-11 w-full rounded-lg" />
            {/* Post skeletons */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border rounded-xl bg-white p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-3.5 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>
            ))}
          </div>
    </AuthenticatedLayout>
  );
}

/* ── Skeleton for posts loading inside the tab ── */
function PostsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-border rounded-xl bg-white p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </div>
      ))}
    </>
  );
}

export default function OrgDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;

  const { data: org, isLoading: orgLoading } = useOrganization(slug);
  const orgId = org?._id;

  const [postPage, setPostPage] = useState(1);
  const [paperPage, setPaperPage] = useState(1);
  const { data: postsData, isLoading: postsLoading } = useOrgPosts(orgId, { page: postPage });
  const { data: papersData, isLoading: papersLoading, isError: papersError } = useOrgPapers(orgId, { page: paperPage });
  const { data: members } = useOrgMembers(orgId);

  const requestJoin = useRequestJoin();
  const leaveOrg = useLeaveOrg();
  const approveJoin = useApproveJoin();
  const rejectJoin = useRejectJoin();
  const promoteAdmin = usePromoteAdmin();
  const demoteAdmin = useDemoteAdmin();
  const followOrg = useFollowOrg();
  const unfollowOrg = useUnfollowOrg();
  const removeMember = useRemoveMember();
  const approvePost = useApprovePost();
  const rejectPost = useRejectPost();

  const { data: pendingPostsData } = useOrgPendingPosts(orgId);
  const pendingCount = pendingPostsData?.posts.length ?? 0;
  const { data: orgAnalytics } = useOrgAnalytics(orgId);
  const queryClient = useQueryClient();

  // Join org room for real-time updates
  useJoinRoom(orgId ? `org:${orgId}` : null);

  // Membership changes (join/leave/approve/reject)
  useSocketEvent<{ orgId: string }>('org:member-changed', () => {
    queryClient.invalidateQueries({ queryKey: ['organizations', slug] });
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'members'] });
    }
  });

  // Post moderation (approved/rejected)
  useSocketEvent<{ orgId: string; postId: string }>('org:post-moderated', () => {
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'posts', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'posts'] });
    }
  });

  const [descExpanded, setDescExpanded] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ _id: string; displayName: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ postId: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (orgLoading) {
    return <OrgPageSkeleton />;
  }

  if (!org) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center py-20">
          <p className="text-muted-foreground">Organization not found.</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Determine user's role in this org
  const isOwner = userId && org.ownerId?._id === userId;
  const isAdmin = org.adminIds.some((a) => a._id === userId);
  const isMember = org.memberIds.some((m) => m._id === userId);
  const isPending = org.pendingMemberIds?.some((p) =>
    typeof p === 'string' ? p === userId : p._id === userId
  );
  const isFollower = org.followerIds?.includes(userId ?? '');
  const canPost = isOwner || isAdmin || isMember;
  const canManage = isOwner || isAdmin;

  // Access role for post interaction restrictions
  const orgAccessRole: 'member' | 'follower' | 'none' =
    canPost ? 'member' : isFollower ? 'follower' : 'none';

  return (
    <AuthenticatedLayout>
            {/* Org header with banner */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="overflow-hidden rounded-xl border-border/60 bg-white border border-border">
                {/* Banner image — richer maroon gradient fallback */}
                <div className="relative h-52 w-full bg-gradient-to-br from-primary via-primary/80 to-primary/30">
                  {org.bannerImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={org.bannerImage}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    /* Decorative overlay pattern on gradient */
                    <div className="flex h-full w-full items-end justify-end p-6 select-none pointer-events-none">
                      <ImageIcon className="h-14 w-14 text-white/10" />
                    </div>
                  )}
                  {/* Subtle dark scrim at the bottom for text legibility */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                <CardContent className="relative p-7">
                  {/* Avatar overlapping banner */}
                  <div className="absolute -top-12 left-7">
                    <Avatar className="h-[92px] w-[92px] ring-4 ring-white ">
                      <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                      <AvatarFallback className="bg-primary/10 text-[23px] font-bold text-primary">
                        {initials(org.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="mt-10 flex items-start justify-between">
                    <div className="flex flex-1 flex-col gap-1">
                      <h1 className="font-heading text-[23px] font-bold text-foreground">{org.name}</h1>
                      {/* Category badge */}
                      {(org as any).category && (
                        <span className="inline-flex w-fit items-center rounded-full bg-kain-green-light px-2.5 py-0.5 text-[12px] font-medium text-kain-green mb-0.5">
                          {(org as any).category}
                        </span>
                      )}
                      {org.description && (() => {
                        const isLong = org.description!.length > 160;
                        return (
                          <div>
                            <p className="text-[16px] text-muted-foreground">
                              {isLong && !descExpanded ? org.description!.slice(0, 160) + '…' : org.description}
                            </p>
                            {isLong && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDescExpanded(!descExpanded); }}
                                className="mt-0.5 text-[14px] font-medium text-primary hover:underline"
                              >
                                {descExpanded ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                      <div className="mt-2.5 flex items-center gap-5">
                        <span className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
                          <Users className="h-3.5 w-3.5" /> {org.memberCount} members
                        </span>
                        <span className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" /> {org.postCount} posts
                        </span>
                        <span className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
                          <Heart className="h-3.5 w-3.5" /> {members?.followerCount ?? org.followerIds?.length ?? 0} followers
                        </span>
                      </div>
                      {org.welcomeMessage && (
                        <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-[15px] text-foreground/80 italic">
                          {org.welcomeMessage}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Settings button (owner/admin only) */}
                      {canManage && (
                        <Link href={`/organizations/${slug}/settings`}>
                          <Button variant="outline" size="sm" className="gap-2 text-[14px]">
                            <Settings className="h-4 w-4" />
                            Settings
                          </Button>
                        </Link>
                      )}

                      {/* Import CSV button (owner/admin only) */}
                      {canManage && orgId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-[14px]"
                          onClick={() => setShowBulkImport(true)}
                        >
                          <UploadCloud className="h-4 w-4" />
                          Import CSV
                        </Button>
                      )}

                      {/* Follow/Unfollow button (non-members can follow) */}
                      {userId && !isOwner && !isAdmin && !isMember && (
                        isFollower ? (
                          <Button
                            variant="outline"
                            size="default"
                            className="gap-2 text-[14px]"
                            onClick={() => orgId && unfollowOrg.mutate(orgId)}
                            disabled={unfollowOrg.isPending}
                          >
                            <HeartOff className="h-4 w-4" />
                            Unfollow
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="default"
                            className="gap-2 text-[14px]"
                            onClick={() => orgId && followOrg.mutate(orgId)}
                            disabled={followOrg.isPending}
                          >
                            <Heart className="h-4 w-4" />
                            Follow
                          </Button>
                        )
                      )}

                      {/* Join/Leave/Pending */}
                      {!userId ? null : isOwner || isAdmin || isMember ? (
                        <Button
                          variant="outline"
                          size="default"
                          className="gap-2 text-[14px]"
                          onClick={() => orgId && leaveOrg.mutate(orgId)}
                          disabled={leaveOrg.isPending || !!isOwner}
                        >
                          <LogOut className="h-4 w-4" />
                          {isOwner ? 'Owner' : 'Leave'}
                        </Button>
                      ) : isPending ? (
                        <Button
                          variant="outline"
                          size="default"
                          className="gap-2 text-[14px]"
                          onClick={() => orgId && leaveOrg.mutate(orgId)}
                          disabled={leaveOrg.isPending}
                        >
                          {leaveOrg.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          Cancel Request
                        </Button>
                      ) : (
                        <Button
                          size="default"
                          className="gap-2 text-[14px]"
                          onClick={() => orgId && requestJoin.mutate(orgId)}
                          disabled={requestJoin.isPending}
                        >
                          <UserPlus className="h-4 w-4" />
                          Request to Join
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Kick member confirmation dialog */}
            <Dialog open={!!kickTarget} onOpenChange={(open) => { if (!open) setKickTarget(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove Member</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove{' '}
                    <span className="font-semibold text-foreground">{kickTarget?.displayName}</span>{' '}
                    from this organization? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setKickTarget(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={removeMember.isPending}
                    onClick={() => {
                      if (orgId && kickTarget) {
                        removeMember.mutate(
                          { orgId, userId: kickTarget._id },
                          { onSuccess: () => setKickTarget(null) }
                        );
                      }
                    }}
                  >
                    {removeMember.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                    Remove Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Reject post confirmation dialog */}
            <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Post</DialogTitle>
                  <DialogDescription>
                    Reject <span className="font-semibold text-foreground">&ldquo;{rejectTarget?.title}&rdquo;</span>? Optionally provide a reason that will be sent to the author.
                  </DialogDescription>
                </DialogHeader>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (optional)…"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-[15px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={rejectPost.isPending}
                    onClick={() => {
                      if (orgId && rejectTarget) {
                        rejectPost.mutate(
                          { orgId, postId: rejectTarget.postId, reason: rejectReason || undefined },
                          { onSuccess: () => { setRejectTarget(null); setRejectReason(''); } }
                        );
                      }
                    }}
                  >
                    {rejectPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Reject Post
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Tabs */}
            <Tabs defaultValue="posts" className="mt-4">
              <TabsList className="w-full justify-start rounded-lg border border-border/60 bg-white p-0 border border-border h-auto">
                <TabsTrigger
                  value="posts"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <FileText className="h-4 w-4" />
                  Posts
                </TabsTrigger>
                <TabsTrigger
                  value="papers"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <BookOpen className="h-4 w-4" />
                  Papers
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <Users className="h-4 w-4" />
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value="followers"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <Heart className="h-4 w-4" />
                  Followers
                </TabsTrigger>
                {canManage && (
                  <TabsTrigger
                    value="requests"
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    <Clock className="h-4 w-4" />
                    Join Requests
                  </TabsTrigger>
                )}
                {canManage && (
                  <TabsTrigger
                    value="pending"
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    <Inbox className="h-4 w-4" />
                    Pending Posts
                    {pendingCount > 0 && (
                      <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-kain-amber text-[11px] font-bold text-white">
                        {pendingCount}
                      </span>
                    )}
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="analytics"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <BarChart2 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Posts tab */}
              <TabsContent value="posts" className="mt-4 flex flex-col gap-4">
                {canPost && (
                  <CreatePostTrigger orgName={org.name} defaultOrgId={orgId} />
                )}

                {/* Posts loading skeleton */}
                {postsLoading && <PostsSkeleton />}

                <AnimatePresence>
                  {!postsLoading && postsData?.posts.map((post, index) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.22 }}
                    >
                      <PostCard post={post} orgAccessRole={orgAccessRole} isOrgAdmin={canManage} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {postsData && postsData.posts.length === 0 && (
                  <p className="py-8 text-center text-[16px] text-muted-foreground">
                    No posts yet.
                  </p>
                )}

                {postsData && postsData.pages > 1 && (
                  <div className="flex items-center justify-center gap-2.5 py-5">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                      disabled={postPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-[14px] text-muted-foreground">
                      Page {postPage} of {postsData.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setPostPage((p) => Math.min(postsData.pages, p + 1))}
                      disabled={postPage >= postsData.pages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Papers tab */}
              <TabsContent value="papers" className="mt-4 flex flex-col gap-4">
                {papersLoading && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="border border-border rounded-xl bg-white p-5 flex flex-col gap-3">
                        <Skeleton className="h-5 w-3/4 rounded" />
                        <Skeleton className="h-4 w-1/2 rounded" />
                        <Skeleton className="h-4 w-1/3 rounded" />
                      </div>
                    ))}
                  </>
                )}

                {papersError && (
                  <p className="py-8 text-center text-[14px] text-destructive">
                    Failed to load papers.
                  </p>
                )}

                {!papersLoading && !papersError && papersData?.papers.map((paper, index) => (
                  <motion.div
                    key={paper._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.22 }}
                  >
                    <PaperCard paper={paper} hideOrgInfo />
                  </motion.div>
                ))}

                {!papersLoading && !papersError && papersData?.papers.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <BookOpen className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-[15px] text-muted-foreground">No papers yet.</p>
                  </div>
                )}

                {papersData && papersData.pages > 1 && (
                  <div className="flex items-center justify-center gap-2.5 py-5">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setPaperPage((p) => Math.max(1, p - 1))}
                      disabled={paperPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-[14px] text-muted-foreground">
                      Page {paperPage} of {papersData.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setPaperPage((p) => Math.min(papersData.pages, p + 1))}
                      disabled={paperPage >= papersData.pages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Members tab */}
              <TabsContent value="members" className="mt-4">
                <Card className="rounded-xl border-border/60 bg-white border border-border">
                  <CardContent className="p-6">
                    {members && (
                      <div className="flex flex-col gap-4">
                        {/* Owner */}
                        <div>
                          <h3 className="mb-2 font-heading text-[14px] font-semibold uppercase text-muted-foreground">
                            Owner
                          </h3>
                          <MemberRow user={members.owner} badge="Owner" />
                        </div>

                        <Separator />

                        {/* Admins */}
                        {members.admins.length > 0 && (
                          <div>
                            <h3 className="mb-2 font-heading text-[14px] font-semibold uppercase text-muted-foreground">
                              Admins ({members.admins.length})
                            </h3>
                            <div className="flex flex-col gap-2">
                              {members.admins.map((a, index) => (
                                <motion.div
                                  key={a._id}
                                  className="flex items-center justify-between"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.04, duration: 0.22 }}
                                >
                                  <MemberRow user={a} badge="Admin" />
                                  {isOwner && a._id !== userId && (
                                    <Button
                                      variant="ghost"
                                      size="default"
                                      className="gap-1.5 text-[14px] text-destructive"
                                      onClick={() =>
                                        orgId && demoteAdmin.mutate({ orgId, userId: a._id })
                                      }
                                    >
                                      <ShieldMinus className="h-4 w-4" />
                                      Remove Admin
                                    </Button>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Members */}
                        <div>
                          <h3 className="mb-2 font-heading text-[14px] font-semibold uppercase text-muted-foreground">
                            Members ({members.members.length})
                          </h3>
                          <div className="flex flex-col gap-2">
                            {members.members.map((m, index) => (
                              <motion.div
                                key={m._id}
                                className="flex items-center justify-between"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04, duration: 0.22 }}
                              >
                                <MemberRow user={m} />
                                {canManage && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="default"
                                      className="gap-1.5 text-[14px]"
                                      onClick={() =>
                                        orgId && promoteAdmin.mutate({ orgId, userId: m._id })
                                      }
                                    >
                                      <ShieldCheck className="h-4 w-4" />
                                      Make Admin
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="default"
                                      className="gap-1.5 text-[14px] text-destructive hover:text-destructive"
                                      onClick={() => setKickTarget(m)}
                                    >
                                      <UserMinus className="h-4 w-4" />
                                      Kick
                                    </Button>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                            {members.members.length === 0 && (
                              <p className="text-[14px] text-muted-foreground">No members yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Followers tab */}
              <TabsContent value="followers" className="mt-4">
                <Card className="rounded-xl border-border/60 bg-white border border-border">
                  <CardContent className="p-6">
                    <h3 className="mb-3 font-heading text-[14px] font-semibold uppercase text-muted-foreground">
                      Followers ({members?.followerCount ?? 0})
                    </h3>
                    {members?.followers && members.followers.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {members.followers.map((f, index) => (
                          <motion.div
                            key={f._id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04, duration: 0.22 }}
                          >
                            <MemberRow user={f} />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[16px] text-muted-foreground">No followers yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Join requests tab */}
              {canManage && (
                <TabsContent value="requests" className="mt-4">
                  <Card className="rounded-xl border-border/60 bg-white border border-border">
                    <CardContent className="p-6">
                      {members?.pendingMembers && members.pendingMembers.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {members.pendingMembers.map((p, index) => (
                            <motion.div
                              key={p._id}
                              className="flex items-center justify-between"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.04, duration: 0.22 }}
                            >
                              <MemberRow user={p} />
                              <div className="flex gap-1">
                                <Button
                                  size="default"
                                  className="gap-1.5 text-[14px]"
                                  onClick={() =>
                                    orgId &&
                                    approveJoin.mutate({ orgId, userId: p._id })
                                  }
                                  disabled={approveJoin.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="default"
                                  className="gap-1.5 text-[14px]"
                                  onClick={() =>
                                    orgId &&
                                    rejectJoin.mutate({ orgId, userId: p._id })
                                  }
                                  disabled={rejectJoin.isPending}
                                >
                                  <X className="h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-8 text-center">
                          <Clock className="mb-2 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-[15px] text-muted-foreground">No pending join requests.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Pending posts tab */}
              {canManage && (
                <TabsContent value="pending" className="mt-4">
                  <Card className="rounded-xl border-border/60 bg-white border border-border">
                    <CardContent className="p-6">
                      {pendingPostsData?.posts && pendingPostsData.posts.length > 0 ? (
                        <div className="flex flex-col gap-4">
                          {pendingPostsData.posts.map((post, index) => {
                            const authorName = typeof post.authorId === 'object' ? post.authorId.displayName : 'Unknown';
                            const authorAvatar = typeof post.authorId === 'object' ? post.authorId.avatar ?? undefined : undefined;
                            const authorProfileId = typeof post.authorId === 'object' ? post.authorId._id : '';
                            return (
                              <motion.div
                                key={post._id}
                                className="rounded-xl border border-border/50 bg-muted/20 p-4"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04, duration: 0.22 }}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <Avatar className="mt-0.5 h-9 w-9 shrink-0">
                                      <AvatarImage src={authorAvatar} alt={authorName} />
                                      <AvatarFallback className="text-[12px]">{initials(authorName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <Link href={`/profile/${authorProfileId}`} className="text-[15px] font-semibold text-foreground hover:underline">
                                        {authorName}
                                      </Link>
                                      <p className="mt-0.5 text-[17px] font-semibold text-foreground line-clamp-2">{post.title}</p>
                                      {post.bodyText && (
                                        <p className="mt-1 text-[14px] text-muted-foreground line-clamp-2">{post.bodyText}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                      size="default"
                                      className="gap-1.5 text-[14px]"
                                      onClick={() => orgId && approvePost.mutate({ orgId, postId: post._id })}
                                      disabled={approvePost.isPending}
                                    >
                                      <Check className="h-4 w-4" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="default"
                                      className="gap-1.5 text-[14px] text-destructive hover:text-destructive"
                                      onClick={() => setRejectTarget({ postId: post._id, title: post.title })}
                                    >
                                      <X className="h-4 w-4" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-8 text-center">
                          <Inbox className="mb-2 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-[15px] text-muted-foreground">No posts pending review.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Analytics tab */}
              <TabsContent value="analytics" className="mt-4">
                {!orgAnalytics ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="border border-border rounded-xl bg-white p-6 flex flex-col gap-3">
                        <Skeleton className="h-4 w-48 rounded" />
                        <Skeleton className="h-[200px] w-full rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    className="grid gap-4 lg:grid-cols-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="rounded-xl border-border/60 bg-white border border-border">
                      <CardContent className="p-6">
                        <h3 className="mb-4 font-heading text-[15px] font-semibold text-foreground">Posts Over Time (6 months)</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={orgAnalytics.postsOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="oklch(0.32 0.13 19)" radius={[3, 3, 0, 0]} name="Posts" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border-border/60 bg-white border border-border">
                      <CardContent className="p-6">
                        <h3 className="mb-4 font-heading text-[15px] font-semibold text-foreground">Post Type Breakdown</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={orgAnalytics.typeBreakdown} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="type" width={100} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="oklch(0.24 0.09 150)" radius={[0, 3, 3, 0]} name="Posts" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border-border/60 bg-white border border-border">
                      <CardContent className="p-6">
                        <h3 className="mb-4 font-heading text-[15px] font-semibold text-foreground">Top Tags</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={orgAnalytics.topTags} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="tag" width={110} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="oklch(0.74 0.17 75)" radius={[0, 3, 3, 0]} name="Posts" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border-border/60 bg-white border border-border">
                      <CardContent className="p-6">
                        <h3 className="mb-4 font-heading text-[15px] font-semibold text-foreground">Top Posts by Engagement</h3>
                        <div className="flex flex-col gap-3">
                          {orgAnalytics.topPosts.length === 0 ? (
                            <p className="text-[14px] text-muted-foreground">No posts yet.</p>
                          ) : (
                            orgAnalytics.topPosts.map((post) => (
                              <Link
                                key={post._id}
                                href={`/posts/${post._id}`}
                                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-4 py-3 text-[14px] transition-colors hover:bg-muted/40"
                              >
                                <span className="line-clamp-1 font-medium text-foreground">{post.title}</span>
                                <span className="shrink-0 text-[13px] text-muted-foreground">
                                  {post.likeCount + post.commentCount} interactions
                                </span>
                              </Link>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>
            </Tabs>
      {canManage && orgId && (
        <BulkImportDialog
          open={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          orgId={orgId}
        />
      )}
    </AuthenticatedLayout>
  );
}

function MemberRow({ user, badge }: { user: UserSummary; badge?: string }) {
  return (
    <Link
      href={`/profile/${user._id}`}
      className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted/40"
    >
      <Avatar size="sm">
        <AvatarImage src={user.avatar ?? undefined} alt={user.displayName} />
        <AvatarFallback className="text-[12px]">{initials(user.displayName)}</AvatarFallback>
      </Avatar>
      <span className="text-[16px] font-medium text-foreground hover:underline">{user.displayName}</span>
      {badge && (
        <Badge variant="secondary" className="text-[12px]">
          {badge}
        </Badge>
      )}
    </Link>
  );
}
