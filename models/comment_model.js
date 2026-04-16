import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    body: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    replyToUser: {
      type: String,
      default: null,
    },
    likedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    dislikedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    likeCount: {
      type: Number,
      required: true,
      default: 0,
    },
    isHidden: {
      type: Boolean,
      required: true,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for comment thread queries (supports cursor-based pagination)
commentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });
// Cursor pagination: fetch next page of top-level comments by createdAt
commentSchema.index({ postId: 1, createdAt: -1 });
// Index for sorting comments by likes (most liked first, oldest tiebreaker)
commentSchema.index({ postId: 1, parentId: 1, likeCount: -1, createdAt: 1 });

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
