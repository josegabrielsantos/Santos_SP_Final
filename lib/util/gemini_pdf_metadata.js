import { GoogleGenerativeAI } from '@google/generative-ai';

const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODELS = ['gemini-2.0-flash'];
const MODEL_CHAIN = [PRIMARY_MODEL, ...FALLBACK_MODELS];

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

const PROMPT_PREFIX = `You are extracting academic paper metadata from a research paper PDF.\n\nReturn ONLY valid JSON (no markdown, no explanation) with this exact shape:\n{\n  "title": string | null,\n  "authors": string[],\n  "abstract": string | null,\n  "keywords": string[],\n  "journal": string | null,\n  "doi": string | null,\n  "year": number | null,\n  "topics": string[]\n}\n\nRules:\n- Extract only what can be reasonably inferred from the PDF.\n- If uncertain, use null (or empty array for arrays).\n- Keep keywords concise; max 12 items.\n- Keep abstract concise and faithful to source text.\n- For "topics", classify the paper into 1-3 of these research topics based on the title, abstract, and keywords: "food-security", "nutrition-health", "food-science-technology", "agricultural-systems", "policy-governance", "indigenous-traditional-knowledge", "education-communication", "environment-sustainability". Pick only the most relevant topics. If none fit, return an empty array.\n`;

function sanitizeError(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    stack: error.stack || null,
  };
}

function cleanJsonText(raw) {
  if (!raw) return '';
  const text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : text;
}

function normalizeMetadata(input) {
  if (!input || typeof input !== 'object') return null;

  const title = typeof input.title === 'string' ? input.title.trim() : null;
  const abstract = typeof input.abstract === 'string' ? input.abstract.trim() : null;
  const journal = typeof input.journal === 'string' ? input.journal.trim() : null;
  const doi = typeof input.doi === 'string' ? input.doi.trim() : null;

  const authors = Array.isArray(input.authors)
    ? input.authors.map((a) => String(a).trim()).filter(Boolean).slice(0, 20)
    : [];

  const keywords = Array.isArray(input.keywords)
    ? input.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 12)
    : [];

  const topics = Array.isArray(input.topics)
    ? input.topics.map((t) => String(t).trim().toLowerCase()).filter((t) => VALID_TOPICS.includes(t))
    : [];

  const parsedYear = Number(input.year);
  const year = Number.isInteger(parsedYear) && parsedYear >= 1800 && parsedYear <= 2200
    ? parsedYear
    : null;

  return {
    title: title || null,
    authors,
    abstract: abstract || null,
    keywords,
    topics,
    journal: journal || null,
    doi: doi || null,
    year,
  };
}

export async function extractPdfMetadataWithGemini(pdfBuffer) {
  const debug = {
    stage: 'init',
    bufferBytes: 0,
    modelChain: MODEL_CHAIN,
    attempts: [],
    finalError: null,
  };

  const apiKey = process.env.GEMINI_API_KEY;
  const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer || []);
  debug.bufferBytes = buffer.length;

  if (!apiKey || !buffer.length) {
    debug.stage = 'precheck_failed';
    debug.finalError = !apiKey
      ? 'GEMINI_API_KEY is not configured.'
      : 'PDF buffer is empty.';
    return { metadata: null, modelUsed: null, error: debug.finalError, debug };
  }

  // Keep payload safe for inline transfer size.
  const maxInlineBytes = 20 * 1024 * 1024;
  if (buffer.length > maxInlineBytes) {
    debug.stage = 'precheck_failed';
    debug.finalError = 'PDF exceeds inline payload limit (20MB).';
    return {
      metadata: null,
      modelUsed: null,
      error: 'PDF is too large for inline AI extraction. Please upload a smaller file (<= 20MB).',
      debug,
    };
  }

  debug.stage = 'requesting_model';
  const client = new GoogleGenerativeAI(apiKey);
  const pdfBase64 = buffer.toString('base64');

  let lastError = null;

  for (const modelName of MODEL_CHAIN) {
    const attempt = {
      model: modelName,
      status: 'started',
      rawTextPreview: null,
      cleanedPreview: null,
      error: null,
    };
    debug.attempts.push(attempt);

    try {
      console.log(`[Gemini][parse-pdf] Attempting model: ${modelName}`);
      const model = client.getGenerativeModel({ model: modelName });
      const response = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: PROMPT_PREFIX },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
      });
      const raw = response?.response?.text?.() || '';
      const cleaned = cleanJsonText(raw);
      attempt.rawTextPreview = raw.slice(0, 1000);
      attempt.cleanedPreview = cleaned.slice(0, 1000);
      const parsed = JSON.parse(cleaned);
      const normalized = normalizeMetadata(parsed);

      if (normalized) {
        attempt.status = 'success';
        debug.stage = 'completed';
        console.log(`[Gemini][parse-pdf] Model succeeded: ${modelName}`);
        return { metadata: normalized, modelUsed: modelName, error: null, debug };
      }

      lastError = new Error('Gemini returned invalid metadata payload.');
      attempt.status = 'invalid_payload';
      attempt.error = sanitizeError(lastError);
      console.log(`[Gemini][parse-pdf] Invalid payload from model: ${modelName}`);
    } catch (error) {
      lastError = error;
      attempt.status = 'failed';
      attempt.error = sanitizeError(error);
      console.log(`[Gemini][parse-pdf] Model failed: ${modelName} -> ${attempt.error?.message}`);
    }
  }

  debug.stage = 'failed';
  debug.finalError = sanitizeError(lastError);
  return {
    metadata: null,
    modelUsed: null,
    error: lastError ? String(lastError.message || lastError) : 'Gemini metadata extraction failed.',
    debug,
  };
}
