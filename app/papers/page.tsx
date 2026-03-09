'use client';

import { useState, useCallback } from 'react';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
  Calendar,
  BookOpen,
  User,
  Tag,
  FileText,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Loader2,
  Hash,
} from 'lucide-react';
import { usePapers, useSearchPapers, useDownloadPaper, useToggleSavePaper, useSavedPapers } from '@/lib/api/papers';
import { useAppSelector } from '@/store/hooks';
import type { Paper, PaperSearchHit } from '@/lib/types';

export default function PapersPage() {
  const currentUser = useAppSelector((s) => s.auth.user);
  const isLoggedIn = !!currentUser;

  // Pagination & filters
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'downloads'>('newest');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterYearFrom, setFilterYearFrom] = useState('');
  const [filterYearTo, setFilterYearTo] = useState('');
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

  const isSearching = Object.keys(activeSearchCriteria).length > 0;

  // Data fetching
  const { data: papersData, isLoading: papersLoading } = usePapers({
    page,
    limit: 10,
    sort: sortBy,
    author: filterAuthor || undefined,
    yearFrom: filterYearFrom ? parseInt(filterYearFrom) : undefined,
    yearTo: filterYearTo ? parseInt(filterYearTo) : undefined,
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
    setSortBy('newest');
    setPage(1);
  }, []);

  const handleDownload = useCallback(
    async (paper: Paper | PaperSearchHit) => {
      try {
        setDownloadError('');
        const result = await downloadMutation.mutateAsync(paper._id);
        const link = document.createElement('a');
        const blobUrl = URL.createObjectURL(result.blob);
        link.href = blobUrl;
        link.download = result.filename || `${paper.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 60)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
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

  return (
    <div className="min-h-screen bg-muted/20">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-4xl px-4 py-6 lg:px-6">
            {/* Header */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Research Papers
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse curated research on food and nutrition security
              </p>
            </div>

            {/* Search bar */}
            {!isLoggedIn && (
              <Card className="mb-4 border-amber-300/60 bg-amber-50/60">
                <CardContent className="p-4 text-sm text-amber-900">
                  Please sign in to access the research papers page.
                </CardContent>
              </Card>
            )}

            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search papers by title, author, keywords…"
                  className="h-9 pl-9 pr-9 text-sm"
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
              <Button size="sm" className="h-9" onClick={handleSearch} disabled={!isLoggedIn}>
                <Search className="mr-1.5 h-3.5 w-3.5" />
                Search
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setShowFilters(!showFilters)}
                disabled={!isLoggedIn}
              >
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                Filters & Advanced Search
              </Button>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Browse Filters
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Author
                      </label>
                      <Input
                        placeholder="Filter by author…"
                        className="h-8 w-44 text-xs"
                        value={filterAuthor}
                        onChange={(e) => {
                          setFilterAuthor(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Year from
                      </label>
                      <Input
                        placeholder="e.g. 2020"
                        className="h-8 w-24 text-xs"
                        value={filterYearFrom}
                        onChange={(e) => {
                          setFilterYearFrom(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Year to
                      </label>
                      <Input
                        placeholder="e.g. 2025"
                        className="h-8 w-24 text-xs"
                        value={filterYearTo}
                        onChange={(e) => {
                          setFilterYearTo(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Sort by
                      </label>
                      <Select
                        value={sortBy}
                        onValueChange={(v) => {
                          setSortBy(v as 'newest' | 'oldest' | 'downloads');
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest first</SelectItem>
                          <SelectItem value="oldest">Oldest first</SelectItem>
                          <SelectItem value="downloads">Most downloads</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Advanced Search (Scopus-style fields)
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <Input
                        placeholder="Exact topic or phrase"
                        className="h-8 w-52 text-xs"
                        value={searchTitle}
                        onChange={(e) => setSearchTitle(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Author</label>
                      <Input
                        placeholder="Surname, Initials"
                        className="h-8 w-44 text-xs"
                        value={searchAuthor}
                        onChange={(e) => setSearchAuthor(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                      <Input
                        placeholder="nutrition, food security"
                        className="h-8 w-60 text-xs"
                        value={searchTags}
                        onChange={(e) => setSearchTags(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Tags match</label>
                      <Select value={searchTagMode} onValueChange={(v) => setSearchTagMode(v as 'any' | 'all')}>
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any tag</SelectItem>
                          <SelectItem value="all">All tags</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Year from</label>
                      <Input
                        placeholder="e.g. 2020"
                        className="h-8 w-24 text-xs"
                        value={searchYearFrom}
                        onChange={(e) => setSearchYearFrom(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Year to</label>
                      <Input
                        placeholder="e.g. 2026"
                        className="h-8 w-24 text-xs"
                        value={searchYearTo}
                        onChange={(e) => setSearchYearTo(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Search sort</label>
                      <Select
                        value={searchSort}
                        onValueChange={(v) => setSearchSort(v as 'relevance' | 'newest' | 'oldest' | 'downloads')}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevance</SelectItem>
                          <SelectItem value="newest">Newest first</SelectItem>
                          <SelectItem value="oldest">Oldest first</SelectItem>
                          <SelectItem value="downloads">Most downloads</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" className="h-8 text-xs" onClick={handleSearch}>
                      Apply search
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearSearch}>
                      Clear search criteria
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active search indicator */}
            {isSearching && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Showing results for:{' '}
                  <span className="font-medium text-foreground">{activeSearchSummary}</span>
                  {searchData?.papers?.total !== undefined && (
                    <span className="ml-1">({searchData.papers.total} results)</span>
                  )}
                </span>
                <button onClick={clearSearch} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {downloadError && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {downloadError}
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading papers…</span>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isSearching && papers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No research papers found.
                </p>
              </div>
            )}

            {!isLoading && isSearching && searchHits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No papers match your search. Try different keywords.
                </p>
              </div>
            )}

            {/* Paper list — regular browse */}
            {!isLoading && !isSearching && (
              <div className="flex flex-col gap-4">
                {papers.map((paper) => (
                  <PaperCard
                    key={paper._id}
                    paper={paper}
                    isSaved={savedPaperIds.has(paper._id)}
                    isLoggedIn={isLoggedIn}
                    onDownload={() => handleDownload(paper)}
                    onToggleSave={() => handleToggleSave(paper._id)}
                  />
                ))}
              </div>
            )}

            {/* Paper list — search results */}
            {!isLoading && isSearching && (
              <div className="flex flex-col gap-4">
                {searchHits.map((hit) => (
                  <SearchPaperCard
                    key={hit._id}
                    hit={hit}
                    isSaved={savedPaperIds.has(hit._id)}
                    isLoggedIn={isLoggedIn}
                    onDownload={() => handleDownload(hit)}
                    onToggleSave={() => handleToggleSave(hit._id)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    isSearching
                      ? setSearchPage((p) => Math.max(1, p - 1))
                      : setPage((p) => Math.max(1, p - 1))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    isSearching
                      ? setSearchPage((p) => Math.min(totalPages, p + 1))
                      : setPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Paper Card (from MongoDB data) ─────────────────────────────

function PaperCard({
  paper,
  isSaved,
  isLoggedIn,
  onDownload,
  onToggleSave,
}: {
  paper: Paper;
  isSaved: boolean;
  isLoggedIn: boolean;
  onDownload: () => void;
  onToggleSave: () => void;
}) {
  return (
    <Card className="border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {paper.title}
          </h3>

          {/* Author */}
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-xs text-muted-foreground/70">Authors:</span>
            <span className="text-xs">{paper.authors.length > 0 ? paper.authors.join(', ') : 'Unknown'}</span>
          </div>

          {/* Metadata row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
            {paper.journal && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Journal:</span>
                {paper.journal}
              </span>
            )}
            {paper.year && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Year:</span>
                {paper.year}
              </span>
            )}
            {paper.doi && (
              <span className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 shrink-0" />
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
              <Download className="h-3 w-3 shrink-0" />
              <span className="font-medium text-muted-foreground/70">Downloads:</span>
              {paper.downloadCount}
            </span>
          </div>

          {/* Abstract */}
          {paper.abstract && (
            <div className="mt-2.5">
              <span className="text-xs font-medium text-muted-foreground/70">Abstract: </span>
              <span className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {paper.abstract}
              </span>
            </div>
          )}

          {/* Tags */}
          {paper.keywords.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-baseline gap-1 text-xs text-muted-foreground">
              <Tag className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="font-medium text-muted-foreground/70">Tags:</span>
              <span>{paper.keywords.join(', ')}</span>
            </div>
          )}

          {/* Uploaded by */}
          {paper.uploadedBy && (
            <div className="mt-1.5 text-xs text-muted-foreground/60">
              Uploaded by {paper.uploadedBy.displayName}
              {paper.organizationId && ` · ${paper.organizationId.name}`}
            </div>
          )}
        </div>

        <Separator className="my-3" />

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
          {isLoggedIn && (
            <Button
              variant={isSaved ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5 text-xs"
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
      </CardContent>
    </Card>
  );
}

// ─── Search Result Paper Card (from ES hits) ────────────────────

function SearchPaperCard({
  hit,
  isSaved,
  isLoggedIn,
  onDownload,
  onToggleSave,
}: {
  hit: PaperSearchHit;
  isSaved: boolean;
  isLoggedIn: boolean;
  onDownload: () => void;
  onToggleSave: () => void;
}) {
  return (
    <Card className="border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex-1 min-w-0">
          {/* Title — with highlight if available */}
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {hit.highlight?.title ? (
              <span dangerouslySetInnerHTML={{ __html: hit.highlight.title[0] }} />
            ) : (
              hit.title
            )}
          </h3>

          {/* Authors */}
          {hit.authors && hit.authors.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-xs text-muted-foreground/70">Authors:</span>
              <span className="text-xs">
                {hit.highlight?.authors
                  ? <span dangerouslySetInnerHTML={{ __html: hit.highlight.authors.join(', ') }} />
                  : hit.authors.join(', ')}
              </span>
            </div>
          )}

          {/* Metadata row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
            {hit.journal && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Journal:</span>
                {hit.journal}
              </span>
            )}
            {hit.year && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Year:</span>
                {hit.year}
              </span>
            )}
            {hit.doi && (
              <span className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 shrink-0" />
                <span className="font-medium text-muted-foreground/70">DOI:</span>
                <a
                  href={`https://doi.org/${hit.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {hit.doi}
                </a>
              </span>
            )}
            {hit.downloadCount !== undefined && (
              <span className="flex items-center gap-1.5">
                <Download className="h-3 w-3 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Downloads:</span>
                {hit.downloadCount}
              </span>
            )}
          </div>

          {/* Abstract */}
          {hit.abstract && (
            <div className="mt-2.5">
              <span className="text-xs font-medium text-muted-foreground/70">Abstract: </span>
              <span className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {hit.highlight?.abstract ? (
                  <span dangerouslySetInnerHTML={{ __html: hit.highlight.abstract.join(' … ') }} />
                ) : (
                  hit.abstract
                )}
              </span>
            </div>
          )}

          {/* Tags */}
          {hit.keywords && hit.keywords.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-baseline gap-1 text-xs text-muted-foreground">
              <Tag className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="font-medium text-muted-foreground/70">Tags:</span>
              <span>{hit.keywords.join(', ')}</span>
            </div>
          )}
        </div>

        <Separator className="my-3" />

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
          {isLoggedIn && (
            <Button
              variant={isSaved ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5 text-xs"
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
      </CardContent>
    </Card>
  );
}
