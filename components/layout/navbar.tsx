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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/uplb_logo.png"
            alt="UPLB Logo"
            width={36}
            height={36}
            className="rounded-full"
          />
          <Image
            src="/FaNS_logo.png"
            alt="FaNS Logo"
            width={36}
            height={36}
            className="rounded-full"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-foreground">
              UPLB KAIN
            </span>
            <span className="hidden text-[10px] text-muted-foreground sm:block">
              Knowledge Archive on Integrated Nutrition
            </span>
          </div>
        </Link>

        {/* Nav Actions */}
        <nav className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">
                  {user.displayName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
