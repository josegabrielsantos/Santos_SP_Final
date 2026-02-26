'use client';

import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Search, Download, ExternalLink, Calendar, BookOpen } from 'lucide-react';

interface PaperData {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  year: number;
  journal: string;
  downloadCount: number;
}

const MOCK_PAPERS: PaperData[] = [
  {
    id: '1',
    title: 'Nutritional Status and Dietary Patterns Among Filipino School-Age Children: A National Survey',
    authors: ['Santos, M.C.', 'Reyes, J.P.', 'Cruz, A.B.'],
    abstract:
      'This study presents findings from a national survey of 10,000 Filipino children aged 6-12 years, examining nutritional status indicators and dietary patterns across urban and rural settings.',
    keywords: ['nutrition survey', 'school-age children', 'Philippines', 'dietary patterns'],
    year: 2025,
    journal: 'Philippine Journal of Nutrition',
    downloadCount: 234,
  },
  {
    id: '2',
    title: 'Biofortification of Rice Varieties in Southeast Asia: Progress and Challenges',
    authors: ['Lim, R.T.', 'Nguyen, H.V.', 'Park, S.K.'],
    abstract:
      'This review examines the current state of rice biofortification efforts across Southeast Asia, with focus on iron, zinc, and Vitamin A enrichment of staple rice varieties.',
    keywords: ['biofortification', 'rice', 'Southeast Asia', 'micronutrients'],
    year: 2025,
    journal: 'Asian Journal of Agricultural Sciences',
    downloadCount: 189,
  },
  {
    id: '3',
    title: 'Food Security Index Development for Philippine Municipalities',
    authors: ['Garcia, L.M.', 'Torres, E.R.'],
    abstract:
      'We propose a composite food security index tailored for Philippine municipalities, incorporating dimensions of availability, access, utilization, and stability.',
    keywords: ['food security', 'index', 'Philippines', 'municipalities'],
    year: 2024,
    journal: 'Journal of Food Security Studies',
    downloadCount: 156,
  },
  {
    id: '4',
    title: 'Impact of Climate Variability on Crop Yield and Nutritional Quality in Tropical Regions',
    authors: ['Rivera, M.A.', 'Johnson, K.L.', 'Santos, M.C.'],
    abstract:
      'This longitudinal study analyzes the relationship between climate variability indicators and both crop yield and nutritional content across five tropical countries over a 10-year period.',
    keywords: ['climate change', 'crop yield', 'nutritional quality', 'tropical agriculture'],
    year: 2024,
    journal: 'Global Food Security',
    downloadCount: 312,
  },
  {
    id: '5',
    title: 'Community-Based Nutrition Intervention Programs: A Systematic Review',
    authors: ['Gutierrez, A.F.', 'Dela Cruz, P.S.'],
    abstract:
      'A systematic review of 45 community-based nutrition interventions implemented in low- and middle-income countries, evaluating effectiveness, scalability, and sustainability.',
    keywords: ['community nutrition', 'intervention', 'systematic review', 'LMIC'],
    year: 2025,
    journal: 'Public Health Nutrition',
    downloadCount: 267,
  },
  {
    id: '6',
    title: 'Seaweed as a Sustainable Source of Nutrition: Chemical Composition and Health Benefits',
    authors: ['Aquino, R.B.', 'Tan, W.L.'],
    abstract:
      'This paper provides a comprehensive analysis of the nutritional profiles of 12 Philippine seaweed species, evaluating their potential as sustainable sources of essential nutrients.',
    keywords: ['seaweed', 'nutrition', 'sustainable food', 'Philippines'],
    year: 2025,
    journal: 'Marine Biology Research',
    downloadCount: 143,
  },
];

export default function PapersPage() {
  return (
    <div className="min-h-screen bg-muted/20">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-4xl px-4 py-6 lg:px-6">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Research Papers
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse curated research on food and nutrition security
                </p>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search papers…"
                  className="h-9 rounded-full pl-9 text-sm"
                />
              </div>
            </div>

            {/* Paper list */}
            <div className="flex flex-col gap-4">
              {MOCK_PAPERS.map((paper) => (
                <Card
                  key={paper.id}
                  className="border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold leading-snug text-foreground">
                          {paper.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {paper.authors.join(', ')}
                        </p>

                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground/80">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {paper.journal}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {paper.year}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {paper.downloadCount} downloads
                          </span>
                        </div>

                        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                          {paper.abstract}
                        </p>

                        {/* Keywords */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {paper.keywords.map((kw) => (
                            <Badge
                              key={kw}
                              variant="secondary"
                              className="text-[11px] font-normal"
                            >
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Download className="h-3.5 w-3.5" />
                        Download PDF
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
