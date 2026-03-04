'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Building2, FileText, Home, TrendingUp, Megaphone, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAppSelector } from '@/store/hooks';
import { useUserOrganizations } from '@/lib/api/users';

const sidebarItems = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Organizations', href: '/organizations', icon: Building2 },
  { label: 'Papers', href: '/papers', icon: FileText },
  { label: 'Trending', href: '/home', icon: TrendingUp },
  { label: 'Announcements', href: '/home', icon: Megaphone },
];

function initials(name: string) {
  return name
    .split(/[\s()]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const { data: userOrgs, isLoading: orgsLoading } = useUserOrganizations(user?._id);

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-border/50 bg-white lg:flex lg:flex-col">
      <nav className="flex flex-col gap-1 p-3.5 pt-5">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3.5 py-3 text-[15px] font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User's organizations quick nav */}
      {user && (
        <div className="mt-auto border-t border-border/50 p-3.5">
          <h4 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            My Organizations
          </h4>
          {orgsLoading && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {userOrgs && userOrgs.length === 0 && (
            <p className="px-1 text-[12px] text-muted-foreground">
              Not in any organization yet.
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {userOrgs?.map((org) => {
              const isActive = pathname === `/organizations/${org.slug}`;
              return (
                <Link
                  key={org._id}
                  href={`/organizations/${org.slug}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                      {initials(org.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-[13px] font-medium">{org.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
