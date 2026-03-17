'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, Users, FileText, Loader2 } from 'lucide-react';
import { useOrganizations } from '@/lib/api/organizations';

export default function OrganizationsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useOrganizations({ page, limit: 20, search: search || undefined });
  const router = useRouter();

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-5xl px-5 py-7 lg:px-7">
            {/* Header */}
            <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-[28px] font-bold tracking-tight text-foreground">
                  Organizations
                </h1>
                <p className="mt-1.5 text-[16px] text-muted-foreground">
                  Browse research organizations and groups on UPLB KAIN
                </p>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search organizations…"
                  className="h-10 rounded-full pl-10 text-[16px]"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {isLoading && (
              <div className="flex justify-center py-14">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            )}

            {isError && (
              <p className="py-7 text-center text-[16px] text-destructive">
                Failed to load organizations.
              </p>
            )}

            {/* Org grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              {data?.organizations.map((org) => {
                const orgInitials = org.name
                  .split(/[\s()]+/)
                  .filter(Boolean)
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <Card key={org._id} className="group cursor-pointer overflow-hidden border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md" onClick={() => router.push(`/organizations/${org.slug}`)}>
                    <div className="h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3.5">
                        <Avatar size="lg" className="shrink-0">
                          <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                          <AvatarFallback className="bg-primary/10 text-[16px] font-bold text-primary">
                            {orgInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <h3 className="text-[16px] font-semibold leading-snug text-foreground line-clamp-2">
                            {org.name}
                          </h3>
                          <p className="text-[14px] leading-relaxed text-muted-foreground line-clamp-2">
                            {org.description}
                          </p>
                          <div className="mt-2.5 flex items-center gap-3.5">
                            <span className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {org.memberCount} members
                            </span>
                            <span className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" />
                              {org.postCount} posts
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {data && data.organizations.length === 0 && !isLoading && (
              <p className="py-14 text-center text-[16px] text-muted-foreground">
                No organizations found.
              </p>
            )}

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2.5 py-7">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-[14px] text-muted-foreground">
                  Page {page} of {data.pages}
                </span>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page >= data.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
