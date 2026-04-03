import mongoose from 'mongoose';

const insightCacheSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      unique: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
    },
    keyThemes: [{ type: String }],
    researchGaps: [{ type: String }],
    stats: {
      totalPosts: Number,
      totalPapers: Number,
      recentPosts: Number,
      topOrg: String,
    },
    contextHash: { type: String },
    generatedAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true },
);

// TTL index — auto-delete when expiresAt is reached
insightCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const InsightCache = mongoose.model('InsightCache', insightCacheSchema);
export default InsightCache;
