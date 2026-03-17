'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
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
      <div className="min-h-screen bg-page-bg">
        <AuthenticatedNavbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen bg-page-bg">
        <AuthenticatedNavbar />
        <div className="flex justify-center py-20">
          <p className="text-muted-foreground">User not found.</p>
        </div>
      </div>
    );
  }

  const postCount = postsData?.total ?? postsData?.posts?.length ?? 0;
  const orgCount = orgs?.length ?? 0;

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-5xl px-5 py-7 lg:px-7">
            {/* Profile header */}
            <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
              {/* Cover / banner */}
              <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />

              <CardContent className="px-7 pb-7 pt-0">
                {/* Avatar — overlapping the banner */}
                <div className="-mt-12 mb-4 flex items-end justify-between">
                  <Avatar className="h-[92px] w-[92px] shrink-0 ring-4 ring-card shadow-md">
                    <AvatarImage src={user.avatar ?? undefined} alt={user.displayName} />
                    <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                      {initials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <span className="text-[13px] text-muted-foreground">Your profile</span>
                  )}
                </div>

                {/* Name + role badge */}
                <div className="flex items-center gap-2.5">
                  <h1 className="text-[23px] font-bold text-foreground">{user.displayName}</h1>
                  {user.role === 'website_admin' && (
                    <Badge variant="default" className="text-[12px]">
                      Admin
                    </Badge>
                  )}
                </div>

                <p className="text-[16px] text-muted-foreground">{user.email}</p>

                {user.bio && (
                  <p className="mt-1.5 text-[16px] text-foreground/80">{user.bio}</p>
                )}

                {/* Stats row */}
                <div className="mt-3 flex items-center gap-1 text-[14px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{postCount}</span>
                  <span>Post{postCount !== 1 ? 's' : ''}</span>
                  <span className="mx-2 text-border">|</span>
                  <span className="font-semibold text-foreground">{orgCount}</span>
                  <span>Organization{orgCount !== 1 ? 's' : ''}</span>
                </div>

                {/* Expertise & certifications */}
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {user.expertise?.map((e) => (
                    <Badge
                      key={e}
                      variant="secondary"
                      className="text-[12px] font-normal"
                    >
                      {e}
                    </Badge>
                  ))}
                  {user.certifications?.map((c) => (
                    <Badge
                      key={c}
                      variant="outline"
                      className="gap-1.5 text-[12px] font-normal"
                    >
                      <Award className="h-3 w-3" />
                      {c}
                    </Badge>
                  ))}
                </div>

                {user.createdAt && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tabs: Posts, Organizations, Following */}
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
              <TabsContent value="posts" className="mt-5 flex flex-col gap-5">
                {postsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                {postsData?.posts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}

                {postsData && postsData.posts.length === 0 && (
                  <p className="py-9 text-center text-[16px] text-muted-foreground">
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

              {/* Organizations tab */}
              <TabsContent value="organizations" className="mt-5">
                <Card className="border-border/60 bg-card shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="mb-3.5 text-[14px] font-semibold uppercase text-muted-foreground">
                      Member of ({orgs?.length ?? 0})
                    </h3>
                    {orgs && orgs.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {orgs.map((org) => (
                          <OrgRow key={org._id} org={org} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[16px] text-muted-foreground">
                        Not a member of any organization yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Following tab */}
              <TabsContent value="following" className="mt-5">
                <Card className="border-border/60 bg-card shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="mb-3.5 text-[14px] font-semibold uppercase text-muted-foreground">
                      Following ({followed?.length ?? 0})
                    </h3>
                    {followed && followed.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {followed.map((org) => (
                          <OrgRow key={org._id} org={org} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[16px] text-muted-foreground">
                        Not following any organizations yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
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
        <AvatarFallback className="text-[11px]">
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
        <span className="text-[16px] font-medium text-foreground hover:underline">{org.name}</span>
        <span className="text-[13px] text-muted-foreground">{org.memberCount} members</span>
      </div>
    </Link>
  );
}
