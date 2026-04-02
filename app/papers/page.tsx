'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Download,
  FileText,
  Bookmark,
  BookmarkCheck,
  SlidersHorizontal,
  X,
  Eye,
  Link2,
  ChevronDown,
} from 'lucide-react';
import { usePapers, useSearchPapers, useDownloadPaper, useToggleSavePaper, useSavedPapers } from '@/lib/api/papers';
import { useAppSelector } from '@/store/hooks';
import { PaperCard } from '@/components/paper/paper-card';
import { AbstractText } from '@/components/paper/abstract-text';
import { NumberedPagination } from '@/components/ui/numbered-pagination';
import { TopicBadge } from '@/components/ui/topic-badge';
import { RESEARCH_TOPICS } from '@/lib/constants/research-topics';
import type { Paper, PaperSearchHit } from '@/lib/types';

function formatAuthor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  const last = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map((p) => p[0]?.toUpperCase() + '.').join('');
  return `${last}, ${initials}`;
}

export default function PapersPage() {
  return (
    <Suspense>
      <PapersPageContent />
    </Suspense>
  );
}

function PapersPageContent() {
  const currentUser = useAppSelector((s) => s.auth.user);
  const isLoggedIn = !!currentUser;
  const searchParams = useSearchParams();

  // Filter tab
  const [activeTab, setActiveTab] = useState<'all' | 'my-orgs'>('all');

  // Pagination & filters
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'downloads'>('newest');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterYearFrom, setFilterYearFrom] = useState('');
  const [filterYearTo, setFilterYearTo] = useState('');
  const [filterTopic, setFilterTopic] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchTags, setSearchTags] = useState('');
  const [searchTagMode, setSearchTagMode] = useState<'any' | 'all'>('any');
  const [searchYearFrom, setSearchYearFrom] = useState('');
  const [searchYearTo, setSearchYearTo] = useState('');
  const [searchSort, setSearchSort] = useState<'relevance' | 'newest' | 'oldest' | 'downloads'>('relevance');
  const [activeSearchCriteria, setActiveSearchCriteria] = useState<{
    q?: string;
    title?: string;
    author?: string;
    tags?: string;
    tagMode?: 'any' | 'all';
    yearFrom?: number;
    yearTo?: number;
    sort?: 'relevance' | 'newest' | 'oldest' | 'downloads';
  }>({});
  const [searchPage, setSearchPage] = useState(1);
  const [downloadError, setDownloadError] = useState('');
  const [copiedPaperId, setCopiedPaperId] = useState('');

  // Pre-populate search from navbar ?q= param
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      setSearchQuery(q.trim());
      setActiveSearchCriteria({ q: q.trim(), sort: 'relevance' });
      setSearchPage(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSearching = Object.keys(activeSearchCriteria).length > 0;

  // Data fetching
  const { data: papersData, isLoading: papersLoading } = usePapers({
    page,
    limit: 10,
    sort: sortBy,
    author: filterAuthor || undefined,
    yearFrom: filterYearFrom ? parseInt(filterYearFrom) : undefined,
    yearTo: filterYearTo ? parseInt(filterYearTo) : undefined,
    myOrgs: activeTab === 'my-orgs' ? true : undefined,
    topic: filterTopic,
    enabled: isLoggedIn,
  });

  const { data: searchData, isLoading: searchLoading } = useSearchPapers({
    q: activeSearchCriteria.q,
    title: activeSearchCriteria.title,
    author: activeSearchCriteria.author,
    tags: activeSearchCriteria.tags,
    tagMode: activeSearchCriteria.tagMode,
    yearFrom: activeSearchCriteria.yearFrom,
    yearTo: activeSearchCriteria.yearTo,
    sort: activeSearchCriteria.sort,
    page: searchPage,
    limit: 10,
    enabled: isLoggedIn,
  });

  const { data: savedPapers } = useSavedPapers(isLoggedIn);
  const downloadMutation = useDownloadPaper();
  const saveMutation = useToggleSavePaper();

  const savedPaperIds = new Set((savedPapers || []).map((p) => p._id));

  const handleSearch = useCallback(() => {
    const parsedYearFrom = searchYearFrom ? Number.parseInt(searchYearFrom, 10) : undefined;
    const parsedYearTo = searchYearTo ? Number.parseInt(searchYearTo, 10) : undefined;
    const hasMainCriteria =
      searchQuery.trim().length > 0 ||
      searchTitle.trim().length > 0 ||
      searchAuthor.trim().length > 0 ||
      searchTags.trim().length > 0 ||
      (parsedYearFrom !== undefined && !Number.isNaN(parsedYearFrom)) ||
      (parsedYearTo !== undefined && !Number.isNaN(parsedYearTo));

    if (!hasMainCriteria) {
      setActiveSearchCriteria({});
      setSearchPage(1);
      return;
    }

    const criteria = {
      ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
      ...(searchTitle.trim() ? { title: searchTitle.trim() } : {}),
      ...(searchAuthor.trim() ? { author: searchAuthor.trim() } : {}),
      ...(searchTags.trim() ? { tags: searchTags.trim(), tagMode: searchTagMode } : {}),
      ...(parsedYearFrom !== undefined && !Number.isNaN(parsedYearFrom) ? { yearFrom: parsedYearFrom } : {}),
      ...(parsedYearTo !== undefined && !Number.isNaN(parsedYearTo) ? { yearTo: parsedYearTo } : {}),
      ...(searchSort ? { sort: searchSort } : {}),
    };

    setActiveSearchCriteria(criteria);
    setSearchPage(1);
  }, [searchAuthor, searchQuery, searchSort, searchTagMode, searchTags, searchTitle, searchYearFrom, searchYearTo]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchTitle('');
    setSearchAuthor('');
    setSearchTags('');
    setSearchTagMode('any');
    setSearchYearFrom('');
    setSearchYearTo('');
    setSearchSort('relevance');
    setActiveSearchCriteria({});
    setSearchPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterAuthor('');
    setFilterYearFrom('');
    setFilterYearTo('');
    setFilterTopic(undefined);
    setSortBy('newest');
    setPage(1);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as 'all' | 'my-orgs');
    setPage(1);
  }, []);

  const handleCopyLink = useCallback((paperId: string) => {
    const url = `${window.location.origin}/papers?id=${paperId}`;
    navigator.clipboard.writeText(url);
    setCopiedPaperId(paperId);
    setTimeout(() => setCopiedPaperId(''), 2000);
  }, []);

  const handleDownload = useCallback(
    async (paper: Paper | PaperSearchHit) => {
      try {
        setDownloadError('');
        await downloadMutation.mutateAsync(paper._id);
      } catch {
        setDownloadError('Unable to download this file right now. Please try again.');
      }
    },
    [downloadMutation],
  );

  const handleToggleSave = useCallback(
    (paperId: string) => {
      saveMutation.mutate(paperId);
    },
    [saveMutation],
  );

  const isLoading = isSearching ? searchLoading : papersLoading;

  // Build display data
  const papers: Paper[] = papersData?.papers || [];
  const searchHits: PaperSearchHit[] = searchData?.papers?.hits || [];
  const totalPages = isSearching
    ? Math.ceil((searchData?.papers?.total || 0) / 10)
    : papersData?.pages || 1;
  const currentPage = isSearching ? searchPage : page;
  const activeSearchSummary = [
    activeSearchCriteria.q ? `Query: "${activeSearchCriteria.q}"` : null,
    activeSearchCriteria.title ? `Title: ${activeSearchCriteria.title}` : null,
    activeSearchCriteria.author ? `Author: ${activeSearchCriteria.author}` : null,
    activeSearchCriteria.tags
      ? `Tags (${activeSearchCriteria.tagMode || 'any'}): ${activeSearchCriteria.tags}`
      : null,
    activeSearchCriteria.yearFrom ? `From: ${activeSearchCriteria.yearFrom}` : null,
    activeSearchCriteria.yearTo ? `To: ${activeSearchCriteria.yearTo}` : null,
    activeSearchCriteria.sort ? `Sort: ${activeSearchCriteria.sort}` : null,
  ]
    .filter(Boolean)
    .join(' | ') || 'Advanced criteria';

  const totalResults = isSearching
    ? searchData?.papers?.total ?? 0
    : papersData?.total ?? papers.length;

  return (
    <AuthenticatedLayout>
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-heading text-[28px] font-bold tracking-tight text-foreground">
          Papers
        </h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Browse curated research on food and nutrition security
        </p>
      </div>

      {/* Not-logged-in notice */}
      {!isLoggedIn && (
        <Card className="mb-5 border-kain-amber/40 bg-kain-amber-light/50">
          <CardContent className="p-5 text-[14px] text-foreground/80">
            Please sign in to access the papers page.
          </CardContent>
        </Card>
      )}

      {/* Search bar */}
      <div className="mb-5 flex gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, keywords…"
            className="h-10 pl-10 pr-10 text-[14px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={!isLoggedIn}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          size="default"
          className="h-10 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSearch}
          disabled={!isLoggedIn}
        >
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
        <Button
          variant="outline"
          size="default"
          className="h-10 lg:hidden"
          onClick={() => setShowFilters(!showFilters)}
          disabled={!isLoggedIn}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Refine By — single column above results */}
      <Card className={`mb-5 border border-border ${showFilters ? 'block' : 'hidden'} lg:block`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
              Refine By
            </h3>
            <button
              onClick={() => { clearFilters(); clearSearch(); }}
              className="text-[12px] text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>

          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Source */}
            {isLoggedIn && (
              <div>
                <p className="text-[12px] font-medium text-muted-foreground mb-1.5">Source</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleTabChange('all')}
                    className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${activeTab === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => handleTabChange('my-orgs')}
                    className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${activeTab === 'my-orgs' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                  >
                    My Organizations
                  </button>
                </div>
              </div>
            )}

            {/* Sort */}
            <div>
              <p className="text-[12px] font-medium text-muted-foreground mb-1.5">Sort by</p>
              <Select
                value={isSearching ? searchSort : sortBy}
                onValueChange={(v) => {
                  if (isSearching) {
                    setSearchSort(v as 'relevance' | 'newest' | 'oldest' | 'downloads');
                    handleSearch();
                  } else {
                    setSortBy(v as 'newest' | 'oldest' | 'downloads');
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger className="h-8 w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSearching && <SelectItem value="relevance">Relevance</SelectItem>}
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="downloads">Most downloads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div>
              <p className="text-[12px] font-medium text-muted-foreground mb-1.5">Year</p>
              <div className="flex gap-2">
                <Input
                  placeholder="From"
                  className="h-8 text-[13px]"
                  value={isSearching ? searchYearFrom : filterYearFrom}
                  onChange={(e) => {
                    if (isSearching) setSearchYearFrom(e.target.value);
                    else { setFilterYearFrom(e.target.value); setPage(1); }
                  }}
                />
                <Input
                  placeholder="To"
                  className="h-8 text-[13px]"
                  value={isSearching ? searchYearTo : filterYearTo}
                  onChange={(e) => {
                    if (isSearching) setSearchYearTo(e.target.value);
                    else { setFilterYearTo(e.target.value); setPage(1); }
                  }}
                />
              </div>
            </div>

            {/* Author */}
            <div>
              <p className="text-[12px] font-medium text-muted-foreground mb-1.5">Author</p>
              <Input
                placeholder="Filter by author…"
                className="h-8 w-full text-[13px]"
                value={isSearching ? searchAuthor : filterAuthor}
                onChange={(e) => {
                  if (isSearching) setSearchAuthor(e.target.value);
                  else { setFilterAuthor(e.target.value); setPage(1); }
                }}
              />
            </div>
          </div>

          {/* Topic row */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-[12px] font-medium text-muted-foreground mb-1.5">Research Topic</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setFilterTopic(undefined); setPage(1); }}
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${!filterTopic ? 'border-primary bg-primary text-white font-semibold' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
              >
                All
              </button>
              {RESEARCH_TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setFilterTopic(filterTopic === t.id ? undefined : t.id); setPage(1); }}
                  className="shrink-0"
                >
                  <TopicBadge topicId={t.id} size="sm" active={filterTopic === t.id} />
                </button>
              ))}
            </div>
          </div>

          {/* Advanced search — collapsible */}
          <FilterSection title="Advanced Search">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <Input
                placeholder="Title"
                className="h-8 text-[13px]"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
              />
              <Input
                placeholder="Keywords (comma-separated)"
                className="h-8 text-[13px]"
                value={searchTags}
                onChange={(e) => setSearchTags(e.target.value)}
              />
              <Select value={searchTagMode} onValueChange={(v) => setSearchTagMode(v as 'any' | 'all')}>
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Match any keyword</SelectItem>
                  <SelectItem value="all">Match all keywords</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 text-[12px]"
                onClick={handleSearch}
              >
                Apply Search
              </Button>
            </div>
          </FilterSection>
        </CardContent>
      </Card>

      {/* Results count bar */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          {!isLoading && (
            isSearching
              ? `Showing ${searchHits.length} of ${totalResults} results`
              : `${totalResults} paper${totalResults !== 1 ? 's' : ''}`
          )}
        </p>
      </div>

      {/* Active search indicator */}
      {isSearching && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {activeSearchSummary}
          </span>
          <button onClick={clearSearch} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {downloadError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          {downloadError}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <PaperCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty states */}
      {!isLoading && !isSearching && papers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-[14px] text-muted-foreground">No papers found.</p>
        </div>
      )}

      {!isLoading && isSearching && searchHits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-[14px] text-muted-foreground">
            No papers match your search. Try different keywords.
          </p>
        </div>
      )}

      {/* Paper list — regular browse */}
      <AnimatePresence mode="wait">
        {!isLoading && !isSearching && papers.length > 0 && (
          <div className="flex flex-col gap-4">
            {papers.map((paper, index) => (
              <motion.div
                key={paper._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
              >
                <PaperCard
                  paper={paper}
                  isSaved={savedPaperIds.has(paper._id)}
                  isLoggedIn={isLoggedIn}
                  onDownload={() => handleDownload(paper)}
                  onToggleSave={() => handleToggleSave(paper._id)}
                  onCopyLink={() => handleCopyLink(paper._id)}
                  linkCopied={copiedPaperId === paper._id}
                />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Paper list — search results */}
      <AnimatePresence mode="wait">
        {!isLoading && isSearching && searchHits.length > 0 && (
          <div className="flex flex-col gap-4">
            {searchHits.map((hit, index) => (
              <motion.div
                key={hit._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
              >
                <SearchPaperCard
                  hit={hit}
                  isSaved={savedPaperIds.has(hit._id)}
                  isLoggedIn={isLoggedIn}
                  onDownload={() => handleDownload(hit)}
                  onToggleSave={() => handleToggleSave(hit._id)}
                  onCopyLink={() => handleCopyLink(hit._id)}
                  linkCopied={copiedPaperId === hit._id}
                />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <NumberedPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => isSearching ? setSearchPage(p) : setPage(p)}
        />
      )}
    </AuthenticatedLayout>
  );
}

// ─── Skeleton loader for a paper card ───────────────────────────

export function PaperCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {/* Title */}
      <Skeleton className="h-6 w-3/4 rounded-md" />
      {/* Authors */}
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-1/3 rounded-md" />
      </div>
      {/* Metadata row */}
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
      {/* Abstract */}
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-5/6 rounded-md" />
        <Skeleton className="h-4 w-4/6 rounded-md" />
      </div>
      {/* Tags */}
      <div className="mt-3 flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      {/* Separator */}
      <div className="my-3.5 h-px bg-border" />
      {/* Action buttons */}
      <div className="flex gap-2.5">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

// ─── Search Result Paper Card (from ES hits) ────────────────────

function SearchPaperCard({
  hit,
  isSaved,
  isLoggedIn,
  onDownload,
  onToggleSave,
  onCopyLink,
  linkCopied,
}: {
  hit: PaperSearchHit;
  isSaved: boolean;
  isLoggedIn: boolean;
  onDownload: () => void;
  onToggleSave: () => void;
  onCopyLink: () => void;
  linkCopied: boolean;
}) {
  return (
    <Card className="rounded-xl border-border/60 bg-card border border-border transition-colors hover:bg-muted/10">
      <CardContent className="p-6">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-heading text-[18px] font-semibold leading-snug text-foreground">
            {hit.highlight?.title ? (
              <span className="search-highlight" dangerouslySetInnerHTML={{ __html: hit.highlight.title[0] }} />
            ) : (
              hit.title
            )}
          </h3>

          {/* Authors */}
          {hit.authors && hit.authors.length > 0 && (
            <p className="mt-2.5 text-[14px] text-muted-foreground">
              {hit.highlight?.authors
                ? <span className="search-highlight" dangerouslySetInnerHTML={{ __html: hit.highlight.authors.join(' · ') }} />
                : hit.authors.map((a) => formatAuthor(a)).join(' · ')}
            </p>
          )}

          {/* Journal / Year / DOI line */}
          <p className="mt-1.5 text-[13px] text-muted-foreground/80">
            {hit.journal && <em>{hit.journal}</em>}
            {hit.journal && hit.year && ' · '}
            {hit.year && <span>{hit.year}</span>}
            {hit.doi && (
              <>
                {(hit.journal || hit.year) && ' · '}
                DOI:{' '}
                <a
                  href={`https://doi.org/${hit.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {hit.doi}
                </a>
              </>
            )}
          </p>

          {/* Abstract */}
          {hit.abstract && (
            <div className="mt-4">
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1.5">Abstract</h4>
              <AbstractText text={hit.abstract} highlight={hit.highlight?.abstract} />
            </div>
          )}

          {/* Keywords */}
          {hit.keywords && hit.keywords.length > 0 && (
            <p className="mt-4 text-[13px] text-muted-foreground">
              <span className="font-medium text-muted-foreground/70">Keywords: </span>
              {hit.keywords.join(' · ')}
            </p>
          )}

          {/* Topics */}
          {hit.topics && hit.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {hit.topics.map((t) => (
                <TopicBadge key={t} topicId={t} size="sm" />
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {hit.fileUrl && (
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-[13px]" onClick={onDownload}>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
            )}
            {hit.fileUrl && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-[13px] border border-border hover:bg-muted/50"
                onClick={() => window.open(hit.fileUrl!, '_blank')}
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[13px] border border-border hover:bg-muted/50"
              onClick={onCopyLink}
            >
              <Link2 className="h-3.5 w-3.5" />
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </Button>
            {isLoggedIn && (
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
      </CardContent>
    </Card>
  );
}

// ─── Collapsible filter section ────────────────────────────────

function FilterSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/30 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-[13px] font-medium text-foreground"
      >
        {title}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}
