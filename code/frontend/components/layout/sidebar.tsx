'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Building2, FileText, Home, BarChart2, ClipboardList, ArrowUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/store/hooks';
import { useUserOrganizations } from '@/lib/api/users';

type OrgSortOption = 'name' | 'members' | 'posts';

// Feature flag — organization creation requests are temporarily disabled in the UI.
// Flip to true to restore the "My Requests" sidebar link.
const ORG_REQUESTS_ENABLED = false;

const browseItems = [
  { label: 'Home',             href: '/home',          icon: Home },
  { label: 'Organizations',    href: '/organizations', icon: Building2 },
  { label: 'Papers',            href: '/papers',        icon: FileText },
  { label: 'Analytics',        href: '/analytics',     icon: BarChart2 },
];

function initials(name: string) {
  return name.split(/[\s()]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const SORT_OPTIONS: { value: OrgSortOption; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'members', label: 'Members' },
  { value: 'posts', label: 'Activity' },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const { data: userOrgs, isLoading: orgsLoading } = useUserOrganizations(user?._id);
  const [orgSort, setOrgSort] = useState<OrgSortOption>('name');

  const sortedOrgs = useMemo(() => {
    if (!userOrgs) return [];
    const orgs = [...userOrgs];
    switch (orgSort) {
      case 'members':
        return orgs.sort((a, b) => b.memberCount - a.memberCount);
      case 'posts':
        return orgs.sort((a, b) => b.postCount - a.postCount);
      case 'name':
      default:
        return orgs.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [userOrgs, orgSort]);

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
          <h4 className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
            My Organizations
          </h4>

          {/* Sort controls */}
          {userOrgs && userOrgs.length > 1 && (
            <div className="flex items-center gap-1 px-3 mb-2">
              <ArrowUpDown className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOrgSort(opt.value)}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors',
                    orgSort === opt.value
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

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
              Browse organizations
            </Link>
          )}

          {ORG_REQUESTS_ENABLED && (
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
          )}

          <div className="flex flex-col gap-0.5 mt-0.5">
            {sortedOrgs.map((org) => {
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
