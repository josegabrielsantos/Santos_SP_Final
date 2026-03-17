import mongoose from 'mongoose';
import slugify from 'slugify';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: 1000,
      default: null,
    },
    bannerImage: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adminIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: {
        validator: (v) => v.length >= 1,
        message: 'At least one admin is required.',
      },
    },
    memberIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    pendingMemberIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    followerIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    welcomeMessage: {
      type: String,
      maxlength: 500,
      default: null,
    },
    pinnedPostIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
      default: [],
      validate: {
        validator: (v) => v.length <= 3,
        message: 'Cannot pin more than 3 posts.',
      },
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    postCount: {
      type: Number,
      required: true,
      default: 0,
    },
    memberCount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name before saving
organizationSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  } 
  // Keep memberCount in sync with memberIds array
  this.memberCount = this.memberIds.length;
  next();
});

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
