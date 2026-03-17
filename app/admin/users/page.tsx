'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminUsers, useUpdateUserRole, useToggleUserActive } from '@/lib/api/admin';
import { useAppSelector } from '@/store/hooks';
import {
  Search,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  UserX,
  UserCheck,
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
function UserRowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_200px_100px_100px_60px] items-center gap-4 border-b border-border/30 px-5 py-3.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-36 rounded" />
      </div>
      <Skeleton className="h-4 w-40 rounded" />
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const currentUser = useAppSelector((s) => s.auth.user);

  const { data, isLoading } = useAdminUsers({ page, limit: 20, search: search || undefined });
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();

  return (
    <div className="bg-page-bg min-h-full">
      {/* Page heading + search bar */}
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
          <h1 className="text-[28px] text-foreground">User Management</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Manage users, promote admins, and deactivate accounts
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="h-9 rounded-full pl-9 text-[14px] bg-white border-border/60"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </motion.div>

      {/* Table card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
      >
        <Card className="border-border/50 bg-white card-shadow overflow-hidden">
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_200px_100px_100px_60px] gap-4 border-b border-border/40 bg-muted/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>User</span>
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
              <span />
            </div>

            {/* Skeleton rows while loading */}
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => <UserRowSkeleton key={i} />)}

            {/* User rows */}
            {data?.users.map((user) => {
              const isSelf = currentUser?._id === user._id;
              return (
                <div
                  key={user._id}
                  className="grid grid-cols-[1fr_200px_100px_100px_60px] items-center gap-4 border-b border-border/25 px-5 py-3 last:border-b-0 transition-colors hover:bg-muted/20"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar size="sm">
                      <AvatarImage src={user.avatar ?? undefined} alt={user.displayName} />
                      <AvatarFallback className="text-[11px]">
                        {initials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-[14px] font-medium text-foreground">
                      {user.displayName}
                      {isSelf && (
                        <span className="ml-1.5 text-[11px] text-muted-foreground">(you)</span>
                      )}
                    </span>
                  </div>

                  {/* Email */}
                  <span className="truncate text-[13px] text-muted-foreground">{user.email}</span>

                  {/* Role */}
                  <Badge
                    variant={user.role === 'website_admin' ? 'default' : 'secondary'}
                    className="w-fit text-[11px] rounded-full"
                  >
                    {user.role === 'website_admin' ? 'Admin' : 'User'}
                  </Badge>

                  {/* Status */}
                  <Badge
                    variant={user.isActive ? 'secondary' : 'destructive'}
                    className="w-fit text-[11px] rounded-full"
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" disabled={isSelf}>
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {user.role === 'user' ? (
                        <DropdownMenuItem
                          className="cursor-pointer gap-2"
                          onClick={() =>
                            updateRole.mutate({ userId: user._id, role: 'website_admin' })
                          }
                        >
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Promote to Admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="cursor-pointer gap-2"
                          onClick={() =>
                            updateRole.mutate({ userId: user._id, role: 'user' })
                          }
                        >
                          <ShieldOff className="h-4 w-4 text-orange-500" />
                          Demote to User
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer gap-2"
                        onClick={() => toggleActive.mutate(user._id)}
                      >
                        {user.isActive ? (
                          <>
                            <UserX className="h-4 w-4 text-destructive" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 text-kain-green" />
                            Reactivate
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}

            {data && data.users.length === 0 && (
              <p className="px-5 py-10 text-center text-[15px] text-muted-foreground">
                No users found.
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
