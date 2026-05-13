'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { useSearch } from '@/lib/api/search';
import { useDownloadPaper, useToggleSavePaper, useSavedPapers } from '@/lib/api/papers';
import axiosInstance from '@/lib/axios';
import { useAppSelector } from '@/store/hooks';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  FileText,
  BookOpen,
  Users,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  Tag,
  Hash,
  Download,
  Eye,
  Link2,
  Bookmark,
  BookmarkCheck,
  User,
} from 'lucide-react';
import { CitationButton } from '@/components/paper/citation-button';
import { AbstractText } from '@/components/paper/abstract-text';
import { TopicBadge } from '@/components/ui/topic-badge';
import { RESEARCH_TOPICS } from '@/lib/constants/research-topics';
import { getInitials } from '@/lib/utils';
import type { OrgListItem, PaperSearchHit } from '@/lib/types';
import type { PostSearchHit } from '@/lib/api/search';

// ─── Animation Variants ─────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// ─── Skeletons ──────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="rounded-xl border-border/60 bg-white border border-border">
          <CardContent className="p-5">
            <div className="space-y-2.5">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-2/3 rounded" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Highlight helper ───────────────────────────────────────────

function HlSpan({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

// ─── Main Page ──────────────────────────────────────────────────

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAppSelector((s) => s.auth.user);
  const isLoggedIn = !!currentUser;

  // ── Read URL params ──
  const q = searchParams.get('q') ?? '';
  const type = (searchParams.get('type') ?? 'all') as 'all' | 'posts' | 'papers' | 'organizations';
  const sort = searchParams.get('sort') ?? 'relevance';
  const author = searchParams.get('author') ?? '';
  const yearFrom = searchParams.get('yearFrom') ?? '';
  const yearTo = searchParams.get('yearTo') ?? '';
  const tags = searchParams.get('tags') ?? '';
  const tagMode = searchParams.get('tagMode') ?? 'any';
  const titleFilter = searchParams.get('title') ?? '';
  const postType = searchParams.get('postType') ?? '';
  const postTags = searchParams.get('postTags') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const topic = searchParams.get('topic') ?? '';
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);

  // ── Local input states (synced to URL on apply) ──
  const [qInput, setQInput] = useState(q);
  const [authorInput, setAuthorInput] = useState(author);
  const [yearFromInput, setYearFromInput] = useState(yearFrom);
  const [yearToInput, setYearToInput] = useState(yearTo);
  const [tagsInput, setTagsInput] = useState(tags);
  const [tagModeInput, setTagModeInput] = useState(tagMode);
  const [titleInput, setTitleInput] = useState(titleFilter);
  const [postTypeInput, setPostTypeInput] = useState(postType);
  const [postTagsInput, setPostTagsInput] = useState(postTags);
  const [dateFromInput, setDateFromInput] = useState(dateFrom);
  const [dateToInput, setDateToInput] = useState(dateTo);
  const [sortInput, setSortInput] = useState(sort);

  // ── Org search (MongoDB, separate from ES) ──
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  // ── Paper actions ──
  const downloadMutation = useDownloadPaper();
  const saveMutation = useToggleSavePaper();
  const { data: savedPapers } = useSavedPapers(isLoggedIn);
  const savedPaperIds = new Set((savedPapers || []).map((p) => p._id));
  const [copiedPaperId, setCopiedPaperId] = useState('');

  // ── Sync local inputs when URL params change (e.g. navbar search) ──
  useEffect(() => {
    setQInput(q);
    setAuthorInput(author);
    setYearFromInput(yearFrom);
    setYearToInput(yearTo);
    setTagsInput(tags);
    setTagModeInput(tagMode);
    setTitleInput(titleFilter);
    setPostTypeInput(postType);
    setPostTagsInput(postTags);
    setDateFromInput(dateFrom);
    setDateToInput(dateTo);
    setSortInput(sort);
  }, [q, author, yearFrom, yearTo, tags, tagMode, titleFilter, postType, postTags, dateFrom, dateTo, sort]);

  // ── URL update helper ──
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      router.replace(`/search?${params.toString()}`);
    },
    [router, searchParams]
  );

  // ── Apply all filters ──
  const handleApplySearch = useCallback(() => {
    const params = new URLSearchParams();
    if (qInput.trim()) params.set('q', qInput.trim());
    if (type !== 'all') params.set('type', type);
    if (titleInput.trim()) params.set('title', titleInput.trim());
    if (authorInput.trim()) params.set('author', authorInput.trim());
    if (tagsInput.trim()) params.set('tags', tagsInput.trim());
    if (tagModeInput !== 'any') params.set('tagMode', tagModeInput);
    if (yearFromInput.trim()) params.set('yearFrom', yearFromInput.trim());
    if (yearToInput.trim()) params.set('yearTo', yearToInput.trim());
    if (postTypeInput.trim()) params.set('postType', postTypeInput.trim());
    if (postTagsInput.trim()) params.set('postTags', postTagsInput.trim());
    if (dateFromInput.trim()) params.set('dateFrom', dateFromInput.trim());
    if (dateToInput.trim()) params.set('dateTo', dateToInput.trim());
    if (sortInput !== 'relevance') params.set('sort', sortInput);
    if (topic) params.set('topic', topic);
    // Reset to page 1 on new search
    router.replace(`/search?${params.toString()}`);
  }, [qInput, type, titleInput, authorInput, tagsInput, tagModeInput, yearFromInput, yearToInput, postTypeInput, postTagsInput, dateFromInput, dateToInput, sortInput, topic, router]);

  const handleClearFilters = useCallback(() => {
    setTitleInput('');
    setAuthorInput('');
    setTagsInput('');
    setTagModeInput('any');
    setYearFromInput('');
    setYearToInput('');
    setPostTypeInput('');
    setPostTagsInput('');
    setDateFromInput('');
    setDateToInput('');
    setSortInput('relevance');
    // Keep only the query
    const params = new URLSearchParams();
    if (qInput.trim()) params.set('q', qInput.trim());
    if (type !== 'all') params.set('type', type);
    router.replace(`/search?${params.toString()}`);
  }, [qInput, type, router]);

  // ── ES search ──
  const searchType = type === 'organizations' ? 'all' : type;
  const hasAnyCriteria = !!q || !!author || !!yearFrom || !!yearTo || !!tags || !!titleFilter || !!postType || !!postTags || !!dateFrom || !!dateTo || !!topic;

  const { data, isLoading } = useSearch({
    q,
    type: searchType as 'all' | 'posts' | 'papers',
    sort,
    author: author || undefined,
    yearFrom: yearFrom || undefined,
    yearTo: yearTo || undefined,
    tags: tags || undefined,
    tagMode: tagMode || undefined,
    title: titleFilter || undefined,
    postType: postType || undefined,
    postTags: postTags || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    topic: topic || undefined,
    page: pageParam,
    limit: 20,
    enabled: type !== 'organizations' && hasAnyCriteria,
  });

  // ── Organization search ──
  useEffect(() => {
    if (type !== 'organizations' || !q) return;
    setOrgsLoading(true);
    axiosInstance
      .get<{ organizations: OrgListItem[] }>('/organizations', { params: { search: q, limit: 20 } })
      .then((res) => setOrgs(res.data.organizations ?? []))
      .catch(() => setOrgs([]))
      .finally(() => setOrgsLoading(false));
  }, [type, q]);

  // ── Paper actions ──
  const handleDownload = useCallback(
    async (hit: PaperSearchHit) => {
      try {
        await downloadMutation.mutateAsync(hit._id);
      } catch { /* ignore */ }
    },
    [downloadMutation],
  );

  const handleCopyPaperLink = useCallback((paperId: string) => {
    const url = `${window.location.origin}/papers?id=${paperId}`;
    navigator.clipboard.writeText(url);
    setCopiedPaperId(paperId);
    setTimeout(() => setCopiedPaperId(''), 2000);
  }, []);

  // ── Derived data ──
  const postHits = data?.posts?.hits ?? [];
  const paperHits = data?.papers?.hits ?? [];
  const postsTotal = data?.posts?.total ?? 0;
  const papersTotal = data?.papers?.total ?? 0;
  const totalForCurrentTab = type === 'posts' ? postsTotal : type === 'papers' ? papersTotal : 0;
  const totalPages = Math.ceil(totalForCurrentTab / 20);

  // ── Empty state (no query at all) — show search panel prominently ──
  if (!q && !hasAnyCriteria) {
    return (
      <AuthenticatedLayout>
        <div className="mb-6 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <h1 className="mt-3 font-heading text-[22px] font-bold text-foreground">Search</h1>
          <p className="mt-1 text-[14px] text-muted-foreground/70">
            Search posts, papers, and organizations using the filters below.
          </p>
        </div>
        <AdvancedSearchPanel
          qInput={qInput} setQInput={setQInput}
          titleInput={titleInput} setTitleInput={setTitleInput}
          authorInput={authorInput} setAuthorInput={setAuthorInput}
          tagsInput={tagsInput} setTagsInput={setTagsInput}
          tagModeInput={tagModeInput} setTagModeInput={setTagModeInput}
          yearFromInput={yearFromInput} setYearFromInput={setYearFromInput}
          yearToInput={yearToInput} setYearToInput={setYearToInput}
          postTypeInput={postTypeInput} setPostTypeInput={setPostTypeInput}
          postTagsInput={postTagsInput} setPostTagsInput={setPostTagsInput}
          dateFromInput={dateFromInput} setDateFromInput={setDateFromInput}
          dateToInput={dateToInput} setDateToInput={setDateToInput}
          sortInput={sortInput} setSortInput={setSortInput}
          onApply={handleApplySearch}
          onClear={handleClearFilters}
        />
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
          {/* Header */}
          <div className="mb-4">
            <h1 className="font-heading text-[22px] font-bold text-foreground">
              {q ? <>Search results for &ldquo;{q}&rdquo;</> : 'Search'}
            </h1>
          </div>

          {/* Advanced Search Panel — always visible */}
          <AdvancedSearchPanel
            qInput={qInput} setQInput={setQInput}
            titleInput={titleInput} setTitleInput={setTitleInput}
            authorInput={authorInput} setAuthorInput={setAuthorInput}
            tagsInput={tagsInput} setTagsInput={setTagsInput}
            tagModeInput={tagModeInput} setTagModeInput={setTagModeInput}
            yearFromInput={yearFromInput} setYearFromInput={setYearFromInput}
            yearToInput={yearToInput} setYearToInput={setYearToInput}
            postTypeInput={postTypeInput} setPostTypeInput={setPostTypeInput}
            postTagsInput={postTagsInput} setPostTagsInput={setPostTagsInput}
            dateFromInput={dateFromInput} setDateFromInput={setDateFromInput}
            dateToInput={dateToInput} setDateToInput={setDateToInput}
            sortInput={sortInput} setSortInput={setSortInput}
            onApply={handleApplySearch}
            onClear={handleClearFilters}
          />

          {/* Topic filter */}
          <div className="mb-4">
            <p className="text-[12px] font-medium text-muted-foreground mb-1.5">Research Topic</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => updateParams({ topic: '', page: '' })}
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${!topic ? 'border-primary bg-primary text-white font-semibold' : 'border-primary/35 bg-primary/10 text-primary hover:shadow-sm'}`}
              >
                All
              </button>
              {RESEARCH_TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateParams({ topic: topic === t.id ? '' : t.id, page: '' })}
                  className="shrink-0"
                >
                  <TopicBadge topicId={t.id} size="sm" active={topic === t.id} />
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={type}
            onValueChange={(val) => updateParams({ type: val === 'all' ? '' : val, page: '' })}
          >
            <TabsList className="w-full justify-start rounded-lg border border-border/60 bg-white p-0 h-auto">
              <TabsTrigger
                value="all"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                All
                {hasAnyCriteria && !isLoading && (
                  <span className="text-[12px] text-muted-foreground/60">({postsTotal + papersTotal})</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="posts"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <FileText className="h-4 w-4" />
                Posts
                {hasAnyCriteria && !isLoading && postsTotal > 0 && (
                  <span className="text-[12px] text-muted-foreground/60">({postsTotal})</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="papers"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <BookOpen className="h-4 w-4" />
                Papers
                {hasAnyCriteria && !isLoading && papersTotal > 0 && (
                  <span className="text-[12px] text-muted-foreground/60">({papersTotal})</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="organizations"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-[14px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Users className="h-4 w-4" />
                Organizations
              </TabsTrigger>
            </TabsList>

            {/* ALL TAB */}
            <TabsContent value="all" className="pt-5">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div key="loading-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ResultsSkeleton />
                  </motion.div>
                ) : postHits.length === 0 && paperHits.length === 0 ? (
                  <EmptyState q={q} />
                ) : (
                  <motion.div
                    key="results-all"
                    className="flex flex-col gap-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {postHits.length > 0 && (
                      <section>
                        <div className="mb-3 flex items-center justify-between">
                          <h2 className="font-heading text-[16px] font-semibold text-foreground">
                            Posts
                            <span className="ml-2 text-[13px] font-normal text-muted-foreground">({postsTotal})</span>
                          </h2>
                          {postsTotal > 5 && (
                            <button
                              onClick={() => updateParams({ type: 'posts', page: '' })}
                              className="flex items-center gap-1 text-[14px] text-primary hover:underline"
                            >
                              See all {postsTotal} posts <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-3">
                          {postHits.slice(0, 5).map((hit) => (
                            <motion.div key={hit._id} variants={itemVariants}>
                              <PostHitCard hit={hit} />
                            </motion.div>
                          ))}
                        </div>
                      </section>
                    )}
                    {paperHits.length > 0 && (
                      <section>
                        <div className="mb-3 flex items-center justify-between">
                          <h2 className="font-heading text-[16px] font-semibold text-foreground">
                            Papers
                            <span className="ml-2 text-[13px] font-normal text-muted-foreground">({papersTotal})</span>
                          </h2>
                          {papersTotal > 5 && (
                            <button
                              onClick={() => updateParams({ type: 'papers', page: '' })}
                              className="flex items-center gap-1 text-[14px] text-primary hover:underline"
                            >
                              See all {papersTotal} papers <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-3">
                          {paperHits.slice(0, 5).map((hit) => (
                            <motion.div key={hit._id} variants={itemVariants}>
                              <SearchPaperResult
                                hit={hit}
                                isSaved={savedPaperIds.has(hit._id)}
                                isLoggedIn={isLoggedIn}
                                onDownload={() => handleDownload(hit)}
                                onToggleSave={() => saveMutation.mutate(hit._id)}
                                onCopyLink={() => handleCopyPaperLink(hit._id)}
                                linkCopied={copiedPaperId === hit._id}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </section>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* POSTS TAB */}
            <TabsContent value="posts" className="pt-5">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div key="loading-posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ResultsSkeleton />
                  </motion.div>
                ) : postHits.length === 0 ? (
                  <EmptyState q={q} />
                ) : (
                  <motion.div
                    key="results-posts"
                    className="flex flex-col gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {postHits.map((hit) => (
                      <motion.div key={hit._id} variants={itemVariants}>
                        <PostHitCard hit={hit} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <Pagination
                currentPage={pageParam}
                totalPages={totalPages}
                onPageChange={(p) => updateParams({ page: p === 1 ? '' : String(p) })}
                show={!isLoading && totalPages > 1}
              />
            </TabsContent>

            {/* PAPERS TAB */}
            <TabsContent value="papers" className="pt-5">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div key="loading-papers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ResultsSkeleton />
                  </motion.div>
                ) : paperHits.length === 0 ? (
                  <EmptyState q={q} />
                ) : (
                  <motion.div
                    key="results-papers"
                    className="flex flex-col gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {paperHits.map((hit) => (
                      <motion.div key={hit._id} variants={itemVariants}>
                        <SearchPaperResult
                          hit={hit}
                          isSaved={savedPaperIds.has(hit._id)}
                          isLoggedIn={isLoggedIn}
                          onDownload={() => handleDownload(hit)}
                          onToggleSave={() => saveMutation.mutate(hit._id)}
                          onCopyLink={() => handleCopyPaperLink(hit._id)}
                          linkCopied={copiedPaperId === hit._id}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <Pagination
                currentPage={pageParam}
                totalPages={totalPages}
                onPageChange={(p) => updateParams({ page: p === 1 ? '' : String(p) })}
                show={!isLoading && totalPages > 1}
              />
            </TabsContent>

            {/* ORGANIZATIONS TAB */}
            <TabsContent value="organizations" className="pt-5">
              <AnimatePresence mode="wait">
                {orgsLoading ? (
                  <motion.div key="loading-orgs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ResultsSkeleton />
                  </motion.div>
                ) : !q ? (
                  <EmptyState q="" />
                ) : orgs.length === 0 ? (
                  <EmptyState q={q} />
                ) : (
                  <motion.div
                    key="results-orgs"
                    className="flex flex-col gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {orgs.map((org) => (
                      <motion.div key={org._id} variants={itemVariants}>
                        <Link href={`/organizations/${org.slug}`}>
                          <Card className="rounded-xl border-border/60 bg-white border border-border hover:border-border/80 transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 shrink-0">
                                  <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                                    {getInitials(org.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[16px] font-semibold text-foreground truncate">{org.name}</p>
                                  {org.description && (
                                    <p className="mt-0.5 text-[14px] text-muted-foreground line-clamp-2">
                                      {org.description}
                                    </p>
                                  )}
                                  <div className="mt-1.5 flex items-center gap-4">
                                    <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                                      <Users className="h-3.5 w-3.5" /> {org.memberCount} members
                                    </span>
                                    <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                                      <FileText className="h-3.5 w-3.5" /> {org.postCount} posts
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
    </AuthenticatedLayout>
  );
}

// ─── Advanced Search Panel ──────────────────────────────────────

function AdvancedSearchPanel({
  qInput, setQInput,
  titleInput, setTitleInput,
  authorInput, setAuthorInput,
  tagsInput, setTagsInput,
  tagModeInput, setTagModeInput,
  yearFromInput, setYearFromInput,
  yearToInput, setYearToInput,
  postTypeInput, setPostTypeInput,
  postTagsInput, setPostTagsInput,
  dateFromInput, setDateFromInput,
  dateToInput, setDateToInput,
  sortInput, setSortInput,
  onApply,
  onClear,
}: {
  qInput: string; setQInput: (v: string) => void;
  titleInput: string; setTitleInput: (v: string) => void;
  authorInput: string; setAuthorInput: (v: string) => void;
  tagsInput: string; setTagsInput: (v: string) => void;
  tagModeInput: string; setTagModeInput: (v: string) => void;
  yearFromInput: string; setYearFromInput: (v: string) => void;
  yearToInput: string; setYearToInput: (v: string) => void;
  postTypeInput: string; setPostTypeInput: (v: string) => void;
  postTagsInput: string; setPostTagsInput: (v: string) => void;
  dateFromInput: string; setDateFromInput: (v: string) => void;
  dateToInput: string; setDateToInput: (v: string) => void;
  sortInput: string; setSortInput: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onApply();
  };

  return (
    <Card className="mb-4 rounded-xl border border-border">
      <CardContent className="p-5">
        {/* Search query — prominent */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search across all content..."
            className="h-11 pl-10 text-[15px]"
          />
        </div>

        {/* Filters grid */}
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Paper filters */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Title</label>
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Exact topic or phrase"
              className="h-9 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Author</label>
            <Input
              value={authorInput}
              onChange={(e) => setAuthorInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Author name"
              className="h-9 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Keywords</label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. nutrition, food security"
              className="h-9 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Keyword Match</label>
            <Select value={tagModeInput} onValueChange={setTagModeInput}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any keyword</SelectItem>
                <SelectItem value="all">All keywords</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Year range + Post type */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Year From</label>
            <Input
              type="number"
              value={yearFromInput}
              onChange={(e) => setYearFromInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 2020"
              className="h-9 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Year To</label>
            <Input
              type="number"
              value={yearToInput}
              onChange={(e) => setYearToInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 2026"
              className="h-9 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Post Type</label>
            <Select value={postTypeInput || '_all'} onValueChange={(v) => setPostTypeInput(v === '_all' ? '' : v)}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All types</SelectItem>
                <SelectItem value="post">Article</SelectItem>
                <SelectItem value="research_paper">Research Paper</SelectItem>
                <SelectItem value="poll">Poll</SelectItem>
                <SelectItem value="update">Update</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Post Tags</label>
            <Input
              value={postTagsInput}
              onChange={(e) => setPostTagsInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. nutrition, FNRI"
              className="h-9 text-[13px]"
            />
          </div>

          {/* Date range + Sort */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Date From</label>
            <Input
              type="date"
              value={dateFromInput}
              onChange={(e) => setDateFromInput(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Date To</label>
            <Input
              type="date"
              value={dateToInput}
              onChange={(e) => setDateToInput(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted-foreground">Sort By</label>
            <Select value={sortInput} onValueChange={setSortInput}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="downloads">Most downloads</SelectItem>
                <SelectItem value="most_liked">Most liked</SelectItem>
                <SelectItem value="most_discussed">Most discussed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <Button size="default" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-[13px]" onClick={onApply}>
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Search
          </Button>
          <Button variant="ghost" size="default" className="h-9 text-[13px] text-muted-foreground" onClick={onClear}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pagination ─────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  show,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  show: boolean;
}) {
  if (!show) return null;

  return (
    <div className="mt-7 flex items-center justify-center gap-2.5">
      <Button
        variant="outline"
        size="default"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="px-3.5 text-[16px] text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="default"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────

function EmptyState({ q }: { q: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Search className="h-10 w-10 text-muted-foreground/40" />
      {q ? (
        <>
          <p className="text-[16px] font-medium text-muted-foreground">No results found for &ldquo;{q}&rdquo;</p>
          <p className="text-[14px] text-muted-foreground/70">Try different keywords or broaden your filters.</p>
        </>
      ) : (
        <p className="text-[16px] font-medium text-muted-foreground">Enter a search term or apply filters to get started.</p>
      )}
    </div>
  );
}

// ─── Post Hit Card ──────────────────────────────────────────────

function PostHitCard({ hit }: { hit: PostSearchHit }) {
  const titleHl = hit.highlight?.title?.[0];
  const bodyHl = hit.highlight?.bodyText?.[0];

  return (
    <Link href={`/posts/${hit._id}`}>
      <Card className="rounded-xl border-border/60 bg-white border border-border hover:border-border/80 transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary/60" />
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-semibold text-foreground leading-snug">
                {titleHl ? <HlSpan text={titleHl} /> : hit.title}
              </p>
              {bodyHl && (
                <p className="mt-1 text-[14px] text-muted-foreground line-clamp-2">
                  <HlSpan text={bodyHl} />
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {hit.authorId && (
                  <span className="text-[13px] text-muted-foreground">by {hit.authorId.displayName}</span>
                )}
                {hit.organizationId && (
                  <span className="text-[13px] text-primary">in {hit.organizationId.name}</span>
                )}
                {hit.type && hit.type !== 'post' && (
                  <Badge variant="secondary" className="text-[11px] capitalize px-2 py-0">
                    {hit.type.replace('_', ' ')}
                  </Badge>
                )}
                {hit.publishedAt && (
                  <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(hit.publishedAt).toLocaleDateString()}
                  </span>
                )}
                {hit.tags && hit.tags.length > 0 && hit.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-kain-amber-light px-2 py-0.5 text-[11px] font-medium text-kain-amber"
                  >
                    {tag}
                  </span>
                ))}
                {hit.tags && hit.tags.length > 3 && (
                  <span className="text-[11px] text-muted-foreground">+{hit.tags.length - 3}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Search Paper Result Card (with actions + highlight) ────────

function SearchPaperResult({
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
  const titleHl = hit.highlight?.title?.[0];
  const abstractHl = hit.highlight?.abstract;

  // Build a minimal Paper-like object for CitationButton
  const paperForCitation = {
    _id: hit._id,
    title: hit.title,
    authors: hit.authors ?? [],
    abstract: hit.abstract ?? null,
    keywords: hit.keywords ?? [],
    doi: hit.doi ?? null,
    year: hit.year ?? null,
    journal: hit.journal ?? null,
    fileUrl: hit.fileUrl ?? null,
    fileSize: null,
    downloadCount: hit.downloadCount ?? 0,
    createdAt: hit.createdAt ?? '',
    updatedAt: hit.createdAt ?? '',
    isPublished: true,
    uploadedBy: { _id: '', displayName: '', avatar: null },
  };

  return (
    <Card className="rounded-lg border border-border bg-card transition-colors hover:bg-muted/10">
      <CardContent className="p-6">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-[20px] font-semibold leading-snug text-foreground">
            {titleHl ? (
              <span className="search-highlight" dangerouslySetInnerHTML={{ __html: titleHl }} />
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
                  onClick={(e) => e.stopPropagation()}
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
            <AbstractText text={hit.abstract} highlight={abstractHl} />
          )}

          {/* Keywords */}
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

        {/* Action buttons */}
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
            <CitationButton paper={paperForCitation} />
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
