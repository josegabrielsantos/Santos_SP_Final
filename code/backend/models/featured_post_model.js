import mongoose from 'mongoose';

const featuredPostSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

featuredPostSchema.index({ postId: 1 }, { unique: true });
featuredPostSchema.index({ order: 1 });

const FeaturedPost = mongoose.model('FeaturedPost', featuredPostSchema);
export default FeaturedPost;
