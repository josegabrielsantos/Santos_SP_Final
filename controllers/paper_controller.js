import Paper from '../models/paper_model.js';
import Organization from '../models/organization_model.js';
import { v2 as cloudinary } from 'cloudinary';

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

    const papers = await Paper.find(filter)
      .sort({ createdAt: -1 })
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
 * Increment download count and return the fileUrl
 */
const downloadPaper = async (req, res) => {
  try {
    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    if (!paper) return res.status(404).json({ error: 'Paper not found.' });
    res.status(200).json({ fileUrl: paper.fileUrl, downloadCount: paper.downloadCount });
  } catch (error) {
    console.log('Error in downloadPaper:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/papers/upload
 * Upload a paper file to Cloudinary and return the URL
 */
const uploadPaperFile = async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) return res.status(400).json({ error: 'File is required.' });

    const uploadResponse = await cloudinary.uploader.upload(file, {
      folder: 'kms/papers',
      resource_type: 'raw',
    });

    res.status(200).json({
      fileUrl: uploadResponse.secure_url,
      fileSize: uploadResponse.bytes,
    });
  } catch (error) {
    console.log('Error in uploadPaperFile:', error.message);
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
};
