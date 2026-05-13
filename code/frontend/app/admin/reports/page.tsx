'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminReports, useUpdateReport } from '@/lib/api/reports';
import { useAdminToggleHidePost, useAdminDeletePost } from '@/lib/api/admin';
import { Flag, Eye, Trash2, XCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function RowSkeleton() {
  return (
    <div className="flex items-start gap-4 border-b border-border/30 px-5 py-4 last:border-b-0">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-3 w-64 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

function ReportRow({ report, index }: { report: any; index: number }) {
  const updateReport = useUpdateReport();
  const adminHidePost = useAdminToggleHidePost();
  const adminDeletePost = useAdminDeletePost();

  const target = report.targetId;
  const isPostReport = report.targetType === 'post';
  const isUserReport = report.targetType === 'user';

  // Post target info
  const postTitle = isPostReport && typeof target === 'object' ? target?.title : null;
  const postBody = isPostReport && typeof target === 'object' ? target?.bodyText : null;
  const postAuthor = isPostReport && typeof target === 'object' && target?.authorId ? target.authorId.displayName : null;
  const targetPostId = isPostReport && typeof target === 'object' ? target?._id : report.targetId;

  // User target info
  const targetUserName = isUserReport && typeof target === 'object' ? target?.displayName : null;
  const targetUserEmail = isUserReport && typeof target === 'object' ? target?.email : null;
  const targetUserAvatar = isUserReport && typeof target === 'object' ? target?.avatar : null;

  // Reporter
  const reporterName = report.reporterId?.displayName || 'Unknown';
  const reporterAvatar = report.reporterId?.avatar ?? undefined;

  // Reviewer
  const reviewerName = report.reviewedBy?.displayName || null;

  const statusColor =
    report.status === 'open' ? 'bg-destructive/10 text-destructive border-destructive/20' :
    report.status === 'action_taken' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    'bg-muted text-muted-foreground border-border';

  const reasonLabel = report.reason.replace('_', ' ').replace(/^\w/, (c: string) => c.toUpperCase());
  const timeAgo = formatDistanceToNow(new Date(report.createdAt), { addSuffix: true });
  const fullDate = format(new Date(report.createdAt), 'MMM d, yyyy h:mm a');

  return (
    <motion.div
      className="border-b border-border/30 px-5 py-4 last:border-b-0 transition-colors hover:bg-muted/20"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      {/* Header: status + type + reason + time */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge className={`text-[11px] font-semibold px-2 py-0 ${statusColor}`}>
          {report.status === 'open' ? 'Open' : report.status === 'action_taken' ? 'Action Taken' : 'Dismissed'}
        </Badge>
        <Badge variant="outline" className="text-[11px] px-2 py-0">
          {isPostReport ? 'Post' : 'User'}
        </Badge>
        <Badge variant="outline" className="text-[11px] px-2 py-0">{reasonLabel}</Badge>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-auto shrink-0 text-[12px] text-muted-foreground cursor-default">
                {timeAgo}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {fullDate}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Target preview */}
      {isPostReport && (
        <>
          {postTitle && (
            <p className="text-[15px] font-semibold text-foreground line-clamp-2">{postTitle}</p>
          )}
          {postBody && (
            <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-2">{postBody}</p>
          )}
          {postAuthor && (
            <p className="mt-1 text-[12px] text-muted-foreground">
              Post by <span className="font-medium text-foreground/70">{postAuthor}</span>
            </p>
          )}
        </>
      )}
      {isUserReport && (
        <div className="flex items-center gap-2 mt-1">
          <Avatar className="h-6 w-6">
            <AvatarImage src={targetUserAvatar ?? undefined} alt={targetUserName ?? ''} />
            <AvatarFallback className="text-[10px]">
              {targetUserName ? initials(targetUserName) : <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-[14px] font-semibold text-foreground">{targetUserName || 'Unknown user'}</span>
          {targetUserEmail && (
            <span className="text-[12px] text-muted-foreground">{targetUserEmail}</span>
          )}
        </div>
      )}

      {/* Reporter info */}
      <div className="flex items-center gap-2 mt-3">
        <Avatar className="h-6 w-6">
          <AvatarImage src={reporterAvatar} alt={reporterName} />
          <AvatarFallback className="text-[10px]">{initials(reporterName)}</AvatarFallback>
        </Avatar>
        <span className="text-[12px] text-muted-foreground">
          Reported by <span className="font-medium text-foreground/70">{reporterName}</span>
          {' · '}
          {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Reporter details */}
      {report.details && (
        <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground italic">
          &ldquo;{report.details}&rdquo;
        </p>
      )}

      {/* Review info (for handled reports) */}
      {report.status !== 'open' && reviewerName && (
        <div className="mt-2 text-[12px] text-muted-foreground">
          Reviewed by <span className="font-medium text-foreground/70">{reviewerName}</span>
          {report.actionTaken && <> · Action: <span className="font-medium">{report.actionTaken.replace('_', ' ')}</span></>}
          {report.reviewNote && <> · Note: &ldquo;{report.reviewNote}&rdquo;</>}
        </div>
      )}

      {/* Actions (for open reports) */}
      {report.status === 'open' && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          {isPostReport && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 text-[13px]" asChild>
                <Link href={`/posts/${targetPostId}`}>
                  <Eye className="h-3.5 w-3.5" />
                  View Post
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-[13px] text-orange-600 hover:text-orange-600"
                onClick={async () => {
                  await adminHidePost.mutateAsync({ postId: targetPostId });
                  updateReport.mutate({ reportId: report._id, status: 'action_taken', actionTaken: 'post_hidden' });
                }}
                disabled={adminHidePost.isPending}
              >
                <Eye className="h-3.5 w-3.5" />
                Hide Post
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-[13px] text-destructive hover:text-destructive"
                onClick={async () => {
                  await adminDeletePost.mutateAsync({ postId: targetPostId });
                  updateReport.mutate({ reportId: report._id, status: 'action_taken', actionTaken: 'post_deleted' });
                }}
                disabled={adminDeletePost.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Post
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-[13px] text-muted-foreground"
            onClick={() => updateReport.mutate({ reportId: report._id, status: 'dismissed' })}
            disabled={updateReport.isPending}
          >
            <XCircle className="h-3.5 w-3.5" />
            Dismiss
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');

  const { data, isLoading } = useAdminReports({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    targetType: targetTypeFilter !== 'all' ? targetTypeFilter : undefined,
    page,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="bg-page-bg min-h-full">
      {/* Page heading */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-kain-green mb-1">
          Admin Panel
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] text-foreground">Reports</h1>
          {data && data.openCount > 0 && (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[12px] font-semibold px-2">
              {data.openCount} open
            </Badge>
          )}
        </div>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Review user-submitted reports for posts and users
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="mb-4 flex flex-wrap items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[150px] text-[13px] bg-white border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="action_taken">Action Taken</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">Type:</span>
          <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[130px] text-[13px] bg-white border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="post">Posts</SelectItem>
              <SelectItem value="user">Users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== 'all' || targetTypeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[13px] text-muted-foreground"
            onClick={() => { setStatusFilter('all'); setTargetTypeFilter('all'); setPage(1); }}
          >
            Clear filters
          </Button>
        )}
      </motion.div>

      {/* Reports list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-border/50 bg-white border border-border overflow-hidden">
          <CardContent className="p-0">
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)}

            {data?.reports.map((report: any, index: number) => (
              <ReportRow key={report._id} report={report} index={index} />
            ))}

            {data && data.reports.length === 0 && (
              <div className="flex flex-col items-center py-14 text-center">
                <Flag className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-[15px] text-muted-foreground">No reports found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {data && totalPages > 1 && (
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
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="default"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
