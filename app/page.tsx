'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { useAppSelector } from '@/store/hooks';
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
  Globe,
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ─── Animation helpers ────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0, 0, 0.2, 1] as const, delay },
  }),
};

export default function LandingPage() {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-page-bg">
      <Navbar />

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        {/* Gradient wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-kain-amber/5" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Left column – copy */}
            <motion.div
              className="flex max-w-2xl flex-col items-center text-center lg:items-start lg:text-left"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.div variants={fadeUp}>
                <Badge
                  variant="secondary"
                  className="mb-6 gap-1.5 px-3 py-1 text-[13px] font-medium text-kain-green bg-kain-green/8 border-kain-green/20"
                >
                  <Globe className="h-3.5 w-3.5" />
                  UPLB Research Platform
                </Badge>
              </motion.div>

              <motion.h1
                className="text-4xl leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
                variants={fadeUp}
              >
                UPLB{' '}
                <span className="text-primary">KAIN</span>
              </motion.h1>

              <motion.p
                className="mt-2 text-[20px] font-medium text-muted-foreground sm:text-[22px]"
                style={{ fontFamily: 'var(--font-heading)' }}
                variants={fadeUp}
              >
                Knowledge Archive on Integrated Nutrition
              </motion.p>

              <motion.p
                className="mt-6 max-w-lg text-[17px] leading-relaxed text-muted-foreground"
                variants={fadeUp}
              >
                A community-driven platform for curated research on food and nutrition
                security. Discover, discuss, and visualize research insights — all in
                one place.
              </motion.p>

              <motion.div
                className="mt-8 flex flex-col gap-3 sm:flex-row"
                variants={fadeUp}
              >
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2" asChild>
                  <Link href="/signup">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-xl" asChild>
                  <Link href="/login">Log in to your account</Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Right column – logo showcase */}
            <motion.div
              className="flex shrink-0 items-center gap-5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0, 0, 0.2, 1] as const }}
            >
              <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-border bg-white p-4 border border-border sm:h-48 sm:w-48">
                <Image
                  src="/uplb_logo.png"
                  alt="UPLB Logo"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
              <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-border bg-white p-4 border border-border sm:h-48 sm:w-48">
                <Image
                  src="/FaNS_logo.png"
                  alt="FaNS Logo"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Separator />

      {/* ───────── Features ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-3xl tracking-tight text-foreground sm:text-4xl">
            Why UPLB KAIN?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] text-muted-foreground">
            Built to advance food and nutrition security research through accessible
            technology, powerful search, and community engagement.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <BookOpen className="h-6 w-6" />,
              title: 'Curated Research Repository',
              description:
                'Access approved, peer-reviewed papers on food security, nutrition science, and integrated agricultural research.',
            },
            {
              icon: <Search className="h-6 w-6" />,
              title: 'Advanced Elasticsearch',
              description:
                'Full-text search across research papers, posts, and discussions powered by Elasticsearch for instant, relevant results.',
            },
            {
              icon: <BarChart3 className="h-6 w-6" />,
              title: 'Data Visualization & Analytics',
              description:
                'Identify trends, emerging challenges, and research gaps through interactive charts and analytics dashboards.',
            },
            {
              icon: <Users className="h-6 w-6" />,
              title: 'Community Discussions',
              description:
                'Engage with researchers through posts, comments, polls, and organization-based discussions — Reddit-style.',
            },
            {
              icon: <FileText className="h-6 w-6" />,
              title: 'Research Paper Management',
              description:
                'Upload, organize, and share research papers with metadata like DOI, journal, keywords, and authors.',
            },
            {
              icon: <TrendingUp className="h-6 w-6" />,
              title: 'Featured & Trending Posts',
              description:
                'Stay updated with highlighted research posts and trending discussions within the community.',
            },
          ].map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.38, delay: i * 0.06 }}
            >
              <FeatureCard icon={feat.icon} title={feat.title} description={feat.description} />
            </motion.div>
          ))}
        </div>
      </section>

      <Separator />

      {/* ───────── Objectives ───────── */}
      <section className="bg-muted/25">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl tracking-tight text-foreground sm:text-4xl">
              Project Objectives
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] text-muted-foreground">
              UPLB KAIN is designed with clear goals to serve the research community
              and the public.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                number: '01',
                title: 'Open Access to Research',
                description:
                  'Provide a platform for research on food and nutrition security where the public can access curated and approved research.',
              },
              {
                number: '02',
                title: 'Advanced Search',
                description:
                  'Enable advanced search functionality for easy access to research data using Elasticsearch.',
              },
              {
                number: '03',
                title: 'Insights & Analytics',
                description:
                  'Provide data visualization and analytics tools that help users identify trends, emerging challenges, and research gaps in food security and nutrition.',
              },
            ].map((obj, i) => (
              <motion.div
                key={obj.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.38, delay: i * 0.08 }}
              >
                <ObjectiveCard
                  number={obj.number}
                  title={obj.title}
                  description={obj.description}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ───────── CTA ───────── */}
      <section className="bg-gradient-to-br from-primary/8 to-primary/3 py-20">
        <motion.div
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <h2 className="text-2xl tracking-tight text-foreground sm:text-3xl">
              Ready to explore nutrition research?
            </h2>
            <p className="max-w-md text-[16px] text-muted-foreground">
              Sign in with your Google account to start browsing curated research,
              join discussions, and contribute to the UPLB KAIN community.
            </p>
            <div className="flex gap-3">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2" asChild>
                <Link href="/signup">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span
              className="text-[15px] font-semibold text-foreground"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              UPLB KAIN
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[14px] text-muted-foreground sm:justify-start">
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
            <Link href="/papers" className="hover:text-foreground transition-colors">Papers</Link>
            <Link href="/organizations" className="hover:text-foreground transition-colors">Organizations</Link>
          </div>
          <p className="text-[13px] text-muted-foreground">
            &copy; {new Date().getFullYear()} University of the Philippines Los Baños.
            Knowledge Archive on Integrated Nutrition.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

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
    <Card className="group border-border/50 bg-white border border-border transition-all duration-200 hover:border-border/80 hover:-translate-y-0.5">
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex h-[48px] w-[48px] items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
        <h3 className="text-[19px] font-semibold text-foreground">{title}</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p>
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
    <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-white p-8 border border-border">
      <span
        className="text-4xl font-extrabold text-primary/15"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {number}
      </span>
      <h3 className="text-[19px] font-semibold text-foreground">{title}</h3>
      <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
