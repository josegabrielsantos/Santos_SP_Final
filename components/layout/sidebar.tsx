'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Building2, FileText, Home, TrendingUp, Megaphone, BarChart2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/store/hooks';
import { useUserOrganizations } from '@/lib/api/users';

const sidebarItems = [
  { label: 'Home',            href: '/home',        icon: Home,     soon: false },
  { label: 'Organizations',   href: '/organizations', icon: Building2, soon: false },
  { label: 'Papers',          href: '/papers',      icon: FileText, soon: false },
  { label: 'Research Trends', href: '/analytics',   icon: BarChart2, soon: false },
  { label: 'Trending',        href: '/home',        icon: TrendingUp, soon: true },
  { label: 'Announcements',   href: '/home',        icon: Megaphone, soon: true },
];

function initials(name: string) {
  return name.split(/[\s()]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const { data: userOrgs, isLoading: orgsLoading } = useUserOrganizations(user?._id);

  return (
    <aside className="sticky top-[64px] hidden h-[calc(100vh-64px)] w-[260px] shrink-0 overflow-y-auto border-r border-border/50 bg-white lg:flex lg:flex-col">

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-3 pt-5 pb-3">
        {sidebarItems.map((item, i) => {
          const isActive = !item.soon && (pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href + '/')));
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg py-2.5 pl-3 pr-4 text-[14px] font-medium transition-all border-l-[3px]',
                  isActive
                    ? 'border-primary bg-primary/8 text-primary'
                    : item.soon
                    ? 'border-transparent text-muted-foreground/50 cursor-default pointer-events-none'
                    : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                <Icon className={cn('h-[19px] w-[19px] shrink-0', isActive ? 'text-primary' : '')} />
                <span className="flex-1">{item.label}</span>
                {item.soon && (
                  <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 leading-5 opacity-60">
                    Soon
                  </Badge>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-border/60" />

      {/* My Organizations */}
      {user && (
        <div className="px-3 py-4 flex-1">
          <h4 className="mb-2.5 px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
            My Organizations
          </h4>

          {orgsLoading && (
            <div className="flex flex-col gap-2 px-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
              ))}
            </div>
          )}

          {!orgsLoading && userOrgs && userOrgs.length === 0 && (
            <Link
              href="/organizations"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              Browse organizations
            </Link>
          )}

          <div className="flex flex-col gap-0.5">
            {userOrgs?.map((org) => {
              const isActive = pathname.startsWith(`/organizations/${org.slug}`);
              return (
                <Link
                  key={org._id}
                  href={`/organizations/${org.slug}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all border-l-[3px]',
                    isActive
                      ? 'border-primary bg-primary/8 text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border/60">
                    <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                    <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
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

      {/* Footer */}
      <div className="border-t border-border/40 px-4 py-3">
        <p className="text-[11px] text-muted-foreground/50 text-center">
          UPLB KAIN · ISC-FaNS
        </p>
      </div>
    </aside>
  );
}
