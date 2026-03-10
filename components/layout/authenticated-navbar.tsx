'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useLogout } from '@/lib/api/auth';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, User, Settings, LogOut, ShieldCheck, Bell } from 'lucide-react';
import { useUnreadNotificationCount, useMarkNotificationsRead } from '@/lib/api/notifications';
import { NotificationDropdown } from './notification-dropdown';

export function AuthenticatedNavbar() {
  const { user } = useAppSelector((s) => s.auth);
  const logoutMutation = useLogout();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.push('/');
  };

  const initials = user?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center gap-4 px-4 lg:px-6">
        {/* Left – Logos */}
        <Link href="/home" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/uplb_logo.png"
            alt="UPLB Logo"
            width={35}
            height={35}
            className="rounded-full"
          />
          <Image
            src="/FaNS_logo.png"
            alt="FaNS Logo"
            width={35}
            height={35}
            className="rounded-full"
          />
          <span className="hidden text-[20px] font-bold tracking-tight text-foreground lg:block">
            UPLB KAIN
          </span>
        </Link>

        {/* Center – Search bar */}
        <div className="flex flex-1 justify-center px-2">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts, papers, organizations…"
              className="h-11 w-full rounded-full border-border/80 bg-muted/40 pl-10 pr-4 text-[16px] placeholder:text-muted-foreground/70 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Right – Notifications + Avatar dropdown */}
        <div className="flex items-center gap-2">
          {/* Notification dropdown */}
          <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex shrink-0 items-center gap-2 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary/40">
              <Avatar size="default" className="cursor-pointer ring-2 ring-border hover:ring-primary/40 transition-all">
                <AvatarImage src={user?.avatar ?? undefined} alt={user?.displayName ?? 'User'} />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* User info */}
            <div className="px-3 py-2">
              <p className="text-[16px] font-medium text-foreground">{user?.displayName}</p>
              <p className="text-[13px] text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => router.push(`/profile/${user?._id}`)} className="cursor-pointer gap-2 text-[15px]">
              <User className="h-[18px] w-[18px]" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer gap-2 text-[15px]">
              <Settings className="h-[18px] w-[18px]" />
              Settings
            </DropdownMenuItem>
            {user?.role === 'website_admin' && (
              <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer gap-2 text-[15px]">
                <ShieldCheck className="h-[18px] w-[18px] text-primary" />
                Admin Panel
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="cursor-pointer gap-2 text-[15px] text-destructive focus:text-destructive"
            >
              <LogOut className="h-[18px] w-[18px]" />
              {logoutMutation.isPending ? 'Logging out…' : 'Logout'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
