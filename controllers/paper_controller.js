import Paper from '../models/paper_model.js';
import Organization from '../models/organization_model.js';
import { uploadToSpaces } from '../lib/spaces.js';
import { extractPdfMetadataWithGemini } from '../lib/util/gemini_pdf_metadata.js';
import { randomUUID } from 'crypto';

/**
 * POST /api/papers
 */
const createPaper = async (req, res) => {
  try {
    const { title, authors, abstract, keywords, doi, year, journal, fileUrl, fileSize, organizationId } = req.body;

    if (!title || !fileUrl) {
      return res.status(400).json({ error: 'Title and fileUrl are required.' });
    }

    // Verify org membership if provided
    if (organizationId) {
      const org = await Organization.findById(organizationId);
      if (!org) return res.status(404).json({ error: 'Organization not found.' });
      const uid = req.user._id.toString();
      const isMember = org.adminIds.map(String).includes(uid) || org.memberIds.map(String).includes(uid);
      if (!isMember && req.user.role !== 'website_admin') {
        return res.status(403).json({ error: 'Not a member of this organization.' });
      }
    }

    const paper = new Paper({
      title,
      authors: authors || [],
      abstract: abstract || '',
      keywords: keywords || [],
      doi: doi || null,
      year: year || null,
      journal: journal || null,
      fileUrl,
      fileSize: fileSize || null,
      uploadedBy: req.user._id,
      organizationId: organizationId || null,
    });

    await paper.save();
    res.status(201).json(paper);
  } catch (error) {
    console.log('Error in createPaper:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/papers
 * Paginated list with filtering & sorting.
 * Query params: page, limit, keyword, author, yearFrom, yearTo, sort (newest|oldest|downloads)
 */
const getPapers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { isPublished: true };
    if (req.query.keyword) {
      filter.keywords = req.query.keyword;
    }
    if (req.query.author) {
      filter.authors = { $regex: req.query.author, $options: 'i' };
    }
    if (req.query.yearFrom || req.query.yearTo) {
      filter.year = {};
      if (req.query.yearFrom) filter.year.$gte = parseInt(req.query.yearFrom);
      if (req.query.yearTo) filter.year.$lte = parseInt(req.query.yearTo);
    }
    // Filter by specific organization
    if (req.query.organizationId) {
      filter.organizationId = req.query.organizationId;
    }
    // Filter by user's organizations
    if (req.query.myOrgs === 'true' && req.user) {
      const uid = req.user._id.toString();
      const userOrgs = await Organization.find({
        $or: [
          { ownerId: req.user._id },
          { adminIds: req.user._id },
          { memberIds: req.user._id },
        ],
      }).select('_id');
      const orgIds = userOrgs.map((o) => o._id);
      filter.organizationId = { $in: orgIds };
    }

    let sortOption = { createdAt: -1 };
    if (req.query.sort === 'oldest') sortOption = { createdAt: 1 };
    else if (req.query.sort === 'downloads') sortOption = { downloadCount: -1 };

    const papers = await Paper.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar');

    const total = await Paper.countDocuments(filter);

    res.status(200).json({ papers, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.log('Error in getPapers:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/papers/:id
 */
const getPaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id)
      .populate('uploadedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar');

    if (!paper) return res.status(404).json({ error: 'Paper not found.' });
    res.status(200).json(paper);
  } catch (error) {
    console.log('Error in getPaper:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * PUT /api/papers/:id
 */
const updatePaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found.' });
    if (!paper.fileUrl) {
      return res.status(400).json({ error: 'No downloadable file is attached to this paper.' });
    }

    const isOwner = paper.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'website_admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    const { title, authors, abstract, keywords, doi, year, journal, fileUrl, fileSize, isPublished } = req.body;

    if (title !== undefined) paper.title = title;
    if (authors !== undefined) paper.authors = authors;
    if (abstract !== undefined) paper.abstract = abstract;
    if (keywords !== undefined) paper.keywords = keywords;
    if (doi !== undefined) paper.doi = doi;
    if (year !== undefined) paper.year = year;
    if (journal !== undefined) paper.journal = journal;
    if (fileUrl !== undefined) paper.fileUrl = fileUrl;
    if (fileSize !== undefined) paper.fileSize = fileSize;
    if (isPublished !== undefined) paper.isPublished = isPublished;

    await paper.save();
    res.status(200).json(paper);
  } catch (error) {
    console.log('Error in updatePaper:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * DELETE /api/papers/:id
 */
const deletePaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found.' });

    const isOwner = paper.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'website_admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    await Paper.findByIdAndDelete(paper._id);
    res.status(200).json({ message: 'Paper deleted.' });
  } catch (error) {
    console.log('Error in deletePaper:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/papers/:id/download
 * Increment download count and stream the file as an attachment
 */
const downloadPaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found.' });
    if (!paper.fileUrl) {
      return res.status(400).json({ error: 'No downloadable file is attached to this paper.' });
    }

    paper.downloadCount += 1;
    await paper.save();

    const upstream = await fetch(paper.fileUrl);
    if (!upstream.ok) {
      return res.status(502).json({ error: 'Failed to fetch paper file from storage.' });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeBaseName = (paper.title || 'paper')
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .trim()
      .slice(0, 80) || 'paper';
    const filename = `${safeBaseName}.pdf`;

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (error) {
    console.log('Error in downloadPaper:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/papers/upload
 * Upload a paper file to DigitalOcean Spaces and return the URL.
 * Expects multipart/form-data with field "file".
 */
const uploadPaperFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required.' });
    }

    const { url, size } = await uploadToSpaces(
      req.file.buffer,
      req.file.originalname,
      'papers',
      req.file.mimetype
    );

    res.status(200).json({ fileUrl: url, fileSize: size });
  } catch (error) {
    console.log('Error in uploadPaperFile:', error.message);
    res.status(500).json({ error: 'File upload failed.' });
  }
};

/**
 * POST /api/papers/parse-pdf
 * Download a PDF from the given URL, extract metadata, and return it.
 * Body: { fileUrl: string }
 */
const parsePdf = async (req, res) => {
  const requestId = randomUUID();
  const debugMode = process.env.NODE_ENV !== 'production';

  try {
    console.log(`[parsePdf][${requestId}] START`);
    const { fileUrl } = req.body;
    if (!fileUrl) {
      console.log(`[parsePdf][${requestId}] Missing fileUrl in request body`);
      return res.status(400).json({ error: 'fileUrl is required.', requestId });
    }

    console.log(`[parsePdf][${requestId}] Downloading PDF from URL: ${fileUrl}`);

    // Download the PDF from storage
    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.log(`[parsePdf][${requestId}] Download failed: status=${response.status} statusText=${response.statusText}`);
      return res.status(400).json({
        error: 'Could not download PDF file.',
        requestId,
        ...(debugMode
          ? {
              debug: {
                stage: 'download',
                status: response.status,
                statusText: response.statusText,
                url: fileUrl,
              },
            }
          : {}),
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(
      `[parsePdf][${requestId}] Downloaded bytes=${buffer.length} contentType=${response.headers.get('content-type') || 'unknown'}`
    );

    // Gemini-only extraction pipeline from the uploaded PDF bytes.
    const geminiResult = await extractPdfMetadataWithGemini(buffer);
    const ai = geminiResult.metadata;
    console.log(
      `[parsePdf][${requestId}] Gemini result modelUsed=${geminiResult.modelUsed || 'none'} hasMetadata=${Boolean(ai)}`
    );

    if (!ai) {
      console.log(`[parsePdf][${requestId}] AI extraction failed: ${geminiResult.error || 'unknown error'}`);
      return res.status(422).json({
        error: geminiResult.error || 'AI could not extract metadata from this PDF.',
        requestId,
        ai: {
          enabled: Boolean(process.env.GEMINI_API_KEY),
          modelUsed: geminiResult.modelUsed,
        },
        ...(debugMode
          ? {
              debug: {
                stage: 'gemini_extraction',
                fileUrl,
                responseStatus: response.status,
                contentType: response.headers.get('content-type') || null,
                bufferBytes: buffer.length,
                gemini: geminiResult.debug || null,
              },
            }
          : {}),
      });
    }

    console.log(
      `[parsePdf][${requestId}] SUCCESS title=${ai.title || 'null'} authors=${ai.authors?.length || 0} keywords=${ai.keywords?.length || 0}`
    );
    return res.status(200).json({
      title: ai.title,
      authors: ai.authors,
      abstract: ai.abstract,
      keywords: ai.keywords,
      year: ai.year,
      journal: ai.journal,
      doi: ai.doi,
      ai: {
        enabled: Boolean(process.env.GEMINI_API_KEY),
        modelUsed: geminiResult.modelUsed,
      },
      requestId,
      ...(debugMode
        ? {
            debug: {
              stage: 'completed',
              gemini: geminiResult.debug || null,
            },
          }
        : {}),
    });
  } catch (error) {
    console.log(`[parsePdf][${requestId}] UNHANDLED ERROR:`, error.message);
    if (error.stack) {
      console.log(`[parsePdf][${requestId}] STACK:`, error.stack);
    }
    res.status(500).json({
      error: 'Failed to parse PDF.',
      requestId,
      ...(debugMode
        ? {
            debug: {
              stage: 'catch',
              name: error.name || 'Error',
              message: error.message || String(error),
              stack: error.stack || null,
            },
          }
        : {}),
    });
  }
};

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 1) return { headers: [], rows: [] };

  function parseRow(line) {
    const fields = [];
    let i = 0;
    while (i <= line.length) {
      if (i === line.length) { fields.push(''); break; }
      if (line[i] === '"') {
        i++;
        let val = '';
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i++]; }
        }
        fields.push(val);
        if (line[i] === ',') i++;
      } else {
        let val = '';
        while (i < line.length && line[i] !== ',') val += line[i++];
        fields.push(val.trim());
        if (line[i] === ',') i++;
      }
    }
    return fields;
  }

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseRow(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });
    rows.push(obj);
  }
  return { headers, rows };
}

const bulkImportCsv = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required.' });

    const text = req.file.buffer.toString('utf-8');
    const { headers, rows } = parseCsv(text);

    if (!headers.includes('title')) {
      return res.status(400).json({ error: 'CSV must include a "title" column.' });
    }

    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required for bulk CSV import.' });
    }

    const org = await Organization.findById(organizationId);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });
    const uid = req.user._id.toString();
    const isOrgAdmin =
      org.ownerId.toString() === uid ||
      org.adminIds.map(String).includes(uid);
    if (!isOrgAdmin && req.user.role !== 'website_admin') {
      return res.status(403).json({ error: 'Only organization admins can bulk import papers.' });
    }

    let created = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const title = row.title?.trim();
      if (!title) {
        errors.push({ row: rowNum, reason: 'Title is required.' });
        continue;
      }
      const authors = row.authors
        ? row.authors.split(';').map((a) => a.trim()).filter(Boolean)
        : [];
      const keywords = row.keywords
        ? row.keywords.split(';').map((k) => k.trim()).filter(Boolean)
        : [];
      const yearRaw = row.year ? parseInt(row.year.trim(), 10) : null;
      const year = yearRaw && !isNaN(yearRaw) ? yearRaw : null;

      try {
        const paper = new Paper({
          title,
          authors,
          abstract: row.abstract?.trim() || null,
          keywords,
          doi: row.doi?.trim() || null,
          isbn: row.isbn?.trim() || null,
          year,
          journal: row.journal?.trim() || null,
          uploadedBy: req.user._id,
          organizationId: organizationId || null,
          fileUrl: null,
          isPublished: true,
        });
        await paper.save();
        created++;
      } catch (err) {
        errors.push({ row: rowNum, reason: err.message });
      }
    }

    res.status(200).json({ created, skipped: errors.length, errors });
  } catch (error) {
    console.log('Error in bulkImportCsv:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

const enrichDoi = async (req, res) => {
  try {
    const { doi } = req.body;
    if (!doi?.trim()) return res.status(400).json({ error: 'DOI is required.' });

    const cleanDoi = doi.trim().replace(/^https?:\/\/doi\.org\//i, '');
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      headers: { 'User-Agent': 'UPLB-KAIN/1.0 (mailto:admin@uplb.edu.ph)' },
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'DOI not found in CrossRef.' });
    }

    const json = await response.json();
    const work = json.message;

    const title = work.title?.[0] ?? null;
    const authors = (work.author ?? []).map((a) =>
      [a.given, a.family].filter(Boolean).join(' ')
    );
    const abstract = work.abstract
      ? work.abstract.replace(/<[^>]+>/g, '').trim()
      : null;
    const year = work.published?.['date-parts']?.[0]?.[0] ?? null;
    const journal = work['container-title']?.[0] ?? null;
    const keywords = (work.subject ?? []).slice(0, 10);

    res.status(200).json({ title, authors, abstract, year, journal, keywords, doi: cleanDoi });
  } catch (error) {
    console.log('Error in enrichDoi:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export {
  createPaper,
  getPapers,
  getPaper,
  updatePaper,
  deletePaper,
  downloadPaper,
  uploadPaperFile,
  parsePdf,
  enrichDoi,
  bulkImportCsv,
};
