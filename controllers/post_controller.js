import Post from "../models/post_model.js";

const createPost = async (req, res) => {
    try {
        const {title, topic, body, postType, tags} = req.body;
        const {id} = req.params;
        const userId = req.user._id;
        const organization = req.organization;

        // CHECKING IF TOPICS ARE CONFIGURED BY ADMIN
        // if (!organization.topics || organization.topics.length === 0) {
        //     return res.status(400).json({ 
        //         success: false,
        //         error: 'This organization has no topics set up yet. Please contact an admin to create topics first.' 
        //     });
        // }

        // const topicExists = organization.topics.some(t => t.name === topic);

        // if (!topicExists) {
        //     return res.status(400).json({ 
        //         success: false,
        //         error: `Invalid topic: "${topic}"`,
        //         availableTopics: organization.topics.map(t => t.name)
        //     });
        // }

        if (!body || Object.keys(body).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Post body cannot be empty. Include at least text, photos, videos, links, poll, or data snapshots.'
            });
        }

        if (postType === 'poll') {
            if (!body.poll || !body.poll.question || !body.poll.options || body.poll.options.length < 2) {
                return res.status(400).json({
                success: false,
                error: 'Poll posts must include a question and at least 2 options'
                });
            }
        }

        const newPost = new Post({
            title,
            topic,
            author: userId,
            organization: id, // Use the id from params
            body,
            postType: postType || 'discussion', // Default to discussion
            tags: tags || [],
            status: 'pending'
        });
            
            // Step 6: Save to database
        await newPost.save();
        
        // Step 7: Populate author and organization details for response
        await newPost.populate([
            { path: 'author', select: 'username email profilePicture' },
            { path: 'organization', select: 'name description' }
        ]);
        
        // Step 8: Return success response
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: newPost
        });

    } catch (error) {
        console.log('Error in createPost:', error.message);
    
        // Handle validation errors from Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors: messages
            });
        }
        
        // Handle other errors
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error.' 
        });
    }
};

const getOrganizationPosts = async (req, res) => {
    try {
        const {id} = req.params;
        const {
            topic,
            postType,
            sortBy = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 10,
            search
        } = req.query;

        // Build filter query - only show approved posts to regular users
        const filter = {
            organization: id,
            status: { $in: ['approved', 'active'] } // Only approved/active posts
        };

        if (topic) {
            filter.topic = topic;
        }

        if (postType) {
            filter.postType = postType;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { 'body.text': { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Build sort object
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortOptions = {};
        
        if (sortBy === 'popular') {
            sortOptions.likeCount = -1;
        } else if (sortBy === 'engagement') {
            sortOptions.commentCount = -1;
            sortOptions.likeCount = -1;
        } else if (sortBy === 'views') {
            sortOptions.viewCount = -1;
        } else {
            sortOptions[sortBy] = sortOrder;
        }

        sortOptions.isPinned = -1;

        const posts = await Post.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('author', 'username profilePicture')
            .populate('organization', 'name')
            .select('-comments');

        const totalPosts = await Post.countDocuments(filter);
        const totalPages = Math.ceil(totalPosts / limit);

        res.status(200).json({
            success: true,
            posts,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalPosts,
                hasMore: page < totalPages
            }
        });

    } catch (error) {
        console.log('Error in getOrganizationPosts:', error.message);
        console.log('Organization ID:', id.name);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error.' 
        });
    }
};

const getOrganizationPendingPosts = async (req, res) => {
    try {
        const {id} = req.params;
        const {page = 1, limit = 10} = req.query;

        // Check if user is admin (middleware should handle this, but double-check)
        const organization = await Organization.findById(id);
        console.log(organization);
        const userId = req.user._id;
        const userRole = req.user.role;
        
        // const isAdmin = organization.admins.includes(userId);
        // const isOwner = organization.owner.toString() === userId.toString();
        // const isSuperAdmin = userRole === 'superAdmin';

        // if (!isAdmin && !isOwner && !isSuperAdmin) {
        //     return res.status(403).json({
        //         success: false,
        //         error: 'Only admins can view pending posts'
        //     });
        // }

        const skip = (page - 1) * limit;

        const pendingPosts = await Post.find({
            organization: id,
            status: 'pending'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('author', 'username email profilePicture')
        .populate('organization', 'name');

        const totalPending = await Post.countDocuments({
            organization: id,
            status: 'pending'
        });

        const totalPages = Math.ceil(totalPending / limit);

        res.status(200).json({
            success: true,
            pendingPosts,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalPending,
                hasMore: page < totalPages
            }
        });

    } catch (error) {
        console.log('Error in getPendingPosts:', error.message);
        // console.log('Organization ID:', org.name);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error.' 
        });
    }
};

const getPostById = async (req, res) => {
    try {
        const {id, postId} = req.params;
        const userId = req.user?._id;

        const post = await Post.findOne({
            _id: postId,
            organization: id
        })
        .populate('author', 'username email profilePicture')
        .populate('organization', 'name description')
        .populate('comments.author', 'username profilePicture')
        .populate('comments.replies.author', 'username profilePicture')
        .populate('approvalStatus.approvedBy', 'username')
        .populate('approvalStatus.rejectedBy', 'username');

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        // Check if post is pending, rejected, hidden or deleted
        if (['pending', 'rejected', 'deleted', 'hidden'].includes(post.status)) {
            const organization = await Organization.findById(id);
            const isAuthor = post.author._id.toString() === userId?.toString();
            const isAdmin = organization.admins.includes(userId);
            const isOwner = organization.owner.toString() === userId?.toString();
            const isSuperAdmin = req.user?.role === 'superAdmin';

            if (!isAuthor && !isAdmin && !isOwner && !isSuperAdmin) {
                return res.status(404).json({
                    success: false,
                    error: 'Post not found'
                });
            }
        }

        res.status(200).json({
            success: true,
            post
        });

    } catch (error) {
        console.log('Error in getPostById:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error.' 
        });
    }
};

const updatePost = async (req, res) => {
    try {
        const {id, postId} = req.params;
        const {title, topic, body, postType, tags} = req.body;
        const userId = req.user._id;

        const post = await Post.findOne({
            _id: postId,
            organization: id
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        // Check if user is the author
        if (post.author.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You can only edit your own posts'
            });
        }

        // If post was approved, editing sends it back to pending
        const wasApproved = post.status === 'approved' || post.status === 'active';

        // If topic is being changed, validate it
        if (topic && topic !== post.topic) {
            const organization = await Organization.findById(id);
            const topicExists = organization.topics.some(t => t.name === topic);
            
            if (!topicExists) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid topic: "${topic}"`,
                    availableTopics: organization.topics.map(t => t.name)
                });
            }
        }

        // Update fields if provided
        if (title) post.title = title;
        if (topic) post.topic = topic;
        if (body) post.body = body;
        if (postType) post.postType = postType;
        if (tags) post.tags = tags;

        // Mark as edited
        post.isEdited = true;
        post.editHistory.push({
            editedAt: new Date(),
            editedBy: userId,
            reason: req.body.editReason || 'Content updated'
        });

        // If post was approved, send back to pending for re-approval
        if (wasApproved) {
            post.status = 'pending';
            post.approvalStatus = {}; // Clear previous approval
        }

        await post.save();

        await post.populate([
            { path: 'author', select: 'username email profilePicture' },
            { path: 'organization', select: 'name description' }
        ]);

        res.status(200).json({
            success: true,
            message: wasApproved 
                ? 'Post updated and sent for re-approval' 
                : 'Post updated successfully',
            post
        });

    } catch (error) {
        console.log('Error in updatePost:', error.message);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors: messages
            });
        }

        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error.' 
        });
    }
};

const deletePost = async (req, res) => {
    try {
        const {id, postId} = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const post = await Post.findOne({
            _id: postId,
            organization: id
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const organization = await Organization.findById(id);
        
        // Check permissions: author, admin, owner, or superAdmin
        const isAuthor = post.author.toString() === userId.toString();
        const isAdmin = organization.admins.includes(userId);
        const isOwner = organization.owner.toString() === userId.toString();
        const isSuperAdmin = userRole === 'superAdmin';

        if (!isAuthor && !isAdmin && !isOwner && !isSuperAdmin) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to delete this post'
            });
        }

        // Soft delete by changing status
        post.status = 'deleted';
        await post.save();

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });

    } catch (error) {
        console.log('Error in deletePost:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error.' 
        });
    }
};




export {
    createPost,
    getOrganizationPosts,
    getOrganizationPendingPosts,
    getPostById,
    updatePost,
    deletePost,
}