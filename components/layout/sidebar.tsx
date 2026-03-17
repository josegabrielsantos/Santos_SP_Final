'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Building2, FileText, Home, TrendingUp, Megaphone, BarChart2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppSelector } from '@/store/hooks';
import { useUserOrganizations } from '@/lib/api/users';

const sidebarItems = [
  { label: 'Home',          href: '/home',          icon: Home,       soon: false },
  { label: 'Organizations', href: '/organizations',  icon: Building2,  soon: false },
  { label: 'Papers',        href: '/papers',         icon: FileText,   soon: false },
  { label: 'Research Trends', href: '/analytics',   icon: BarChart2,  soon: false },
  { label: 'Trending',      href: '/home',           icon: TrendingUp, soon: true  },
  { label: 'Announcements', href: '/home',           icon: Megaphone,  soon: true  },
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
    <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-[270px] shrink-0 overflow-y-auto border-r border-border/50 bg-white lg:flex lg:flex-col">

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-3 pt-4 pb-2">
        {sidebarItems.map((item) => {
          const isActive = !item.soon && (pathname === item.href || pathname.startsWith(item.href + '/'));
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg py-3 pl-[13px] pr-4 text-[15px] font-medium transition-colors border-l-[3px]',
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-[20px] w-[20px] shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold px-1.5 py-0 leading-5"
                >
                  Soon
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* My Organizations */}
      {user && (
        <>
          <Separator className="mx-3 mt-2 w-auto" />
          <div className="px-3 pb-4 pt-3">
            <h4 className="mb-2 px-[13px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              My Organizations
            </h4>

            {orgsLoading && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {userOrgs && userOrgs.length === 0 && (
              <Link
                href="/organizations"
                className="flex items-center gap-2 rounded-lg px-[13px] py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                Browse organizations
              </Link>
            )}

            <div className="flex flex-col gap-0.5">
              {userOrgs?.map((org) => {
                const isActive = pathname === `/organizations/${org.slug}`;
                return (
                  <Link
                    key={org._id}
                    href={`/organizations/${org.slug}`}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-[13px] py-2 transition-colors border-l-[3px]',
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {initials(org.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-[13px] font-medium">{org.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
