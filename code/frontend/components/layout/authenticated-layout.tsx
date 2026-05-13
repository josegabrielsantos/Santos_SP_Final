'use client';

import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
  noPadding?: boolean;
  /** Scrollable top section of the right sidebar (e.g. announcements) */
  rightSidebarTop?: React.ReactNode;
  /** Fixed bottom section of the right sidebar (e.g. recommended, quick links) */
  rightSidebarBottom?: React.ReactNode;
}

export function AuthenticatedLayout({
  children,
  maxWidth = 'max-w-6xl',
  noPadding = false,
  rightSidebarTop,
  rightSidebarBottom,
}: AuthenticatedLayoutProps) {
  const hasRightSidebar = !!rightSidebarTop || !!rightSidebarBottom;

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 min-w-0">
          <div
            className={`mx-auto w-full ${maxWidth} ${noPadding ? '' : 'px-5 py-7 lg:px-7'}`}
          >
            {children}
          </div>
        </main>

        {hasRightSidebar && (
          <aside className="sticky top-[60px] hidden h-[calc(100vh-60px)] w-[320px] shrink-0 border-l border-border/50 bg-white xl:flex xl:flex-col">
            {/* Top ~2/3 — scrollable (announcements) */}
            {rightSidebarTop && (
              <div className="flex-[2] min-h-0 overflow-y-auto px-4 py-4">
                {rightSidebarTop}
              </div>
            )}

            {/* Separator */}
            {rightSidebarTop && rightSidebarBottom && (
              <div className="mx-4 h-px bg-border/50 shrink-0" />
            )}

            {/* Bottom ~1/3 — fixed (recommended) */}
            {rightSidebarBottom && (
              <div className="flex-1 shrink-0 overflow-y-auto px-4 py-4">
                {rightSidebarBottom}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
