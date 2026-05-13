'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PostCard } from '@/components/post/post-card';
import {
  useUser,
  useUserOrganizations,
  useUserFollowedOrganizations,
  useUserPosts,
} from '@/lib/api/users';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Heart,
  FileText,
  Award,
  Calendar,
} from 'lucide-react';

function initials(name: string) {
  return name
    .split(/[\s()]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0, 0, 0.2, 1] as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function ProfileSkeleton() {
  return (
    <div className="w-full max-w-5xl px-5 py-7 lg:px-7">
      {/* Header card skeleton */}
      <Card className="rounded-xl border-border/60 bg-white border border-border overflow-hidden">
        {/* Banner */}
        <Skeleton className="h-32 w-full rounded-none" />
        <CardContent className="px-7 pb-7 pt-0">
          <div className="-mt-12 mb-4 flex items-end justify-between">
            <Skeleton className="h-[92px] w-[92px] rounded-full ring-4 ring-card" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-4 w-56 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-18 rounded-full" />
            </div>
            <Skeleton className="h-4 w-36 rounded" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <div className="mt-5">
        <div className="flex gap-0 border-b border-border/50">
          <Skeleton className="h-10 w-24 rounded-none" />
          <Skeleton className="h-10 w-32 rounded-none" />
          <Skeleton className="h-10 w-24 rounded-none" />
        </div>
        <div className="mt-5 flex flex-col gap-5">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-xl border-border/60 bg-white border border-border">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-2/3 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params.id;
  const currentUser = useAppSelector((s) => s.auth.user);
  const isOwnProfile = currentUser?._id === profileId;

  const { data: user, isLoading: userLoading, isError } = useUser(profileId);
  const { data: orgs } = useUserOrganizations(profileId);
  const { data: followed } = useUserFollowedOrganizations(profileId);

  const [postPage, setPostPage] = useState(1);
  const { data: postsData, isLoading: postsLoading } = useUserPosts(profileId, {
    page: postPage,
  });

  if (userLoading) {
    return (
      <AuthenticatedLayout>
        <ProfileSkeleton />
      </AuthenticatedLayout>
    );
  }

  if (isError || !user) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center py-20">
          <p className="text-muted-foreground">User not found.</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  const postCount = postsData?.total ?? postsData?.posts?.length ?? 0;
  const orgCount = orgs?.length ?? 0;

  return (
    <AuthenticatedLayout>
            {/* Profile header */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <Card className="rounded-xl border-border/60 bg-white border border-border overflow-hidden">
                {/* Cover / banner — rich maroon gradient */}
                <div className="relative h-32 bg-gradient-to-r from-primary via-primary/80 to-primary/40">
                  {/* subtle texture overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.45_0.13_19/0.3),transparent_60%)]" />
                </div>

                <CardContent className="px-7 pb-7 pt-0">
                  {/* Avatar — overlapping the banner */}
                  <div className="-mt-12 mb-4 flex items-end justify-between">
                    <Avatar className="h-[92px] w-[92px] shrink-0 ring-4 ring-white ">
                      <AvatarImage src={user.avatar ?? undefined} alt={user.displayName} />
                      <AvatarFallback className="bg-primary text-2xl font-bold text-white">
                        {initials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                      <span className="text-[13px] text-muted-foreground">Your profile</span>
                    )}
                  </div>

                  {/* Name + role badge */}
                  <div className="flex items-center gap-2.5">
                    <h1 className="font-heading text-[24px] font-bold text-foreground">{user.displayName}</h1>
                    {user.role === 'website_admin' && (
                      <Badge className="bg-primary text-white text-[12px]">
                        Admin
                      </Badge>
                    )}
                  </div>

                  <p className="text-[15px] text-muted-foreground">{user.email}</p>

                  {user.bio && (
                    <p className="mt-1.5 text-[16px] text-foreground/80">{user.bio}</p>
                  )}

                  {/* Stats row — visually prominent */}
                  <div className="mt-4 flex items-center gap-5">
                    <div className="flex flex-col items-center rounded-lg bg-primary/5 px-4 py-2 min-w-[72px]">
                      <span className="font-heading text-[22px] font-bold text-primary">{postCount}</span>
                      <span className="text-[12px] text-muted-foreground">Post{postCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-kain-green-light px-4 py-2 min-w-[72px]">
                      <span className="font-heading text-[22px] font-bold text-kain-green">{orgCount}</span>
                      <span className="text-[12px] text-muted-foreground">Org{orgCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Expertise */}
                  {user.expertise && user.expertise.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">Expertise</h4>
                      <p className="text-[13px] text-foreground">{user.expertise.join(' · ')}</p>
                    </div>
                  )}

                  {/* Certifications */}
                  {user.certifications && user.certifications.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">Certifications</h4>
                      <ul className="list-disc list-inside text-[13px] text-foreground space-y-0.5">
                        {user.certifications.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {user.createdAt && (
                    <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Tabs: Posts, Organizations, Following */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              style={{ transitionDelay: '0.1s' }}
            >
              <Tabs defaultValue="posts" className="mt-5">
                <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent p-0">
                  <TabsTrigger
                    value="posts"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none px-5 py-3 text-[15px] font-medium gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Posts
                  </TabsTrigger>
                  <TabsTrigger
                    value="organizations"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none px-5 py-3 text-[15px] font-medium gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    Organizations
                  </TabsTrigger>
                  <TabsTrigger
                    value="following"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none px-5 py-3 text-[15px] font-medium gap-2"
                  >
                    <Heart className="h-4 w-4" />
                    Following
                  </TabsTrigger>
                </TabsList>

                {/* Posts tab */}
                <TabsContent value="posts" className="mt-5">
                  {postsLoading ? (
                    <div className="flex flex-col gap-5">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="rounded-xl border-border/60 bg-white border border-border">
                          <CardContent className="p-5 space-y-3">
                            <Skeleton className="h-4 w-3/4 rounded" />
                            <Skeleton className="h-3 w-full rounded" />
                            <Skeleton className="h-3 w-2/3 rounded" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      className="flex flex-col gap-5"
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                    >
                      {postsData?.posts.map((post) => (
                        <motion.div key={post._id} variants={fadeUp}>
                          <PostCard post={post} />
                        </motion.div>
                      ))}

                      {postsData && postsData.posts.length === 0 && (
                        <p className="py-9 text-center text-[14px] text-muted-foreground">
                          No posts yet.
                        </p>
                      )}
                    </motion.div>
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

                {/* Organizations tab */}
                <TabsContent value="organizations" className="mt-5">
                  <Card className="rounded-xl border-border/60 bg-white border border-border">
                    <CardContent className="p-6">
                      <h3 className="mb-3.5 font-heading text-[14px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Member of ({orgs?.length ?? 0})
                      </h3>
                      {orgs && orgs.length > 0 ? (
                        <motion.div
                          className="flex flex-col gap-2"
                          variants={staggerContainer}
                          initial="hidden"
                          animate="visible"
                        >
                          {orgs.map((org) => (
                            <motion.div key={org._id} variants={fadeUp}>
                              <OrgRow org={org} />
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : (
                        <p className="text-[14px] text-muted-foreground">
                          Not a member of any organization yet.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Following tab */}
                <TabsContent value="following" className="mt-5">
                  <Card className="rounded-xl border-border/60 bg-white border border-border">
                    <CardContent className="p-6">
                      <h3 className="mb-3.5 font-heading text-[14px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Following ({followed?.length ?? 0})
                      </h3>
                      {followed && followed.length > 0 ? (
                        <motion.div
                          className="flex flex-col gap-2"
                          variants={staggerContainer}
                          initial="hidden"
                          animate="visible"
                        >
                          {followed.map((org) => (
                            <motion.div key={org._id} variants={fadeUp}>
                              <OrgRow org={org} />
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : (
                        <p className="text-[14px] text-muted-foreground">
                          Not following any organizations yet.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
    </AuthenticatedLayout>
  );
}

function OrgRow({
  org,
}: {
  org: { _id: string; name: string; slug: string; avatar?: string | null; memberCount: number };
}) {
  return (
    <Link
      href={`/organizations/${org.slug}`}
      className="flex items-center gap-3.5 rounded-lg p-2.5 transition-colors hover:bg-muted/40"
    >
      <Avatar size="sm">
        <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
          {org.name
            .split(/[\s()]+/)
            .filter(Boolean)
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-[14px] font-medium text-foreground hover:underline">{org.name}</span>
        <span className="text-[13px] text-muted-foreground">{org.memberCount} members</span>
      </div>
    </Link>
  );
}
