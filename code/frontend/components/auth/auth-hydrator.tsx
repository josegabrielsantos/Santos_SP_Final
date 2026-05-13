'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGetMe } from '@/lib/api/auth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUser, clearUser } from '@/store/slices/authSlice';

const PUBLIC_PATHS = ['/', '/login', '/signup'];

/**
 * Checks if the user has a valid session cookie on mount.
 * Syncs the result to Redux so components can read from the store.
 * Redirects to /login when the session check fails on protected routes.
 */
export function AuthHydrator({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data: user, isSuccess, isError, isLoading } = useGetMe();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isSuccess && user) {
      dispatch(setUser(user));
    }
    if (isError) {
      dispatch(clearUser());
      // Redirect to login if the session check failed on a protected route
      const isPublic = PUBLIC_PATHS.some(
        (p) => pathname === p || pathname.startsWith('/login') || pathname.startsWith('/signup')
      );
      if (!isPublic) {
        router.replace('/login');
      }
    }
  }, [isSuccess, isError, user, dispatch, pathname, router]);

  return <>{children}</>;
}
