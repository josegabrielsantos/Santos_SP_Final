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
      maxlength: 2000,
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
  },
  { timestamps: true }
);

// Compound index for comment thread queries
commentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
