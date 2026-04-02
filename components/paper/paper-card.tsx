'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Download,
  Bookmark,
  BookmarkCheck,
  Eye,
  Link2,
} from 'lucide-react';

function formatAuthor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  const last = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map((p) => p[0]?.toUpperCase() + '.').join('');
  return `${last}, ${initials}`;
}
import { CitationButton } from '@/components/paper/citation-button';
import { AbstractText } from '@/components/paper/abstract-text';
import { TopicBadge } from '@/components/ui/topic-badge';
import { getInitials } from '@/lib/utils';
import type { Paper } from '@/lib/types';

interface PaperCardProps {
  paper: Paper;
  isSaved?: boolean;
  isLoggedIn?: boolean;
  onDownload?: () => void;
  onToggleSave?: () => void;
  onCopyLink?: () => void;
  linkCopied?: boolean;
  hideOrgInfo?: boolean;
}

export function PaperCard({
  paper,
  isSaved,
  isLoggedIn,
  onDownload,
  onToggleSave,
  onCopyLink,
  linkCopied,
  hideOrgInfo,
}: PaperCardProps) {
  const router = useRouter();

  const hasActions = onDownload || onToggleSave || onCopyLink || paper.fileUrl;

  return (
    <Card className="rounded-lg border border-border bg-card transition-colors hover:bg-muted/10">
      <CardContent className="p-6">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-heading text-[18px] font-semibold leading-snug text-foreground">
            {paper.title}
          </h3>

          {/* Authors */}
          <p className="mt-2.5 text-[14px] text-muted-foreground">
            {paper.authors.length > 0
              ? paper.authors.map((a) => formatAuthor(a)).join(' · ')
              : 'Unknown'}
          </p>

          {/* Journal / Year / DOI line */}
          <p className="mt-1.5 text-[13px] text-muted-foreground/80">
            {paper.journal && <em>{paper.journal}</em>}
            {paper.journal && paper.year && ' · '}
            {paper.year && <span>{paper.year}</span>}
            {paper.doi && (
              <>
                {(paper.journal || paper.year) && ' · '}
                DOI:{' '}
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {paper.doi}
                </a>
              </>
            )}
          </p>

          {/* Abstract */}
          {paper.abstract && (
            <div className="mt-4">
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1.5">Abstract</h4>
              <AbstractText text={paper.abstract} />
            </div>
          )}

          {/* Keywords */}
          {paper.keywords.length > 0 && (
            <p className="mt-4 text-[13px] text-muted-foreground">
              <span className="font-medium text-muted-foreground/70">Keywords: </span>
              {paper.keywords.join(' · ')}
            </p>
          )}

          {/* Topics */}
          {paper.topics && paper.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {paper.topics.map((t) => (
                <TopicBadge key={t} topicId={t} size="sm" />
              ))}
            </div>
          )}

          {/* Uploaded by */}
          {paper.uploadedBy && (
            <div className="mt-4 flex items-center gap-2 text-[13px] text-muted-foreground/80">
              <span className="text-muted-foreground/60">Uploaded by</span>
              <button
                onClick={() => router.push(`/profile/${paper.uploadedBy._id}`)}
                className="inline-flex items-center gap-1.5 text-foreground hover:underline"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={paper.uploadedBy.avatar ?? undefined} alt={paper.uploadedBy.displayName} />
                  <AvatarFallback className="bg-primary/10 text-[9px] font-bold text-primary">
                    {getInitials(paper.uploadedBy.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{paper.uploadedBy.displayName}</span>
              </button>
              {!hideOrgInfo && paper.organizationId && (
                <>
                  <span className="text-muted-foreground/60">in</span>
                  <button
                    onClick={() => router.push(`/organizations/${paper.organizationId!.slug}`)}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={paper.organizationId.avatar ?? undefined} alt={paper.organizationId.name} />
                      <AvatarFallback className="bg-primary/10 text-[9px] font-bold text-primary">
                        {getInitials(paper.organizationId.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{paper.organizationId.name}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {hasActions && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {onDownload && paper.fileUrl && (
                <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-[13px]" onClick={onDownload}>
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              )}
              {paper.fileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-[13px] border border-border hover:bg-muted/50"
                  onClick={() => window.open(paper.fileUrl!, '_blank')}
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Button>
              )}
              <CitationButton paper={paper} />
              {onCopyLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-[13px] border border-border hover:bg-muted/50"
                  onClick={onCopyLink}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {linkCopied ? 'Copied!' : 'Copy Link'}
                </Button>
              )}
              {onToggleSave && isLoggedIn && (
                <Button
                  variant={isSaved ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-1.5 text-[13px] ${isSaved ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-border hover:bg-muted/50'}`}
                  onClick={onToggleSave}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="h-3.5 w-3.5" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
