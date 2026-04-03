'use client';

import { Lightbulb, MessageSquare, FileText, BookOpen, Download, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAIInsight, useRelatedPosts } from '@/lib/api/insights';
import { usePapersByIds, useRelatedPapers, useDownloadPaper } from '@/lib/api/papers';
import { AIInsightSummary } from './AIInsightSummary';
import { RelatedPostCard } from './RelatedPostCard';
import type { Post, Paper } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';

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
  const handleDownload = async () => {
    try {
      await downloadMutation.mutateAsync(paper._id);
    } catch {
      // Ignore download errors silently
    }
  };

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
            <span className="hidden sm:inline">View</span>
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-[12px] h-7 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => handleDownload()}
            disabled={downloadMutation.isPending}
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function RelatedInsights({ post }: { post: Post }) {
  const { data: aiInsight, isLoading: loadingAI } = useAIInsight(post._id);
  const { data: relatedPosts, isLoading: loadingPosts } = useRelatedPosts(post._id);
  const { data: discoveredData, isLoading: loadingPapers } = useRelatedPapers(post._id);
  const { data: attachedPapers, isLoading: loadingAttached } = usePapersByIds(
    post.paperIds || [],
  );
  const downloadMutation = useDownloadPaper();

  const discovered = discoveredData?.papers || [];
  const attached = attachedPapers || [];
  const hasAttachedPapers = attached.length > 0;
  const hasAI = !!aiInsight?.summary;
  const hasPosts = (relatedPosts?.length || 0) > 0;
  const hasPapers = discovered.length > 0;
  const isLoading = loadingAI || loadingPosts || loadingPapers || loadingAttached;

  // Don't render if nothing to show and not loading
  if (!isLoading && !hasAI && !hasPosts && !hasPapers && !hasAttachedPapers) {
    return null;
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-border/50 bg-white"
      role="complementary"
      aria-label="Related insights for this post"
    >
      {/* Header */}
      <div className="p-4 pb-3 md:p-5 md:pb-3">
        <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Lightbulb className="h-5 w-5 text-primary" />
          Related Insights
        </h3>
      </div>

      <div className="space-y-6 p-4 pt-0 md:p-5 md:pt-0">
        {/* AI-Generated Insight Summary — shows its own skeleton/fade */}
        <AIInsightSummary insight={aiInsight} isLoading={loadingAI} />

        {/* Attached Papers (manually linked by author) — progressive reveal */}
        {(hasAttachedPapers || loadingAttached) && (
          <InsightSection
            title="Referenced in This Post"
            icon={BookOpen}
            isLoading={loadingAttached}
            isEmpty={!hasAttachedPapers}
          >
            <div className="flex flex-col divide-y divide-border/40">
              {attached.map((paper: Paper) => (
                <PaperItem
                  key={paper._id}
                  paper={paper}
                  downloadMutation={downloadMutation}
                />
              ))}
            </div>
          </InsightSection>
        )}

        {/* Related Discussions (auto-discovered posts) — progressive reveal */}
        {(hasPosts || loadingPosts) && (
          <InsightSection
            title="Related Discussions"
            icon={MessageSquare}
            isLoading={loadingPosts}
            isEmpty={!hasPosts}
          >
            <div className="space-y-2">
              {relatedPosts?.map((p) => (
                <RelatedPostCard key={p._id} post={p} />
              ))}
            </div>
          </InsightSection>
        )}

        {/* Related Research (auto-discovered papers) — progressive reveal */}
        {(hasPapers || loadingPapers) && (
          <InsightSection
            title="Related Research"
            icon={FileText}
            isLoading={loadingPapers}
            isEmpty={!hasPapers}
          >
            <div className="flex flex-col divide-y divide-border/40">
              {discovered.map((paper: Paper) => (
                <PaperItem
                  key={paper._id}
                  paper={paper}
                  downloadMutation={downloadMutation}
                />
              ))}
            </div>
          </InsightSection>
        )}
      </div>
    </div>
  );
}
