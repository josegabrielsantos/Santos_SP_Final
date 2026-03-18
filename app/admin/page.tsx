'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats } from '@/lib/api/admin';
import {
  Users,
  FileText,
  Building2,
  ShieldCheck,
  UserPlus,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ─── Loading skeleton for a single stat card ─────────────────── */
function StatCardSkeleton() {
  return (
    <Card className="border-border/50 bg-white border border-border">
      <CardContent className="flex items-center gap-5 p-6">
        <Skeleton className="h-[50px] w-[50px] rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-16 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  const cards = stats
    ? [
        {
          label: 'Total Users',
          value: stats.totalUsers,
          icon: Users,
          iconClass: 'text-primary bg-primary/10',
        },
        {
          label: 'Active Users',
          value: stats.activeUsers,
          icon: Users,
          iconClass: 'text-kain-green bg-kain-green/10',
        },
        {
          label: 'Super Admins',
          value: stats.totalAdmins,
          icon: ShieldCheck,
          iconClass: 'text-purple-600 bg-purple-50',
        },
        {
          label: 'Total Posts',
          value: stats.totalPosts,
          icon: FileText,
          iconClass: 'text-kain-amber bg-kain-amber/10',
        },
        {
          label: 'Organizations',
          value: stats.totalOrgs,
          icon: Building2,
          iconClass: 'text-primary bg-primary/10',
        },
        {
          label: 'Signups (30d)',
          value: stats.recentSignups,
          icon: UserPlus,
          iconClass: 'text-kain-green bg-kain-green/10',
        },
        {
          label: 'Posts (30d)',
          value: stats.postsThisMonth,
          icon: TrendingUp,
          iconClass: 'text-rose-600 bg-rose-50',
        },
      ]
    : [];

  return (
    <div className="bg-page-bg min-h-full">
      {/* Page heading */}
      <motion.div
        className="mb-7"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-kain-green mb-1">
          Admin Panel
        </p>
        <h1 className="text-[28px] text-foreground">Dashboard</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Overview of the UPLB KAIN platform
        </p>
      </motion.div>

      {/* Stats grid — skeletons while loading */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className="border-border/50 bg-white border border-border">
                    <CardContent className="flex items-center gap-5 p-6">
                      <div
                        className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl ${c.iconClass}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[28px] font-bold text-foreground leading-none">{c.value}</p>
                        <p className="mt-1 text-[13px] text-muted-foreground">{c.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>

      {/* Analytics shortcut */}
      {!isLoading && (
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <a
            href="/admin/analytics"
            className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 text-primary transition-colors hover:bg-primary/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-semibold">View Analytics Dashboard</p>
              <p className="text-[13px] text-primary/70">Charts for posts, users, papers, and org activity</p>
            </div>
          </a>
        </motion.div>
      )}
    </div>
  );
}
