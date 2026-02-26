'use client';

import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { AnnouncementsPanel } from '@/components/home/announcements-panel';
import { PostCard, type PostData } from '@/components/home/post-card';

const MOCK_POSTS: PostData[] = [
  {
    id: '1',
    author: {
      name: 'Dr. Maria Santos',
      avatar: '',
      initials: 'MS',
    },
    organization: 'IFNuD',
    title: 'Impact of Urban Agriculture on Household Food Security in Metro Manila',
    body: 'Our study examines how urban farming initiatives in Metro Manila have contributed to improved household nutrition outcomes. We surveyed over 500 households across 12 barangays and found a significant positive correlation between participation in community gardens and dietary diversity scores.',
    tags: ['food-security', 'urban-agriculture', 'Philippines'],
    likeCount: 42,
    commentCount: 8,
    publishedAt: '2 hours ago',
    type: 'post',
  },
  {
    id: '2',
    author: {
      name: 'Prof. Juan Reyes',
      avatar: '',
      initials: 'JR',
    },
    organization: 'UPLB FaNS',
    title: 'Micronutrient Deficiency Trends Among Filipino Children (2020-2025)',
    body: 'This paper presents a longitudinal analysis of micronutrient deficiency patterns in children aged 6-59 months. Key findings show that while iron deficiency anemia has decreased by 12%, Vitamin A deficiency remains a persistent challenge in rural communities.',
    tags: ['nutrition', 'micronutrients', 'child-health', 'research'],
    likeCount: 87,
    commentCount: 23,
    publishedAt: '5 hours ago',
    type: 'paper_share',
  },
  {
    id: '3',
    author: {
      name: 'Ana Gutierrez',
      avatar: '',
      initials: 'AG',
    },
    title: 'Has anyone explored the link between climate change and crop nutrition density?',
    body: 'I\'ve been reading about how rising CO₂ levels may reduce the protein and mineral content of staple crops like rice and wheat. Looking for studies or data specifically in the Southeast Asian context. Would appreciate any recommendations!',
    tags: ['climate-change', 'crop-nutrition', 'discussion'],
    likeCount: 31,
    commentCount: 15,
    publishedAt: '8 hours ago',
    type: 'post',
  },
  {
    id: '4',
    author: {
      name: 'Dr. Roberto Lim',
      avatar: '',
      initials: 'RL',
    },
    organization: 'FNRI',
    title: 'Fortification of Local Root Crops: A Viable Solution for Rural Nutrition',
    body: 'We present findings from a 2-year pilot program that explored biofortification of sweet potato and cassava varieties in Visayas communities. Results show a 30% improvement in Vitamin A intake among participating households, with high community adoption rates.',
    tags: ['biofortification', 'root-crops', 'rural-health', 'Visayas'],
    likeCount: 56,
    commentCount: 11,
    publishedAt: '1 day ago',
    type: 'post',
  },
  {
    id: '5',
    author: {
      name: 'Elena Torres',
      avatar: '',
      initials: 'ET',
    },
    organization: 'UPLB FaNS',
    title: 'School Feeding Programs: Outcomes and Cost-Effectiveness Analysis',
    body: 'This comprehensive review evaluates 15 school feeding programs across Luzon, examining their impact on student nutrition status, academic performance, and attendance rates. Our cost-effectiveness analysis provides recommendations for optimizing program budgets while maximizing nutritional outcomes.',
    tags: ['school-feeding', 'cost-analysis', 'education', 'nutrition-policy'],
    likeCount: 73,
    commentCount: 19,
    publishedAt: '1 day ago',
    type: 'paper_share',
  },
  {
    id: '6',
    author: {
      name: 'Mark Rivera',
      avatar: '',
      initials: 'MR',
    },
    title: 'Seaweed farming as an alternative livelihood and nutrition source',
    body: 'I recently visited several seaweed farming communities in Zamboanga and was impressed by the dual benefits: livelihood generation and access to highly nutritious food. Would love to connect with researchers working on the nutritional profiling of Philippine seaweed species.',
    tags: ['seaweed', 'aquaculture', 'livelihood', 'Mindanao'],
    likeCount: 24,
    commentCount: 7,
    publishedAt: '2 days ago',
    type: 'post',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-muted/20">
      <AuthenticatedNavbar />

      <div className="flex">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main content area — posts and announcements centered */}
        <main className="flex flex-1 justify-center">
          <div className="flex w-full max-w-3xl flex-col gap-4 px-4 py-6 lg:px-6">
            {/* Post feed */}
            {MOCK_POSTS.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </main>

        {/* Right Announcements Panel */}
        <AnnouncementsPanel />
      </div>
    </div>
  );
}
