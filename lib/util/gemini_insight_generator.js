import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are an academic research analyst for a food and nutrition security knowledge platform (UPLB KAIN).
Your job is to synthesize platform data into a brief, insightful summary that helps researchers understand the research landscape around a specific post.

RULES:
- Only reference data provided in the context below. Never invent statistics, papers, or claims.
- Write in a scholarly but accessible tone (think: journal editorial, not chatbot).
- Keep the summary to 2-4 sentences.
- Identify 2-3 key themes discussed across the related content.
- If you can identify a research gap (a topic mentioned in posts but not covered by any paper, or vice versa), mention it.
- Do not use bullet points in the summary — write flowing prose.
- Do not start with "This post discusses..." — start with the insight itself.`;

function buildUserPrompt(postContext, topicSummary, relatedPosts, relatedPapers) {
  const topPostLines = relatedPosts
    .slice(0, 5)
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" — ${p.organizationName || 'No org'} (${p.likeCount || 0} likes, ${p.commentCount || 0} comments) [Tags: ${p.tags?.join(', ') || 'none'}]`,
    )
    .join('\n');

  const topPaperLines = relatedPapers
    .slice(0, 5)
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" by ${p.authors?.join(', ') || 'Unknown'} (${p.year || 'N/A'}) — Keywords: ${p.keywords?.join(', ') || 'none'}`,
    )
    .join('\n');

  return `CURRENT POST:
- Title: "${postContext.title}"
- Topics: ${postContext.topics.join(', ') || 'none'}
- Tags: ${postContext.tags.join(', ') || 'none'}

PLATFORM CONTEXT FOR THESE TOPICS:
- Total posts on these topics: ${topicSummary.totalPosts}
- Total research papers: ${topicSummary.totalPapers}
- New posts in last 30 days: ${topicSummary.recentPosts}
- Most active organization: ${topicSummary.topOrganizations?.[0]?.name || 'N/A'} (${topicSummary.topOrganizations?.[0]?.count || 0} posts)
- Trending tags: ${topicSummary.trendingTags?.join(', ') || 'N/A'}
- Related research areas: ${topicSummary.relatedTopics?.join(', ') || 'N/A'}
- Most published authors: ${topicSummary.topAuthors?.map((a) => a.name).join(', ') || 'N/A'}
- Paper publication years: ${topicSummary.yearDistribution?.map((y) => `${y.year} (${y.count})`).join(', ') || 'N/A'}

TOP ENGAGED POSTS ON THESE TOPICS:
${topPostLines || '(none)'}

RELATED RESEARCH PAPERS:
${topPaperLines || '(none)'}

TOP KEYWORDS ACROSS PAPERS: ${topicSummary.topKeywords?.join(', ') || 'N/A'}

Based on all the data above, generate a JSON response with this exact structure:
{
  "summary": "A 2-4 sentence analytical paragraph synthesizing the research landscape. Mention quantitative facts (post/paper counts, active orgs) and qualitative patterns (recurring themes, emerging discussions). If a gap is visible, note it.",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "researchGaps": ["gap1"]
}

The researchGaps array can be empty if no clear gap is visible. Do not force a gap that isn't there.
Return ONLY the JSON object, no markdown fencing.`;
}

function cleanJsonText(raw) {
  if (!raw) return '';
  const text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : text;
}

/**
 * Generate an AI research landscape insight using Gemini.
 * Returns { summary, keyThemes, researchGaps } or null on failure.
 */
export async function generateInsight(postContext, topicSummary, relatedPosts, relatedPapers) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Insight Generator] GEMINI_API_KEY not set — skipping AI generation');
    return null;
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
      },
    });

    const prompt = buildUserPrompt(postContext, topicSummary, relatedPosts, relatedPapers);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: SYSTEM_PROMPT,
    });

    const raw = result?.response?.text?.() || '';
    const cleaned = cleanJsonText(raw);
    const parsed = JSON.parse(cleaned);

    if (!parsed.summary || typeof parsed.summary !== 'string') {
      console.error('[Insight Generator] Invalid response structure — missing summary');
      return null;
    }

    console.log(`[Insight Generator] Success: ${parsed.summary.slice(0, 80)}...`);

    return {
      summary: parsed.summary,
      keyThemes: Array.isArray(parsed.keyThemes) ? parsed.keyThemes.slice(0, 5) : [],
      researchGaps: Array.isArray(parsed.researchGaps) ? parsed.researchGaps.slice(0, 3) : [],
    };
  } catch (error) {
    console.error(`[Insight Generator] Failed: ${error.message}`);
    return null;
  }
}
