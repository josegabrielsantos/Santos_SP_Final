'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats, useReindex } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Users,
  FileText,
  Building2,
  ShieldCheck,
  UserPlus,
  TrendingUp,
  Megaphone,
  Plus,
  BookOpen,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CreateAnnouncementDialog } from '@/components/announcement/create-announcement-dialog';

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
  const reindex = useReindex();

  const handleReindex = () => {
    toast.promise(reindex.mutateAsync(), {
      loading: 'Rebuilding search index…',
      success: 'Search index rebuilt from MongoDB.',
      error: 'Reindex failed. Check server logs.',
    });
  };

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
          label: 'Total Papers',
          value: stats.totalPapers,
          icon: BookOpen,
          iconClass: 'text-kain-green bg-kain-green/10',
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
        className="mb-7 flex items-start justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-kain-green mb-1">
            Admin Panel
          </p>
          <h1 className="text-[28px] text-foreground">Dashboard</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Overview of the UPLB FaNS Knowledge Hub platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                disabled={reindex.isPending}
              >
                {reindex.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Rebuild Search Index
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rebuild search index?</AlertDialogTitle>
                <AlertDialogDescription>
                  Drops the Elasticsearch <code>kms_posts</code> and{' '}
                  <code>kms_papers</code> indexes and rebuilds them from MongoDB.
                  Use this to clear out orphaned documents (e.g. papers deleted
                  from Mongo that still appear in search). Search will be briefly
                  unavailable while this runs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReindex}>
                  Rebuild
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <CreateAnnouncementDialog>
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Megaphone className="h-4 w-4" />
              Create Announcement
            </Button>
          </CreateAnnouncementDialog>
        </div>
      </motion.div>

      {/* Stats grid — skeletons while loading */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
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
