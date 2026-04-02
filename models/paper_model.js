import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    authors: {
      type: [String],
      required: true,
    },
    abstract: {
      type: String,
      default: null,
    },
    keywords: {
      type: [String],
      default: [],
    },
    doi: {
      type: String,
      default: null,
    },
    isbn: {
      type: String,
      default: null,
    },
    publicationDate: {
      type: Date,
      default: null,
      index: true,
    },
    year: {
      type: Number,
      default: null,
      index: true,
    },
    journal: {
      type: String,
      default: null,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    sourcePostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },
    isPublished: {
      type: Boolean,
      required: true,
      default: true,
    },
    downloadCount: {
      type: Number,
      required: true,
      default: 0,
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
  },
  { timestamps: true }
);

// -- Auto-classify topics from keywords/title/abstract --

import { classifyTopics } from '../utils/topic-classifier.js';

paperSchema.pre('save', function (next) {
  // Keyword fallback — only runs when no topics are set (Gemini classification takes priority).
  if (this.topics.length === 0 && (this.isNew || this.isModified('keywords'))) {
    this.topics = classifyTopics(this.keywords, this.title, this.abstract);
  }
  next();
});

// -- Post-save ES sync hook --

import { indexPaper, deletePaper } from '../elastic/esSync.js';

paperSchema.post('save', async function (doc) {
  try {
    if (doc.isPublished) {
      await indexPaper(doc);
    } else {
      await deletePaper(doc._id.toString());
    }
  } catch (err) {
    console.error('[ES sync] paper save failed:', err.message);
  }
});

const Paper = mongoose.model('Paper', paperSchema);
export default Paper;
