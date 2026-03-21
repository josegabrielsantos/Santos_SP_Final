'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAdminOrgRequests } from '@/lib/api/org-requests';
import { formatDistanceToNow } from 'date-fns';
import type { OrgRequestStatus } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

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

function RowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_1fr_120px_140px_60px] items-center gap-4 border-b border-border/25 px-5 py-3.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
      <Skeleton className="h-4 w-32 rounded" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-4 w-20 rounded" />
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  );
}

type FilterStatus = '' | OrgRequestStatus;

export default function AdminOrgRequestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');

  const { data, isLoading } = useAdminOrgRequests({
    page,
    limit: 20,
    status: statusFilter || undefined,
  });

  const handleTabChange = (value: string) => {
    setStatusFilter(value as FilterStatus);
    setPage(1);
  };

  return (
    <div className="bg-page-bg min-h-full">
      {/* Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-kain-green mb-1">
          Admin Panel
        </p>
        <h1 className="text-[28px] text-foreground">Organization Requests</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Review and manage organization creation requests from users
        </p>
      </motion.div>

      {/* Filter tabs */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Tabs value={statusFilter} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="needs_revision">Needs Revision</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
      >
        <Card className="border-border/50 bg-white border border-border overflow-hidden">
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_120px_140px_60px] gap-4 border-b border-border/40 bg-muted/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Requester</span>
              <span>Organization</span>
              <span>Status</span>
              <span>Submitted</span>
              <span />
            </div>

            {/* Loading */}
            {isLoading && Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}

            {/* Rows */}
            {data?.requests.map((req) => (
              <div
                key={req._id}
                className="grid grid-cols-[1fr_1fr_120px_140px_60px] items-center gap-4 border-b border-border/25 px-5 py-3 last:border-b-0 transition-colors hover:bg-muted/20 cursor-pointer"
                onClick={() => router.push(`/admin/org-requests/${req._id}`)}
              >
                {/* Requester */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar size="sm">
                    <AvatarImage src={req.requesterId?.avatar ?? undefined} />
                    <AvatarFallback className="text-[11px]">
                      {initials(req.requesterId?.displayName ?? 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-foreground">
                      {req.requesterId?.displayName}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {req.requesterId?.email}
                    </p>
                  </div>
                </div>

                {/* Org name */}
                <p className="truncate text-[14px] text-foreground">{req.orgName}</p>

                {/* Status */}
                {statusBadge(req.status)}

                {/* Submitted */}
                <p className="text-[13px] text-muted-foreground">
                  {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                </p>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon-xs">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      className="cursor-pointer gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/org-requests/${req._id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {data && data.requests.length === 0 && (
              <p className="px-5 py-10 text-center text-[15px] text-muted-foreground">
                No requests found.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 py-6">
          <Button
            variant="outline"
            size="default"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-[13px] text-muted-foreground">
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
  );
}
