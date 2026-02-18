// import mongoose from 'mongoose';

// const postSchema = new mongoose.Schema({
//     title: {
//         type: String,
//         required: true,
//         trim: true,
//         maxLength: 200
//     },
    
//     content: {
//         type: String,
//         required: true,
//         trim: true,
//         maxLength: 10000
//     },
    
//     // Post type/category
//     category: {
//         type: String,
//         enum: ['announcement', 'research', 'discussion', 'news', 'event', 'question', 'other'],
//         default: 'other'
//     },
    
//     // Tags for categorization
//     tags: [{
//         type: String,
//         trim: true,
//         lowercase: true
//     }],
    
//     // Author (user who created the post)
//     author: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
    
//     // Organization where post is published
//     organization: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Organization',
//         required: true
//     },
    
//     // Post visibility
//     isPublic: {
//         type: Boolean,
//         default: true
//     },
    
//     // Post status for approval workflow
//     status: {
//         type: String,
//         enum: ['draft', 'pending', 'approved', 'rejected', 'archived'],
//         default: 'pending'
//     },
    
//     // Likes
//     likes: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//     }],
    
//     // Comments
//     comments: [{
//         author: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'User',
//             required: true
//         },
//         content: {
//             type: String,
//             required: true,
//             trim: true,
//             maxLength: 1000
//         },
//         createdAt: {
//             type: Date,
//             default: Date.now
//         },
//         likes: [{
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'User'
//         }],
//         replies: [{
//             author: {
//                 type: mongoose.Schema.Types.ObjectId,
//                 ref: 'User',
//                 required: true
//             },
//             content: {
//                 type: String,
//                 required: true,
//                 trim: true,
//                 maxLength: 500
//             },
//             createdAt: {
//                 type: Date,
//                 default: Date.now
//             }
//         }]
//     }],
    
//     // Images/attachments
//     images: [{
//         url: String,
//         caption: String,
//         uploadedAt: {
//             type: Date,
//             default: Date.now
//         }
//     }],
    
//     // Link preview (if post contains links)
//     linkPreview: {
//         url: String,
//         title: String,
//         description: String,
//         image: String
//     },
    
//     // Priority/pinned status
//     isPinned: {
//         type: Boolean,
//         default: false
//     },
    
//     // View count
//     viewCount: {
//         type: Number,
//         default: 0
//     },
    
//     // Scheduled publishing
//     scheduledAt: {
//         type: Date
//     },
    
//     // Admin who approved/rejected the post
//     reviewedBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//     },
    
//     reviewedAt: {
//         type: Date
//     },
    
//     rejectionReason: {
//         type: String,
//         trim: true
//     }
// }, {
//     timestamps: true
// });

// // Indexes for better query performance
// postSchema.index({ organization: 1, createdAt: -1 });
// postSchema.index({ author: 1, createdAt: -1 });
// postSchema.index({ status: 1 });
// postSchema.index({ category: 1 });
// postSchema.index({ tags: 1 });
// postSchema.index({ title: 'text', content: 'text', tags: 'text' });
// postSchema.index({ likes: 1 });
// postSchema.index({ isPinned: 1, createdAt: -1 });

// // Virtual for like count
// postSchema.virtual('likeCount').get(function() {
//     return this.likes.length;
// });

// // Virtual for comment count
// postSchema.virtual('commentCount').get(function() {
//     return this.comments.length;
// });

// // Virtual for total engagement (likes + comments)
// postSchema.virtual('engagementCount').get(function() {
//     return this.likes.length + this.comments.length;
// });

// // Method to check if user liked the post
// postSchema.methods.isLikedBy = function(userId) {
//     return this.likes.includes(userId);
// };

// // Method to get excerpt
// postSchema.methods.getExcerpt = function(length = 150) {
//     return this.content.length > length 
//         ? this.content.substring(0, length) + '...'
//         : this.content;
// };

// // Static method to find posts by organization with filters
// postSchema.statics.findByOrganization = function(organizationId, filters = {}) {
//     let query = { organization: organizationId };
    
//     if (filters.status) query.status = filters.status;
//     if (filters.category) query.category = filters.category;
//     if (filters.author) query.author = filters.author;
//     if (filters.tags) query.tags = { $in: filters.tags };
//     if (filters.isPublic !== undefined) query.isPublic = filters.isPublic;
    
//     return this.find(query)
//         .populate('author', 'firstName lastName profilePicture')
//         .populate('organization', 'organizationName profilePicture')
//         .sort({ isPinned: -1, createdAt: -1 });
// };

// // Static method for trending posts (high engagement recently)
// postSchema.statics.findTrending = function(timeframe = 7) {
//     const daysAgo = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
    
//     return this.aggregate([
//         {
//             $match: {
//                 createdAt: { $gte: daysAgo },
//                 status: 'approved',
//                 isPublic: true
//             }
//         },
//         {
//             $addFields: {
//                 engagementScore: {
//                     $add: [
//                         { $size: '$likes' },
//                         { $multiply: [{ $size: '$comments' }, 2] }, // Comments weight more
//                         '$viewCount'
//                     ]
//                 }
//             }
//         },
//         {
//             $sort: { engagementScore: -1 }
//         },
//         {
//             $limit: 20
//         }
//     ]);
// };

// // Pre-save middleware to handle status changes
// postSchema.pre('save', function(next) {
//     if (this.isModified('status')) {
//         if (this.status === 'approved' || this.status === 'rejected') {
//             this.reviewedAt = new Date();
//         }
//     }
//     next();
// });

// // Pre-save middleware to update organization post count (you'd implement this)
// postSchema.post('save', async function(doc) {
//     if (doc.isNew && doc.status === 'approved') {
//         // Update organization post count
//         await mongoose.model('Organization').findByIdAndUpdate(
//             doc.organization,
//             { $inc: { 'statistics.totalPosts': 1 } }
//         );
//     }
// });

// const Post = mongoose.model('Post', postSchema);

// export default Post;

import mongoose, { Schema } from "mongoose";


const pollOptionSchema = new mongoose.Schema({
  optionText: {
    type: String,
    required: true,
    maxlength: 200
  },
  votes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  voteCount: {
    type: Number,
    default: 0
  }
}, { _id: true });

const commentSchema = new mongoose.Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  likeCount: {
    type: Number,
    default: 0
  },
  dislikeCount: {
    type: Number,
    default: 0
  },
  replies: [{
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    dislikes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    likeCount: {
      type: Number,
      default: 0
    },
    dislikeCount: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isEdited: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  topic: {
    type: String,
    required: true,
  },
  
  // Body content with different content types
  body: {
    text: {
      type: String,
      trim: true,
      maxlength: 50000
    },
    
    photos: [{
      url: {
        type: String,
        required: true
      },
      caption: {
        type: String,
        maxlength: 500
      },
      publicId: String, // For cloud storage reference (e.g., Cloudinary)
      order: Number
    }],
    
    videos: [{
      url: {
        type: String,
        required: true
      },
      thumbnail: String,
      caption: {
        type: String,
        maxlength: 500
      },
      publicId: String,
      duration: Number, // in seconds
      order: Number
    }],
    
    links: [{
      url: {
        type: String,
        required: true
      },
      title: String,
      description: String,
      thumbnail: String,
      order: Number
    }],
    
    dataSnapshots: [{
      type: {
        type: String,
        enum: ['chart', 'infographic', 'table', 'graph'],
        required: true
      },
      title: String,
      imageUrl: {
        type: String,
        required: true
      },
      publicId: String,
      description: String,
      dataSource: String,
      order: Number
    }],
    
    // Interactive poll
    poll: {
      question: {
        type: String,
        maxlength: 500
      },
      options: [pollOptionSchema],
      allowMultipleVotes: {
        type: Boolean,
        default: false
      },
      expiresAt: Date,
      totalVotes: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Post type classification
  postType: {
    type: String,
    enum: ['discussion', 'question', 'poll', 'article', 'announcement', 'data-share'],
    default: 'discussion'
  },
  
  // For question-type posts
  // isQuestion: {
  //   type: Boolean,
  //   default: false
  // },
  
  // acceptedAnswer: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Comment'
  // },
  
  // Engagement metrics
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  dislikes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  likeCount: {
    type: Number,
    default: 0
  },
  
  dislikeCount: {
    type: Number,
    default: 0
  },
  
  viewCount: {
    type: Number,
    default: 0
  },
  
  // Comments
  comments: [commentSchema],
  
  commentCount: {
    type: Number,
    default: 0
  },
  
  // Post status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted', 'flagged', 'hidden'],
    default: 'active'
  },
  
  isPinned: {
    type: Boolean,
    default: false
  },
  
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editHistory: [{
    editedAt: Date,
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }],
  
  // Tags for better searchability
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Moderation
  flagCount: {
    type: Number,
    default: 0
  },
  
  flags: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'archived', 'deleted', 'flagged', 'hidden'],
    default: 'pending'
  },
  
  // Approval tracking
  approvalStatus: {
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String
  },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
postSchema.index({ organization: 1, createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ topic: 1 });
postSchema.index({ status: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'body.poll.expiresAt': 1 });

// Virtual for engagement score (can be used for ranking/sorting)
postSchema.virtual('engagementScore').get(function() {
  return this.likeCount + (this.commentCount * 2) + (this.viewCount * 0.1);
});

// Pre-save middleware to update counts
postSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likeCount = this.likes.length;
  }
  if (this.isModified('dislikes')) {
    this.dislikeCount = this.dislikes.length;
  }
  if (this.isModified('comments')) {
    this.commentCount = this.comments.length;
  }
  next();
});

const Post = mongoose.model('Post', postSchema);

export default Post;