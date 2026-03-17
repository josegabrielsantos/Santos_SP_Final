'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { useSearch } from '@/lib/api/search';
import axiosInstance from '@/lib/axios';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Loader2,
  FileText,
  BookOpen,
  Users,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import type { OrgListItem } from '@/lib/types';

function OrgInitials(name: string) {
  return name
    .split(/[\s()]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function HlSpan({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const type = (searchParams.get('type') ?? 'all') as 'all' | 'posts' | 'papers' | 'organizations';
  const sort = searchParams.get('sort') ?? 'relevance';
  const author = searchParams.get('author') ?? '';
  const yearFrom = searchParams.get('yearFrom') ?? '';
  const yearTo = searchParams.get('yearTo') ?? '';

  const [authorInput, setAuthorInput] = useState(author);
  const [yearFromInput, setYearFromInput] = useState(yearFrom);
  const [yearToInput, setYearToInput] = useState(yearTo);

  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

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

  const searchEnabled = type !== 'organizations';
  const searchType = type === 'all' || type === 'organizations' ? 'all' : type;

  const { data, isLoading } = useSearch({
    q,
    type: searchType as 'all' | 'posts' | 'papers',
    sort,
    author: author || undefined,
    yearFrom: yearFrom || undefined,
    yearTo: yearTo || undefined,
    enabled: searchEnabled && !!q,
  });

  useEffect(() => {
    if (type !== 'organizations' || !q) return;
    setOrgsLoading(true);
    axiosInstance
      .get<{ organizations: OrgListItem[] }>('/organizations', { params: { search: q, limit: 20 } })
      .then((res) => setOrgs(res.data.organizations ?? []))
      .catch(() => setOrgs([]))
      .finally(() => setOrgsLoading(false));
  }, [type, q]);

  useEffect(() => {
    setAuthorInput(author);
    setYearFromInput(yearFrom);
    setYearToInput(yearTo);
  }, [author, yearFrom, yearTo]);

  if (!q) {
    return (
      <div className="min-h-screen bg-page-bg">
        <AuthenticatedNavbar />
        <div className="flex justify-center py-32">
          <div className="flex flex-col items-center gap-3 text-center">
            <Search className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-[17px] font-medium text-muted-foreground">Enter a search term to get started</p>
          </div>
        </div>
      </div>
    );
  }

  const postHits = data?.posts?.hits ?? [];
  const paperHits = data?.papers?.hits ?? [];
  const postsTotal = data?.posts?.total ?? 0;
  const papersTotal = data?.papers?.total ?? 0;

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />

      <div className="mx-auto max-w-[1200px] flex gap-6 px-4 pt-6">
        <Sidebar />

        <main className="flex-1 min-w-0">
          <h1 className="mb-4 text-[22px] font-bold text-foreground">
            Search results for &ldquo;{q}&rdquo;
          </h1>

          <Tabs
            value={type}
            onValueChange={(val) => updateParams({ type: val, author: '', yearFrom: '', yearTo: '', sort: 'relevance' })}
          >
            <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent p-0">
              <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none px-5 py-3 text-[15px] font-medium" value="all">
                All
              </TabsTrigger>
              <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none px-5 py-3 text-[15px] font-medium" value="posts">
                Posts
              </TabsTrigger>
              <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none px-5 py-3 text-[15px] font-medium" value="papers">
                Papers
              </TabsTrigger>
              <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none px-5 py-3 text-[15px] font-medium" value="organizations">
                Organizations
              </TabsTrigger>
            </TabsList>

            {/* ALL TAB */}
            <TabsContent value="all" className="pt-5">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : postHits.length === 0 && paperHits.length === 0 ? (
                <EmptyState q={q} />
              ) : (
                <div className="flex flex-col gap-8">
                  {postHits.length > 0 && (
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-[16px] font-semibold text-foreground">Posts</h2>
                        {postsTotal > 5 && (
                          <Link
                            href={`/search?q=${encodeURIComponent(q)}&type=posts`}
                            className="flex items-center gap-1 text-[14px] text-primary hover:underline"
                          >
                            See all {postsTotal} posts <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-col gap-3">
                        {postHits.slice(0, 5).map((hit) => (
                          <PostHitCard key={hit._id} hit={hit} />
                        ))}
                      </div>
                    </section>
                  )}
                  {paperHits.length > 0 && (
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-[16px] font-semibold text-foreground">Papers</h2>
                        {papersTotal > 5 && (
                          <Link
                            href={`/search?q=${encodeURIComponent(q)}&type=papers`}
                            className="flex items-center gap-1 text-[14px] text-primary hover:underline"
                          >
                            See all {papersTotal} papers <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-col gap-3">
                        {paperHits.slice(0, 5).map((hit) => (
                          <PaperHitCard key={hit._id} hit={hit} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </TabsContent>

            {/* POSTS TAB */}
            <TabsContent value="posts" className="pt-5">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : postHits.length === 0 ? (
                <EmptyState q={q} />
              ) : (
                <div className="flex flex-col gap-3">
                  {postHits.map((hit) => (
                    <PostHitCard key={hit._id} hit={hit} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PAPERS TAB */}
            <TabsContent value="papers" className="pt-5">
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-muted-foreground">Author</label>
                  <Input
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                    placeholder="Author name"
                    className="h-9 w-44 text-[14px]"
                    onKeyDown={(e) => { if (e.key === 'Enter') updateParams({ author: authorInput }); }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-muted-foreground">Year from</label>
                  <Input
                    type="number"
                    value={yearFromInput}
                    onChange={(e) => setYearFromInput(e.target.value)}
                    placeholder="e.g. 2015"
                    className="h-9 w-28 text-[14px]"
                    onKeyDown={(e) => { if (e.key === 'Enter') updateParams({ yearFrom: yearFromInput }); }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-muted-foreground">Year to</label>
                  <Input
                    type="number"
                    value={yearToInput}
                    onChange={(e) => setYearToInput(e.target.value)}
                    placeholder="e.g. 2024"
                    className="h-9 w-28 text-[14px]"
                    onKeyDown={(e) => { if (e.key === 'Enter') updateParams({ yearTo: yearToInput }); }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-muted-foreground">Sort</label>
                  <select
                    value={sort}
                    onChange={(e) => updateParams({ sort: e.target.value })}
                    className="h-9 rounded-md border border-border/80 bg-white px-3 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
                <Button
                  size="sm"
                  onClick={() => updateParams({ author: authorInput, yearFrom: yearFromInput, yearTo: yearToInput })}
                  className="h-9"
                >
                  Apply
                </Button>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : paperHits.length === 0 ? (
                <EmptyState q={q} />
              ) : (
                <div className="flex flex-col gap-3">
                  {paperHits.map((hit) => (
                    <PaperHitCard key={hit._id} hit={hit} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ORGANIZATIONS TAB */}
            <TabsContent value="organizations" className="pt-5">
              {orgsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : orgs.length === 0 ? (
                <EmptyState q={q} />
              ) : (
                <div className="flex flex-col gap-3">
                  {orgs.map((org) => (
                    <Link key={org._id} href={`/organizations/${org.slug}`}>
                      <Card className="border-border/60 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 shrink-0">
                              <AvatarImage src={org.avatar ?? undefined} alt={org.name} />
                              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                                {OrgInitials(org.name)}
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
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Search className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-[16px] font-medium text-muted-foreground">No results found for &ldquo;{q}&rdquo;</p>
      <p className="text-[14px] text-muted-foreground/70">Try different keywords or broaden your search.</p>
    </div>
  );
}

function PostHitCard({ hit }: { hit: import('@/lib/api/search').PostSearchHit }) {
  const titleHl = hit.highlight?.title?.[0];
  const bodyHl = hit.highlight?.bodyText?.[0];

  return (
    <Link href={`/posts/${hit._id}`}>
    <Card className="border-border/60 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
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
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {hit.authorId && (
                <span className="text-[13px] text-muted-foreground">by {hit.authorId.displayName}</span>
              )}
              {hit.type && (
                <Badge variant="secondary" className="text-[12px] capitalize px-2 py-0.5">
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
                <Badge key={tag} variant="outline" className="text-[12px] px-2 py-0.5">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}

function PaperHitCard({ hit }: { hit: import('@/lib/types').PaperSearchHit }) {
  const titleHl = hit.highlight?.title?.[0];
  const abstractHl = hit.highlight?.abstract?.[0];
  const abstractText = abstractHl ?? (hit.abstract ? hit.abstract.slice(0, 200) + (hit.abstract.length > 200 ? '…' : '') : null);

  return (
    <Card className="border-border/60 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary/60" />
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-foreground leading-snug">
              {titleHl ? <HlSpan text={titleHl} /> : hit.title}
            </p>
            {hit.authors && hit.authors.length > 0 && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {hit.authors.join(', ')}
              </p>
            )}
            {abstractText && (
              <p className="mt-1 text-[14px] text-muted-foreground line-clamp-2">
                {abstractHl ? <HlSpan text={abstractHl} /> : abstractText}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {hit.year && (
                <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {hit.year}
                </span>
              )}
              {hit.journal && (
                <span className="text-[13px] text-muted-foreground italic">{hit.journal}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
