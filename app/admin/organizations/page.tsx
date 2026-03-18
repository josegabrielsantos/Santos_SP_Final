'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrganizations } from '@/lib/api/organizations';
import { useAdminUsers, useAdminCreateOrg, useAdminDeleteOrg } from '@/lib/api/admin';
import {
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  Users,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/* ─── Row skeleton ─────────────────────────────────────────────── */
function OrgRowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_120px_120px_100px_60px] items-center gap-4 border-b border-border/25 px-5 py-3.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>
      <Skeleton className="h-4 w-10 rounded" />
      <Skeleton className="h-4 w-10 rounded" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  );
}

/* ─── Create Org Dialog (inline) ──────────────────────────────── */

function CreateOrgDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<{
    _id: string;
    displayName: string;
    email: string;
    avatar?: string | null;
  } | null>(null);

  const { data: usersData, isLoading: usersLoading } = useAdminUsers({
    search: ownerSearch || undefined,
    limit: 8,
  });

  const createOrg = useAdminCreateOrg();

  const handleSubmit = () => {
    if (!name.trim() || !selectedOwner) return;
    createOrg.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        ownerId: selectedOwner._id,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        className="w-full max-w-lg mx-4"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Card className="bg-white border-border/50 border border-border rounded-2xl">
          <CardContent className="p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-kain-green mb-0.5">
                  Admin Action
                </p>
                <h2 className="text-[20px] text-foreground">Create Organization</h2>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                  Organization Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Enter name…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-[14px] bg-white border-border/60"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                  Description
                </label>
                <Input
                  placeholder="Short description (optional)…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9 text-[14px] bg-white border-border/60"
                />
              </div>

              {/* Owner selector */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                  Assign Owner <span className="text-destructive">*</span>
                </label>

                {selectedOwner ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                    <Avatar size="sm">
                      <AvatarImage src={selectedOwner.avatar ?? undefined} />
                      <AvatarFallback className="text-[11px]">
                        {initials(selectedOwner.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[14px] font-medium">{selectedOwner.displayName}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{selectedOwner.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setSelectedOwner(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search users…"
                        value={ownerSearch}
                        onChange={(e) => setOwnerSearch(e.target.value)}
                        className="h-9 pl-9 text-[14px] bg-white border-border/60"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-border/50 bg-white">
                      {usersLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : usersData?.users.length === 0 ? (
                        <p className="px-3 py-3 text-[13px] text-muted-foreground">No users found</p>
                      ) : (
                        usersData?.users.map((u) => (
                          <button
                            key={u._id}
                            type="button"
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[14px] hover:bg-muted/30 transition-colors"
                            onClick={() => {
                              setSelectedOwner({
                                _id: u._id,
                                displayName: u.displayName,
                                email: u.email,
                                avatar: u.avatar,
                              });
                              setOwnerSearch('');
                            }}
                          >
                            <Avatar size="sm">
                              <AvatarImage src={u.avatar ?? undefined} />
                              <AvatarFallback className="text-[11px]">
                                {initials(u.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-[14px] font-medium">{u.displayName}</p>
                              <p className="truncate text-[12px] text-muted-foreground">{u.email}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-2.5">
              <Button variant="outline" size="default" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="default"
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                disabled={!name.trim() || !selectedOwner || createOrg.isPending}
                onClick={handleSubmit}
              >
                {createOrg.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Create Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useOrganizations({ page, limit: 20, search: search || undefined });
  const deleteOrg = useAdminDeleteOrg();

  return (
    <div className="bg-page-bg min-h-full">
      {/* Page heading */}
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-kain-green mb-1">
            Admin Panel
          </p>
          <h1 className="text-[28px] text-foreground">Organizations</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Create and manage organizations across the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search organizations…"
              className="h-9 rounded-full pl-9 text-[14px] bg-white border-border/60"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button
            size="default"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 rounded-lg shrink-0"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            New Org
          </Button>
        </div>
      </motion.div>

      {/* Table card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
      >
        <Card className="border-border/50 bg-white border border-border overflow-hidden">
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_120px_120px_100px_60px] gap-4 border-b border-border/40 bg-muted/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Organization</span>
              <span>Members</span>
              <span>Posts</span>
              <span>Status</span>
              <span />
            </div>

            {/* Skeleton rows while loading */}
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => <OrgRowSkeleton key={i} />)}

            {/* Org rows */}
            {data?.organizations.map((org) => (
              <div
                key={org._id}
                className="grid grid-cols-[1fr_120px_120px_100px_60px] items-center gap-4 border-b border-border/25 px-5 py-3 last:border-b-0 transition-colors hover:bg-muted/20"
              >
                {/* Org info */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar size="sm">
                    <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                    <AvatarFallback className="text-[11px]">{initials(org.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-foreground">{org.name}</p>
                    <p className="truncate text-[12px] text-muted-foreground">{org.slug}</p>
                  </div>
                </div>

                {/* Members */}
                <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {org.memberCount}
                </div>

                {/* Posts */}
                <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  {org.postCount}
                </div>

                {/* Status */}
                <Badge
                  variant="secondary"
                  className="w-fit text-[11px] rounded-full text-kain-green bg-kain-green/10"
                >
                  Active
                </Badge>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget({ id: org._id, name: org.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Organization
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {data && data.organizations.length === 0 && (
              <p className="px-5 py-10 text-center text-[15px] text-muted-foreground">
                No organizations found.
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

      {/* Create dialog */}
      {showCreate && <CreateOrgDialog onClose={() => setShowCreate(false)} />}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organization?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  You are about to delete <strong className="text-foreground">&ldquo;{deleteTarget.name}&rdquo;</strong>.
                  This will permanently remove the organization, its settings, and all associated data. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteOrg.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
