import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are an academic research analyst for a food and nutrition security knowledge platform (UPLB FaNS Knowledge Hub).
Your job is to synthesize platform data into a brief, insightful summary that helps researchers understand both what a specific post is about and the broader research landscape around it.

RULES:
- Only reference data provided in the context below. Never invent statistics, papers, or claims.
- Write in a scholarly but accessible tone (think: journal editorial, not chatbot).
- The summary must begin by stating what the post itself actually says (its content and argument), in 1-2 sentences.
- If the post has an ATTACHED RESEARCH PAPER section, the opening sentences must also situate the post relative to that paper — e.g., whether the post discusses, extends, critiques, or applies the paper's findings — grounded in the paper's title, authors, and abstract.
- After the post-content opening, add 1-2 sentences that place the post within the platform's research landscape (quantitative facts about related posts/papers, recurring themes, active organizations).
- Total summary length: 3-5 sentences. Flowing prose, no bullet points.
- Identify 2-3 key themes discussed across the related content.
- If you can identify a research gap (a topic mentioned in posts but not covered by any paper, or vice versa), mention it.
- Do not start with "This post discusses..." — lead with the substantive content.`;

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

  // Truncate post body to keep prompt bounded — 2000 chars is plenty for a summary.
  const bodyExcerpt = (postContext.bodyText || '').trim().slice(0, 2000);

  const pm = postContext.paperMetadata;
  const hasAttachedPaper =
    pm && (pm.researchTitle || pm.abstract || (pm.authors && pm.authors.length > 0));

  const attachedPaperBlock = hasAttachedPaper
    ? `
ATTACHED RESEARCH PAPER (the post is about this paper):
- Title: "${pm.researchTitle || 'Untitled'}"
- Authors: ${pm.authors?.join(', ') || 'Unknown'}
- Year: ${pm.datePublished ? new Date(pm.datePublished).getFullYear() : 'N/A'}
- Journal: ${pm.journal || 'N/A'}
- DOI: ${pm.doi || 'N/A'}
- Abstract: ${pm.abstract || '(no abstract provided)'}
`
    : '';

  return `CURRENT POST:
- Title: "${postContext.title}"
- Topics: ${(postContext.topics || []).join(', ') || 'none'}
- Tags: ${(postContext.tags || []).join(', ') || 'none'}
- Body: ${bodyExcerpt || '(empty)'}
${attachedPaperBlock}
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
  "summary": "A 3-5 sentence analytical paragraph. It MUST open by summarizing what this specific post says (from Title + Body). If an ATTACHED RESEARCH PAPER section is present, the opening must also relate the post to that paper — e.g., whether the post discusses, extends, critiques, or applies the paper's findings — using the paper's title, authors, and abstract. Then add 1-2 sentences placing the post within the platform's research landscape (quantitative facts, recurring themes). Flowing prose, no bullets.",
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
