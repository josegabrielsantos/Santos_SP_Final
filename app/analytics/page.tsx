'use client';

import { usePublicTrends } from '@/lib/api/analytics';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const papersByYearConfig = {
  count: { label: 'Papers', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const topKeywordsConfig = {
  count: { label: 'Papers', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const papersByOrgConfig = {
  count: { label: 'Papers', color: 'var(--chart-3)' },
} satisfies ChartConfig;

export default function AnalyticsPage() {
  const { data, isLoading } = usePublicTrends();

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />
      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-5xl px-5 py-6 lg:px-7">
          <div className="mb-6">
            <h1 className="text-[26px] font-bold tracking-tight text-foreground">Research Trends</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Aggregated insights from papers and knowledge shared on UPLB FaNS Knowledge Hub
            </p>
          </div>

          {isLoading && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="border border-border bg-card lg:col-span-2">
                <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
                <CardContent><Skeleton className="h-[240px] w-full rounded-md" /></CardContent>
              </Card>
              <Card className="border border-border bg-card">
                <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
                <CardContent><Skeleton className="h-[280px] w-full rounded-md" /></CardContent>
              </Card>
              <Card className="border border-border bg-card">
                <CardHeader><Skeleton className="h-5 w-44" /></CardHeader>
                <CardContent><Skeleton className="h-[280px] w-full rounded-md" /></CardContent>
              </Card>
            </div>
          )}

          {data && (
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Papers by year */}
              <Card className="border border-border bg-card lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[15px] font-semibold">Papers by Publication Year</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={papersByYearConfig} className="h-[240px] w-full">
                    <BarChart data={data.papersByYear} accessibilityLayer>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Top keywords */}
              <Card className="border border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[15px] font-semibold">Top Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={topKeywordsConfig} className="h-[280px] w-full">
                    <BarChart data={data.topKeywords} layout="vertical" accessibilityLayer>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="keyword" width={130} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Papers by org */}
              <Card className="border border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[15px] font-semibold">Papers by Organization</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={papersByOrgConfig} className="h-[280px] w-full">
                    <BarChart data={data.papersByOrg} layout="vertical" accessibilityLayer>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
