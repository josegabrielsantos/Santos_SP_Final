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
    <div className="min-h-screen bg-muted/20">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-4xl px-4 py-6 lg:px-6">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Organizations
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse research organizations and groups on UPLB KAIN
                </p>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search organizations…"
                  className="h-9 rounded-full pl-9 text-sm"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {isError && (
              <p className="py-6 text-center text-sm text-destructive">
                Failed to load organizations.
              </p>
            )}

            {/* Org grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {data?.organizations.map((org) => {
                const orgInitials = org.name
                  .split(/[\s()]+/)
                  .filter(Boolean)
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <Card
                    key={org._id}
                    className="border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                    onClick={() => router.push(`/organizations/${org.slug}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Avatar size="lg" className="shrink-0">
                          <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                          <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                            {orgInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1 min-w-0">
                          <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                            {org.name}
                          </h3>
                          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {org.description}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {org.memberCount} members
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              {org.postCount} posts
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          View Organization
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {data && data.organizations.length === 0 && !isLoading && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No organizations found.
              </p>
            )}

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 py-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {data.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
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
