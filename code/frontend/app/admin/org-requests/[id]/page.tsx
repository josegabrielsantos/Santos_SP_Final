'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Check,
  X,
  Send,
  Loader2,
  Building2,
  User,
  Calendar,
  Mail,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  useAdminOrgRequest,
  useApproveOrgRequest,
  useRejectOrgRequest,
  useAdminSendMessage,
} from '@/lib/api/org-requests';
import { formatDistanceToNow, format } from 'date-fns';
import type { OrgRequestStatus } from '@/lib/types';

function statusBadge(status: OrgRequestStatus) {
  const map: Record<OrgRequestStatus, { label: string; className: string }> = {
    pending: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    needs_revision: { label: 'Needs Revision', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const { label, className } = map[status];
  return <Badge variant="outline" className={`text-[12px] font-semibold px-2.5 py-0.5 ${className}`}>{label}</Badge>;
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminOrgRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const { data: request, isLoading } = useAdminOrgRequest(requestId);

  const [message, setMessage] = useState('');
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const approveMutation = useApproveOrgRequest();
  const rejectMutation = useRejectOrgRequest();
  const sendMessageMutation = useAdminSendMessage();

  const canAct = request && ['pending', 'needs_revision'].includes(request.status);

  const handleApprove = () => {
    if (!request) return;
    setActionError('');
    approveMutation.mutate(request._id, {
      onSuccess: () => setShowApprove(false),
      onError: (err: any) => {
        setActionError(err?.response?.data?.error || 'Failed to approve request.');
      },
    });
  };

  const handleReject = () => {
    if (!request || !rejectReason.trim()) return;
    setActionError('');
    rejectMutation.mutate(
      { id: request._id, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          setShowReject(false);
          setRejectReason('');
        },
        onError: () => setActionError('Failed to reject request.'),
      },
    );
  };

  const handleSendMessage = () => {
    if (!request || !message.trim()) return;
    sendMessageMutation.mutate(
      { id: request._id, body: message.trim() },
      { onSuccess: () => setMessage('') },
    );
  };

  return (
    <div className="bg-page-bg min-h-full">
      {/* Back */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <button
          onClick={() => router.push('/admin/org-requests')}
          className="mb-5 flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </button>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <Card className="border-border/50 bg-white">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      )}

      {request && (
        <>
          {/* Request info card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="border-border/50 bg-white overflow-hidden mb-6">
              {/* Banner */}
              {request.orgBannerImage && (
                <div className="h-32 w-full overflow-hidden">
                  <img src={request.orgBannerImage} alt="Banner" className="h-full w-full object-cover" />
                </div>
              )}

              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 ring-2 ring-border/40">
                      {request.orgAvatar ? <AvatarImage src={request.orgAvatar} /> : null}
                      <AvatarFallback className="text-[16px] font-bold bg-primary/10 text-primary">
                        {initials(request.orgName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-[22px] font-bold text-foreground">{request.orgName}</h1>
                      {request.orgDescription && (
                        <p className="mt-1 text-[14px] text-muted-foreground leading-relaxed max-w-xl">{request.orgDescription}</p>
                      )}
                    </div>
                  </div>
                  {statusBadge(request.status)}
                </div>

                {/* Requester info */}
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Requester</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.requesterId?.avatar ?? undefined} />
                      <AvatarFallback className="text-[11px]">
                        {initials(request.requesterId?.displayName ?? 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[14px] font-medium text-foreground">{request.requesterId?.displayName}</p>
                      <p className="text-[13px] text-muted-foreground">{request.requesterId?.email}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    Submitted {format(new Date(request.createdAt), 'MMM d, yyyy')} ({formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })})
                  </p>
                </div>

                {/* Rejection reason (if rejected) */}
                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-[13px] font-medium text-red-800">Rejection Reason</p>
                    <p className="mt-0.5 text-[14px] text-red-700">{request.rejectionReason}</p>
                  </div>
                )}

                {/* Action error */}
                {actionError && (
                  <p className="mt-4 text-[13px] text-destructive">{actionError}</p>
                )}

                {/* Action buttons */}
                {canAct && (
                  <div className="mt-5 flex items-center gap-3">
                    <Button
                      className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => setShowApprove(true)}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setShowReject(true)}
                      disabled={rejectMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Conversation thread */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <Card className="border-border/50 bg-white overflow-hidden">
              <CardContent className="p-6">
                <h2 className="mb-4 text-[16px] font-semibold text-foreground">Conversation</h2>

                {request.messages.length === 0 && (
                  <p className="py-4 text-center text-[14px] text-muted-foreground/60">
                    No messages yet. Send a message to request more information from the requester.
                  </p>
                )}

                <div className="flex flex-col gap-3">
                  {request.messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'admin';
                    return (
                      <div key={msg._id} className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={msg.senderId?.avatar ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {initials(msg.senderId?.displayName ?? 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isAdmin ? 'bg-primary/10' : 'bg-muted/60'}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] font-semibold text-foreground">
                              {msg.senderId?.displayName ?? 'User'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {isAdmin ? 'Admin' : 'Requester'}
                            </span>
                          </div>
                          <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message input */}
                {canAct && (
                  <div className="mt-4 flex gap-2">
                    <Input
                      placeholder="Send a follow-up message…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="h-9 text-[14px] bg-white border-border/60"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={handleSendMessage}
                      disabled={!message.trim() || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* Approve dialog */}
      <AlertDialog open={showApprove} onOpenChange={setShowApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create the organization <strong className="text-foreground">&ldquo;{request?.orgName}&rdquo;</strong> with{' '}
              <strong className="text-foreground">{request?.requesterId?.displayName}</strong> as the owner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve & Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={showReject} onOpenChange={(open) => { setShowReject(open); if (!open) setRejectReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this request?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting the request to create <strong className="text-foreground">&ldquo;{request?.orgName}&rdquo;</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6">
            <Textarea
              placeholder="Reason for rejection…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[80px] text-[14px] bg-white border-border/60 resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
