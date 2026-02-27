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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of the UPLB KAIN platform
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-border/60 bg-white shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${c.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Placeholder for future charts */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 border-dashed bg-white/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <h3 className="text-sm font-semibold text-muted-foreground">User Growth Chart</h3>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Visualization coming soon — track signups over time
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 border-dashed bg-white/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <h3 className="text-sm font-semibold text-muted-foreground">Post Activity Chart</h3>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Visualization coming soon — track posts & engagement
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
