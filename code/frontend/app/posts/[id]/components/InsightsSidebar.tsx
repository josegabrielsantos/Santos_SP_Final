'use client';

import { Sparkles, MessageSquare, FileText, Download, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RelatedPostCard } from './RelatedPostCard';
import type { AIInsight, RelatedPost } from '@/lib/api/insights';
import type { Paper } from '@/lib/types';
import type { useDownloadPaper } from '@/lib/api/papers';

// ── Helpers ──────────────────────────────────────────────────────

function SidebarSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border/30 bg-card p-2.5">
          <Skeleton className="mb-1.5 h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function formatGeneratedDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SidebarPaperItem({
  paper,
  downloadMutation,
}: {
  paper: Paper;
  downloadMutation: ReturnType<typeof useDownloadPaper>;
}) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <p className="text-[13px] font-medium leading-snug text-foreground line-clamp-2">
        {paper.title}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
        {[
          paper.authors?.length > 0 ? paper.authors.join(', ') : null,
          paper.year,
        ]
          .filter(Boolean)
          .join(' \u00b7 ')}
      </p>
      {paper.fileUrl && (
        <div className="mt-1.5 flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px]"
            onClick={() => window.open(paper.fileUrl!, '_blank')}
          >
            <Eye className="h-2.5 w-2.5" />
            View
          </Button>
          <Button
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => downloadMutation.mutateAsync(paper._id).catch(() => {})}
            disabled={downloadMutation.isPending}
          >
            <Download className="h-2.5 w-2.5" />
            PDF
          </Button>
        </div>
      )}
    </div>
  );
}

// ── AI Insight (compact sidebar version) ─────────────────────────

function SidebarAIInsight({
  insight,
  isLoading,
}: {
  insight: AIInsight | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/30 bg-muted/30 p-3 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (!insight?.summary) return null;

  return (
    <div
      className="animate-in fade-in duration-500 rounded-lg border border-border/30 bg-muted/30 p-3"
      aria-label="AI-generated research insight"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="font-heading text-xs font-semibold text-foreground">
          AI Research Insight
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-foreground">{insight.summary}</p>

      {insight.keyThemes?.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Themes:</span>
          {insight.keyThemes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary"
            >
              {theme}
            </span>
          ))}
        </div>
      )}

      {insight.researchGaps?.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Gaps:</span>
          {insight.researchGaps.map((gap) => (
            <span
              key={gap}
              className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700"
            >
              {gap}
            </span>
          ))}
        </div>
      )}

      {insight.stats && (
        <div className="mt-2 border-t border-border/30 pt-2">
          <span className="text-[11px] text-muted-foreground">
            {insight.stats.totalPosts} posts &middot; {insight.stats.totalPapers} papers
            {insight.stats.recentPosts > 0 &&
              ` \u00b7 ${insight.stats.recentPosts} new this month`}
          </span>
        </div>
      )}

      {insight.generatedAt && (
        <div className="mt-1">
          <span className="text-[10px] text-muted-foreground/60">
            Generated {formatGeneratedDate(insight.generatedAt)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Exported: single sidebar component ───────────────────────────

export function InsightsSidebar({
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

  if (!isLoading && !hasAI && !hasPosts && !hasPapers) return null;

  const postCount = relatedPosts.length;
  const paperCount = discoveredPapers.length;

  return (
    <div className="space-y-4">
      {/* AI Insight — always visible at top */}
      <SidebarAIInsight insight={aiInsight} isLoading={loadingAI} />

      {/* Tabbed: Discussions / Research */}
      {(hasPosts || hasPapers || loadingPosts || loadingPapers) && (
        <Tabs defaultValue={hasPosts || loadingPosts ? 'discussions' : 'research'}>
          <TabsList className="w-full">
            <TabsTrigger value="discussions" className="gap-1 text-xs">
              <MessageSquare className="h-3 w-3" />
              Discussions{postCount > 0 && ` (${postCount})`}
            </TabsTrigger>
            <TabsTrigger value="research" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Research{paperCount > 0 && ` (${paperCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions">
            {loadingPosts ? (
              <SidebarSkeleton count={3} />
            ) : hasPosts ? (
              <div className="space-y-1.5">
                {relatedPosts.slice(0, 5).map((p) => (
                  <RelatedPostCard key={p._id} post={p} />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No related discussions found
              </p>
            )}
          </TabsContent>

          <TabsContent value="research">
            {loadingPapers ? (
              <SidebarSkeleton count={3} />
            ) : hasPapers ? (
              <div className="flex flex-col divide-y divide-border/40">
                {discoveredPapers.slice(0, 5).map((paper) => (
                  <SidebarPaperItem
                    key={paper._id}
                    paper={paper}
                    downloadMutation={downloadMutation}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No related research found
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
