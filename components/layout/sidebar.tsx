'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Building2, FileText, Home, TrendingUp, Megaphone } from 'lucide-react';

const sidebarItems = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Organizations', href: '/organizations', icon: Building2 },
  { label: 'Papers', href: '/papers', icon: FileText },
  { label: 'Trending', href: '/home', icon: TrendingUp },
  { label: 'Announcements', href: '/home', icon: Megaphone },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-border/50 bg-white lg:block">
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
