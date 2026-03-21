'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Download,
  Calendar,
  BookOpen,
  User,
  Tag,
  Bookmark,
  BookmarkCheck,
  Hash,
  Eye,
  Link2,
} from 'lucide-react';
import { CitationButton } from '@/components/paper/citation-button';
import { AbstractText } from '@/components/paper/abstract-text';
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
          <h3 className="text-[20px] font-semibold leading-snug text-foreground">
            {paper.title}
          </h3>

          {/* Authors */}
          <div className="mt-4 flex items-center gap-2 text-[14px] text-muted-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span className="font-medium text-muted-foreground/70">Authors:</span>
            <span>{paper.authors.length > 0 ? paper.authors.join(', ') : 'Unknown'}</span>
          </div>

          {/* Metadata row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground/80">
            {paper.journal && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Journal:</span>
                {paper.journal}
              </span>
            )}
            {paper.year && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Year:</span>
                {paper.year}
              </span>
            )}
            {paper.doi && (
              <span className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-muted-foreground/70">DOI:</span>
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {paper.doi}
                </a>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-muted-foreground/70">Downloads:</span>
              {paper.downloadCount}
            </span>
          </div>

          {/* Abstract */}
          {paper.abstract && <AbstractText text={paper.abstract} />}

          {/* Tags */}
          {paper.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 shrink-0 text-kain-green/60" />
              {paper.keywords.map((kw) => (
                <Badge
                  key={kw}
                  className="bg-kain-green-light text-kain-green border border-kain-green/20 text-[12px] font-normal hover:bg-kain-green-light/80"
                >
                  {kw}
                </Badge>
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
