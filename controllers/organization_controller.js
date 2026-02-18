import Organization from "../models/organization_model.js";
import User from "../models/user_model.js";
import bcrypt from 'bcryptjs';
import {v2 as cloudinary} from 'cloudinary';

//admin routes
const createOrganization = async (req, res) => {
    try {
        const { organizationName, description, contactNumber, website, ownerId } = req.body;
        console.log(organizationName, description, contactNumber, website, ownerId);
        if (!organizationName || !ownerId) {
            return res.status(400).json({ error: "Organization name and owner ID are required." });
        }

        const owner = await User.findById(ownerId);
        if (!owner) {
            return res.status(404).json({ error: "Owner user not found." });
        }

        const newOrganization = new Organization({
            organizationName,
            description: description || "",
            contactNumber: contactNumber || "",
            website: website || "",
            owner: ownerId,
            members: [ownerId],
            followers: [ownerId],
        });

        await newOrganization.save();

        await User.findByIdAndUpdate(ownerId, {
            $push: { 
                ownedOrganizations: newOrganization._id,
                memberOrganization: newOrganization._id,
                followingOrganization: newOrganization._id
            }
        });

        res.status(201).json({
            message: "Organization created successfully",
            organization: {
                _id: newOrganization._id,
                organizationName: newOrganization.organizationName,
                description: newOrganization.description,
                owner: newOrganization.owner,
            }
        });

    } catch (error) {
        console.log("Error in createOrganization", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

//admin routes
const updateOrganization = async (req, res) => {
    try {
        const { organizationName, description, contactNumber, website } = req.body;
        const organization = req.organization;

        const updatedOrganization = await Organization.findByIdAndUpdate(
            organization._id,
            {
                organizationName: organizationName || organization.organizationName,
                description: description || organization.description,
                contactNumber: contactNumber || organization.contactNumber,
                website: website || organization.website
            },
            { new: true }
        );

        res.status(200).json({
            message: "Organization updated successfully",
            organization: updatedOrganization
        });

    } catch (error) {
        console.log("Error in updateOrganization", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

//admin routes
const deleteOrganization = async (req, res) => {
    try {
        const { id } = req.params;

        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        await User.updateMany(
            { ownedOrganizations: id },
            { $pull: { 
                ownedOrganizations: id,
                memberOrganization: id,
                followingOrganization: id
             }}
        );

        await User.updateMany(
            { adminOrganizations: id },
            { $pull: { adminOrganizations: id } }
        );

        await User.updateMany(
            { followingOrganization: id },
            { $pull: { followingOrganization: id } }
        );

        await User.updateMany(
            { memberOrganization: id },
            { $pull: { memberOrganization: id } }
        );

        await Organization.findByIdAndDelete(id);

        res.status(200).json({ message: "Organization deleted successfully" });

    } catch (error) {
        console.log("Error in deleteOrganization", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};


// organization routes ADD REMOVE ADMIN AND MEMBERS
const addOrganizationAdmin = async (req, res) => {
    try {
        const { userId } = req.body;
        const organization = req.organization;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        if (organization.admins.includes(userId)) {
            return res.status(400).json({ error: "User is already an admin." });
        }

        if (organization.owner.toString() === userId) {
            return res.status(400).json({ error: "Owner cannot be added as admin." });
        }

        await Organization.findByIdAndUpdate(organization._id, {
            $push: { 
                admins: userId,
                followers: userId,
                members: userId,
             }
        });

        await User.findByIdAndUpdate(userId, {
            $push: { 
                adminOrganizations: organization._id, 
                followingOrganization: organization._id,
                memberOrganization: organization._id
             }
        });

        res.status(200).json({ message: "Admin added successfully" });

    } catch (error) {
        console.log("Error in addOrganizationAdmin", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const removeOrganizationAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        const organization = req.organization;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        if (!organization.admins.includes(userId)) {
            return res.status(400).json({ error: "User is not an admin." });
        }

        await Organization.findByIdAndUpdate(organization._id, {
            $pull: { admins: userId }
        });

        await User.findByIdAndUpdate(userId, {
            $pull: { adminOrganizations: organization._id }
        });

        res.status(200).json({ message: "Admin removed successfully" });

    } catch (error) {
        console.log("Error in removeOrganizationAdmin", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const addMemberToOrganization = async (req, res) => {
    try {
        const { id } = req.params; // organization id
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required." });
        }

        const organization = await Organization.findById(id);
        const user = await User.findById(userId);

        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        if (organization.members.includes(userId)) {
            return res.status(400).json({ error: "User is already a member." });
        }

        await Organization.findByIdAndUpdate(id, {
            $push: { members: userId }
        });

        await User.findByIdAndUpdate(userId, {
            $push: { memberOrganization: id }
        });

        res.status(200).json({ message: "Member added successfully." });

    } catch (error) {
        console.log("Error in addMemberToOrganization", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const removeMemberFromOrganization = async (req, res) => {
    try {
        const { id, userId } = req.params; // organization id and user id

        const organization = await Organization.findById(id);
        const user = await User.findById(userId);

        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        if (!organization.members.includes(userId)) {
            return res.status(400).json({ error: "User is not a member." });
        }

        if (organization.owner.toString() === userId) {
            return res.status(400).json({ error: "Cannot remove owner from membership." });
        }

        if (organization.admins.includes(userId)) {
            return res.status(400).json({ error: "Cannot remove admin from membership. Remove admin role first." });
        }

        await Organization.findByIdAndUpdate(id, {
            $pull: { members: userId }
        });

        await User.findByIdAndUpdate(userId, {
            $pull: { memberOrganization: id }
        });

        res.status(200).json({ message: "Member removed successfully." });

    } catch (error) {
        console.log("Error in removeMemberFromOrganization", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const bulkAddMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const { userIds, emailList } = req.body; // Can accept user IDs or email list
        const organization = req.organization;

        if (!userIds && !emailList) {
            return res.status(400).json({ error: "User IDs or email list is required." });
        }

        let usersToAdd = [];
        let results = {
            success: [],
            failed: [],
            alreadyMembers: []
        };

        // If email list provided, find users by email
        if (emailList && Array.isArray(emailList)) {
            for (const email of emailList) {
                const user = await User.findOne({ email: email.toLowerCase() });
                if (user) {
                    usersToAdd.push(user._id.toString());
                } else {
                    results.failed.push({ email, reason: "User not found" });
                }
            }
        }

        // If user IDs provided, use them directly
        if (userIds && Array.isArray(userIds)) {
            usersToAdd = [...usersToAdd, ...userIds];
        }

        // Remove duplicates
        usersToAdd = [...new Set(usersToAdd)];

        // Process each user
        for (const userId of usersToAdd) {
            try {
                const user = await User.findById(userId);
                if (!user) {
                    results.failed.push({ userId, reason: "User not found" });
                    continue;
                }

                // Check if already a member
                if (organization.members.includes(userId)) {
                    results.alreadyMembers.push({
                        userId,
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`
                    });
                    continue;
                }

                // Add to organization
                await Organization.findByIdAndUpdate(id, {
                    $addToSet: { 
                        members: userId,
                        followers: userId // Also add as follower if not already
                    }
                });

                // Add to user
                await User.findByIdAndUpdate(userId, {
                    $addToSet: { 
                        memberOrganization: id,
                        followingOrganization: id
                    }
                });

                results.success.push({
                    userId,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });

            } catch (userError) {
                results.failed.push({ userId, reason: userError.message });
            }
        }

        // Update organization statistics
        await Organization.findByIdAndUpdate(id, {
            $set: {
                'statistics.totalMembers': await Organization.findById(id).then(org => org.members.length),
                'statistics.totalFollowers': await Organization.findById(id).then(org => org.followers.length)
            }
        });

        res.status(200).json({
            message: "Bulk member addition completed",
            results: {
                totalProcessed: usersToAdd.length,
                successfullyAdded: results.success.length,
                failed: results.failed.length,
                alreadyMembers: results.alreadyMembers.length,
                details: results
            }
        });

    } catch (error) {
        console.log("Error in bulkAddMembers", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};


const bulkRemoveMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const { userIds, emailList, reason } = req.body; // Optional reason for removal
        const organization = req.organization;
        const currentUserId = req.user._id;

        if (!userIds && !emailList) {
            return res.status(400).json({ error: "User IDs or email list is required." });
        }

        let usersToRemove = [];
        let results = {
            success: [],
            failed: [],
            notMembers: [],
            cannotRemove: []
        };

        // If email list provided, find users by email
        if (emailList && Array.isArray(emailList)) {
            for (const email of emailList) {
                const user = await User.findOne({ email: email.toLowerCase() });
                if (user) {
                    usersToRemove.push(user._id.toString());
                } else {
                    results.failed.push({ email, reason: "User not found" });
                }
            }
        }

        // If user IDs provided, use them directly
        if (userIds && Array.isArray(userIds)) {
            usersToRemove = [...usersToRemove, ...userIds];
        }

        // Remove duplicates
        usersToRemove = [...new Set(usersToRemove)];

        // Process each user
        for (const userId of usersToRemove) {
            try {
                const user = await User.findById(userId);
                if (!user) {
                    results.failed.push({ userId, reason: "User not found" });
                    continue;
                }

                // Check if user is a member
                if (!organization.members.includes(userId)) {
                    results.notMembers.push({
                        userId,
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`
                    });
                    continue;
                }

                // Cannot remove owner
                if (organization.owner.toString() === userId) {
                    results.cannotRemove.push({
                        userId,
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`,
                        reason: "Cannot remove organization owner"
                    });
                    continue;
                }

                // Cannot remove yourself (unless you're super admin)
                if (userId === currentUserId.toString() && req.user.role !== 'superAdmin') {
                    results.cannotRemove.push({
                        userId,
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`,
                        reason: "Cannot remove yourself"
                    });
                    continue;
                }

                // If user is admin, remove admin role first
                if (organization.admins.includes(userId)) {
                    await Organization.findByIdAndUpdate(id, {
                        $pull: { admins: userId }
                    });
                    await User.findByIdAndUpdate(userId, {
                        $pull: { adminOrganizations: id }
                    });
                }

                // Remove from organization
                await Organization.findByIdAndUpdate(id, {
                    $pull: { 
                        members: userId,
                        authors: userId // Remove from authors if present
                    }
                });

                // Remove from user
                await User.findByIdAndUpdate(userId, {
                    $pull: { memberOrganization: id }
                });

                results.success.push({
                    userId,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                    reason: reason || "Bulk removal"
                });

            } catch (userError) {
                results.failed.push({ userId, reason: userError.message });
            }
        }

        // Update organization statistics
        await Organization.findByIdAndUpdate(id, {
            $set: {
                'statistics.totalMembers': await Organization.findById(id).then(org => org.members.length)
            }
        });

        res.status(200).json({
            message: "Bulk member removal completed",
            results: {
                totalProcessed: usersToRemove.length,
                successfullyRemoved: results.success.length,
                failed: results.failed.length,
                notMembers: results.notMembers.length,
                cannotRemove: results.cannotRemove.length,
                details: results
            }
        });

    } catch (error) {
        console.log("Error in bulkRemoveMembers", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};




const followUnfollowOrganization = async (req, res) => {
    try {
        const {id} = req.params;
        const currentUser = await User.findById(req.user._id);
        const organizationToModify = await Organization.findById(id);
        
        if(!organizationToModify || !currentUser) {
            return res.status(400).json({error: "User not found."});
        }

        const isFollowing = currentUser.followingOrganization.includes(id);
        if(isFollowing){
            await Organization.findByIdAndUpdate(id, {$pull: { followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, { $pull: { followingOrganization: id}});
            return res.status(200).json({message: "UnFollowed Successfully."});
        }
        else{
            await Organization.findByIdAndUpdate(id, {$push: { followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, { $push: { followingOrganization: id}});
        
            return res.status(200).json({message: "Followed Successfully."});
        }


    } catch (error) {
        console.log("Error in followUnfollowOrganization");
        res.status(500).json({error:error.message});
    }
}


//admin routes
const getAllOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find()
            .populate('owner', 'firstName lastName email')
            .populate('admins', 'firstName lastName email')
            .select('-posts -pendingPosts -members -followers');

        res.status(200).json({ organizations });

    } catch (error) {
        console.log("Error in getAllOrganizations", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params;

        const organization = await Organization.findById(id)
            .populate('owner', 'firstName lastName email profilePicture')
            .populate('admins', 'firstName lastName email profilePicture')
            .populate('members', 'firstName lastName email profilePicture')
            .populate('followers', 'firstName lastName email profilePicture')
            .populate('authors', 'firstName lastName email profilePicture')
            .populate('posts')
            .populate('pendingPosts');

        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        res.status(200).json({ organization });

    } catch (error) {
        console.log("Error in getOrganizationById", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Get organization profile for public viewing (any user can access)
const getOrganizationProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id; // Optional if not authenticated

        const organization = await Organization.findById(id)
            .populate('owner', 'firstName lastName profilePicture')
            .populate('admins', 'firstName lastName profilePicture')
            .populate('members', 'firstName lastName profilePicture')
            .populate('authors', 'firstName lastName profilePicture')
            .populate({
                path: 'posts',
                populate: {
                    path: 'author',
                    select: 'firstName lastName profilePicture'
                }
            })
            .populate({
                path: 'pendingPosts',
                populate: {
                    path: 'author',
                    select: 'firstName lastName profilePicture'
                }
            });

        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        // Determine user relationship
        let userRelation = {
            isFollowing: false,
            isMember: false,
            isAdmin: false,
            isOwner: false
        };

        if (userId) {
            userRelation = {
                isFollowing: organization.followers.includes(userId),
                isMember: organization.members.includes(userId),
                isAdmin: organization.admins.includes(userId),
                isOwner: organization.owner._id.toString() === userId.toString()
            };
        }

        // Base organization data that everyone sees
        let responseData = {
            organization: {
                _id: organization._id,
                organizationName: organization.organizationName,
                description: organization.description,
                profilePicture: organization.profilePicture,
                coverPhoto: organization.coverPhoto,
                contactNumber: organization.contactNumber,
                website: organization.website,
                statistics: organization.statistics,
                createdAt: organization.createdAt,
                updatedAt: organization.updatedAt
            },
            userRelation,
            permissions: {
                canFollow: userId && !userRelation.isFollowing && !userRelation.isMember,
                canApplyMembership: userId && !userRelation.isMember && !userRelation.isAdmin && !userRelation.isOwner,
                canViewMembers: userRelation.isMember || userRelation.isAdmin || userRelation.isOwner,
                canManageMembers: userRelation.isAdmin || userRelation.isOwner,
                canManageAdmins: userRelation.isOwner,
                canCreatePosts: userRelation.isMember || userRelation.isAdmin || userRelation.isOwner,
                canManagePosts: userRelation.isAdmin || userRelation.isOwner
            }
        };

        // Content visibility based on user status
        if (!userId) {
            // PUBLIC USERS - Basic info + public posts only
            responseData.organization.posts = organization.posts.filter(post => post.isPublic !== false);
            responseData.organization.memberCount = organization.statistics.totalMembers;
            responseData.organization.followerCount = organization.statistics.totalFollowers;
            
        } else if (userRelation.isFollowing && !userRelation.isMember) {
            // FOLLOWERS - Public posts + basic member info
            responseData.organization.posts = organization.posts.filter(post => post.isPublic !== false);
            responseData.organization.memberCount = organization.statistics.totalMembers;
            responseData.organization.followerCount = organization.statistics.totalFollowers;
            responseData.organization.recentMembers = organization.members.slice(0, 5); // Show some members
            
        } else if (userRelation.isMember || userRelation.isAdmin || userRelation.isOwner) {
            // MEMBERS+ - All posts + member lists + own pending posts
            responseData.organization.posts = organization.posts;
            responseData.organization.members = organization.members;
            responseData.organization.admins = organization.admins;
            responseData.organization.owner = organization.owner;
            responseData.organization.authors = organization.authors;
            
            // Members can see their own pending posts
            if (userRelation.isMember && !userRelation.isAdmin && !userRelation.isOwner) {
                responseData.organization.myPendingPosts = organization.pendingPosts.filter(
                    post => post.author._id.toString() === userId.toString()
                );
            }
        }

        // ADMINS/OWNERS - Everything including all pending posts and management data
        if (userRelation.isAdmin || userRelation.isOwner) {
            responseData.organization.pendingPosts = organization.pendingPosts;
            responseData.organization.followers = organization.followers;
            responseData.managementData = {
                totalPendingPosts: organization.pendingPosts.length,
                recentJoins: organization.members.slice(-5), // Last 5 members who joined
                adminActions: [] // Could add admin activity log here
            };
        }

        res.status(200).json(responseData);

    } catch (error) {
        console.log("Error in getOrganizationProfile", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Get all organizations for browsing (public list)
const getAllOrganizationsPublic = async (req, res) => {
    try {
        const { page = 1, limit = 12, sortBy = 'createdAt', order = 'desc' } = req.query;
        
        const skip = (page - 1) * limit;
        const sortOrder = order === 'desc' ? -1 : 1;
        
        let sortOptions = {};
        if (sortBy === 'followers') {
            sortOptions = { 'statistics.totalFollowers': sortOrder };
        } else if (sortBy === 'members') {
            sortOptions = { 'statistics.totalMembers': sortOrder };
        } else {
            sortOptions = { [sortBy]: sortOrder };
        }

        const organizations = await Organization.find()
            .populate('owner', 'firstName lastName profilePicture')
            .select('organizationName description profilePicture coverPhoto statistics createdAt')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Organization.countDocuments();

        res.status(200).json({ 
            organizations,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                hasNext: skip + organizations.length < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.log("Error in getAllOrganizationsPublic", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Search organizations (public)




const getOrganizationAdmins = async (req, res) => {
    try{
        const {id} = req.params;
        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        const admins = await User.find({ 
            _id: { $in: organization.admins } 
        })
        .select('firstName lastName profilePicture');

        res.status(200).json({ admins, totalAdmins: organization.admins.length });

    }catch (error) {
        console.log("Error in getOrganizationAdmins", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
}

// const getOrganizationPosts = async (req, res) => {
//   try {
//     const { id } = req.params; // organization ID from URL
//     const page = parseInt(req.query.page) || 1; // current page number
//     const limit = parseInt(req.query.limit) || 10; // posts per page
//     const skip = (page - 1) * limit;

//     const organization = await Organization.findById(id)
//       .populate({
//         path: "posts",
//         populate: {
//           path: "author",
//           select: "firstName lastName profilePicture",
//         },
//         options: { skip, limit, sort: { createdAt: -1 } }, // pagination + newest first
//       })
//       .select("posts");

//     if (!organization) {
//       return res.status(404).json({ error: "Organization not found." });
//     }

//     const totalPosts = organization.statistics?.totalPosts || organization.posts.length;
//     const totalPages = Math.ceil(totalPosts / limit);

//     res.status(200).json({
//       posts: organization.posts,
//       pagination: {
//         currentPage: page,
//         totalPages,
//         totalPosts,
//         hasNextPage: page < totalPages,
//         hasPrevPage: page > 1,
//       },
//     });
//   } catch (error) {
//     console.error("Error in getOrganizationPosts:", error.message);
//     res.status(500).json({ error: "Internal Server Error." });
//   }
// };

const getOrganizationPendingPosts = async (req, res) => {
  try {
    const { id } = req.params; // organization ID from URL
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const organization = await Organization.findById(id)
      .populate({
        path: "pendingPosts",
        populate: {
          path: "author",
          select: "firstName lastName profilePicture",
        },
        options: { skip, limit, sort: { createdAt: -1 } },
      })
      .select("pendingPosts");

    if (!organization) {
      return res.status(404).json({ error: "Organization not found." });
    }

    const totalPending = organization.pendingPosts.length;
    const totalPages = Math.ceil(totalPending / limit);

    res.status(200).json({
      pendingPosts: organization.pendingPosts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPending,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in getOrganizationPendingPosts:", error.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};


// Get organization members (public)
const getOrganizationMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        const skip = (page - 1) * limit;

        const members = await User.find({ 
            _id: { $in: organization.members } 
        })
        .select('firstName lastName profilePicture')
        .skip(skip)
        .limit(parseInt(limit));

        

        const owner = await User.findById(organization.owner)
            .select('firstName lastName profilePicture');

        res.status(200).json({
            organizationName: organization.organizationName,
            owner,
            admins,
            members,
            counts: {
                totalMembers: organization.statistics.totalMembers,
                totalAdmins: organization.admins.length,
                showing: members.length
            },
            pagination: {
                current: parseInt(page),
                total: Math.ceil(organization.statistics.totalMembers / limit),
                hasNext: skip + members.length < organization.statistics.totalMembers,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.log("Error in getOrganizationMembers", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Get organization followers (public)
const getOrganizationFollowers = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        const skip = (page - 1) * limit;

        const followers = await User.find({ 
            _id: { $in: organization.followers } 
        })
        .select('firstName lastName profilePicture')
        .skip(skip)
        .limit(parseInt(limit));
        
        await syncOrganizationStats(organization._id);
        res.status(200).json({
            organizationName: organization.organizationName,
            followers,
            counts: {
                totalFollowers: organization.statistics.totalFollowers,
                showing: followers.length
            },
            pagination: {
                current: parseInt(page),
                total: Math.ceil(organization.statistics.totalFollowers / limit),
                hasNext: skip + followers.length < organization.statistics.totalFollowers,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.log("Error in getOrganizationFollowers", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const getOrganizationStatistics = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        const organization = await Organization.findById(id)
            .populate('posts')
            .populate('members', 'createdAt')
            .populate('followers', 'createdAt')
            .populate('admins', 'createdAt');

        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        // Calculate various statistics
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

        // Member growth statistics
        const totalMembers = organization.members.length;
        const newMembersThisMonth = organization.members.filter(
            member => new Date(member.createdAt) >= oneMonthAgo
        ).length;
        const newMembersThreeMonths = organization.members.filter(
            member => new Date(member.createdAt) >= threeMonthsAgo
        ).length;

        // Follower growth statistics
        const totalFollowers = organization.followers.length;
        const newFollowersThisMonth = organization.followers.filter(
            follower => new Date(follower.createdAt) >= oneMonthAgo
        ).length;

        // Post statistics
        const totalPosts = organization.posts.length;
        const postsThisMonth = organization.posts.filter(
            post => new Date(post.createdAt) >= oneMonthAgo
        ).length;
        const postsThreeMonths = organization.posts.filter(
            post => new Date(post.createdAt) >= threeMonthsAgo
        ).length;

        // Engagement statistics (if you have likes/comments on posts)
        let totalLikes = 0;
        let totalComments = 0;
        organization.posts.forEach(post => {
            totalLikes += post.likes?.length || 0;
            totalComments += post.comments?.length || 0;
        });

        // Calculate growth rates
        const memberGrowthRate = totalMembers > 0 ? 
            ((newMembersThisMonth / totalMembers) * 100).toFixed(1) : 0;
        const followerGrowthRate = totalFollowers > 0 ? 
            ((newFollowersThisMonth / totalFollowers) * 100).toFixed(1) : 0;

        // Admin count
        const totalAdmins = organization.admins.length;

        // Basic statistics available to all registered users
        const basicStats = {
            overview: {
                totalMembers,
                totalFollowers,
                totalAdmins,
                totalPosts,
                organizationAge: Math.floor((now - new Date(organization.createdAt)) / (1000 * 60 * 60 * 24)) // days
            },
            growth: {
                newMembersThisMonth,
                newFollowersThisMonth,
                memberGrowthRate: `${memberGrowthRate}%`,
                followerGrowthRate: `${followerGrowthRate}%`
            },
            activity: {
                postsThisMonth,
                avgPostsPerMonth: totalPosts > 0 ? 
                    (totalPosts / Math.max(1, Math.floor((now - new Date(organization.createdAt)) / (1000 * 60 * 60 * 24 * 30)))).toFixed(1) : 0
            }
        };

        // Check user's relationship with organization for detailed stats
        const isOwner = organization.owner.toString() === userId?.toString();
        const isAdmin = organization.admins.some(admin => admin._id.toString() === userId?.toString());
        const isMember = organization.members.some(member => member._id.toString() === userId?.toString());
        const isSuperAdmin = userRole === 'superAdmin';

        // Enhanced statistics for members and above
        if (isMember || isAdmin || isOwner || isSuperAdmin) {
            basicStats.engagement = {
                totalLikes,
                totalComments,
                avgLikesPerPost: totalPosts > 0 ? (totalLikes / totalPosts).toFixed(1) : 0,
                avgCommentsPerPost: totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : 0
            };

            basicStats.membershipTrends = {
                newMembersThreeMonths,
                memberRetentionRate: "85%", // You'd calculate this based on active members
                mostActiveMembers: [] // Top contributors by posts/comments
            };
        }

        // Advanced statistics for admins and above
        if (isAdmin || isOwner || isSuperAdmin) {
            // Monthly breakdown for the last 6 months
            const monthlyBreakdown = [];
            for (let i = 5; i >= 0; i--) {
                const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
                
                const membersJoined = organization.members.filter(
                    member => new Date(member.createdAt) >= monthStart && new Date(member.createdAt) <= monthEnd
                ).length;
                
                const postsCreated = organization.posts.filter(
                    post => new Date(post.createdAt) >= monthStart && new Date(post.createdAt) <= monthEnd
                ).length;

                monthlyBreakdown.push({
                    month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    membersJoined,
                    postsCreated
                });
            }

            basicStats.detailed = {
                monthlyBreakdown,
                topPerformingPosts: organization.posts
                    .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
                    .slice(0, 5)
                    .map(post => ({
                        _id: post._id,
                        title: post.title,
                        likes: post.likes?.length || 0,
                        comments: post.comments?.length || 0,
                        createdAt: post.createdAt
                    })),
                adminActivity: {
                    totalAdmins,
                    adminJoinDates: organization.admins.map(admin => ({
                        adminId: admin._id,
                        joinedAt: admin.createdAt
                    }))
                }
            };
        }

        // Super detailed stats for owners and super admins
        if (isOwner || isSuperAdmin) {
            basicStats.management = {
                pendingApplications: organization.applicants?.length || 0,
                reportedContent: 0, // You'd implement content reporting
                organizationHealth: "Good", // Based on engagement metrics
                recommendations: [
                    "Consider hosting events to increase member engagement",
                    "Create more regular content to boost follower growth"
                ]
            };
        }

        res.status(200).json({
            organizationName: organization.organizationName,
            statistics: basicStats,
            lastUpdated: now.toISOString()
        });

    } catch (error) {
        console.log("Error in getOrganizationStatistics", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Get user's followed organizations
const getMyFollowedOrganizations = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId)
            .populate({
                path: 'followingOrganization',
                select: 'organizationName description profilePicture statistics',
                populate: {
                    path: 'owner',
                    select: 'firstName lastName profilePicture'
                }
            });

        res.status(200).json({ 
            total: user.followingOrganization.length,
            organizations: user.followingOrganization
        });

    } catch (error) {
        console.log("Error in getMyFollowedOrganizations", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Get user's member organizations  
const getMyMemberOrganizations = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId)
            .populate({
                path: 'memberOrganization',
                select: 'organizationName description profilePicture statistics',
                populate: {
                    path: 'owner',
                    select: 'firstName lastName profilePicture'
                }
            });

        res.status(200).json({ 
            total: user.memberOrganization.length,
            organizations: user.memberOrganization
        });

    } catch (error) {
        console.log("Error in getMyMemberOrganizations", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const leaveOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const user = await User.findById(userId);
        const organization = await Organization.findById(id);

        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        if (!user.memberOrganization.includes(id)) {
            return res.status(400).json({ error: "You are not a member of this organization." });
        }

        await User.findByIdAndUpdate(userId, {
            $pull: { memberOrganization: id }
        });

        await Organization.findByIdAndUpdate(id, {
            $pull: { members: userId }
        });

        res.status(200).json({ message: "Left organization successfully." });

    } catch (error) {
        console.log("Error in leaveOrganization", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const searchOrganizations = async (req, res) => {
    try {
        const { query, page = 1, limit = 10 } = req.query;

        if (!query) {
            return res.status(400).json({ error: "Search query is required." });
        }

        const skip = (page - 1) * limit;

        const organizations = await Organization.find({
            $or: [
                { organizationName: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        })
        .populate('owner', 'firstName lastName profilePicture')
        .select('organizationName description profilePicture statistics')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ 'statistics.totalFollowers': -1 });

        const total = await Organization.countDocuments({
            $or: [
                { organizationName: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        });

        res.status(200).json({ 
            organizations,
            query,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                hasNext: skip + organizations.length < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.log("Error in searchOrganizations", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const syncOrganizationStats = async (organizationId) => {
  try {
    const organization = await Organization.findById(organizationId)
      .select("members followers posts statistics");

    if (!organization) return null;

    const updatedStats = {
      totalMembers: organization.members.length,
      totalFollowers: organization.followers.length,
      totalPosts: organization.posts.length,
    };

    // Update only if something changed
    if (JSON.stringify(updatedStats) !== JSON.stringify(organization.statistics)) {
      organization.statistics = updatedStats;
      await organization.save();
      console.log(`✅ Stats synced for organization ${organizationId}`);
    }

    return organization.statistics;
  } catch (error) {
    console.error("Error syncing organization stats:", error.message);
  }
};

export {
    createOrganization,
    updateOrganization,
    deleteOrganization,
    addOrganizationAdmin,
    removeOrganizationAdmin,
    addMemberToOrganization,
    removeMemberFromOrganization,
    bulkAddMembers,
    bulkRemoveMembers,
    getAllOrganizations,
    getOrganizationById,
    followUnfollowOrganization,

    // getOrganizationPosts,
    getOrganizationPendingPosts,
    getOrganizationProfile,
    getAllOrganizationsPublic,
    getOrganizationAdmins,
    getOrganizationMembers,
    getOrganizationFollowers,


    searchOrganizations,
    
    getOrganizationStatistics,
    getMyFollowedOrganizations,
    getMyMemberOrganizations,
    leaveOrganization,

    syncOrganizationStats
};



// const getOrganizationProfile = async (req, res) => {
//     const {id} = req.params;

//     try {
//         const organization = await Organization.findById(id).select("-password");
//         console.log(organization);
//         if(!organization){
//             return res.status(404).json({message: "Organiwdawdation not found."});
//         }
//         res.status(200).json(organization);

//     } catch (error) {
//         console.log("Error in getOrganizationProfile");
//         res.status(500).json({error:error.message});
//     }
// }

const updateOrganizationProfile = async (req, res) => {
    const {name, description, email, currentPassword, newPassword, website} = req.body;
    let logo = req.body.logo; // Extract the correct field
    const organizationId = req.organization._id;

    try {
        let organization = await Organization.findById(organizationId);
        
        if(!organization) return res.status(404).json({message: "organization not found." });

        if((!newPassword && currentPassword) || (!currentPassword && newPassword)){
            return res.status(400).json({error: "Provide current and new password." });
        }

        if(currentPassword && newPassword){
            const isMatch = await bcrypt.compare(currentPassword, organization.password);
            if(!isMatch) return res.status(400).json({error: "Password provided is incorrect." });
            if(newPassword.length < 8) return res.status(400).json({error: "Password must be at least 8 characters long." });

            const salt = await bcrypt.genSalt(10);
            organization.password = await bcrypt.hash(newPassword, salt);
        }

        if(logo){
            if(organization.logo){
                await cloudinary.uploader.destroy(organization.logo.split("/").pop().split(".")[0]);
            }

            const uploadedPicture = await cloudinary.uploader.upload(logo);
            logo = uploadedPicture.secure_url;
        }

        organization.name = name || organization.name;
        organization.description = description || organization.description;
        organization.email = email || organization.email;
        organization.logo = logo || organization.logo;
        organization.website = website || organization.website;

        organization = await organization.save();
        organization.password = null

        return res.status(200).json(organization);
    } catch (error) {
        console.log("Error in updateOrganizationProfile");
        res.status(500).json({error:error.message});
    }
}

const getFollowerList = async (req, res) => {
    const {id} = req.params;

    try {
        const organization = await Organization.findById(id).populate('followers', 'firstName lastName email');
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.status(200).json(organization.followers);
    } catch (error) {
        console.error('Error getting organization followers:', error);
        res.status(500).json({ message: 'Error fetching organization followers' });
    }
}

const getMemberList = async (req, res) => {
    const { id } = req.params;

    try {
        const organization = await Organization.findById(id).populate('members', 'firstName lastName email');

        if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
        }

        res.status(200).json(organization.members);
    } catch (error) {
        console.error('Error getting organization members:', error);
        res.status(500).json({ message: 'Error fetching organization members' });
    }
}

const getApplicantList = async (req, res) => {
    const organizationId = req.organization._id;
  
    try {
      const organization = await Organization.findById(organizationId).populate('applicants', 'firstName lastName email');
  
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
  
      res.status(200).json(organization.applicants);
    } catch (error) {
      console.error('Error getting organization applicants:', error);
      res.status(500).json({ message: 'Error fetching organization applicants' });
    }
}
const getPostList = async (req, res) => {
    const organizationId = req.params.id;
  
    try {
      const organization = await Organization.findById(organizationId).populate('posts', 'title content');
  
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
  
      res.status(200).json(organization.posts);
    } catch (error) {
      console.error('Error getting organization posts:', error);
      res.status(500).json({ message: 'Error fetching organization posts' });
    }
}

export {
    // getOrganizationProfile,
    // updateOrganizationProfile,
    // getFollowerList,
    // getMemberList,
    // getApplicantList,
    // getPostList,

}