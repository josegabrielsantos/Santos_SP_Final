import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { useAppDispatch } from '@/store/hooks';
import { setUser, clearUser, type User } from '@/store/slices/authSlice';

// ─── Google Auth (login / signup) ────────────────────────────────

interface GoogleAuthPayload {
  credential: string;
}

export function useGoogleAuth() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GoogleAuthPayload) => {
      const { data } = await axiosInstance.post<User>('/auth/google', payload);
      return data;
    },
    onSuccess: (user) => {
      dispatch(setUser(user));
      queryClient.setQueryData(['auth', 'me'], user);
    },
  });
}

// ─── Get current user (session check) ───────────────────────────

export function useGetMe(options?: { enabled?: boolean }) {
  const dispatch = useAppDispatch();

  return useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<User>('/auth/me');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
    // Sync with Redux on success via select / onSuccess pattern:
    // We do this in the component that calls useGetMe
  });
}

// ─── Logout ─────────────────────────────────────────────────────

export function useLogout() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await axiosInstance.post('/auth/logout');
    },
    onSuccess: () => {
      dispatch(clearUser());
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
