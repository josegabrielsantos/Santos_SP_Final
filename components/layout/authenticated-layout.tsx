'use client';

import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
  noPadding?: boolean;
  rightPanel?: React.ReactNode;
}

export function AuthenticatedLayout({
  children,
  maxWidth = 'max-w-6xl',
  noPadding = false,
  rightPanel,
}: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div
            className={`w-full ${maxWidth} ${noPadding ? '' : 'px-5 py-7 lg:px-7'} ${rightPanel ? 'flex gap-6' : ''}`}
          >
            <div className={rightPanel ? 'flex-1 min-w-0' : 'w-full'}>
              {children}
            </div>
            {rightPanel && (
              <aside className="hidden xl:block w-[280px] shrink-0">
                <div className="sticky top-[80px]">{rightPanel}</div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
