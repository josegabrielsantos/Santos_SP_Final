'use client';

import { usePublicTrends } from '@/lib/api/analytics';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7', '#f97316', '#0ea5e9'];

export default function AnalyticsPage() {
  const { data, isLoading } = usePublicTrends();

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />
      <div className="mx-auto flex max-w-[1200px] gap-6 px-4 pt-6">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mb-6">
            <h1 className="text-[26px] font-bold tracking-tight text-foreground">Research Trends</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">
              Aggregated insights from papers and knowledge shared on UPLB KAIN
            </p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {data && (
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Papers by year */}
              <Card className="border-border/60 bg-white shadow-sm lg:col-span-2">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-[16px] font-semibold text-foreground">Papers by Publication Year</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.papersByYear}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Papers" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top keywords */}
              <Card className="border-border/60 bg-white shadow-sm">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-[16px] font-semibold text-foreground">Top Keywords</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.topKeywords} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="keyword" width={130} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#22c55e" radius={[0, 3, 3, 0]} name="Papers" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Papers by org */}
              <Card className="border-border/60 bg-white shadow-sm">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-[16px] font-semibold text-foreground">Papers by Organization</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.papersByOrg} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[0, 3, 3, 0]} name="Papers" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
