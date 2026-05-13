'use client';

import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { AIInsight } from '@/lib/api/insights';

interface Props {
  insight: AIInsight | undefined;
  isLoading: boolean;
}

function formatGeneratedDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AIInsightSummary({ insight, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/30 bg-muted/30 p-4 md:p-5 space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>
    );
  }

  if (!insight?.summary) return null;

  return (
    <div
      className="animate-in fade-in duration-500 rounded-lg border border-border/30 bg-muted/30 p-4 md:p-5"
      aria-label="AI-generated research insight"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-heading text-sm font-semibold text-foreground">
          AI Research Insight
        </span>
      </div>

      {/* Summary paragraph */}
      <p className="text-sm leading-relaxed text-foreground">{insight.summary}</p>

      {/* Key Themes */}
      {insight.keyThemes?.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Key Themes:</span>
          {insight.keyThemes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
              aria-label={`Theme: ${theme}`}
            >
              {theme}
            </span>
          ))}
        </div>
      )}

      {/* Research Gaps */}
      {insight.researchGaps?.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Research Gaps:</span>
          {insight.researchGaps.map((gap) => (
            <span
              key={gap}
              className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700"
              aria-label={`Research gap: ${gap}`}
            >
              {gap}
            </span>
          ))}
        </div>
      )}

      {/* Stats footer */}
      {insight.stats && (
        <div className="mt-3 border-t border-border/30 pt-3">
          <span className="text-xs text-muted-foreground">
            {insight.stats.totalPosts} posts &middot; {insight.stats.totalPapers} papers
            {insight.stats.recentPosts > 0 && ` \u00b7 ${insight.stats.recentPosts} new this month`}
            {insight.stats.topOrg && ` \u00b7 ${insight.stats.topOrg} most active`}
          </span>
        </div>
      )}

      {/* Generated timestamp */}
      {insight.generatedAt && (
        <div className="mt-2">
          <span className="text-xs text-muted-foreground/60">
            Generated {formatGeneratedDate(insight.generatedAt)}
          </span>
        </div>
      )}
    </div>
  );
}
