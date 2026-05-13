'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Quote, Check } from 'lucide-react';

export interface CitationData {
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  doi: string | null;
}

function formatAPA(paper: CitationData): string {
  const authors = paper.authors?.join(', ') || 'Unknown Author';
  const year = paper.year ? `(${paper.year})` : '';
  const doi = paper.doi ? ` https://doi.org/${paper.doi}` : '';
  return `${authors} ${year}. ${paper.title}. ${paper.journal ?? ''}.${doi}`.replace(/\s+/g, ' ').trim();
}

function formatMLA(paper: CitationData): string {
  const firstAuthor = paper.authors?.[0] ?? 'Unknown Author';
  const year = paper.year ?? 'n.d.';
  return `${firstAuthor}. "${paper.title}." ${paper.journal ?? ''}, ${year}.`.replace(/\s+/g, ' ').trim();
}

function formatChicago(paper: CitationData): string {
  const authors = paper.authors?.join(', ') || 'Unknown Author';
  const year = paper.year ?? 'n.d.';
  return `${authors}. "${paper.title}." ${paper.journal ?? ''} (${year}).`.replace(/\s+/g, ' ').trim();
}

export function CitationButton({ paper }: { paper: CitationData }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-[13px] border border-border hover:bg-muted/50"
        >
          <Quote className="h-3.5 w-3.5" />
          Cite
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-[14px]"
          onClick={() => copy(formatAPA(paper), 'APA')}
        >
          {copied === 'APA' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Quote className="h-3.5 w-3.5" />}
          APA
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-[14px]"
          onClick={() => copy(formatMLA(paper), 'MLA')}
        >
          {copied === 'MLA' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Quote className="h-3.5 w-3.5" />}
          MLA
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-[14px]"
          onClick={() => copy(formatChicago(paper), 'Chicago')}
        >
          {copied === 'Chicago' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Quote className="h-3.5 w-3.5" />}
          Chicago
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
