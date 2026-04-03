'use client';

import { Lightbulb, MessageSquare, FileText, Download, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AIInsightSummary } from './AIInsightSummary';
import { RelatedPostCard } from './RelatedPostCard';
import type { AIInsight, RelatedPost } from '@/lib/api/insights';
import type { Paper } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import type { useDownloadPaper } from '@/lib/api/papers';

// ── Helpers ──────────────────────────────────────────────────────

function InsightSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border/30 bg-card p-3">
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function InsightSection({
  title,
  icon: Icon,
  isLoading,
  isEmpty,
  children,
}: {
  title: string;
  icon: LucideIcon;
  isLoading?: boolean;
  isEmpty?: boolean;
  children: React.ReactNode;
}) {
  if (isEmpty && !isLoading) return null;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
      </div>
      {isLoading ? <InsightSkeleton count={2} /> : children}
    </div>
  );
}

function PaperItem({
  paper,
  downloadMutation,
}: {
  paper: Paper;
  downloadMutation: ReturnType<typeof useDownloadPaper>;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3 min-w-0">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
        <div className="min-w-0">
          <p className="font-heading text-[14px] font-semibold leading-snug text-foreground">
            {paper.title}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {[
              paper.authors?.length > 0 ? paper.authors.join(', ') : null,
              paper.journal,
              paper.year,
              paper.doi ? `DOI: ${paper.doi}` : null,
            ]
              .filter(Boolean)
              .join(' \u00b7 ')}
          </p>
        </div>
      </div>
      {paper.fileUrl && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[12px] h-7"
            onClick={() => window.open(paper.fileUrl!, '_blank')}
          >
            <Eye className="h-3 w-3" />
            View
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-[12px] h-7 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => downloadMutation.mutateAsync(paper._id).catch(() => {})}
            disabled={downloadMutation.isPending}
          >
            <Download className="h-3 w-3" />
            PDF
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Mobile fallback (shown below comments on < xl) ──────────────

/**
 * Full Related Insights card for mobile/tablet — rendered below comments.
 * Hidden on xl+ where the sidebar version is used instead.
 */
export function RelatedInsightsMobile({
  aiInsight,
  loadingAI,
  relatedPosts,
  loadingPosts,
  discoveredPapers,
  loadingPapers,
  downloadMutation,
}: {
  aiInsight: AIInsight | undefined;
  loadingAI: boolean;
  attachedPapers?: Paper[];
  loadingAttached?: boolean;
  relatedPosts: RelatedPost[];
  loadingPosts: boolean;
  discoveredPapers: Paper[];
  loadingPapers: boolean;
  downloadMutation: ReturnType<typeof useDownloadPaper>;
}) {
  const hasAI = !!aiInsight?.summary;
  const hasPosts = relatedPosts.length > 0;
  const hasPapers = discoveredPapers.length > 0;
  const isLoading = loadingAI || loadingPosts || loadingPapers;

  if (!isLoading && !hasAI && !hasPosts && !hasPapers) {
    return null;
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-border/50 bg-white xl:hidden"
      role="complementary"
      aria-label="Related insights for this post"
    >
      <div className="p-4 pb-3">
        <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Lightbulb className="h-5 w-5 text-primary" />
          Related Insights
        </h3>
      </div>

      <div className="space-y-6 p-4 pt-0">
        <AIInsightSummary insight={aiInsight} isLoading={loadingAI} />

        {(hasPosts || loadingPosts) && (
          <InsightSection
            title="Related Discussions"
            icon={MessageSquare}
            isLoading={loadingPosts}
            isEmpty={!hasPosts}
          >
            <div className="space-y-2">
              {relatedPosts.slice(0, 3).map((p) => (
                <RelatedPostCard key={p._id} post={p} />
              ))}
            </div>
          </InsightSection>
        )}

        {(hasPapers || loadingPapers) && (
          <InsightSection
            title="Related Research"
            icon={FileText}
            isLoading={loadingPapers}
            isEmpty={!hasPapers}
          >
            <div className="flex flex-col divide-y divide-border/40">
              {discoveredPapers.slice(0, 3).map((paper) => (
                <PaperItem key={paper._id} paper={paper} downloadMutation={downloadMutation} />
              ))}
            </div>
          </InsightSection>
        )}
      </div>
    </div>
  );
}
