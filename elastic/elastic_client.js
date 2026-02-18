// elastic/elastic_client.js

import mongoose from 'mongoose';
import Paper from '../models/paper_model.js';
import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';
import Post from '../models/post_model.js';
import { Client } from '@elastic/elasticsearch';

const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL || 'https://localhost:9200',
    auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'thWfaVtgu8__6Nv80-VQ'
    },
    tls: {
        rejectUnauthorized: false, // For development only
    },
});

// Index mappings for better search performance
const indexMappings = {
    papers: {
        mappings: {
            properties: {
                title: { 
                    type: 'text',
                    analyzer: 'standard',
                    fields: {
                        keyword: { type: 'keyword' }
                    }
                },
                abstract: {
                    type: 'text', 
                    analyzer: 'standard' 
                },
                authors: {
                    type: 'nested',
                    properties: {
                        name: { 
                            type: 'text',
                            fields: {
                                keyword: { type: 'keyword' }
                            }
                        },
                        email: { type: 'keyword' },
                        affiliation: { type: 'text' }
                    }
                },
                keywords: { type: 'keyword' },
                fields: { type: 'keyword' },
                journal: { 
                    type: 'text',
                    fields: {
                        keyword: { type: 'keyword' }
                    }
                },
                doi: { type: 'keyword' },
                paperType: { type: 'keyword' },
                status: { type: 'keyword' },
                publishedDate: { type: 'date' },
                citationCount: { type: 'integer' },
                organizationId: { type: 'keyword' },
                organizationName: { type: 'keyword' },
                uploadedBy: { type: 'keyword' },
                isPublic: { type: 'boolean' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
            }
        }
    },
    
    users: {
        mappings: {
            properties: {
                firstName: { 
                    type: 'text',
                    fields: {
                        keyword: { type: 'keyword' }
                    }
                },
                lastName: { 
                    type: 'text',
                    fields: {
                        keyword: { type: 'keyword' }
                    }
                },
                fullName: { type: 'text' },
                email: { type: 'keyword' },
                bio: { type: 'text' },
                role: { type: 'keyword' },
                isActive: { type: 'boolean' },
                memberOrganizations: { type: 'keyword' },
                followingOrganizations: { type: 'keyword' },
                adminOrganizations: { type: 'keyword' },
                createdAt: { type: 'date' },
                lastLogin: { type: 'date' }
            }
        }
    },
    
    organizations: {
        mappings: {
            properties: {
                organizationName: { 
                    type: 'text',
                    fields: {
                        keyword: { type: 'keyword' }
                    }
                },
                description: { type: 'text' },
                type: { type: 'keyword' },
                website: { type: 'keyword' },
                location: { type: 'text' },
                memberCount: { type: 'integer' },
                followerCount: { type: 'integer' },
                paperCount: { type: 'integer' },
                postCount: { type: 'integer' },
                isPublic: { type: 'boolean' },
                ownerId: { type: 'keyword' },
                ownerName: { type: 'keyword' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
            }
        }
    },
    
    // posts: {
    //     mappings: {
    //         properties: {
    //             title: { 
    //                 type: 'text',
    //                 fields: {
    //                     keyword: { type: 'keyword' }
    //                 }
    //             },
    //             content: { type: 'text' },
    //             authorId: { type: 'keyword' },
    //             authorName: { type: 'keyword' },
    //             organizationId: { type: 'keyword' },
    //             organizationName: { type: 'keyword' },
    //             tags: { type: 'keyword' },
    //             category: { type: 'keyword' },
    //             likeCount: { type: 'integer' },
    //             commentCount: { type: 'integer' },
    //             isPublic: { type: 'boolean' },
    //             createdAt: { type: 'date' },
    //             updatedAt: { type: 'date' }
    //         }
    //     }
    // }
};

// Create indexes with proper mappings
export const createIndexes = async () => {
    try {
        for (const [indexName, mapping] of Object.entries(indexMappings)) {
            const { body: exists } = await esClient.indices.exists({ index: indexName });
            
            if (!exists) {
                await esClient.indices.create({
                    index: indexName,
                    body: mapping
                });
                console.log(`Created index: ${indexName}`);
            } else {
                console.log(`Index already exists: ${indexName}`);
            }
        }
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
};

// Enhanced sync function for all data types
export const syncExistingData = async () => {
    try {
        console.log('Starting data synchronization...');
        
        // Connect to MongoDB if not connected
        if (!mongoose.connection.readyState) {
            await mongoose.connect(process.env.MONGO_URI, { 
                useNewUrlParser: true, 
                useUnifiedTopology: true 
            });
            console.log('Connected to MongoDB.');
        }

        // Create indexes first
        await createIndexes();

        // Sync Papers
        console.log('Syncing papers...');
        const papers = await Paper.find()
            .populate('organization', 'organizationName')
            .populate('uploadedBy', 'firstName lastName');
        
        if (papers.length > 0) {
            const paperBulkOps = papers.flatMap((paper) => [
                { index: { _index: 'papers', _id: paper._id.toString() } },
                {
                    title: paper.title,
                    abstract: paper.abstract,
                    authors: paper.authors,
                    keywords: paper.keywords,
                    fields: paper.fields,
                    journal: paper.journal,
                    doi: paper.doi,
                    paperType: paper.paperType,
                    status: paper.status,
                    publishedDate: paper.publishedDate,
                    citationCount: paper.citationCount,
                    organizationId: paper.organization?._id.toString(),
                    organizationName: paper.organization?.organizationName,
                    uploadedBy: paper.uploadedBy?._id.toString(),
                    isPublic: paper.isPublic,
                    createdAt: paper.createdAt,
                    updatedAt: paper.updatedAt
                }
            ]);
            
            await esClient.bulk({ refresh: true, body: paperBulkOps });
            console.log(`Synced ${papers.length} papers`);
        }

        // Sync Users
        console.log('Syncing users...');
        const users = await User.find().select('-password');
        
        if (users.length > 0) {
            const userBulkOps = users.flatMap((user) => [
                { index: { _index: 'users', _id: user._id.toString() } },
                {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    bio: user.bio,
                    role: user.role,
                    isActive: user.isActive !== false,
                    memberOrganizations: user.memberOrganization || [],
                    followingOrganizations: user.followingOrganization || [],
                    adminOrganizations: user.adminOrganizations || [],
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin
                }
            ]);
            
            await esClient.bulk({ refresh: true, body: userBulkOps });
            console.log(`Synced ${users.length} users`);
        }

        // Sync Organizations
        console.log('Syncing organizations...');
        const organizations = await Organization.find()
            .populate('owner', 'firstName lastName');
        
        if (organizations.length > 0) {
            const orgBulkOps = organizations.flatMap((org) => [
                { index: { _index: 'organizations', _id: org._id.toString() } },
                {
                    organizationName: org.organizationName,
                    description: org.description,
                    type: org.type,
                    website: org.website,
                    location: org.location,
                    memberCount: org.members?.length || 0,
                    followerCount: org.followers?.length || 0,
                    paperCount: 0, // You can calculate this
                    postCount: 0,  // You can calculate this
                    isPublic: org.isPublic !== false,
                    ownerId: org.owner?._id.toString(),
                    ownerName: org.owner ? `${org.owner.firstName} ${org.owner.lastName}` : '',
                    createdAt: org.createdAt,
                    updatedAt: org.updatedAt
                }
            ]);
            
            await esClient.bulk({ refresh: true, body: orgBulkOps });
            console.log(`Synced ${organizations.length} organizations`);
        }

        // Sync Posts (if you have a Post model)
        // try {
        //     console.log('Syncing posts...');
        //     const posts = await Post.find()
        //         .populate('author', 'firstName lastName')
        //         .populate('organization', 'organizationName');
            
        //     if (posts.length > 0) {
        //         const postBulkOps = posts.flatMap((post) => [
        //             { index: { _index: 'posts', _id: post._id.toString() } },
        //             {
        //                 title: post.title,
        //                 content: post.content,
        //                 authorId: post.author?._id.toString(),
        //                 authorName: post.author ? `${post.author.firstName} ${post.author.lastName}` : '',
        //                 organizationId: post.organization?._id.toString(),
        //                 organizationName: post.organization?.organizationName,
        //                 tags: post.tags || [],
        //                 category: post.category,
        //                 likeCount: post.likes?.length || 0,
        //                 commentCount: post.comments?.length || 0,
        //                 isPublic: post.isPublic !== false,
        //                 createdAt: post.createdAt,
        //                 updatedAt: post.updatedAt
        //             }
        //         ]);
                
        //         await esClient.bulk({ refresh: true, body: postBulkOps });
        //         console.log(`Synced ${posts.length} posts`);
        //     }
        // } catch (postError) {
        //     console.log('Post model not found or error syncing posts:', postError.message);
        // }

        console.log('Data synchronization completed successfully!');
        
    } catch (error) {
        console.error('Error syncing data:', error);
    }
};

// Enhanced change watcher for all collections
export const watchMongoChanges = async () => {
    try {
        console.log('Setting up MongoDB change watchers...');

        // Watch Papers
        const paperChangeStream = Paper.watch();
        paperChangeStream.on('change', async (change) => {
            await handlePaperChange(change);
        });

        // Watch Users
        const userChangeStream = User.watch();
        userChangeStream.on('change', async (change) => {
            await handleUserChange(change);
        });

        // Watch Organizations
        const orgChangeStream = Organization.watch();
        orgChangeStream.on('change', async (change) => {
            await handleOrganizationChange(change);
        });

        // Watch Posts (if available)
        // try {
        //     const postChangeStream = Post.watch();
        //     postChangeStream.on('change', async (change) => {
        //         await handlePostChange(change);
        //     });
        // } catch (error) {
        //     console.log('Post collection watcher not set up:', error.message);
        // }

        console.log('All change watchers active!');

    } catch (error) {
        console.error('Error setting up change watchers:', error);
    }
};

// Change handlers for each collection
const handlePaperChange = async (change) => {
    const { operationType, documentKey, fullDocument } = change;
    
    try {
        switch (operationType) {
            case 'insert':
                const populatedPaper = await Paper.findById(documentKey._id)
                    .populate('organization', 'organizationName')
                    .populate('uploadedBy', 'firstName lastName');
                
                await esClient.index({
                    index: 'papers',
                    id: documentKey._id.toString(),
                    document: {
                        title: populatedPaper.title,
                        abstract: populatedPaper.abstract,
                        authors: populatedPaper.authors,
                        keywords: populatedPaper.keywords,
                        fields: populatedPaper.fields,
                        journal: populatedPaper.journal,
                        doi: populatedPaper.doi,
                        paperType: populatedPaper.paperType,
                        status: populatedPaper.status,
                        publishedDate: populatedPaper.publishedDate,
                        citationCount: populatedPaper.citationCount,
                        organizationId: populatedPaper.organization?._id.toString(),
                        organizationName: populatedPaper.organization?.organizationName,
                        uploadedBy: populatedPaper.uploadedBy?._id.toString(),
                        isPublic: populatedPaper.isPublic,
                        createdAt: populatedPaper.createdAt,
                        updatedAt: populatedPaper.updatedAt
                    }
                });
                console.log(`Paper indexed: ${documentKey._id}`);
                break;

            case 'update':
                const updatedPaper = await Paper.findById(documentKey._id)
                    .populate('organization', 'organizationName')
                    .populate('uploadedBy', 'firstName lastName');
                
                await esClient.update({
                    index: 'papers',
                    id: documentKey._id.toString(),
                    doc: {
                        title: updatedPaper.title,
                        abstract: updatedPaper.abstract,
                        authors: updatedPaper.authors,
                        keywords: updatedPaper.keywords,
                        fields: updatedPaper.fields,
                        journal: updatedPaper.journal,
                        doi: updatedPaper.doi,
                        paperType: updatedPaper.paperType,
                        status: updatedPaper.status,
                        publishedDate: updatedPaper.publishedDate,
                        citationCount: updatedPaper.citationCount,
                        organizationId: updatedPaper.organization?._id.toString(),
                        organizationName: updatedPaper.organization?.organizationName,
                        uploadedBy: updatedPaper.uploadedBy?._id.toString(),
                        isPublic: updatedPaper.isPublic,
                        updatedAt: updatedPaper.updatedAt
                    }
                });
                console.log(`Paper updated: ${documentKey._id}`);
                break;

            case 'delete':
                await esClient.delete({
                    index: 'papers',
                    id: documentKey._id.toString(),
                });
                console.log(`Paper deleted: ${documentKey._id}`);
                break;
        }
    } catch (error) {
        console.error('Error handling paper change:', error);
    }
};

const handleUserChange = async (change) => {
    const { operationType, documentKey } = change;
    
    try {
        switch (operationType) {
            case 'insert':
            case 'update':
                const user = await User.findById(documentKey._id).select('-password');
                
                await esClient.index({
                    index: 'users',
                    id: documentKey._id.toString(),
                    document: {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        fullName: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        bio: user.bio,
                        role: user.role,
                        isActive: user.isActive !== false,
                        memberOrganizations: user.memberOrganization || [],
                        followingOrganizations: user.followingOrganization || [],
                        adminOrganizations: user.adminOrganizations || [],
                        createdAt: user.createdAt,
                        lastLogin: user.lastLogin
                    }
                });
                console.log(`User indexed: ${documentKey._id}`);
                break;

            case 'delete':
                await esClient.delete({
                    index: 'users',
                    id: documentKey._id.toString(),
                });
                console.log(`User deleted: ${documentKey._id}`);
                break;
        }
    } catch (error) {
        console.error('Error handling user change:', error);
    }
};

const handleOrganizationChange = async (change) => {
    const { operationType, documentKey } = change;
    
    try {
        switch (operationType) {
            case 'insert':
            case 'update':
                const org = await Organization.findById(documentKey._id)
                    .populate('owner', 'firstName lastName');
                
                await esClient.index({
                    index: 'organizations',
                    id: documentKey._id.toString(),
                    document: {
                        organizationName: org.organizationName,
                        description: org.description,
                        type: org.type,
                        website: org.website,
                        location: org.location,
                        memberCount: org.members?.length || 0,
                        followerCount: org.followers?.length || 0,
                        paperCount: 0,
                        postCount: 0,
                        isPublic: org.isPublic !== false,
                        ownerId: org.owner?._id.toString(),
                        ownerName: org.owner ? `${org.owner.firstName} ${org.owner.lastName}` : '',
                        createdAt: org.createdAt,
                        updatedAt: org.updatedAt
                    }
                });
                console.log(`Organization indexed: ${documentKey._id}`);
                break;

            case 'delete':
                await esClient.delete({
                    index: 'organizations',
                    id: documentKey._id.toString(),
                });
                console.log(`Organization deleted: ${documentKey._id}`);
                break;
        }
    } catch (error) {
        console.error('Error handling organization change:', error);
    }
};

// const handlePostChange = async (change) => {
//     const { operationType, documentKey } = change;
    
//     try {
//         switch (operationType) {
//             case 'insert':
//             case 'update':
//                 const post = await Post.findById(documentKey._id)
//                     .populate('author', 'firstName lastName')
//                     .populate('organization', 'organizationName');
                
//                 await esClient.index({
//                     index: 'posts',
//                     id: documentKey._id.toString(),
//                     document: {
//                         title: post.title,
//                         content: post.content,
//                         authorId: post.author?._id.toString(),
//                         authorName: post.author ? `${post.author.firstName} ${post.author.lastName}` : '',
//                         organizationId: post.organization?._id.toString(),
//                         organizationName: post.organization?.organizationName,
//                         tags: post.tags || [],
//                         category: post.category,
//                         likeCount: post.likes?.length || 0,
//                         commentCount: post.comments?.length || 0,
//                         isPublic: post.isPublic !== false,
//                         createdAt: post.createdAt,
//                         updatedAt: post.updatedAt
//                     }
//                 });
//                 console.log(`Post indexed: ${documentKey._id}`);
//                 break;

//             case 'delete':
//                 await esClient.delete({
//                     index: 'posts',
//                     id: documentKey._id.toString(),
//                 });
//                 console.log(`Post deleted: ${documentKey._id}`);
//                 break;
//         }
//     } catch (error) {
//         console.error('Error handling post change:', error);
//     }
// };

// Test Elasticsearch connection
esClient.ping({}, (error) => {
    if (error) {
        console.error('Elasticsearch connection failed:', error);
    } else {
        console.log('Elasticsearch connected successfully');
    }
});

export default esClient;