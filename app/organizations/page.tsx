'use client';

import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, Users, FileText } from 'lucide-react';

interface OrgData {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar?: string;
  initials: string;
  memberCount: number;
  postCount: number;
}

const MOCK_ORGS: OrgData[] = [
  {
    id: '1',
    name: 'Institute of Food and Nutrition Development (IFNuD)',
    slug: 'ifnud',
    description:
      'Dedicated to advancing food and nutrition research through evidence-based programs and community engagement.',
    initials: 'IF',
    memberCount: 142,
    postCount: 87,
  },
  {
    id: '2',
    name: 'UPLB Food and Nutrition Society (FaNS)',
    slug: 'uplb-fans',
    description:
      'A student organization promoting food and nutrition awareness, research, and academic excellence at UPLB.',
    initials: 'FS',
    memberCount: 256,
    postCount: 134,
  },
  {
    id: '3',
    name: 'Food and Nutrition Research Institute (FNRI)',
    slug: 'fnri',
    description:
      'The principal research arm for food and nutrition in the Philippines, conducting surveys and policy research.',
    initials: 'FN',
    memberCount: 98,
    postCount: 62,
  },
  {
    id: '4',
    name: 'Philippine Society of Nutritionists-Dietitians (PSND)',
    slug: 'psnd',
    description:
      'A professional organization for nutritionists and dietitians practicing in the Philippines.',
    initials: 'PS',
    memberCount: 312,
    postCount: 45,
  },
  {
    id: '5',
    name: 'Agricultural Systems Institute',
    slug: 'asi',
    description:
      'Focuses on agricultural research for sustainable food production and farming systems development.',
    initials: 'AS',
    memberCount: 89,
    postCount: 51,
  },
  {
    id: '6',
    name: 'Community Nutrition Research Group',
    slug: 'cnrg',
    description:
      'A research collective studying community-level nutrition interventions, food access, and dietary patterns.',
    initials: 'CN',
    memberCount: 67,
    postCount: 38,
  },
];

export default function OrganizationsPage() {
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
                  Organizations
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse research organizations and groups on UPLB KAIN
                </p>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search organizations…"
                  className="h-9 rounded-full pl-9 text-sm"
                />
              </div>
            </div>

            {/* Org grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {MOCK_ORGS.map((org) => (
                <Card
                  key={org.id}
                  className="border-border/60 bg-white shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Avatar size="lg" className="shrink-0">
                        <AvatarImage src={org.avatar} alt={org.name} />
                        <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                          {org.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1 min-w-0">
                        <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                          {org.name}
                        </h3>
                        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                          {org.description}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {org.memberCount} members
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            {org.postCount} posts
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View Organization
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
