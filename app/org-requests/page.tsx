'use client';

import Link from 'next/link';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, ArrowLeft, MessageSquare, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMyOrgRequests } from '@/lib/api/org-requests';
import { formatDistanceToNow } from 'date-fns';
import type { OrgRequestStatus } from '@/lib/types';

function statusBadge(status: OrgRequestStatus) {
  const map: Record<OrgRequestStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    needs_revision: { label: 'Needs Revision', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const { label, className } = map[status];
  return <Badge variant="outline" className={`text-[11px] font-semibold ${className}`}>{label}</Badge>;
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function MyOrgRequestsPage() {
  const { data, isLoading } = useMyOrgRequests();
  const requests = data?.requests ?? [];

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />
      <div className="flex">
        <Sidebar />
        <main className="flex flex-1 justify-center">
          <div className="flex w-full max-w-3xl flex-col gap-6 px-5 py-7 lg:px-7">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Link
                href="/organizations"
                className="mb-4 flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Organizations
              </Link>
              <h1 className="text-[26px] font-bold text-foreground">My Organization Requests</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Track the status of your organization creation requests.
              </p>
            </motion.div>

            {/* Loading */}
            {isLoading && (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border/50 bg-white">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && requests.length === 0 && (
              <Card className="border-border/50 bg-white">
                <CardContent className="flex flex-col items-center py-16">
                  <Building2 className="mb-3 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-[16px] font-medium text-muted-foreground">No requests yet</p>
                  <p className="mt-1 text-[14px] text-muted-foreground/70">
                    You can request a new organization from the{' '}
                    <Link href="/organizations" className="text-primary hover:underline">Organizations</Link> page.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Request list */}
            <div className="flex flex-col gap-3">
              {requests.map((req, i) => (
                <motion.div
                  key={req._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <Link href={`/org-requests/${req._id}`}>
                    <Card className="border-border/50 bg-white transition-colors hover:bg-muted/20 cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 ring-1 ring-border/60">
                            {req.orgAvatar ? (
                              <AvatarImage src={req.orgAvatar} alt={req.orgName} />
                            ) : null}
                            <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                              {initials(req.orgName)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="truncate text-[15px] font-semibold text-foreground">{req.orgName}</p>
                            <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted-foreground">
                              <span>Submitted {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
                              {req.messages.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {req.messages.length}
                                </span>
                              )}
                            </div>
                          </div>

                          {statusBadge(req.status)}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
