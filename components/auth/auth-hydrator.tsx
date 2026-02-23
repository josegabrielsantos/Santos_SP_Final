'use client';

import { useEffect } from 'react';
import { useGetMe } from '@/lib/api/auth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUser, clearUser } from '@/store/slices/authSlice';

/**
 * Checks if the user has a valid session cookie on mount.
 * Syncs the result to Redux so components can read from the store.
 */
export function AuthHydrator({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data: user, isSuccess, isError, isLoading } = useGetMe();

  useEffect(() => {
    if (isSuccess && user) {
      dispatch(setUser(user));
    }
    if (isError) {
      dispatch(clearUser());
    }
  }, [isSuccess, isError, user, dispatch]);

  return <>{children}</>;
}
