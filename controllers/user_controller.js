import bcrypt from 'bcryptjs';
import {v2 as cloudinary} from 'cloudinary';

import User from "../models/user_model.js";
import Notification from "../models/notification_model.js";
import Organization from '../models/organization_model.js';
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getMe controller", error.message);
        res.status(500).json({ error: "Internal Server Error."});
    }
}
const getUserProfile = async (req, res) => {
    const {id} = req.params;

    try {
        const user = await User.findById(id).select("-password");

        if(!user){
            return res.status(404).json({message: "User not found."});
        }
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserProfile");
        res.status(500).json({error:error.message});
    }
}

const updateUserProfile = async (req, res) => {
    const {firstName, lastName, middleName, currentPassword, newPassword, affiliation, researchInterests, expertiseAreas} = req.body;
    let profilePicture = req.body.profilePicture;
    const userId = req.user._id;

    try {
        let user = await User.findById(userId);
        
        if(!user) return res.status(404).json({error: "User not found." });

        if((!newPassword && currentPassword) || (!currentPassword && newPassword)){
            return res.status(400).json({error: "Provide current and new password." });
        }

        if(currentPassword && newPassword){
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if(!isMatch) return res.status(400).json({error: "Password provided is incorrect." });
            if(newPassword.length < 8) return res.status(400).json({error: "Password must be at least 8 characters long." });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // Check email uniqueness if email is being updated
        // if(email && email !== user.email) {
        //     const existingUser = await User.findOne({ email: email.toLowerCase() });
        //     if(existingUser) {
        //         return res.status(400).json({error: "Email already exists." });
        //     }
        // }

        // Handle profile picture upload
        if(profilePicture){
            // Only destroy if it's a Cloudinary URL (not the default URL)
            if(user.profilePicture && user.profilePicture.includes('cloudinary')) {
                try {
                    await cloudinary.uploader.destroy(user.profilePicture.split("/").pop().split(".")[0]);
                } catch (cloudinaryError) {
                    console.log("Error destroying old image:", cloudinaryError);
                    // Continue execution even if destroy fails
                }
            }

            const uploadedPicture = await cloudinary.uploader.upload(profilePicture);
            profilePicture = uploadedPicture.secure_url;
        }

        // Update basic fields
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.middleName = middleName || user.middleName;
        user.email = email || user.email;
        user.profilePicture = profilePicture || user.profilePicture;
        
        // Update new profile fields
        user.affiliation = affiliation !== undefined ? affiliation : user.affiliation;
        user.researchInterests = researchInterests !== undefined ? researchInterests : user.researchInterests;
        user.expertiseAreas = expertiseAreas !== undefined ? expertiseAreas : user.expertiseAreas;

        user = await user.save();
        
        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(200).json(userResponse);
    } catch (error) {
        console.log("Error in updateUserProfile");
        res.status(500).json({error: error.message});
    }
}


const getMyFollowedOrganizations = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findById(userId)
            .populate('followingOrganization', 'name description logo website email followers members')
            .select('followingOrganization');
        
        if(!user) {
            return res.status(404).json({error: "User not found."});
        }
        
        res.status(200).json({
            followedOrganizations: user.followingOrganization,
            count: user.followingOrganization.length
        });
    } catch (error) {
        console.log("Error in getUserFollowedOrganizations");
        res.status(500).json({error: error.message});
    }
}

const getMyMemberships = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findById(userId)
            .populate('memberOrganizations', 'name description logo website email followers members')
            .select('memberOrganizations');
        
        if(!user) {
            return res.status(404).json({error: "User not found."});
        }
        
        res.status(200).json({
            memberships: user.memberOrganizations,
            count: user.memberOrganizations.length
        });
    } catch (error) {
        console.log("Error in getUserMemberships");
        res.status(500).json({error: error.message});
    }
}

const getMyLikedPosts = async (req, res) => {
    try {
        const {id} = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const user = await User.findById(id)
            .populate({
                path: 'likedPosts',
                populate: [
                    {
                        path: 'author',
                        select: 'firstName lastName profilePicture'
                    },
                    {
                        path: 'organization',
                        select: 'name logo'
                    }
                ],
                options: {
                    sort: { createdAt: -1 },
                    skip: skip,
                    limit: limit
                }
            })
            .select('likedPosts');
        
        if(!user) {
            return res.status(404).json({error: "User not found."});
        }
        
        // Get total count for pagination
        const totalLikedPosts = await User.findById(id).select('likedPosts');
        const totalCount = totalLikedPosts.likedPosts.length;
        
        res.status(200).json({
            likedPosts: user.likedPosts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalPosts: totalCount,
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.log("Error in getUserLikedPosts");
        res.status(500).json({error: error.message});
    }
}

const getMyPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const user = await User.findById(userId)
            .populate({
                path: 'posts',
                populate: [
                    {
                        path: 'organization',
                        select: 'name logo'
                    }
                ],
                options: {
                    sort: { createdAt: -1 },
                    skip: skip,
                    limit: limit
                }
            })
            .select('posts');
        
        if(!user) {
            return res.status(404).json({error: "User not found."});
        }
        
        // Get total count for pagination
        const totalUserPosts = await User.findById(userId).select('posts');
        const totalCount = totalUserPosts.posts.length;
        
        res.status(200).json({
            posts: user.posts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalPosts: totalCount,
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.log("Error in getUserPosts");
        res.status(500).json({error: error.message});
    }
}

const getMyPendingPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findById(userId)
            .populate({
                path: 'applicationsForPosts',
                populate: [
                    {
                        path: 'organization',
                        select: 'name logo'
                    }
                ],
                options: {
                    sort: { createdAt: -1 },
                    skip,
                    limit,
                }
            })
            .select('applicationsForPosts');
        
        if(!user) {
            return res.status(404).json({error: "User not found."});
        }
        
        res.status(200).json({
            applicationsForPosts: user.applicationsForPosts,
            count: user.applicationsForPosts.length
        });
    } catch (error) {
        console.log("Error in getmyPendingPosts");
        res.status(500).json({error: error.message});
    }
}

const getUserFollowedOrganizations = async (req, res) => {
    try {
        const {id} = req.params;
        
        const user = await User.findById(id)
            .populate('followingOrganization', 'name description logo website email followers members')
            .select('followingOrganization');
        
        if(!user) {
            return res.status(404).json({error: "User not found."});
        }
        
        res.status(200).json({
            followedOrganizations: user.followingOrganization,
            count: user.followingOrganization.length
        });
    } catch (error) {
        console.log("Error in getUserFollowedOrganizations");
        res.status(500).json({error: error.message});
    }
}

// Get user's organization memberships
const getUserMemberships = async (req, res) => {
    try {
        const {id} = req.params;
    
        const user = await User.findById(id)
            .populate('memberOrganizations', 'name description logo website email followers members')
            .select('memberOrganizations');
        
        if(!user) {
            return res.status(404).json({error: "User not found."});
        }
        
        res.status(200).json({
            memberships: user.memberOrganizations,
            count: user.memberOrganizations.length
        });
    } catch (error) {
        console.log("Error in getUserMemberships");
        res.status(500).json({error: error.message});
    }
}

// Get user's liked posts
const getUserLikedPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const user = await User.findById(userId)
            .populate({
                path: 'likedPosts',
                populate: [
                    {
                        path: 'author',
                        select: 'firstName lastName profilePicture'
                    },
                    {
                        path: 'organization',
                        select: 'name logo'
                    }
                ],
                options: {
                    sort: { createdAt: -1 },
                    skip: skip,
                    limit: limit
                }
            })
            .select('likedPosts');
        
        if(!user) {
            return res.status(404).json({error: "User not found."});
        }
        
        // Get total count for pagination
        const totalLikedPosts = await User.findById(userId).select('likedPosts');
        const totalCount = totalLikedPosts.likedPosts.length;
        
        res.status(200).json({
            likedPosts: user.likedPosts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalPosts: totalCount,
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.log("Error in getUserLikedPosts");
        res.status(500).json({error: error.message});
    }
}

// Get user's created postsawda
const getUserPosts = async (req, res) => {
    try {
        const {id} = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const user = await User.findById(id)
            .populate({
                path: 'posts',
                populate: [
                    {
                        path: 'organization',
                        select: 'name logo'
                    }
                ],
                options: {
                    sort: { createdAt: -1 },
                    skip: skip,
                    limit: limit
                }
            })
            .select('posts');
        
        if(!user) {
            return res.status(404).json({error: "User not found."});
        }
        
        // Get total count for pagination
        const totalUserPosts = await User.findById(id).select('posts');
        const totalCount = totalUserPosts.posts.length;
        
        res.status(200).json({
            posts: user.posts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalPosts: totalCount,
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.log("Error in getUserPosts");
        res.status(500).json({error: error.message});
    }
}

export {
    getMe,
    getMyMemberships,
    getMyPosts,
    getMyLikedPosts,
    getMyFollowedOrganizations,
    getMyPendingPosts,

    getUserProfile,
    updateUserProfile,
    getUserFollowedOrganizations,
    getUserMemberships,
    getUserLikedPosts,
    getUserPosts,
};