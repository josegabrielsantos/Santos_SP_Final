'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Send,
  ExternalLink,
  Pencil,
  X,
  Check,
  Upload,
  ImageIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMyOrgRequest, useUpdateMyOrgRequest, useAddRequesterMessage } from '@/lib/api/org-requests';
import { useUploadFile } from '@/lib/api/upload';
import { formatDistanceToNow } from 'date-fns';
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

export default function OrgRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const { data: request, isLoading } = useMyOrgRequest(requestId);

  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [editBanner, setEditBanner] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = useAddRequesterMessage();
  const updateRequest = useUpdateMyOrgRequest();
  const uploadFile = useUploadFile();

  const canEdit = request && ['pending', 'needs_revision'].includes(request.status);
  const canMessage = request && ['pending', 'needs_revision'].includes(request.status);

  const handleSendMessage = () => {
    if (!message.trim() || !request) return;
    sendMessage.mutate(
      { id: request._id, body: message.trim() },
      { onSuccess: () => setMessage('') },
    );
  };

  const startEditing = () => {
    if (!request) return;
    setEditName(request.orgName);
    setEditDescription(request.orgDescription);
    setEditAvatar(request.orgAvatar ?? null);
    setEditBanner(request.orgBannerImage ?? null);
    setEditing(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadFile.mutateAsync({ file, folder: 'org-requests' });
      setEditAvatar(result.url);
    } catch { /* ignore */ }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadFile.mutateAsync({ file, folder: 'org-requests' });
      setEditBanner(result.url);
    } catch { /* ignore */ }
  };

  const handleSaveEdit = () => {
    if (!request || !editName.trim()) return;
    updateRequest.mutate(
      {
        id: request._id,
        orgName: editName.trim(),
        orgDescription: editDescription.trim(),
        orgAvatar: editAvatar,
        orgBannerImage: editBanner,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />
      <div className="flex">
        <Sidebar />
        <main className="flex flex-1 justify-center">
          <div className="flex w-full max-w-3xl flex-col gap-6 px-5 py-7 lg:px-7">
            {/* Back */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

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
                {/* Request details card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <Card className="border-border/50 bg-white overflow-hidden">
                    {/* Hidden file inputs */}
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />

                    {/* Banner */}
                    {!editing ? (
                      request.orgBannerImage ? (
                        <div className="h-32 w-full overflow-hidden">
                          <img src={request.orgBannerImage} alt="Banner" className="h-full w-full object-cover" />
                        </div>
                      ) : null
                    ) : (
                      <div className="relative h-32 w-full overflow-hidden bg-muted/30 border-b border-border/40">
                        {editBanner ? (
                          <>
                            <img src={editBanner} alt="Banner preview" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="secondary" className="gap-1.5 text-[12px]" onClick={() => bannerInputRef.current?.click()} disabled={uploadFile.isPending}>
                                {uploadFile.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                Change
                              </Button>
                              <Button size="sm" variant="secondary" className="gap-1.5 text-[12px]" onClick={() => setEditBanner(null)}>
                                <X className="h-3 w-3" /> Remove
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Button variant="ghost" size="sm" className="gap-2 text-[13px] text-muted-foreground" onClick={() => bannerInputRef.current?.click()} disabled={uploadFile.isPending}>
                              {uploadFile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                              Upload Banner Image
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          {!editing ? (
                            <Avatar className="h-14 w-14 ring-2 ring-border/40">
                              {request.orgAvatar ? <AvatarImage src={request.orgAvatar} /> : null}
                              <AvatarFallback className="text-[16px] font-bold bg-primary/10 text-primary">
                                {initials(request.orgName)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="relative group shrink-0">
                              <Avatar className="h-14 w-14 ring-2 ring-border/40 cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                {editAvatar ? <AvatarImage src={editAvatar} /> : null}
                                <AvatarFallback className="text-[16px] font-bold bg-primary/10 text-primary">
                                  {initials(editName || request.orgName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                <Upload className="h-4 w-4 text-white" />
                              </div>
                              {editAvatar && (
                                <button
                                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-[10px] hover:bg-destructive/90"
                                  onClick={() => setEditAvatar(null)}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}

                          <div>
                            {!editing ? (
                              <>
                                <h1 className="text-[22px] font-bold text-foreground">{request.orgName}</h1>
                                {request.orgDescription && (
                                  <p className="mt-1 text-[14px] text-muted-foreground leading-relaxed">{request.orgDescription}</p>
                                )}
                              </>
                            ) : (
                              <div className="space-y-3 min-w-[300px]">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-9 text-[14px] bg-white border-border/60"
                                  placeholder="Organization name"
                                />
                                <Textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="min-h-[60px] text-[14px] bg-white border-border/60 resize-none"
                                  placeholder="Description"
                                  maxLength={1000}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" className="gap-1.5 text-[13px]" onClick={handleSaveEdit} disabled={updateRequest.isPending || !editName.trim()}>
                                    {updateRequest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    Save
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-[13px]" onClick={() => setEditing(false)}>
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {statusBadge(request.status)}
                          {canEdit && !editing && (
                            <Button variant="ghost" size="icon-xs" onClick={startEditing}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="mt-4 flex items-center gap-4 text-[13px] text-muted-foreground">
                        <span>Submitted {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</span>
                        {request.reviewedBy && (
                          <span>Reviewed by {request.reviewedBy.displayName}</span>
                        )}
                      </div>

                      {/* Approved — link to org */}
                      {request.status === 'approved' && request.organizationId && (
                        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                          <p className="text-[14px] text-emerald-800">
                            Your organization has been created!
                          </p>
                          <Link
                            href={`/organizations/${request.organizationId.slug}`}
                            className="mt-1 inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
                          >
                            Go to {request.organizationId.name}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      )}

                      {/* Rejected — show reason */}
                      {request.status === 'rejected' && request.rejectionReason && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                          <p className="text-[13px] font-medium text-red-800">Rejection Reason</p>
                          <p className="mt-0.5 text-[14px] text-red-700">{request.rejectionReason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Conversation thread */}
                {(request.messages.length > 0 || canMessage) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                    <Card className="border-border/50 bg-white overflow-hidden">
                      <CardContent className="p-6">
                        <h2 className="mb-4 text-[16px] font-semibold text-foreground">Conversation</h2>

                        {request.messages.length === 0 && (
                          <p className="py-4 text-center text-[14px] text-muted-foreground/60">No messages yet</p>
                        )}

                        <div className="flex flex-col gap-3">
                          {request.messages.map((msg) => {
                            const isAdmin = msg.senderRole === 'admin';
                            return (
                              <div key={msg._id} className={`flex gap-3 ${isAdmin ? '' : 'flex-row-reverse'}`}>
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarImage src={msg.senderId?.avatar ?? undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {initials(msg.senderId?.displayName ?? 'U')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isAdmin ? 'bg-muted/60' : 'bg-primary/10'}`}>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[12px] font-semibold text-foreground">
                                      {msg.senderId?.displayName ?? 'User'}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {isAdmin ? 'Admin' : 'You'}
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
                        {canMessage && (
                          <div className="mt-4 flex gap-2">
                            <Input
                              placeholder="Type a message…"
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
                              disabled={!message.trim() || sendMessage.isPending}
                            >
                              {sendMessage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              Send
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
