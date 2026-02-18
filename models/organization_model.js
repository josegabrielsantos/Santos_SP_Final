// import mongoose, { mongo } from "mongoose";

// const organizationSchema = new mongoose.Schema(
//     {
//       name: {
//         type: String,
//         required: true,
//         unique: true,
//         trim: true,
//       },
//       description: {
//         type: String,
//         required: true,
//         trim: true,
//       },
//       logo: {
//         type: String, // URL to the organization's logo
//         default: 'https://example.com/default-logo.png', // Optional default logo
//       },
//       website: {
//         type: String, // URL to the organization's website
//         default: null,
//       },
//       email: {
//         type: String,
//         required: true,
//         unique: true,
//         lowercase: true,
//         trim: true,
//       },
//       password: {
//         type: String,
//         required: true,
//         min: 8,
//       },
//       followers: [
//         {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: 'User', // Reference to the User collection
//         },
//       ],
//       members: [
//         {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: 'User', // Reference to the User collection
//         }
//       ],
//       applicants: [
//         {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: 'User', // Reference to the User collection
//         }
//       ],
//       posts: [
//         {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: 'Post', // Reference to the Post collection
//         },
//       ],
//       pendingPosts: [
//         {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: 'Post', // Reference to the Post collection
//         },
//       ],
//     },
//     {
//       timestamps: true,
//     }
// );

// const Organization = mongoose.model("Organization", organizationSchema);

// export default Organization;

import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  color: {
    type: String,
    default: '#3b82f6',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  backgroundColor: {
    type: String,
    default: '#eff6ff',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  icon: {
    type: String,
    maxlength: 10 // emoji or icon identifier
  }
}, { _id: false });

const organizationSchema = new mongoose.Schema({
    organizationName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: "",
        trim: true
    },
    contactNumber: {
        type: String,
        default: "",
        trim: true
    },
    website: {
        type: String,
        default: "",
        trim: true
    },
    profilePicture: {
        type: String,
        default: ""
    },
    coverPhoto: {
        type: String,
        default: ""
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],
    topics: {
        type: [topicSchema],
        default: []
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    }],
    pendingPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    }],
    authors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    statistics: {
        totalPosts: {
            type: Number,
            default: 0
        },
        totalMembers: {
            type: Number,
            default: 0
        },
        totalFollowers: {
            type: Number,
            default: 0
        } 
    }
}, {
    timestamps: true
});

organizationSchema.pre("save", function() {
    this.statistics.totalMembers = this.members.length;
    this.statistics.totalFollowers = this.followers.length;
    this.statistics.totalPosts = this.posts.length;
});

const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;
