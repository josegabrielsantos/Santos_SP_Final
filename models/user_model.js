import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    expertise: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    role: {
      type: String,
      enum: ['user', 'website_admin'],
      required: true,
      default: 'user',
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    savedPapers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paper',
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;