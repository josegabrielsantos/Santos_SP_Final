export const RESEARCH_TOPICS = [
  {
    id: 'food-security',
    label: 'Food Security',
    description: 'Household and community food availability, access, and utilization',
    color: 'var(--chart-1)',
  },
  {
    id: 'nutrition-health',
    label: 'Nutrition & Health',
    description: 'Malnutrition, micronutrient deficiency, maternal/child nutrition, dietary health',
    color: 'var(--chart-2)',
  },
  {
    id: 'food-science-technology',
    label: 'Food Science & Technology',
    description: 'Food processing, preservation, fortification, functional foods, food safety',
    color: 'var(--chart-3)',
  },
  {
    id: 'agricultural-systems',
    label: 'Agricultural Systems',
    description: 'Crop production, farming systems, post-harvest, supply chains, smallholder agriculture',
    color: 'var(--chart-4)',
  },
  {
    id: 'policy-governance',
    label: 'Policy & Governance',
    description: 'Nutrition policy, food regulation, governance, economics, trade, tariffication',
    color: 'var(--chart-5)',
  },
  {
    id: 'indigenous-traditional-knowledge',
    label: 'Indigenous & Traditional Knowledge',
    description: 'Ethnobotany, wild edible plants, indigenous food systems, traditional practices',
    color: 'var(--kain-green)',
  },
  {
    id: 'education-communication',
    label: 'Education & Communication',
    description: 'Nutrition education, school nutrition programs, health communication, misinformation',
    color: 'var(--kain-amber)',
  },
  {
    id: 'environment-sustainability',
    label: 'Environment & Sustainability',
    description: 'Climate change, sustainable agriculture, biodiversity, environmental impact on food systems',
    color: '#4a9abe',
  },
] as const;

export type ResearchTopicId = (typeof RESEARCH_TOPICS)[number]['id'];
