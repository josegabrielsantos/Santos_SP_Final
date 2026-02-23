'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  BookOpen,
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  ArrowRight,
  Shield,
  Globe,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-kain-gold/5" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Left column – copy */}
            <div className="flex max-w-2xl flex-col items-center text-center lg:items-start lg:text-left">
              <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs font-medium">
                <Globe className="h-3 w-3" />
                UPLB Research Platform
              </Badge>

              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                UPLB{' '}
                <span className="text-primary">KAIN</span>
              </h1>

              <p className="mt-2 text-lg font-medium text-muted-foreground sm:text-xl">
                Knowledge Archive on Integrated Nutrition
              </p>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
                A community-driven platform for curated research on food and nutrition
                security. Discover, discuss, and visualize research insights — all in
                one place.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Log in to your account</Link>
                </Button>
              </div>
            </div>

            {/* Right column – logo showcase */}
            <div className="flex shrink-0 items-center gap-6">
              <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-border bg-white p-4 shadow-lg sm:h-48 sm:w-48">
                <Image
                  src="/uplb_logo.png"
                  alt="UPLB Logo"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
              <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-border bg-white p-4 shadow-lg sm:h-48 sm:w-48">
                <Image
                  src="/FaNS_logo.png"
                  alt="FaNS Logo"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* ───────── Features ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Why UPLB KAIN?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            Built to advance food and nutrition security research through accessible
            technology, powerful search, and community engagement.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<BookOpen className="h-6 w-6" />}
            title="Curated Research Repository"
            description="Access approved, peer-reviewed papers on food security, nutrition science, and integrated agricultural research."
          />
          <FeatureCard
            icon={<Search className="h-6 w-6" />}
            title="Advanced Elasticsearch"
            description="Full-text search across research papers, posts, and discussions powered by Elasticsearch for instant, relevant results."
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="Data Visualization & Analytics"
            description="Identify trends, emerging challenges, and research gaps through interactive charts and analytics dashboards."
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Community Discussions"
            description="Engage with researchers through posts, comments, polls, and organization-based discussions — Reddit-style."
          />
          <FeatureCard
            icon={<FileText className="h-6 w-6" />}
            title="Research Paper Management"
            description="Upload, organize, and share research papers with metadata like DOI, journal, keywords, and authors."
          />
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6" />}
            title="Featured & Trending Posts"
            description="Stay updated with highlighted research posts and trending discussions within the community."
          />
        </div>
      </section>

      <Separator />

      {/* ───────── Objectives ───────── */}
      <section className="bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Project Objectives
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
              UPLB KAIN is designed with clear goals to serve the research community
              and the public.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <ObjectiveCard
              number="01"
              title="Open Access to Research"
              description="Provide a platform for research on food and nutrition security where the public can access curated and approved research."
            />
            <ObjectiveCard
              number="02"
              title="Advanced Search"
              description="Enable advanced search functionality for easy access to research data using Elasticsearch."
            />
            <ObjectiveCard
              number="03"
              title="Insights & Analytics"
              description="Provide data visualization and analytics tools that help users identify trends, emerging challenges, and research gaps in food security and nutrition."
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ───────── CTA ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col items-center gap-6 py-14 text-center">
            <Shield className="h-12 w-12 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ready to explore nutrition research?
            </h2>
            <p className="max-w-md text-muted-foreground">
              Sign in with your Google account to start browsing curated research,
              join discussions, and contribute to the UPLB KAIN community.
            </p>
            <div className="flex gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <Image src="/uplb_logo.png" alt="UPLB" width={24} height={24} className="rounded-full" />
            <span className="text-sm font-medium text-foreground">UPLB KAIN</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} University of the Philippines Los Baños.
            Knowledge Archive on Integrated Nutrition.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="group border-border/60 bg-white transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ObjectiveCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-white p-8 shadow-sm">
      <span className="text-4xl font-extrabold text-primary/20">{number}</span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
