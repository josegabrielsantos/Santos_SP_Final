'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Building2, FileText, Home, BarChart2, ClipboardList } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/store/hooks';
import { useUserOrganizations } from '@/lib/api/users';

const browseItems = [
  { label: 'Home',             href: '/home',          icon: Home },
  { label: 'Research Groups',  href: '/organizations', icon: Building2 },
  { label: 'Publications',     href: '/papers',        icon: FileText },
  { label: 'Analytics',        href: '/analytics',     icon: BarChart2 },
];

function initials(name: string) {
  return name.split(/[\s()]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const { data: userOrgs, isLoading: orgsLoading } = useUserOrganizations(user?._id);

  return (
    <aside className="sticky top-[63px] hidden h-[calc(100vh-63px)] w-[250px] shrink-0 overflow-y-auto border-r border-border/50 bg-white lg:flex lg:flex-col">

      {/* Browse section */}
      <nav className="flex flex-col gap-0.5 px-3 pt-5 pb-3">
        <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
          Browse
        </h4>
        {browseItems.map((item, i) => {
          const isActive = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href + '/'));
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.18 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md py-2 pl-3 pr-4 text-[13px] font-medium transition-all border-l-[3px]',
                  isActive
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary' : '')} strokeWidth={1.75} />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-border/50" />

      {/* My Organizations */}
      {user && (
        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
            My Research Groups
          </h4>

          {orgsLoading && (
            <div className="flex flex-col gap-2 px-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3.5 flex-1 rounded" />
                </div>
              ))}
            </div>
          )}

          {!orgsLoading && userOrgs && userOrgs.length === 0 && (
            <Link
              href="/organizations"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              Browse research groups
            </Link>
          )}

          <Link
            href="/org-requests"
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-1.5 transition-all border-l-[3px]',
              pathname === '/org-requests' || pathname.startsWith('/org-requests/')
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <ClipboardList className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span className="text-[12px] font-medium">My Requests</span>
          </Link>

          <div className="flex flex-col gap-0.5 mt-0.5">
            {userOrgs?.map((org) => {
              const isActive = pathname.startsWith(`/organizations/${org.slug}`);
              return (
                <Link
                  key={org._id}
                  href={`/organizations/${org.slug}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-1.5 transition-all border-l-[3px]',
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <Avatar className="h-5 w-5 shrink-0 ring-1 ring-border/50">
                    <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                    <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                      {initials(org.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-[12px] font-medium">{org.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border/30 px-4 py-2.5 mt-auto">
        <p className="text-[10px] text-muted-foreground/40 text-center">
          UPLB FaNS Knowledge Hub
        </p>
      </div>
    </aside>
  );
}
