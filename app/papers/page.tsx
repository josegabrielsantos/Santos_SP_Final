'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Hash,
  Eye,
  Link2,
} from 'lucide-react';
import { usePapers, useSearchPapers, useDownloadPaper, useToggleSavePaper, useSavedPapers } from '@/lib/api/papers';
import { useAppSelector } from '@/store/hooks';
import { CitationButton } from '@/components/paper/citation-button';
import type { Paper, PaperSearchHit } from '@/lib/types';

export default function PapersPage() {
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
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-5xl px-5 py-7 lg:px-7">
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-[28px] font-bold tracking-tight text-foreground">
                Research Papers
              </h1>
              <p className="mt-1.5 text-[15px] text-muted-foreground">
                Browse curated research on food and nutrition security
              </p>
            </div>

            {/* Not-logged-in notice */}
            {!isLoggedIn && (
              <Card className="mb-5 border-kain-amber/40 bg-kain-amber-light/50">
                <CardContent className="p-5 text-[18px] text-foreground/80">
                  Please sign in to access the research papers page.
                </CardContent>
              </Card>
            )}

            {/* Search bar */}
            <div className="mb-5 flex gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search papers by title, author, keywords…"
                  className="h-10 pl-10 pr-10 text-[18px]"
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
                className="h-10"
                onClick={() => setShowFilters(!showFilters)}
                disabled={!isLoggedIn}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters &amp; Advanced Search
              </Button>
            </div>

            {/* Filtering tabs */}
            {isLoggedIn && (
              <div className="mb-5">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent p-0">
                    <TabsTrigger
                      value="all"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none px-5 py-3 text-[15px] font-medium"
                    >
                      All Research Papers
                    </TabsTrigger>
                    <TabsTrigger
                      value="my-orgs"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none px-5 py-3 text-[15px] font-medium"
                    >
                      My Organization&apos;s Research Papers
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Filters panel */}
            {showFilters && (
              <Card className="mb-4 rounded-xl border border-border">
                <CardContent className="p-4">
                  <p className="mb-2 text-[14px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Browse Filters
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">
                        Author
                      </label>
                      <Input
                        placeholder="Filter by author…"
                        className="h-9 w-48 text-[14px]"
                        value={filterAuthor}
                        onChange={(e) => {
                          setFilterAuthor(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">
                        Year from
                      </label>
                      <Input
                        placeholder="e.g. 2020"
                        className="h-9 w-28 text-[14px]"
                        value={filterYearFrom}
                        onChange={(e) => {
                          setFilterYearFrom(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">
                        Year to
                      </label>
                      <Input
                        placeholder="e.g. 2025"
                        className="h-9 w-28 text-[14px]"
                        value={filterYearTo}
                        onChange={(e) => {
                          setFilterYearTo(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">
                        Sort by
                      </label>
                      <Select
                        value={sortBy}
                        onValueChange={(v) => {
                          setSortBy(v as 'newest' | 'oldest' | 'downloads');
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="h-9 w-40 text-[14px]">
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
                      size="default"
                      className="h-9 text-[14px]"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  <p className="mb-2 text-[14px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Advanced Search (Scopus-style fields)
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">Title</label>
                      <Input
                        placeholder="Exact topic or phrase"
                        className="h-9 w-56 text-[14px]"
                        value={searchTitle}
                        onChange={(e) => setSearchTitle(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">Author</label>
                      <Input
                        placeholder="Surname, Initials"
                        className="h-9 w-48 text-[14px]"
                        value={searchAuthor}
                        onChange={(e) => setSearchAuthor(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">Tags (comma-separated)</label>
                      <Input
                        placeholder="nutrition, food security"
                        className="h-9 w-64 text-[14px]"
                        value={searchTags}
                        onChange={(e) => setSearchTags(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">Tags match</label>
                      <Select value={searchTagMode} onValueChange={(v) => setSearchTagMode(v as 'any' | 'all')}>
                        <SelectTrigger className="h-9 w-32 text-[14px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any tag</SelectItem>
                          <SelectItem value="all">All tags</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">Year from</label>
                      <Input
                        placeholder="e.g. 2020"
                        className="h-9 w-28 text-[14px]"
                        value={searchYearFrom}
                        onChange={(e) => setSearchYearFrom(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">Year to</label>
                      <Input
                        placeholder="e.g. 2026"
                        className="h-9 w-28 text-[14px]"
                        value={searchYearTo}
                        onChange={(e) => setSearchYearTo(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[14px] font-medium text-muted-foreground">Search sort</label>
                      <Select
                        value={searchSort}
                        onValueChange={(v) => setSearchSort(v as 'relevance' | 'newest' | 'oldest' | 'downloads')}
                      >
                        <SelectTrigger className="h-9 w-40 text-[14px]">
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
                    <Button
                      size="default"
                      className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-[14px]"
                      onClick={handleSearch}
                    >
                      Apply search
                    </Button>
                    <Button variant="ghost" size="default" className="h-9 text-[14px]" onClick={clearSearch}>
                      Clear search criteria
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active search indicator */}
            {isSearching && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[16px]">
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
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[16px] text-destructive">
                {downloadError}
              </div>
            )}

            {/* Loading state — skeleton cards */}
            {isLoading && (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PaperCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isSearching && papers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-[16px] text-muted-foreground">
                  No research papers found.
                </p>
              </div>
            )}

            {!isLoading && isSearching && searchHits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-[16px] text-muted-foreground">
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
              <div className="mt-7 flex items-center justify-center gap-2.5">
                <Button
                  variant="outline"
                  size="default"
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
                <span className="px-3.5 text-[18px] text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="default"
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

// ─── Helper: get initials from name ─────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Abstract with "Read more" toggle ───────────────────────────

function AbstractText({ text, highlight }: { text: string; highlight?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;

  if (highlight && highlight.length > 0) {
    return (
      <div className="mt-4">
        <span className="text-[13px] font-medium text-muted-foreground/70">Abstract: </span>
        <span
          className="text-[14px] leading-relaxed text-muted-foreground search-highlight"
          dangerouslySetInnerHTML={{ __html: highlight.join(' … ') }}
        />
      </div>
    );
  }

  const displayed = isLong && !expanded ? text.slice(0, 200) + '…' : text;

  return (
    <div className="mt-4">
      <span className="text-[13px] font-medium text-muted-foreground/70">Abstract: </span>
      <span className="text-[14px] leading-relaxed text-muted-foreground">{displayed}</span>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-1.5 text-[15px] font-medium text-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
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
  onCopyLink,
  linkCopied,
}: {
  paper: Paper;
  isSaved: boolean;
  isLoggedIn: boolean;
  onDownload: () => void;
  onToggleSave: () => void;
  onCopyLink: () => void;
  linkCopied: boolean;
}) {
  const router = useRouter();

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
              {paper.organizationId && (
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

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-[13px]" onClick={onDownload}>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
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
          <h3 className="text-[20px] font-semibold leading-snug text-foreground">
            {hit.highlight?.title ? (
              <span className="search-highlight" dangerouslySetInnerHTML={{ __html: hit.highlight.title[0] }} />
            ) : (
              hit.title
            )}
          </h3>

          {/* Authors */}
          {hit.authors && hit.authors.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-[14px] text-muted-foreground">
              <User className="h-4 w-4 shrink-0" />
              <span className="font-medium text-muted-foreground/70">Authors:</span>
              <span>
                {hit.highlight?.authors
                  ? <span className="search-highlight" dangerouslySetInnerHTML={{ __html: hit.highlight.authors.join(', ') }} />
                  : hit.authors.join(', ')}
              </span>
            </div>
          )}

          {/* Metadata row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground/80">
            {hit.journal && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Journal:</span>
                {hit.journal}
              </span>
            )}
            {hit.year && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Year:</span>
                {hit.year}
              </span>
            )}
            {hit.doi && (
              <span className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 shrink-0" />
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
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-muted-foreground/70">Downloads:</span>
                {hit.downloadCount}
              </span>
            )}
          </div>

          {/* Abstract */}
          {hit.abstract && (
            <AbstractText text={hit.abstract} highlight={hit.highlight?.abstract} />
          )}

          {/* Tags */}
          {hit.keywords && hit.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 shrink-0 text-kain-green/60" />
              {hit.keywords.map((kw) => (
                <Badge
                  key={kw}
                  className="bg-kain-green-light text-kain-green border border-kain-green/20 text-[12px] font-normal hover:bg-kain-green-light/80"
                >
                  {kw}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-[13px]" onClick={onDownload}>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
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
