export const RESEARCH_TOPICS = [
  {
    id: 'food-security',
    label: 'Food Security',
    description: 'Household and community food availability, access, and utilization',
    color: 'var(--primary)',
  },
  {
    id: 'nutrition-health',
    label: 'Nutrition & Health',
    description: 'Malnutrition, micronutrient deficiency, maternal/child nutrition, dietary health',
    color: 'var(--primary)',
  },
  {
    id: 'food-science-technology',
    label: 'Food Science & Technology',
    description: 'Food processing, preservation, fortification, functional foods, food safety',
    color: 'var(--primary)',
  },
  {
    id: 'agricultural-systems',
    label: 'Agricultural Systems',
    description: 'Crop production, farming systems, post-harvest, supply chains, smallholder agriculture',
    color: 'var(--primary)',
  },
  {
    id: 'policy-governance',
    label: 'Policy & Governance',
    description: 'Nutrition policy, food regulation, governance, economics, trade, tariffication',
    color: 'var(--primary)',
  },
  {
    id: 'indigenous-traditional-knowledge',
    label: 'Indigenous & Traditional Knowledge',
    description: 'Ethnobotany, wild edible plants, indigenous food systems, traditional practices',
    color: 'var(--primary)',
  },
  {
    id: 'education-communication',
    label: 'Education & Communication',
    description: 'Nutrition education, school nutrition programs, health communication, misinformation',
    color: 'var(--primary)',
  },
  {
    id: 'environment-sustainability',
    label: 'Environment & Sustainability',
    description: 'Climate change, sustainable agriculture, biodiversity, environmental impact on food systems',
    color: 'var(--primary)',
  },
] as const;

export type ResearchTopicId = (typeof RESEARCH_TOPICS)[number]['id'];
