'use client';

import { useEffect, useRef } from 'react';
import axiosInstance from '@/lib/axios';

/**
 * Attaches an IntersectionObserver to the returned ref.
 * If the element stays 50%+ visible for 2 seconds, fires a fire-and-forget
 * POST /activity beacon. Fires at most once per component mount.
 */
export function useViewTracking(postId: string, tags: string[], enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (!enabled || !postId || tracked.current || !ref.current) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          timer = setTimeout(() => {
            axiosInstance
              .post('/activity', { targetId: postId, targetType: 'post', action: 'view' })
              .catch(() => {});
            tracked.current = true;
          }, 2000);
        } else {
          if (timer) clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );

    const el = ref.current;
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [postId, enabled]);

  return ref;
}
