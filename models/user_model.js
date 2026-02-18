import mongoose, { mongo } from "mongoose";

const userSchema = new mongoose.Schema(
   {
     firstName: {
       type: String,
       required: true,
       trim: true,
     },
     lastName: {
       type: String,
       required: true,
       trim: true,
     },
     middleName: {
       type: String,
       trim: true,
       required: true,
     },
     email: {
       type: String,
       required: true,
       unique: true,
       lowercase: true,
       trim: true,
     },
     password: {
       type: String,
       required: true,
       min: 8,
     },
     role: {
       type: String,
       enum: ['superAdmin', 'organization_admin', 'registered_user'],
       default: 'registered_user',
     },
     // Profile fields (FR-1.2) - empty by default, filled after signup
     affiliation: {
       type: String,
       trim: true,
       default: '',
     },
     researchInterests: [{
       type: String,
       trim: true,
     }],
     expertiseAreas: [{
       type: String,
       trim: true,
     }],
     // Author status (FR-1.3)
     isAuthor: {
       type: Boolean,
       default: false,
     },
     authorizedByOrganizations: [{
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Organization',
     }],
     // Relationships
     followingOrganization:[
       {
           type: mongoose.Schema.Types.ObjectId,
           ref: 'Organization',
       }
     ],
     likedPosts: [
       {
         type:mongoose.Schema.Types.ObjectId,
         ref: "Post",
       }
     ],
     memberOrganizations: [
       {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Organization",
       }
     ],
     applicationsForPosts: [
       {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Post'
       }
     ],
     posts: [
       {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Post'
       }
     ],
     profilePicture: {
       type: String, // URL to the profile picture
       default: 'https://example.com/default-profile.png', // Optional default picture
     },  
   },
   {
     timestamps: true, // Automatically adds createdAt and updatedAt fields
   }
);

const User = mongoose.model("User", userSchema);
export default User;