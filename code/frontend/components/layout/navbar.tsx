'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/store/hooks';
import { useLogout } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const logoutMutation = useLogout();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-primary border-b border-primary/80">
      <div className="mx-auto flex h-[60px] max-w-[1400px] items-center justify-between px-4 lg:px-6">
        {/* Left – Logos + Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
          <Image src="/uplb_logo.png" alt="UPLB" width={32} height={32} className="rounded-full ring-1 ring-white/30" />
          <Image src="/FaNS_logo.png" alt="FaNS" width={32} height={32} className="rounded-full ring-1 ring-white/30" />
          <div className="flex flex-col leading-tight">
            <span className="text-[17px] font-bold tracking-tight text-white font-heading">
              UPLB FaNS Knowledge Hub
            </span>
            <span className="hidden text-[11px] text-white/70 sm:block">
              Food and Nutrition Security Research Platform
            </span>
          </div>
        </Link>

        {/* Right – Nav Actions */}
        <nav className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <>
              <div className="hidden items-center gap-2.5 sm:flex">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white/30"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <span className="text-[14px] font-medium text-white">
                  {user.displayName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-semibold" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
