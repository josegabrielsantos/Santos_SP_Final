'use client';

import { usePublicTrends, useTopicCounts } from '@/lib/api/analytics';
import { RESEARCH_TOPICS } from '@/lib/constants/research-topics';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
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

const topicConfig = {
  count: { label: 'Items', color: 'var(--chart-4)' },
} satisfies ChartConfig;

export default function AnalyticsPage() {
  const { data, isLoading } = usePublicTrends();
  const { data: topicData } = useTopicCounts();

  return (
    <AuthenticatedLayout>
          <div className="mb-6">
            <h1 className="font-heading text-[26px] font-bold tracking-tight text-foreground">Research Trends</h1>
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
                  <CardTitle className="font-heading text-[15px] font-semibold">Papers by Publication Year</CardTitle>
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
                  <p className="mt-2 text-[12px] text-muted-foreground">Distribution of papers published per year across all organizations</p>
                </CardContent>
              </Card>

              {/* Top keywords */}
              <Card className="border border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-[15px] font-semibold">Top Keywords</CardTitle>
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
                  <p className="mt-2 text-[12px] text-muted-foreground">Most frequently used keywords across all uploaded papers</p>
                </CardContent>
              </Card>

              {/* Papers by org */}
              <Card className="border border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-[15px] font-semibold">Papers by Organization</CardTitle>
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
                  <p className="mt-2 text-[12px] text-muted-foreground">Number of papers contributed by each organization</p>
                </CardContent>
              </Card>

              {/* Research Topics breakdown */}
              {topicData && topicData.length > 0 && (
                <Card className="border border-border bg-card lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-heading text-[15px] font-semibold">Research Topics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={topicConfig} className="h-[280px] w-full">
                      <BarChart
                        data={topicData.map((d) => ({
                          ...d,
                          label: RESEARCH_TOPICS.find((t) => t.id === d.topic)?.label ?? d.topic,
                        }))}
                        layout="vertical"
                        accessibilityLayer
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                    <p className="mt-2 text-[12px] text-muted-foreground">Distribution of posts and papers across FaNS research topics</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
    </AuthenticatedLayout>
  );
}
