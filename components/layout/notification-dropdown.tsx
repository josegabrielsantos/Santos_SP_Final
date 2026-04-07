'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bell, MessageCircle, Reply, AtSign, ThumbsUp, UserPlus, Check, X, FileText, Megaphone, Loader2, Building2, UploadCloud } from 'lucide-react';
import { useNotifications, useNotificationSummary, useMarkNotificationsRead } from '@/lib/api/notifications';
import { useAppSelector } from '@/store/hooks';
import { useSocketEvent } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function notifIcon(type: Notification['type']) {
  switch (type) {
    case 'comment':
      return <MessageCircle className="h-4 w-4" />;
    case 'reply':
      return <Reply className="h-4 w-4" />;
    case 'mention':
      return <AtSign className="h-4 w-4" />;
    case 'like':
      return <ThumbsUp className="h-4 w-4" />;
    case 'join_request':
      return <UserPlus className="h-4 w-4" />;
    case 'join_approved':
      return <Check className="h-4 w-4" />;
    case 'join_rejected':
      return <X className="h-4 w-4" />;
    case 'post_approved':
      return <FileText className="h-4 w-4" />;
    case 'post_rejected':
      return <FileText className="h-4 w-4" />;
    case 'announcement':
      return <Megaphone className="h-4 w-4" />;
    case 'org_request_submitted':
    case 'org_request_approved':
    case 'org_request_rejected':
    case 'org_request_followup':
    case 'org_request_reply':
      return <Building2 className="h-4 w-4" />;
    case 'bulk_upload_complete':
      return <UploadCloud className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function notifIconBg(type: Notification['type']) {
  switch (type) {
    case 'comment':
    case 'reply':
      return 'bg-blue-100 text-blue-600';
    case 'mention':
      return 'bg-purple-100 text-purple-600';
    case 'like':
      return 'bg-green-100 text-green-600';
    case 'join_request':
      return 'bg-amber-100 text-amber-600';
    case 'join_approved':
      return 'bg-emerald-100 text-emerald-600';
    case 'join_rejected':
      return 'bg-red-100 text-red-600';
    case 'post_approved':
      return 'bg-emerald-100 text-emerald-600';
    case 'post_rejected':
      return 'bg-red-100 text-red-600';
    case 'announcement':
      return 'bg-amber-100 text-amber-600';
    case 'org_request_submitted':
    case 'org_request_reply':
      return 'bg-indigo-100 text-indigo-600';
    case 'org_request_approved':
      return 'bg-emerald-100 text-emerald-600';
    case 'org_request_rejected':
      return 'bg-red-100 text-red-600';
    case 'org_request_followup':
      return 'bg-blue-100 text-blue-600';
    case 'bulk_upload_complete':
      return 'bg-emerald-100 text-emerald-600';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const { data: summaryData } = useNotificationSummary();
  const {
    data: notifsPages,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const queryClient = useQueryClient();

  // Real-time notification updates via socket
  useSocketEvent<{ unreadCount: number }>('notification:new', (data) => {
    queryClient.setQueryData(['notifications', 'unread-count'], { count: data.unreadCount });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'summary'] });
  });

  const unreadCount = summaryData?.unreadCount ?? 0;
  const notifications = notifsPages?.pages.flatMap((p) => p.notifications) ?? summaryData?.notifications ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    setOpen(!open);
  };

  const handleMarkAllRead = () => {
    markRead.mutate({ all: true });
  };

  const handleNotifClick = (notif: Notification) => {
    // Mark as read
    if (!notif.isRead) {
      markRead.mutate({ notificationIds: [notif._id] });
    }

    // Navigate
    if (notif.type.startsWith('org_request_') && notif.orgRequestId) {
      const isAdmin = user?.role === 'website_admin';
      router.push(isAdmin ? `/admin/org-requests/${notif.orgRequestId}` : `/org-requests/${notif.orgRequestId}`);
    } else if (notif.postId) {
      router.push(`/posts/${notif.postId._id}`);
    } else if (notif.organizationId) {
      router.push(`/organizations/${notif.organizationId.slug}`);
    }

    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-[22px] w-[22px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] overflow-hidden rounded-xl border border-border/60 bg-white shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/40">
            <h3 className="text-[14px] font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[12px] font-medium text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <ScrollArea className="h-[min(400px,70vh)] [&>[data-slot=scroll-area-viewport]>div]:!block">
            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="mb-2 h-9 w-9 opacity-40" />
                <p className="text-[16px]">No notifications yet</p>
              </div>
            )}

            {!isLoading && notifications.map((notif) => (
              <button
                key={notif._id}
                onClick={() => handleNotifClick(notif)}
                className={`flex w-full items-start gap-2.5 pl-3.5 pr-4 py-3 text-left transition-colors hover:bg-muted/40 overflow-hidden ${
                  !notif.isRead ? 'bg-primary/[0.03]' : ''
                }`}
              >
                {/* Sender avatar */}
                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={notif.senderId?.avatar ?? undefined}
                      alt={notif.senderId?.displayName ?? 'User'}
                    />
                    <AvatarFallback className="text-[10px]">
                      {initials(notif.senderId?.displayName ?? 'U')}
                    </AvatarFallback>
                  </Avatar>
                  {/* Type icon badge */}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full ${notifIconBg(notif.type)} [&_svg]:h-3 [&_svg]:w-3`}
                  >
                    {notifIcon(notif.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-[13px] leading-snug text-foreground line-clamp-2">
                    {notif.message}
                  </p>
                  {notif.postId && (
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {notif.postId.title}
                    </p>
                  )}
                  {notif.organizationId && !notif.postId && (
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {notif.organizationId.name}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notif.isRead && (
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))}

            {/* Load more */}
            {hasNextPage && (
              <div className="flex justify-center border-t border-border/40 py-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
