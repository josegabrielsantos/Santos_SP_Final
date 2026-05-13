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
import { useModerationLogs } from '@/lib/api/admin';
import type { ModerationAction, ModerationLog } from '@/lib/types';
import {
  EyeOff,
  Eye,
  Trash2,
  Ban,
  ShieldCheck,
  UserX,
  UserCheck,
  ShieldMinus,
  FileText,
  MessageCircle,
  User,
  Building2,
  PowerOff,
  Power,
} from 'lucide-react';
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

const ACTION_CONFIG: Record<ModerationAction, { label: string; icon: React.ReactNode; color: string }> = {
  post_hidden: {
    label: 'Post Hidden',
    icon: <EyeOff className="h-3.5 w-3.5" />,
    color: 'bg-orange-50 text-orange-700 border-orange-200/60',
  },
  post_unhidden: {
    label: 'Post Unhidden',
    icon: <Eye className="h-3.5 w-3.5" />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  },
  post_deleted: {
    label: 'Post Deleted',
    icon: <Trash2 className="h-3.5 w-3.5" />,
    color: 'bg-red-50 text-red-700 border-red-200/60',
  },
  comment_hidden: {
    label: 'Comment Hidden',
    icon: <EyeOff className="h-3.5 w-3.5" />,
    color: 'bg-orange-50 text-orange-700 border-orange-200/60',
  },
  comment_unhidden: {
    label: 'Comment Unhidden',
    icon: <Eye className="h-3.5 w-3.5" />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  },
  comment_deleted: {
    label: 'Comment Deleted',
    icon: <Trash2 className="h-3.5 w-3.5" />,
    color: 'bg-red-50 text-red-700 border-red-200/60',
  },
  user_banned: {
    label: 'User Banned',
    icon: <Ban className="h-3.5 w-3.5" />,
    color: 'bg-red-50 text-red-700 border-red-200/60',
  },
  user_unbanned: {
    label: 'User Unbanned',
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  },
  user_deactivated: {
    label: 'User Deactivated',
    icon: <UserX className="h-3.5 w-3.5" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200/60',
  },
  user_reactivated: {
    label: 'User Reactivated',
    icon: <UserCheck className="h-3.5 w-3.5" />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  },
  user_role_changed: {
    label: 'Role Changed',
    icon: <ShieldMinus className="h-3.5 w-3.5" />,
    color: 'bg-blue-50 text-blue-700 border-blue-200/60',
  },
  org_deactivated: {
    label: 'Org Deactivated',
    icon: <PowerOff className="h-3.5 w-3.5" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200/60',
  },
  org_reactivated: {
    label: 'Org Reactivated',
    icon: <Power className="h-3.5 w-3.5" />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  },
  org_deleted: {
    label: 'Org Deleted',
    icon: <Trash2 className="h-3.5 w-3.5" />,
    color: 'bg-red-50 text-red-700 border-red-200/60',
  },
};

const TARGET_ICONS: Record<string, React.ReactNode> = {
  post: <FileText className="h-4 w-4 text-primary" />,
  comment: <MessageCircle className="h-4 w-4 text-violet-500" />,
  user: <User className="h-4 w-4 text-amber-600" />,
  organization: <Building2 className="h-4 w-4 text-primary" />,
};

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-border/30 px-5 py-3.5 last:border-b-0">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-4 w-48 rounded" />
      <Skeleton className="h-4 w-24 rounded" />
    </div>
  );
}

function LogRow({ log }: { log: ModerationLog }) {
  const config = ACTION_CONFIG[log.action];
  const meta = log.metadata as Record<string, string> | null;
  const timeAgo = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true });
  const fullDate = format(new Date(log.createdAt), 'MMM d, yyyy h:mm a');

  const adminName = typeof log.performedBy === 'object' ? log.performedBy.displayName : 'System';
  const adminAvatar = typeof log.performedBy === 'object' ? log.performedBy.avatar ?? undefined : undefined;

  // Build a readable description from metadata
  let targetLabel = '';
  if (log.targetType === 'post' && meta?.title) {
    targetLabel = meta.title;
  } else if (log.targetType === 'comment' && meta?.bodyPreview) {
    targetLabel = meta.bodyPreview;
  } else if (log.targetType === 'user') {
    targetLabel = meta?.displayName || meta?.email || log.targetId;
  } else if (log.targetType === 'organization') {
    targetLabel = meta?.name || log.targetId;
  } else {
    targetLabel = log.targetId;
  }

  // If the target is a post or a comment (which belongs to a post), build a link
  // back to the post so admins can act on it (e.g., unhide) directly from the log.
  // For deleted posts, linking is pointless — the record is gone.
  let targetHref: string | null = null;
  if (log.targetType === 'post' && log.action !== 'post_deleted') {
    targetHref = `/posts/${log.targetId}`;
  } else if (log.targetType === 'comment' && meta?.postId) {
    targetHref = `/posts/${meta.postId}`;
  }

  const displayLabel = targetLabel.length > 80 ? targetLabel.slice(0, 80) + '…' : targetLabel;

  return (
    <div className="flex items-start gap-4 border-b border-border/25 px-5 py-3.5 last:border-b-0 transition-colors hover:bg-muted/20">
      {/* Admin avatar */}
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={adminAvatar} alt={adminName} />
        <AvatarFallback className="text-[10px]">{initials(adminName)}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-foreground">{adminName}</span>
          <Badge className={`inline-flex items-center gap-1 text-[11px] font-medium border rounded-full px-2 py-0 ${config.color}`}>
            {config.icon}
            {config.label}
          </Badge>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {TARGET_ICONS[log.targetType]}
          {targetHref ? (
            <Link
              href={targetHref}
              className="truncate max-w-md text-primary hover:underline"
              title={targetLabel}
            >
              {displayLabel}
            </Link>
          ) : (
            <span className="truncate max-w-md" title={targetLabel}>
              {displayLabel}
            </span>
          )}
        </div>

        {log.details && (
          <p className="mt-1 text-[13px] text-muted-foreground/80 italic">
            Reason: {log.details}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 text-[12px] text-muted-foreground cursor-default mt-0.5">
              {timeAgo}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {fullDate}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default function ModerationLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');

  const { data, isLoading } = useModerationLogs({
    page,
    limit: 30,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    targetType: targetTypeFilter !== 'all' ? targetTypeFilter : undefined,
  });

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
        <h1 className="text-[28px] text-foreground">Moderation Logs</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Audit trail of all admin moderation actions
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
          <span className="text-[13px] font-medium text-muted-foreground">Target:</span>
          <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[130px] text-[13px] bg-white border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="post">Posts</SelectItem>
              <SelectItem value="comment">Comments</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="organization">Organizations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">Action:</span>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[180px] text-[13px] bg-white border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="post_hidden">Post Hidden</SelectItem>
              <SelectItem value="post_unhidden">Post Unhidden</SelectItem>
              <SelectItem value="post_deleted">Post Deleted</SelectItem>
              <SelectItem value="comment_hidden">Comment Hidden</SelectItem>
              <SelectItem value="comment_unhidden">Comment Unhidden</SelectItem>
              <SelectItem value="comment_deleted">Comment Deleted</SelectItem>
              <SelectItem value="user_banned">User Banned</SelectItem>
              <SelectItem value="user_unbanned">User Unbanned</SelectItem>
              <SelectItem value="user_deactivated">User Deactivated</SelectItem>
              <SelectItem value="user_reactivated">User Reactivated</SelectItem>
              <SelectItem value="user_role_changed">Role Changed</SelectItem>
              <SelectItem value="org_deactivated">Org Deactivated</SelectItem>
              <SelectItem value="org_reactivated">Org Reactivated</SelectItem>
              <SelectItem value="org_deleted">Org Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(actionFilter !== 'all' || targetTypeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[13px] text-muted-foreground"
            onClick={() => { setActionFilter('all'); setTargetTypeFilter('all'); setPage(1); }}
          >
            Clear filters
          </Button>
        )}
      </motion.div>

      {/* Logs table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-border/50 bg-white border border-border overflow-hidden">
          <CardContent className="p-0">
            {isLoading &&
              Array.from({ length: 10 }).map((_, i) => <RowSkeleton key={i} />)}

            {data?.logs.map((log) => (
              <LogRow key={log._id} log={log} />
            ))}

            {data && data.logs.length === 0 && (
              <p className="px-5 py-14 text-center text-[15px] text-muted-foreground">
                No moderation logs found.
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
