import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';

const VALID_TOPICS = [
  'food-security',
  'nutrition-health',
  'food-science-technology',
  'agricultural-systems',
  'policy-governance',
  'indigenous-traditional-knowledge',
  'education-communication',
  'environment-sustainability',
];

const PROMPT_PREFIX = `You are a research topic classifier for a Food and Nutrition Security knowledge hub.

Given a post's title, body text, and tags, classify it into 1-3 of the following research topics. Pick only the most relevant. If the content does not clearly fit any topic, return an empty array.

Valid topics:
- "food-security": Food availability, access, utilization, hunger, resilience, food systems
- "nutrition-health": Malnutrition, dietary health, maternal/child nutrition, micronutrients
- "food-science-technology": Food processing, preservation, fortification, food safety
- "agricultural-systems": Crop production, farming, post-harvest, supply chains, aquaculture
- "policy-governance": Food/nutrition policy, regulation, economics, trade, governance
- "indigenous-traditional-knowledge": Ethnobotany, indigenous food systems, traditional practices
- "education-communication": Nutrition education, health communication, school nutrition programs
- "environment-sustainability": Climate change, sustainable agriculture, biodiversity, conservation

Return ONLY valid JSON (no markdown, no explanation):
{ "topics": string[] }
`;

function cleanJsonText(raw) {
  if (!raw) return '';
  const text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : text;
}

/**
 * Classify a post's topics using Gemini. Lightweight text-only call.
 * Returns an array of valid topic IDs, or empty array on failure.
 */
export async function classifyTopicsWithGemini(title, bodyText, tags = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const content = [
    `Title: ${title || ''}`,
    `Tags: ${tags.join(', ') || 'none'}`,
    `Body: ${(bodyText || '').slice(0, 2000)}`,
  ].join('\n');

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: MODEL });
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT_PREFIX },
            { text: content },
          ],
        },
      ],
    });

    const raw = response?.response?.text?.() || '';
    const cleaned = cleanJsonText(raw);
    const parsed = JSON.parse(cleaned);
    const topics = Array.isArray(parsed.topics)
      ? parsed.topics.map((t) => String(t).trim().toLowerCase()).filter((t) => VALID_TOPICS.includes(t))
      : [];

    console.log(`[Gemini][classify-topics] Success: [${topics.join(', ')}]`);
    return topics;
  } catch (error) {
    console.error(`[Gemini][classify-topics] Failed: ${error.message}`);
    return [];
  }
}
