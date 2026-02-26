'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Megaphone, Pin } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  pinned?: boolean;
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Welcome to UPLB KAIN!',
    body: 'We are excited to launch the Knowledge Archive on Integrated Nutrition. Explore curated research and join discussions.',
    date: 'Feb 22, 2026',
    pinned: true,
  },
  {
    id: '2',
    title: 'Call for Research Papers',
    body: 'Submit your research papers on food security and nutrition. All submissions will be reviewed by our panel.',
    date: 'Feb 20, 2026',
    pinned: true,
  },
  {
    id: '3',
    title: 'New Search Features',
    body: 'Elasticsearch-powered search is now live! Try advanced queries to find relevant papers and posts.',
    date: 'Feb 18, 2026',
  },
  {
    id: '4',
    title: 'Community Guidelines Update',
    body: 'Please review our updated community guidelines to ensure a respectful and productive discussion environment.',
    date: 'Feb 15, 2026',
  },
  {
    id: '5',
    title: 'Data Visualization Tools Coming Soon',
    body: 'Interactive analytics dashboards for research trends and gaps will be available in the next update.',
    date: 'Feb 12, 2026',
  },
  {
    id: '6',
    title: 'FaNS Research Symposium 2026',
    body: 'Join us for the annual Food and Nutrition Security symposium on March 15, 2026 at the UPLB campus.',
    date: 'Feb 10, 2026',
  },
];

export function AnnouncementsPanel() {
  return (
    <div className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 border-l border-border/50 bg-white xl:block">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Megaphone className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Announcements</h2>
      </div>

      <ScrollArea className="h-[calc(100vh-3.5rem-3rem)]">
        <div className="flex flex-col gap-0.5 p-2">
          {MOCK_ANNOUNCEMENTS.map((item, idx) => (
            <div key={item.id}>
              <div className="rounded-lg p-3 transition-colors hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  {item.pinned && (
                    <Pin className="h-3 w-3 text-primary shrink-0" />
                  )}
                  <h3 className="text-sm font-medium leading-snug text-foreground line-clamp-1">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {item.body}
                </p>
                <span className="mt-1.5 block text-[10px] text-muted-foreground/70">
                  {item.date}
                </span>
              </div>
              {idx < MOCK_ANNOUNCEMENTS.length - 1 && (
                <Separator className="mx-3" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
