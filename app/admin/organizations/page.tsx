'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Create Org Dialog (inline) ────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-lg bg-white shadow-lg">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[21px] font-bold text-foreground">Create Organization</h2>
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-[14px] font-medium text-foreground">
                Organization Name *
              </label>
              <Input
                placeholder="Enter name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-[16px]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[14px] font-medium text-foreground">
                Description
              </label>
              <Input
                placeholder="Short description (optional)…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 text-[16px]"
              />
            </div>

            {/* Owner selector */}
            <div>
              <label className="mb-1.5 block text-[14px] font-medium text-foreground">
                Assign Owner *
              </label>

              {selectedOwner ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <Avatar size="sm">
                    <AvatarImage src={selectedOwner.avatar ?? undefined} />
                    <AvatarFallback className="text-[11px]">
                      {initials(selectedOwner.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[16px] font-medium">{selectedOwner.displayName}</p>
                    <p className="truncate text-[14px] text-muted-foreground">{selectedOwner.email}</p>
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
                      className="h-10 pl-10 text-[16px]"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-border/60">
                    {usersLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : usersData?.users.length === 0 ? (
                      <p className="px-3 py-3 text-[14px] text-muted-foreground">No users found</p>
                    ) : (
                      usersData?.users.map((u) => (
                        <button
                          key={u._id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[16px] hover:bg-muted/40 transition-colors"
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
                            <p className="truncate text-[16px] font-medium">{u.displayName}</p>
                            <p className="truncate text-[14px] text-muted-foreground">{u.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="default"
              disabled={!name.trim() || !selectedOwner || createOrg.isPending}
              onClick={handleSubmit}
            >
              {createOrg.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Create Organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useOrganizations({ page, limit: 20, search: search || undefined });
  const deleteOrg = useAdminDeleteOrg();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Organizations</h1>
          <p className="mt-1 text-[16px] text-muted-foreground">
            Create and manage organizations across the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
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
          <Button size="default" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New Org
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <Card className="border-border/60 bg-white shadow-sm">
        <CardContent className="p-0">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_120px_100px_60px] gap-4 border-b border-border/50 px-5 py-3.5 text-[14px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Organization</span>
            <span>Members</span>
            <span>Posts</span>
            <span>Status</span>
            <span></span>
          </div>

          {/* Org rows */}
          {data?.organizations.map((org) => (
            <div
              key={org._id}
              className="grid grid-cols-[1fr_120px_120px_100px_60px] items-center gap-4 border-b border-border/30 px-5 py-3 last:border-b-0"
            >
              {/* Org info */}
              <div className="flex items-center gap-3 min-w-0">
                <Avatar size="sm">
                  <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                  <AvatarFallback className="text-[11px]">{initials(org.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-medium text-foreground">{org.name}</p>
                  <p className="truncate text-[14px] text-muted-foreground">{org.slug}</p>
                </div>
              </div>

              {/* Members */}
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Users className="h-4 w-4" />
                {org.memberCount}
              </div>

              {/* Posts */}
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <FileText className="h-4 w-4" />
                {org.postCount}
              </div>

              {/* Status */}
              <Badge variant="secondary" className="w-fit text-[12px]">Active</Badge>

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
                    onClick={() => {
                      if (window.confirm(`Delete "${org.name}"? This cannot be undone.`)) {
                        deleteOrg.mutate(org._id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Organization
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {data && data.organizations.length === 0 && (
            <p className="px-5 py-8 text-center text-[16px] text-muted-foreground">
              No organizations found.
            </p>
          )}
        </CardContent>
      </Card>

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

      {/* Create dialog */}
      {showCreate && <CreateOrgDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
