'use client';

import { useAdminCharts } from '@/lib/api/admin';
import { useTopicCounts } from '@/lib/api/analytics';
import { RESEARCH_TOPICS } from '@/lib/constants/research-topics';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7', '#f97316', '#0ea5e9'];

const TYPE_LABELS: Record<string, string> = {
  post: 'Post',
  announcement: 'Announcement',
  poll: 'Poll',
  research_paper: 'Research Paper',
  update: 'Update',
};

const TOPIC_LOOKUP = Object.fromEntries(
  RESEARCH_TOPICS.map((t) => [t.id, { label: t.label, color: t.color }]),
);

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useAdminCharts();
  const { data: topicCounts } = useTopicCounts();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const pieData = data.postTypeDistribution.map((d) => ({
    name: TYPE_LABELS[d.type] ?? d.type,
    value: d.count,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="mt-1 text-[16px] text-muted-foreground">Platform-wide activity over the last 12 months</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Posts over time */}
        <Card className="border-border/60 bg-white ">
          <CardContent className="p-6">
            <h2 className="mb-4 text-[16px] font-semibold text-foreground">Posts Over Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.postsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} name="Posts" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Registrations over time */}
        <Card className="border-border/60 bg-white ">
          <CardContent className="p-6">
            <h2 className="mb-4 text-[16px] font-semibold text-foreground">User Registrations</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.registrationsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={false} name="Signups" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Papers over time */}
        <Card className="border-border/60 bg-white ">
          <CardContent className="p-6">
            <h2 className="mb-4 text-[16px] font-semibold text-foreground">Papers Uploaded</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.papersOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Papers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Post type distribution */}
        <Card className="border-border/60 bg-white ">
          <CardContent className="p-6">
            <h2 className="mb-4 text-[16px] font-semibold text-foreground">Post Type Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top tags */}
        <Card className="border-border/60 bg-white ">
          <CardContent className="p-6">
            <h2 className="mb-4 text-[16px] font-semibold text-foreground">Top Tags</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topTags} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="tag" width={110} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 3, 3, 0]} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orgs by activity */}
        <Card className="border-border/60 bg-white ">
          <CardContent className="p-6">
            <h2 className="mb-4 text-[16px] font-semibold text-foreground">Most Active Organizations</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.orgsByActivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="postCount" fill="#14b8a6" radius={[0, 3, 3, 0]} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Publications by Research Topic */}
        {topicCounts && topicCounts.length > 0 && (
          <Card className="border-border/60 bg-white lg:col-span-2">
            <CardContent className="p-6">
              <h2 className="mb-1 text-[16px] font-semibold text-foreground">Publications by Research Topic</h2>
              <p className="mb-4 text-[13px] text-muted-foreground">
                Distribution of papers and posts across FaNS research areas
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topicCounts.map((d) => ({
                    name: TOPIC_LOOKUP[d.topic]?.label ?? d.topic,
                    count: d.count,
                    fill: TOPIC_LOOKUP[d.topic]?.color ?? '#6366f1',
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]} name="Publications">
                    {topicCounts.map((d, i) => (
                      <Cell key={i} fill={TOPIC_LOOKUP[d.topic]?.color ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
