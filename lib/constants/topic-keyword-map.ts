import type { ResearchTopicId } from './research-topics';

export const TOPIC_KEYWORD_MAP: Record<ResearchTopicId, string[]> = {
  'food-security': [
    'food security', 'food insecurity', 'food access', 'food availability',
    'household nutrition', 'hunger', 'coping strategies', 'disaster',
    'resilience', 'food systems', 'food sovereignty', 'famine',
    'covid-19', 'pandemic', 'livelihood', 'livelihoods',
  ],
  'nutrition-health': [
    'nutrition', 'malnutrition', 'stunting', 'wasting', 'underweight',
    'micronutrient', 'iron deficiency', 'anemia', 'vitamin',
    'maternal', 'child nutrition', 'infant', 'pregnancy',
    'dietary', 'diet', 'obesity', 'overweight', 'NCDs',
    'complementary feeding', 'breastfeeding', 'ENNS',
    'nutrition survey', 'dietary diversity', 'nutrient',
    'supplementation', 'maternal health',
  ],
  'food-science-technology': [
    'food science', 'food processing', 'food technology', 'fortification',
    'biofortification', 'functional foods', 'phytochemistry', 'antioxidants',
    'food safety', 'aflatoxin', 'mycotoxin', 'antibiotic residues',
    'fermentation', 'preservation', 'solar drying', 'food quality',
    'moringa', 'malunggay', 'sweet potato', 'native crops', 'adlai',
  ],
  'agricultural-systems': [
    'agriculture', 'farming', 'smallholder', 'crop', 'rice',
    'post-harvest', 'supply chain', 'cold chain', 'yield',
    'irrigation', 'aquaculture', 'fisheries', 'livestock',
    'poultry', 'vegetable', 'fruit', 'grain',
    'machine learning', 'crop prediction', 'precision agriculture',
    'diversified farming', 'organic',
  ],
  'policy-governance': [
    'policy', 'governance', 'regulation', 'legislation', 'law',
    'economics', 'trade', 'tariff', 'tariffication', 'price',
    'government', 'local government', 'PPAN', 'program',
    'intervention', 'CMAM', 'disaster recovery',
    'food policy', 'nutrition policy', 'planning',
  ],
  'indigenous-traditional-knowledge': [
    'indigenous', 'traditional', 'ethnobotany', 'wild edible',
    'Ifugao', 'Aeta', 'Cordillera', 'native', 'ancestral',
    'indigenous knowledge', 'indigenous peoples', 'traditional food',
    'folk', 'herbal', 'medicinal plant',
  ],
  'education-communication': [
    'education', 'nutrition education', 'school nutrition',
    'communication', 'social media', 'misinformation',
    'health education', 'dietary behavior', 'awareness',
    'Gulayan sa Paaralan', 'training', 'capacity building',
    'information dissemination', 'extension',
  ],
  'environment-sustainability': [
    'climate', 'climate change', 'sustainability', 'sustainable',
    'environment', 'environmental', 'biodiversity', 'ecosystem',
    'water', 'deforestation', 'soil', 'agroforestry',
    'organic farming', 'conservation', 'carbon',
  ],
};
