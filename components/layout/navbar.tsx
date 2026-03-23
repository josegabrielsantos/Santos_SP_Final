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
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-7 lg:px-9">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-3.5">
          <Image
            src="/uplb_logo.png"
            alt="UPLB Logo"
            width={40}
            height={40}
            className="rounded-full"
          />
          <Image
            src="/FaNS_logo.png"
            alt="FaNS Logo"
            width={40}
            height={40}
            className="rounded-full"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-[21px] font-bold tracking-tight text-foreground">
              UPLB FaNS Knowledge Hub
            </span>
            <span className="hidden text-[12px] text-muted-foreground sm:block">
              Food and Nutrition Security Research Platform
            </span>
          </div>
        </Link>

        {/* Nav Actions */}
        <nav className="flex items-center gap-3.5">
          {isAuthenticated && user ? (
            <>
              <div className="hidden items-center gap-2.5 sm:flex">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                )}
                <span className="text-[16px] font-medium text-foreground">
                  {user.displayName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="default"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="default" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="default" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
