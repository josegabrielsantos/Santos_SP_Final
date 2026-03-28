'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, FileText, Plus } from 'lucide-react';
import { useOrganizations } from '@/lib/api/organizations';
import { useAppSelector } from '@/store/hooks';
import { RequestOrgDialog } from '@/components/org-requests/request-org-dialog';
import Link from 'next/link';

function OrgCardSkeleton() {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white">
      <div className="h-1 bg-border/40" />
      <div className="p-5 flex items-start gap-3.5">
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
          <div className="mt-2 flex gap-4">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const { data, isLoading, isError } = useOrganizations({ page, limit: 20, search: search || undefined });
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'website_admin';

  return (
    <AuthenticatedLayout>
            {/* Header */}
            <motion.div
              className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div>
                <h1 className="font-heading text-[28px] font-bold tracking-tight text-foreground">
                  Organizations
                </h1>
                <p className="mt-1.5 text-[16px] text-muted-foreground">
                  Browse research organizations and groups on UPLB FaNS Knowledge Hub
                </p>
              </div>
              <div className="flex items-center gap-3">
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
                {user && !isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      className="gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setShowRequestDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Request Org
                    </Button>
                    <Link href="/org-requests">
                      <Button variant="outline" size="default" className="text-[14px]">
                        My Requests
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Loading skeletons */}
            {isLoading && (
              <div className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <OrgCardSkeleton key={i} />
                ))}
              </div>
            )}

            {isError && (
              <p className="py-7 text-center text-[16px] text-destructive">
                Failed to load organizations.
              </p>
            )}

            {/* Org grid */}
            <AnimatePresence>
              {!isLoading && data && (
                <div className="grid gap-5 sm:grid-cols-2">
                  {data.organizations.map((org, index) => {
                    const orgInitials = org.name
                      .split(/[\s()]+/)
                      .filter(Boolean)
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <motion.div
                        key={org._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.22 }}
                      >
                        <Card
                          className="group cursor-pointer overflow-hidden rounded-xl border-border/60 bg-white border border-border transition-shadow hover:border-border/80"
                          onClick={() => router.push(`/organizations/${org.slug}`)}
                        >
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
                                <h3 className="font-heading text-[16px] font-semibold leading-snug text-foreground line-clamp-2">
                                  {org.name}
                                </h3>
                                {(org as any).category && (
                                  <span className="inline-flex w-fit items-center rounded-full bg-kain-green-light px-2.5 py-0.5 text-[12px] font-medium text-kain-green">
                                    {(org as any).category}
                                  </span>
                                )}
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
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

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
      {showRequestDialog && <RequestOrgDialog onClose={() => setShowRequestDialog(false)} />}
    </AuthenticatedLayout>
  );
}
