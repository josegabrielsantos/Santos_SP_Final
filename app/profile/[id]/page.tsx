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
import { Separator } from '@/components/ui/separator';
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
      <div className="min-h-screen bg-muted/20">
        <AuthenticatedNavbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen bg-muted/20">
        <AuthenticatedNavbar />
        <div className="flex justify-center py-20">
          <p className="text-muted-foreground">User not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-4xl px-4 py-6 lg:px-6">
            {/* Profile header */}
            <Card className="border-border/60 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <Avatar className="h-20 w-20 shrink-0 ring-2 ring-primary/10">
                    <AvatarImage src={user.avatar ?? undefined} alt={user.displayName} />
                    <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                      {initials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-foreground">{user.displayName}</h1>
                      {user.role === 'website_admin' && (
                        <Badge variant="default" className="text-[10px]">
                          Admin
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">{user.email}</p>

                    {user.bio && (
                      <p className="mt-1 text-sm text-foreground/80">{user.bio}</p>
                    )}

                    {/* Expertise & certifications */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {user.expertise?.map((e) => (
                        <Badge
                          key={e}
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {e}
                        </Badge>
                      ))}
                      {user.certifications?.map((c) => (
                        <Badge
                          key={c}
                          variant="outline"
                          className="gap-1 text-[10px] font-normal"
                        >
                          <Award className="h-2.5 w-2.5" />
                          {c}
                        </Badge>
                      ))}
                    </div>

                    {user.createdAt && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs: Posts, Organizations, Following */}
            <Tabs defaultValue="posts" className="mt-4">
              <TabsList>
                <TabsTrigger value="posts" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Posts
                </TabsTrigger>
                <TabsTrigger value="organizations" className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Organizations
                </TabsTrigger>
                <TabsTrigger value="following" className="gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  Following
                </TabsTrigger>
              </TabsList>

              {/* Posts tab */}
              <TabsContent value="posts" className="mt-4 flex flex-col gap-4">
                {postsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                {postsData?.posts.map((post) => (
                  <PostCard key={post._id} post={post} />
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

              {/* Organizations tab */}
              <TabsContent value="organizations" className="mt-4">
                <Card className="border-border/60 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                      Member of ({orgs?.length ?? 0})
                    </h3>
                    {orgs && orgs.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {orgs.map((org) => (
                          <OrgRow key={org._id} org={org} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Not a member of any organization yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Following tab */}
              <TabsContent value="following" className="mt-4">
                <Card className="border-border/60 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                      Following ({followed?.length ?? 0})
                    </h3>
                    {followed && followed.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {followed.map((org) => (
                          <OrgRow key={org._id} org={org} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
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
      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40"
    >
      <Avatar size="sm">
        <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
        <AvatarFallback className="text-[10px]">
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
        <span className="text-sm font-medium text-foreground hover:underline">{org.name}</span>
        <span className="text-[11px] text-muted-foreground">{org.memberCount} members</span>
      </div>
    </Link>
  );
}
