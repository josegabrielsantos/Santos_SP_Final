'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Building2, ArrowLeft, ShieldCheck, BarChart2, ClipboardList, ScrollText, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOrgRequestPendingCount } from '@/lib/api/org-requests';
import { useAdminReports } from '@/lib/api/reports';
import { useEffect } from 'react';

const adminNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Organizations', href: '/admin/organizations', icon: Building2 },
  { label: 'Org Requests', href: '/admin/org-requests', icon: ClipboardList },
  { label: 'Reports', href: '/admin/reports', icon: Flag },
  { label: 'Moderation Logs', href: '/admin/moderation-logs', icon: ScrollText },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const { data: pendingCountData } = useOrgRequestPendingCount();
  const pendingCount = pendingCountData?.count ?? 0;
  const { data: reportsData } = useAdminReports({ status: 'open' });
  const openReportCount = reportsData?.openCount ?? 0;

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'website_admin') {
      router.replace('/home');
    }
  }, [user, router]);

  if (!user || user.role !== 'website_admin') {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-page-bg">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-[250px] shrink-0 flex-col border-r border-border/50 bg-white">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-4">
          <ShieldCheck className="h-[22px] w-[22px] text-primary" />
          <span className="text-[16px] font-bold tracking-tight text-foreground">Admin Panel</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {adminNav.map((item) => {
            const isActive = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[16px] font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.href === '/admin/org-requests' && pendingCount > 0 && (
                  <Badge className="ml-auto h-5 min-w-[20px] justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">
                    {pendingCount}
                  </Badge>
                )}
                {item.href === '/admin/reports' && openReportCount > 0 && (
                  <Badge className="ml-auto h-5 min-w-[20px] justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">
                    {openReportCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="border-t border-border/50 p-3">
          <Link
            href="/home"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[16px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
