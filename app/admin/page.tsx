'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useAdminStats } from '@/lib/api/admin';
import {
  Users,
  FileText,
  Building2,
  ShieldCheck,
  UserPlus,
  TrendingUp,
  Loader2,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  const cards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600 bg-blue-50' },
        { label: 'Active Users', value: stats.activeUsers, icon: Users, color: 'text-green-600 bg-green-50' },
        { label: 'Super Admins', value: stats.totalAdmins, icon: ShieldCheck, color: 'text-purple-600 bg-purple-50' },
        { label: 'Total Posts', value: stats.totalPosts, icon: FileText, color: 'text-orange-600 bg-orange-50' },
        { label: 'Organizations', value: stats.totalOrgs, icon: Building2, color: 'text-indigo-600 bg-indigo-50' },
        { label: 'Signups (30d)', value: stats.recentSignups, icon: UserPlus, color: 'text-teal-600 bg-teal-50' },
        { label: 'Posts (30d)', value: stats.postsThisMonth, icon: TrendingUp, color: 'text-rose-600 bg-rose-50' },
      ]
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-[16px] text-muted-foreground">
          Overview of the UPLB KAIN platform
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-border/60 bg-white shadow-sm">
              <CardContent className="flex items-center gap-5 p-6">
                <div className={`flex h-[50px] w-[50px] items-center justify-center rounded-lg ${c.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[28px] font-bold text-foreground">{c.value}</p>
                  <p className="text-[14px] text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics shortcut */}
      <div className="mt-9">
        <a
          href="/admin/analytics"
          className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-6 py-4 text-primary transition-colors hover:bg-primary/10"
        >
          <TrendingUp className="h-6 w-6 shrink-0" />
          <div>
            <p className="text-[16px] font-semibold">View Analytics Dashboard</p>
            <p className="text-[14px] text-primary/70">Charts for posts, users, papers, and org activity</p>
          </div>
        </a>
      </div>
    </div>
  );
}
