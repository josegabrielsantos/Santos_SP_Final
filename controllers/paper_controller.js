import Paper from '../models/paper_model.js';
import Post from '../models/post_model.js';
import Organization from '../models/organization_model.js';
import Notification from '../models/notification_model.js';
import User from '../models/user_model.js';
import UserActivity from '../models/user_activity_model.js';
import { uploadToSpaces, deleteFromSpaces, keyFromUrl } from '../lib/spaces.js';
import { deletePaper as esDeletePaper } from '../elastic/esSync.js';
import { extractPdfMetadataWithGemini } from '../lib/util/gemini_pdf_metadata.js';
import { enqueue } from '../lib/bulk-upload-queue.js';
import { getIO, emitNotification } from '../socket.js';
import esClient from '../elastic/elastic_client.js';
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
    // Filter by topic
    if (req.query.topic) {
      filter.topics = req.query.topic;
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

    // Remove from Elasticsearch
    await esDeletePaper(paper._id.toString());

    // Delete S3 file — best-effort
    if (paper.fileUrl) {
      const key = keyFromUrl(paper.fileUrl);
      if (key) await deleteFromSpaces(key).catch(() => {});
    }

    // Clean up savedPapers references in users
    await User.updateMany(
      { savedPapers: paper._id },
      { $pull: { savedPapers: paper._id } },
    );

    // Clean up user activities for this paper
    await UserActivity.deleteMany({ targetId: paper._id });

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
      `[parsePdf][${requestId}] SUCCESS title=${ai.title || 'null'} authors=${ai.authors?.length || 0} keywords=${ai.keywords?.length || 0} topics=${ai.topics?.length || 0}`
    );
    return res.status(200).json({
      title: ai.title,
      authors: ai.authors,
      abstract: ai.abstract,
      keywords: ai.keywords,
      topics: ai.topics || [],
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

/**
 * POST /api/papers/bulk-pdf
 * Accept multiple PDF files, validate, upload to Spaces immediately, then return
 * a jobId. AI metadata extraction + paper creation runs in the background via a
 * concurrency-limited queue. Socket events keep the client updated:
 *   - bulk-upload:progress  { jobId, current, total, fileName, status, paperTitle? }
 *   - bulk-upload:complete  { jobId, created, skipped, errors[], papers[] }
 *
 * Expects multipart/form-data with field "files" (multiple) and "organizationId".
 */
const bulkImportPdfs = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one PDF file is required.' });
    }

    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required for bulk PDF import.' });
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

    const jobId = randomUUID();
    const userId = req.user._id;
    const total = files.length;

    // ── Phase 1 (sync): Upload all files to Spaces ──
    // This is fast (just S3 PutObject) so we do it before returning.
    const uploadedFiles = [];
    for (const file of files) {
      const fileName = file.originalname || `paper_${uploadedFiles.length + 1}.pdf`;
      try {
        const { url: fileUrl, size: fileSize } = await uploadToSpaces(
          file.buffer,
          fileName,
          'papers',
          file.mimetype || 'application/pdf'
        );
        uploadedFiles.push({ fileName, fileUrl, fileSize, buffer: file.buffer });
      } catch (err) {
        console.log(`[bulkImportPdfs][${jobId}] Upload failed for ${fileName}:`, err.message);
        uploadedFiles.push({ fileName, fileUrl: null, fileSize: 0, buffer: null, uploadError: err.message });
      }
    }

    // Return immediately — client tracks progress via socket
    res.status(202).json({
      jobId,
      total,
      message: `${total} file${total !== 1 ? 's' : ''} accepted. Processing in background.`,
    });

    // ── Phase 2 (async): AI extraction + paper creation via queue ──
    const emitProgress = (data) => {
      try {
        const io = getIO();
        io.to(`user:${userId}`).emit('bulk-upload:progress', { jobId, ...data });
      } catch { /* socket may not be available in tests */ }
    };

    (async () => {
      let created = 0;
      const errors = [];
      const createdPapers = [];
      const orgName = org.name;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const uf = uploadedFiles[i];

        // Skip files that failed to upload
        if (!uf.fileUrl) {
          errors.push({ file: uf.fileName, reason: uf.uploadError || 'Upload failed' });
          emitProgress({
            current: i + 1,
            total,
            fileName: uf.fileName,
            status: 'error',
            error: uf.uploadError || 'Upload failed',
          });
          continue;
        }

        // Notify client we're starting this file
        emitProgress({
          current: i + 1,
          total,
          fileName: uf.fileName,
          status: 'processing',
        });

        try {
          // Enqueue the Gemini call through the concurrency limiter
          const geminiResult = await enqueue(() => extractPdfMetadataWithGemini(uf.buffer));
          const ai = geminiResult.metadata;

          const paper = new Paper({
            title: ai?.title || uf.fileName.replace(/\.pdf$/i, ''),
            authors: ai?.authors || [],
            abstract: ai?.abstract || null,
            keywords: ai?.keywords || [],
            topics: ai?.topics || [],
            doi: ai?.doi || null,
            year: ai?.year || null,
            journal: ai?.journal || null,
            fileUrl: uf.fileUrl,
            fileSize: uf.fileSize,
            uploadedBy: userId,
            organizationId,
            isPublished: true,
          });

          await paper.save();
          created++;
          createdPapers.push(paper);

          emitProgress({
            current: i + 1,
            total,
            fileName: uf.fileName,
            status: 'done',
            paperTitle: paper.title,
          });
        } catch (err) {
          console.log(`[bulkImportPdfs][${jobId}] Error processing ${uf.fileName}:`, err.message);
          errors.push({ file: uf.fileName, reason: err.message });
          emitProgress({
            current: i + 1,
            total,
            fileName: uf.fileName,
            status: 'error',
            error: err.message,
          });
        }
      }

      // ── Phase 3: Auto-generate announcement post ──
      if (created > 0) {
        try {
          const paperTitles = createdPapers.map((p) => p.title);
          const paperIds = createdPapers.map((p) => p._id);
          const allTopics = [...new Set(createdPapers.flatMap((p) => p.topics || []))];

          const bodyContent = [
            {
              type: 'paragraph',
              content: [{
                type: 'text',
                marks: [{ type: 'bold' }],
                text: `${created} new research paper${created !== 1 ? 's have' : ' has'} been added to ${orgName}!`,
              }],
            },
            { type: 'paragraph' },
            {
              type: 'paragraph',
              content: [{
                type: 'text',
                marks: [{ type: 'bold' }],
                text: 'Newly added papers:',
              }],
            },
            {
              type: 'bulletList',
              content: paperTitles.map((title) => ({
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: title }] }],
              })),
            },
            { type: 'paragraph' },
            {
              type: 'paragraph',
              content: [{
                type: 'text',
                text: 'Browse the Papers tab to explore, download, and cite these works. Happy reading!',
              }],
            },
          ];

          const plainText =
            `${created} new research paper${created !== 1 ? 's have' : ' has'} been added to ${orgName}!\n\n` +
            `Newly added papers:\n${paperTitles.map((t) => `• ${t}`).join('\n')}\n\n` +
            'Browse the Papers tab to explore, download, and cite these works. Happy reading!';

          const post = new Post({
            title: `📚 ${created} New Paper${created !== 1 ? 's' : ''} Added to ${orgName}`,
            body: { type: 'doc', content: bodyContent },
            bodyText: plainText,
            tags: ['bulk-upload', 'new-papers'],
            topics: allTopics,
            authorId: userId,
            organizationId,
            type: 'update',
            status: 'published',
            mediaUrls: [],
            paperIds,
            publishedAt: new Date(),
          });

          await post.save();
          await Organization.findByIdAndUpdate(organizationId, { $inc: { postCount: 1 } });
        } catch (postErr) {
          console.log(`[bulkImportPdfs][${jobId}] Failed to create announcement post:`, postErr.message);
        }
      }

      // ── Phase 4: Emit completion + create notification ──
      const completionData = {
        jobId,
        created,
        skipped: errors.length,
        errors,
        papers: createdPapers.map((p) => ({ _id: p._id, title: p.title })),
        orgName: org.name,
        organizationId,
      };

      try {
        const io = getIO();
        io.to(`user:${userId}`).emit('bulk-upload:complete', completionData);
      } catch { /* ignore */ }

      // Persist a notification so the admin sees it even if they were offline
      try {
        await Notification.create({
          recipientId: userId,
          senderId: userId,
          type: 'bulk_upload_complete',
          organizationId,
          message: `Bulk upload complete: ${created} paper${created !== 1 ? 's' : ''} added to ${org.name}${errors.length > 0 ? ` (${errors.length} failed)` : ''}.`,
        });
        await emitNotification(userId.toString());
      } catch (notifErr) {
        console.log(`[bulkImportPdfs][${jobId}] Notification error:`, notifErr.message);
      }

      console.log(`[bulkImportPdfs][${jobId}] DONE created=${created} errors=${errors.length}`);
    })();
  } catch (error) {
    console.log('Error in bulkImportPdfs:', error.message);
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

/**
 * GET /api/papers/related?postId=xxx&limit=5
 * Returns papers from Elasticsearch that match the post's topics and keywords.
 */
const getRelatedPapers = async (req, res) => {
  try {
    const { postId, limit: limitParam } = req.query;
    if (!postId) return res.status(400).json({ error: 'postId is required.' });

    const limit = Math.min(parseInt(limitParam) || 5, 10);

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const topics = post.topics || [];
    const tags = post.tags || [];

    // Build keyword text from tags + paperMetadata research title
    const metaKeywords = [];
    if (post.paperMetadata?.researchTitle) {
      metaKeywords.push(post.paperMetadata.researchTitle);
    }
    const keywordText = [...tags, ...metaKeywords].filter(Boolean).join(' ');

    // If no topics and no keyword text, we have nothing to match on
    if (topics.length === 0 && !keywordText.trim()) {
      return res.status(200).json({ papers: [] });
    }

    // IDs to exclude: already-attached papers + the paper created by this post
    const excludeIds = (post.paperIds || []).map((id) => id.toString());

    // Build Elasticsearch bool query
    const must = [];
    const should = [];
    const mustNot = [];

    // Must match at least one topic (if topics exist)
    if (topics.length > 0) {
      must.push({ terms: { topics } });
    }

    // Boost keyword/tag matches
    if (keywordText.trim()) {
      should.push({ match: { keywords: { query: keywordText, boost: 2 } } });
      should.push({ match: { title: { query: keywordText, boost: 1.5 } } });
      should.push({ match: { abstract: { query: keywordText, boost: 1 } } });
    }

    // Also boost by post title
    if (post.title) {
      should.push({ match: { title: { query: post.title, boost: 1.5 } } });
      should.push({ match: { abstract: { query: post.title, boost: 0.5 } } });
    }

    // Exclude already-attached papers
    if (excludeIds.length > 0) {
      mustNot.push({ ids: { values: excludeIds } });
    }

    // Exclude the paper created BY this post
    mustNot.push({ term: { sourcePostId: postId } });

    // If no must clauses (no topics), use should as must with minimum_should_match
    const query = { bool: {} };
    if (must.length > 0) {
      query.bool.must = must;
    }
    if (should.length > 0) {
      query.bool.should = should;
      if (must.length === 0) {
        query.bool.minimum_should_match = 1;
      }
    }
    if (mustNot.length > 0) {
      query.bool.must_not = mustNot;
    }

    const esResult = await esClient.search({
      index: 'kms_papers',
      body: { query, size: limit },
    });

    const hits = esResult.hits?.hits || [];

    // Fetch full paper documents from MongoDB for the matched IDs
    const paperIds = hits.map((h) => h._id);
    if (paperIds.length === 0) {
      return res.status(200).json({ papers: [] });
    }

    // Build a map of ES scores and matched topics per paper
    const postTopics = topics;
    const esMetaMap = new Map(
      hits.map((h) => [
        h._id,
        {
          relevanceScore: h._score,
          matchedTopics: (h._source?.topics || []).filter((t) => postTopics.includes(t)),
        },
      ]),
    );

    const papers = await Paper.find({ _id: { $in: paperIds }, isPublished: true })
      .populate('uploadedBy', 'displayName avatar')
      .populate('organizationId', 'name slug avatar');

    // Sort papers by ES relevance score order and enrich with ES metadata
    const idOrder = new Map(paperIds.map((id, i) => [id, i]));
    papers.sort((a, b) => (idOrder.get(a._id.toString()) ?? 0) - (idOrder.get(b._id.toString()) ?? 0));

    const enrichedPapers = papers.map((paper) => {
      const obj = paper.toObject();
      const esMeta = esMetaMap.get(paper._id.toString()) || {};
      obj.relevanceScore = esMeta.relevanceScore ?? null;
      obj.matchedTopics = esMeta.matchedTopics ?? [];
      return obj;
    });

    res.status(200).json({ papers: enrichedPapers });
  } catch (error) {
    console.log('Error in getRelatedPapers:', error.message);
    res.status(200).json({ papers: [] });
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
  bulkImportPdfs,
  getRelatedPapers,
};
