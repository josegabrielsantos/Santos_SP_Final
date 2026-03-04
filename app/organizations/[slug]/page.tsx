'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { PostCard } from '@/components/post/post-card';
import { CreatePostDialog } from '@/components/post/create-post-dialog';
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
} from '@/lib/api/organizations';
import { useAppSelector } from '@/store/hooks';
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
  Plus,
  LogOut,
  UserPlus,
  ShieldCheck,
  ShieldMinus,
  Check,
  X,
  Clock,
  Heart,
  HeartOff,
  Image as ImageIcon,
} from 'lucide-react';
import type { UserSummary } from '@/lib/types';

function initials(name: string) {
  return name
    .split(/[\s()]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function OrgDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;

  const { data: org, isLoading: orgLoading } = useOrganization(slug);
  const orgId = org?._id;

  const [postPage, setPostPage] = useState(1);
  const { data: postsData, isLoading: postsLoading } = useOrgPosts(orgId, { page: postPage });
  const { data: members } = useOrgMembers(orgId);

  const requestJoin = useRequestJoin();
  const leaveOrg = useLeaveOrg();
  const approveJoin = useApproveJoin();
  const rejectJoin = useRejectJoin();
  const promoteAdmin = usePromoteAdmin();
  const demoteAdmin = useDemoteAdmin();
  const followOrg = useFollowOrg();
  const unfollowOrg = useUnfollowOrg();

  const [expandedComments, setExpandedComments] = useState<string | null>(null);

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <AuthenticatedNavbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-muted/20">
        <AuthenticatedNavbar />
        <div className="flex justify-center py-20">
          <p className="text-muted-foreground">Organization not found.</p>
        </div>
      </div>
    );
  }

  // Determine user's role in this org
  const isOwner = userId && org.ownerId?._id === userId;
  const isAdmin = org.adminIds.some((a) => a._id === userId);
  const isMember = org.memberIds.some((m) => m._id === userId);
  const isPending = org.pendingMemberIds?.some((p) => p._id === userId);
  const isFollower = org.followerIds?.includes(userId ?? '');
  const canPost = isOwner || isAdmin || isMember;
  const canManage = isOwner || isAdmin;

  // Access role for post interaction restrictions
  const orgAccessRole: 'member' | 'follower' | 'none' =
    canPost ? 'member' : isFollower ? 'follower' : 'none';

  return (
    <div className="min-h-screen bg-muted/20">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-4xl px-4 py-6 lg:px-6">
            {/* Org header with banner */}
            <Card className="overflow-hidden border-border/60 bg-white shadow-sm">
              {/* Banner image */}
              <div className="relative h-48 w-full bg-gradient-to-r from-primary/20 to-primary/5">
                {org.bannerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={org.bannerImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-primary/20" />
                  </div>
                )}
              </div>

              <CardContent className="relative p-6">
                {/* Avatar overlapping banner */}
                <div className="absolute -top-10 left-6">
                  <Avatar className="h-20 w-20 ring-4 ring-white shadow-md">
                    <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                    <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                      {initials(org.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="mt-8 flex items-start justify-between">
                  <div className="flex flex-1 flex-col gap-1">
                    <h1 className="text-xl font-bold text-foreground">{org.name}</h1>
                    {org.description && (
                      <p className="text-sm text-muted-foreground">{org.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {org.memberCount} members
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" /> {org.postCount} posts
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Heart className="h-3 w-3" /> {members?.followerCount ?? org.followerIds?.length ?? 0} followers
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Follow/Unfollow button (non-members can follow) */}
                    {userId && !isOwner && !isAdmin && !isMember && (
                      isFollower ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => orgId && unfollowOrg.mutate(orgId)}
                          disabled={unfollowOrg.isPending}
                        >
                          <HeartOff className="h-3.5 w-3.5" />
                          Unfollow
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => orgId && followOrg.mutate(orgId)}
                          disabled={followOrg.isPending}
                        >
                          <Heart className="h-3.5 w-3.5" />
                          Follow
                        </Button>
                      )
                    )}

                    {/* Join/Leave/Pending */}
                    {!userId ? null : isOwner || isAdmin || isMember ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => orgId && leaveOrg.mutate(orgId)}
                        disabled={leaveOrg.isPending || !!isOwner}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {isOwner ? 'Owner' : 'Leave'}
                      </Button>
                    ) : isPending ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => orgId && leaveOrg.mutate(orgId)}
                        disabled={leaveOrg.isPending}
                      >
                        {leaveOrg.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        Cancel Request
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => orgId && requestJoin.mutate(orgId)}
                        disabled={requestJoin.isPending}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Request to Join
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="posts" className="mt-4">
              <TabsList>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="followers">Followers</TabsTrigger>
                {canManage && <TabsTrigger value="requests">Join Requests</TabsTrigger>}
              </TabsList>

              {/* Posts tab */}
              <TabsContent value="posts" className="mt-4 flex flex-col gap-4">
                {canPost && (
                  <CreatePostDialog defaultOrgId={orgId}>
                    <Card className="cursor-pointer border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Post in {org.name}…
                        </span>
                      </CardContent>
                    </Card>
                  </CreatePostDialog>
                )}

                {postsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                {postsData?.posts.map((post) => (
                  <div key={post._id}>
                    <PostCard post={post} orgAccessRole={orgAccessRole} />
                  </div>
                ))}

                {postsData && postsData.posts.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No posts yet.
                  </p>
                )}

                {postsData && postsData.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                      disabled={postPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {postPage} of {postsData.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPostPage((p) => Math.min(postsData.pages, p + 1))}
                      disabled={postPage >= postsData.pages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Members tab */}
              <TabsContent value="members" className="mt-4">
                <Card className="border-border/60 bg-white shadow-sm">
                  <CardContent className="p-5">
                    {members && (
                      <div className="flex flex-col gap-4">
                        {/* Owner */}
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                            Owner
                          </h3>
                          <MemberRow user={members.owner} badge="Owner" />
                        </div>

                        <Separator />

                        {/* Admins */}
                        {members.admins.length > 0 && (
                          <div>
                            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                              Admins ({members.admins.length})
                            </h3>
                            <div className="flex flex-col gap-2">
                              {members.admins.map((a) => (
                                <div key={a._id} className="flex items-center justify-between">
                                  <MemberRow user={a} badge="Admin" />
                                  {isOwner && a._id !== userId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1 text-xs text-destructive"
                                      onClick={() =>
                                        orgId && demoteAdmin.mutate({ orgId, userId: a._id })
                                      }
                                    >
                                      <ShieldMinus className="h-3.5 w-3.5" />
                                      Remove Admin
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Members */}
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                            Members ({members.members.length})
                          </h3>
                          <div className="flex flex-col gap-2">
                            {members.members.map((m) => (
                              <div key={m._id} className="flex items-center justify-between">
                                <MemberRow user={m} />
                                {canManage && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-xs"
                                    onClick={() =>
                                      orgId && promoteAdmin.mutate({ orgId, userId: m._id })
                                    }
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Make Admin
                                  </Button>
                                )}
                              </div>
                            ))}
                            {members.members.length === 0 && (
                              <p className="text-xs text-muted-foreground">No members yet.</p>
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
                <Card className="border-border/60 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                      Followers ({members?.followerCount ?? 0})
                    </h3>
                    {members?.followers && members.followers.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {members.followers.map((f) => (
                          <MemberRow key={f._id} user={f} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No followers yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Join requests tab */}
              {canManage && (
                <TabsContent value="requests" className="mt-4">
                  <Card className="border-border/60 bg-white shadow-sm">
                    <CardContent className="p-5">
                      {members?.pendingMembers && members.pendingMembers.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {members.pendingMembers.map((p) => (
                            <div key={p._id} className="flex items-center justify-between">
                              <MemberRow user={p} />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() =>
                                    orgId &&
                                    approveJoin.mutate({ orgId, userId: p._id })
                                  }
                                  disabled={approveJoin.isPending}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() =>
                                    orgId &&
                                    rejectJoin.mutate({ orgId, userId: p._id })
                                  }
                                  disabled={rejectJoin.isPending}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No pending join requests.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </div>
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
        <AvatarFallback className="text-[10px]">{initials(user.displayName)}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium text-foreground hover:underline">{user.displayName}</span>
      {badge && (
        <Badge variant="secondary" className="text-[10px]">
          {badge}
        </Badge>
      )}
    </Link>
  );
}
