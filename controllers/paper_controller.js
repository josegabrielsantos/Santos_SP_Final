// import mongoose from "mongoose";
// import Paper from "../models/paper_model.js";
// import Author from "../models/author_model.js";
// import Organization from "../models/organization_model.js";
// import User from "../models/user_model.js";
// import esClient, { syncExistingData, watchMongoChanges } from "../elastic/elastic_client.js";

// const createPaper = async (req, res) => {
//     try {
//         const { title, abstract, authors, keywords, publicationDate, doi, journal } = req.body;
//         const organization = req.organization;
//         // Ensure title is provided
//         if (!title || title.trim() === "") {
//             return res.status(400).json({ message: "Title is required." });
//         }

//         // Ensure authors is an array
//         if (!Array.isArray(authors) || authors.length === 0) {
//             return res.status(400).json({ message: "Authors must be an array." });
//         }

//         if (!Array.isArray(keywords) || keywords.length === 0) {
//             res.status(400);
//             throw new Error('Keywords must be a non-empty array');
//         }

//         const newPaper = new Paper({
//             title,
//             abstract,
//             authors,
//             keywords,
//             publicationDate,
//             doi,
//             journal,
//             organization,
//         });
        
//         // Save the paper and return the result
//         const savedPaper = await newPaper.save();
//         watchMongoChanges();
//         res.status(201).json(savedPaper);
//     } catch (error) {
//         console.error("Error in createPaper", error);
//         res.status(500).json({ error: error.message || "Internal Server Error." });
//     }
// };

// const getPaperById = async (req, res) => {
//     try {
//         const {id} = req.params;
//         if (!mongoose.Types.ObjectId.isValid(id)) {
//             return res.status(400).json({ error: "Invalid Paper ID." });
//         }
//         const paper = await Paper.findById(id);

//         if(!paper) return res.status(404).json({error: "Paper not found."});
//         res.status(201).json(paper);
//     } catch (error) {
//         res.status(500).json({error:"Internal Server Error"});
//         console.log("Error in like post controller.",error); 
//     }
// }

// const updatePaper = async (req, res) => {
//     // const {title, abstract, authors, keywords, publicationDate, journal, doi} = req.body;
//     // const {id} = req.params;

//     // const paper = await Paper.findById(id)

//     // if(!paper) return res.status(404).json({error: "Paper not found."});

//     // paper.title = title || paper.title;
//     // paper.abstract = abstract || paper.abstract;
//     // paper. = title || paper.title;
//     // paper.title = title || paper.title;

//     // try {
        
//     // } catch (error) {
        
//     // }
// }

// const deletePaper = async (req, res) => {
//     try {
//         const paperId = req.params.id;
        
//         // Check if paper exists
//         const paper = await Paper.findById(paperId);
//         if (!paper) {
//             return res.status(404).json({ message: "Paper not found." });
//         }

//         // Get the current user or organization (logged-in user/organization)
//         // const creatorId = req.user ? req.user.id : req.organization ? req.organization.id : null;
//         // const creatorType = req.user ? 'User' : req.organization ? 'Organization' : null;

//         // if (!creatorId || !creatorType) {
//         //     return res.status(400).json({ message: "Creator information is required to delete." });
//         // }

//         // Check if the current user or organization is the creator of the paper
//         // if (paper.createdBy.toString() !== creatorId.toString()) {
//         //     return res.status(403).json({ message: "You do not have permission to delete this paper." });
//         // }

//         // Delete the paper
//         await Paper.findByIdAndDelete(paperId);
//         res.status(200).json({ message: "Paper deleted successfully." });
//     } catch (error) {
//         console.error("Error in deletePaper", error);
//         res.status(500).json({ error: error.message || "Internal Server Error." });
//     }
// };

// const searchPapers = async (req, res) => {
//     try {
//         const { query, filters } = req.body;

//         if (!query || typeof query !== 'string' || query.trim() === '') {
//             return res.status(400).json({ error: 'Query is required and must be a non-empty string.' });
//         }

//         const searchQuery = {
//             index: 'papers',
//             query: {
//                 bool: {
//                     must: [
//                         {
//                             multi_match: {
//                                 query,
//                                 fields: ['title', 'abstract', 'keywords', 'authors.name'],
//                                 fuzziness: 'AUTO',
//                             },
//                         },
//                     ],
//                     filter: filters || [],
//                 },
//             },
//         };

//         const response = await esClient.search(searchQuery);
//         console.log(response)
//         res.status(200).json({message: response.hits.hits });
//     } catch (error) {
//         console.error('Error in searchPapers:', error.message);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// };
  
// const getPaperByAuthor = async (req, res) => {
//     try {
//         const { query, filters, author } = req.body;

//         if (!query || typeof query !== 'string' || query.trim() === '') {
//             return res.status(400).json({ error: 'Query is required and must be a non-empty string.' });
//         }

//         const searchQuery = {
//             index: 'papers',
//             query: {
//                 bool: {
//                     must: [
//                         {
//                             match: {
//                                 query,
//                                 [author]: ['title', 'abstract', 'keywords', 'authors.name'],
//                                 fuzziness: 'AUTO',
//                             },
//                         },
//                     ],
//                     filter: filters || [],
//                 },
//             },
//         };

//         const response = await esClient.search(searchQuery);
//         console.log(response)
//         res.status(200).json({message: response.hits.hits });
//     } catch (error) {
//         console.error('Error in searchPapers:', error.message);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// }

// const getPaperByKeyword = async (req, res) => {
//     try {
//         const { keyword } = req.params;
//         const { query } = req.body;

//         if (!query || typeof query !== 'string' || query.trim() === '') {
//             return res.status(400).json({ error: 'Query is required and must be a non-empty string.' });
//         }

//         const searchQuery = {
//             index: 'papers',
//             query: {
//                 bool: {
//                     must: [
//                         {
//                             multi_match: {
//                                 query,
//                                 fields: ['title', 'abstract', 'keywords', 'authors.name'],
//                                 fuzziness: 'AUTO',
//                             },
//                         },
//                     ],
//                     filter: [
//                         { term: { 'authors.name.keyword': author } }, // Exact match for the author's name
//                     ],
//                 },
//             },
//         };

//         const { body } = await esClient.search(searchQuery);

//         if (!body.hits.hits.length) {
//             return res.status(404).json({ message: 'No papers found for the specified author and query.' });
//         }

//         const results = body.hits.hits.map((hit) => ({
//             id: hit._id,
//             ...hit._source,
//         }));

//         res.status(200).json({ results, total: body.hits.total.value });
//     } catch (error) {
//         console.error('Error in searchPapersByAuthor:', error.message);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// };


// const getAllPapers = async (req, res) => {
//     try {
//         const papers = await Paper.find().sort({createdAt: -1}).populate({
//             path: "title",
//             select: "-password"
//         });

//         if(papers.length === 0){
//             return res.status(200).json([]);
//         }

//         res.status(200).json(papers);

//     } catch (error) {
//         res.status(500).json({error:"Internal Server Error"});
//         console.log("Error in get all post controller.",error);
//     }  
// }

// export {
//     createPaper,
//     getPaperById,
//     updatePaper,
//     deletePaper,
//     searchPapers,
//     getAllPapers,
//     getPaperByAuthor,
//     getPaperByKeyword
// };

// controllers/paper_controllers.js

import Paper from '../models/paper_model.js';
import Organization from '../models/organization_model.js';
import User from '../models/user_model.js';
import { v4 as uuidv4 } from 'uuid';

// Create a single paper
const createPaper = async (req, res) => {
    try {
        const {
            title,
            description,
            abstract,
            originalLink,
            doi,
            authors,
            journal,
            volume,
            issue,
            pages,
            publishedDate,
            submittedDate,
            acceptedDate,
            paperType,
            keywords,
            fields,
            status,
            isPublic,
            citationCount,
            language,
            notes
        } = req.body;

        const { id: organizationId } = req.params;
        const uploadedBy = req.user._id;

        // Validate required fields
        if (!title) {
            return res.status(400).json({ error: "Title is required." });
        }

        if (!authors || !Array.isArray(authors) || authors.length === 0) {
            return res.status(400).json({ error: "At least one author is required." });
        }

        // Process authors - all as strings now
        const processedAuthors = [];
        for (let i = 0; i < authors.length; i++) {
            const author = authors[i];
            let processedAuthor = {
                name: author.name,
                email: author.email || null,
                affiliation: author.affiliation || null,
                isCorresponding: author.isCorresponding || false,
                order: author.order || (i + 1)
            };

            processedAuthors.push(processedAuthor);
        }

        // Create the paper
        const newPaper = new Paper({
            title,
            description,
            abstract,
            originalLink,
            doi,
            authors: processedAuthors,
            organization: organizationId,
            uploadedBy,
            journal,
            volume,
            issue,
            pages,
            publishedDate: publishedDate ? new Date(publishedDate) : null,
            submittedDate: submittedDate ? new Date(submittedDate) : null,
            acceptedDate: acceptedDate ? new Date(acceptedDate) : null,
            paperType: paperType || 'research',
            keywords: keywords || [],
            fields: fields || [],
            status: status || 'published',
            isPublic: isPublic !== undefined ? isPublic : true,
            citationCount: citationCount || 0,
            language: language || 'en',
            notes,
            importSource: 'manual'
        });

        await newPaper.save();

        // Populate the response
        const populatedPaper = await Paper.findById(newPaper._id)
            .populate('uploadedBy', 'firstName lastName email')
            .populate('organization', 'organizationName');

        res.status(201).json({
            message: "Paper created successfully",
            paper: populatedPaper
        });

    } catch (error) {
        console.log("Error in createPaper", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Get papers for an organization
const getOrganizationPapers = async (req, res) => {
    try {
        const { id: organizationId } = req.params;
        const { 
            page = 1, 
            limit = 20, 
            sortBy = 'createdAt', 
            order = 'desc',
            paperType,
            status,
            field,
            author,
            year
        } = req.query;

        const skip = (page - 1) * limit;
        const sortOrder = order === 'desc' ? -1 : 1;

        // Build query
        let query = { organization: organizationId };

        // Add filters
        if (paperType) query.paperType = paperType;
        if (status) query.status = status;
        if (field) query.fields = { $in: [field] };
        if (author) {
            query.$or = [
                { 'authors.name': { $regex: author, $options: 'i' } },
                { 'authors.email': { $regex: author, $options: 'i' } }
            ];
        }
        if (year) {
            const yearStart = new Date(`${year}-01-01`);
            const yearEnd = new Date(`${year}-12-31`);
            query.publishedDate = { $gte: yearStart, $lte: yearEnd };
        }

        // Check user permissions for visibility
        const userId = req.user?._id;
        if (!userId) {
            query.isPublic = true;
        } else {
            const organization = await Organization.findById(organizationId);
            const isOwner = organization.owner.toString() === userId.toString();
            const isAdmin = organization.admins.includes(userId);
            const isMember = organization.members.includes(userId);
            const isSuperAdmin = req.user.role === 'superAdmin';

            // Non-members can only see public papers
            if (!isMember && !isAdmin && !isOwner && !isSuperAdmin) {
                query.isPublic = true;
            }
        }

        // Sort options
        let sortOptions = {};
        if (sortBy === 'publishedDate') {
            sortOptions = { publishedDate: sortOrder, createdAt: -1 };
        } else if (sortBy === 'citationCount') {
            sortOptions = { citationCount: sortOrder, createdAt: -1 };
        } else if (sortBy === 'title') {
            sortOptions = { title: sortOrder };
        } else {
            sortOptions = { [sortBy]: sortOrder };
        }

        const papers = await Paper.find(query)
            .populate('uploadedBy', 'firstName lastName email')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Paper.countDocuments(query);

        res.status(200).json({
            papers,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                hasNext: skip + papers.length < total,
                hasPrev: page > 1
            },
            filters: {
                paperType,
                status,
                field,
                author,
                year
            }
        });

    } catch (error) {
        console.log("Error in getOrganizationPapers", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Get single paper details
const getPaperById = async (req, res) => {
    try {
        const { paperId } = req.params;

        const paper = await Paper.findById(paperId)
            .populate('uploadedBy', 'firstName lastName email profilePicture')
            .populate('organization', 'organizationName description');

        if (!paper) {
            return res.status(404).json({ error: "Paper not found." });
        }

        // Check visibility permissions
        if (!paper.isPublic) {
            const userId = req.user?._id;
            if (!userId) {
                return res.status(403).json({ error: "Access denied." });
            }

            const organization = await Organization.findById(paper.organization._id);
            const isOwner = organization.owner.toString() === userId.toString();
            const isAdmin = organization.admins.includes(userId);
            const isMember = organization.members.includes(userId);
            const isSuperAdmin = req.user.role === 'superAdmin';

            if (!isMember && !isAdmin && !isOwner && !isSuperAdmin) {
                return res.status(403).json({ error: "Access denied." });
            }
        }

        res.status(200).json({ paper });

    } catch (error) {
        console.log("Error in getPaperById", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Update paper
const updatePaper = async (req, res) => {
    try {
        const { paperId } = req.params;
        const updates = req.body;

        const paper = await Paper.findById(paperId);
        if (!paper) {
            return res.status(404).json({ error: "Paper not found." });
        }

        // Process authors if provided - all as strings
        if (updates.authors) {
            const processedAuthors = [];
            for (let i = 0; i < updates.authors.length; i++) {
                const author = updates.authors[i];
                let processedAuthor = {
                    name: author.name,
                    email: author.email || null,
                    affiliation: author.affiliation || null,
                    isCorresponding: author.isCorresponding || false,
                    order: author.order || (i + 1)
                };

                processedAuthors.push(processedAuthor);
            }
            updates.authors = processedAuthors;
        }

        // Convert date strings to Date objects
        if (updates.publishedDate) updates.publishedDate = new Date(updates.publishedDate);
        if (updates.submittedDate) updates.submittedDate = new Date(updates.submittedDate);
        if (updates.acceptedDate) updates.acceptedDate = new Date(updates.acceptedDate);

        const updatedPaper = await Paper.findByIdAndUpdate(
            paperId,
            { ...updates, updatedAt: Date.now() },
            { new: true, runValidators: true }
        )
        .populate('uploadedBy', 'firstName lastName email')
        .populate('organization', 'organizationName');

        res.status(200).json({
            message: "Paper updated successfully",
            paper: updatedPaper
        });

    } catch (error) {
        console.log("Error in updatePaper", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Delete paper
const deletePaper = async (req, res) => {
    try {
        const { paperId } = req.params;

        const paper = await Paper.findById(paperId);
        if (!paper) {
            return res.status(404).json({ error: "Paper not found." });
        }

        await Paper.findByIdAndDelete(paperId);

        res.status(200).json({ message: "Paper deleted successfully" });

    } catch (error) {
        console.log("Error in deletePaper", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Bulk upload papers from CSV/JSON
const bulkUploadPapers = async (req, res) => {
    try {
        const { id: organizationId } = req.params;
        const { papers, fileType } = req.body; // papers array from parsed CSV/JSON
        const uploadedBy = req.user._id;

        if (!papers || !Array.isArray(papers) || papers.length === 0) {
            return res.status(400).json({ error: "Papers array is required." });
        }

        const batchId = uuidv4(); // Unique identifier for this bulk upload
        const results = {
            success: [],
            failed: [],
            duplicates: []
        };

        for (let i = 0; i < papers.length; i++) {
            try {
                const paperData = papers[i];

                // Skip if no title
                if (!paperData.title) {
                    results.failed.push({
                        row: i + 1,
                        reason: "Title is required",
                        data: paperData
                    });
                    continue;
                }

                // Check for duplicates by title and DOI
                const existingPaper = await Paper.findOne({
                    organization: organizationId,
                    $or: [
                        { title: paperData.title.trim() },
                        ...(paperData.doi ? [{ doi: paperData.doi.trim() }] : [])
                    ]
                });

                if (existingPaper) {
                    results.duplicates.push({
                        row: i + 1,
                        existingId: existingPaper._id,
                        title: paperData.title,
                        reason: "Paper with same title or DOI already exists"
                    });
                    continue;
                }

                // Process authors
                let processedAuthors = [];
                if (paperData.authors) {
                    // Handle different author formats
                    let authorList = [];
                    
                    if (typeof paperData.authors === 'string') {
                        // Split by semicolon or comma
                        authorList = paperData.authors.split(/[;,]/).map(a => a.trim());
                    } else if (Array.isArray(paperData.authors)) {
                        authorList = paperData.authors;
                    }

                    for (let j = 0; j < authorList.length; j++) {
                        const authorInfo = authorList[j];
                        let processedAuthor = {
                            name: '',
                            email: null,
                            affiliation: null,
                            isCorresponding: false,
                            order: j + 1
                        };

                        if (typeof authorInfo === 'string') {
                            processedAuthor.name = authorInfo.trim();
                        } else if (typeof authorInfo === 'object') {
                            processedAuthor.name = authorInfo.name || '';
                            processedAuthor.email = authorInfo.email || null;
                            processedAuthor.affiliation = authorInfo.affiliation || null;
                            processedAuthor.isCorresponding = authorInfo.isCorresponding || false;
                        }

                        processedAuthors.push(processedAuthor);
                    }
                }

                // If no authors processed, create default
                if (processedAuthors.length === 0) {
                    processedAuthors.push({
                        name: 'Unknown Author',
                        email: null,
                        affiliation: null,
                        isCorresponding: false,
                        order: 1
                    });
                }

                // Create paper
                const newPaper = new Paper({
                    title: paperData.title.trim(),
                    description: paperData.description || '',
                    abstract: paperData.abstract || '',
                    originalLink: paperData.originalLink || paperData.link || '',
                    doi: paperData.doi || '',
                    authors: processedAuthors,
                    organization: organizationId,
                    uploadedBy,
                    journal: paperData.journal || '',
                    volume: paperData.volume || '',
                    issue: paperData.issue || '',
                    pages: paperData.pages || '',
                    publishedDate: paperData.publishedDate ? new Date(paperData.publishedDate) : null,
                    submittedDate: paperData.submittedDate ? new Date(paperData.submittedDate) : null,
                    acceptedDate: paperData.acceptedDate ? new Date(paperData.acceptedDate) : null,
                    paperType: paperData.paperType || 'research',
                    keywords: paperData.keywords ? 
                        (Array.isArray(paperData.keywords) ? paperData.keywords : paperData.keywords.split(/[;,]/).map(k => k.trim())) : [],
                    fields: paperData.fields ? 
                        (Array.isArray(paperData.fields) ? paperData.fields : paperData.fields.split(/[;,]/).map(f => f.trim())) : [],
                    status: paperData.status || 'published',
                    isPublic: paperData.isPublic !== undefined ? paperData.isPublic : true,
                    citationCount: paperData.citationCount || 0,
                    language: paperData.language || 'en',
                    notes: paperData.notes || '',
                    importBatch: batchId,
                    importSource: fileType === 'json' ? 'json' : 'csv'
                });

                await newPaper.save();

                results.success.push({
                    row: i + 1,
                    paperId: newPaper._id,
                    title: newPaper.title
                });

            } catch (paperError) {
                results.failed.push({
                    row: i + 1,
                    reason: paperError.message,
                    data: papers[i]
                });
            }
        }

        res.status(200).json({
            message: "Bulk upload completed",
            batchId,
            results: {
                totalProcessed: papers.length,
                successful: results.success.length,
                failed: results.failed.length,
                duplicates: results.duplicates.length,
                details: results
            }
        });

    } catch (error) {
        console.log("Error in bulkUploadPapers", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Search papers across organizations (public)
const searchPapers = async (req, res) => {
    try {
        const { 
            query, 
            page = 1, 
            limit = 10,
            paperType,
            field,
            year,
            organizationId
        } = req.query;

        if (!query) {
            return res.status(400).json({ error: "Search query is required." });
        }

        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {
            isPublic: true,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { abstract: { $regex: query, $options: 'i' } },
                { keywords: { $regex: query, $options: 'i' } },
                { 'authors.name': { $regex: query, $options: 'i' } }
            ]
        };

        // Add filters
        if (paperType) searchQuery.paperType = paperType;
        if (field) searchQuery.fields = { $in: [field] };
        if (organizationId) searchQuery.organization = organizationId;
        if (year) {
            const yearStart = new Date(`${year}-01-01`);
            const yearEnd = new Date(`${year}-12-31`);
            searchQuery.publishedDate = { $gte: yearStart, $lte: yearEnd };
        }

        const papers = await Paper.find(searchQuery)
            .populate('organization', 'organizationName profilePicture')
            .select('title abstract authors journal publishedDate paperType citationCount doi originalLink')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ citationCount: -1, publishedDate: -1 });

        const total = await Paper.countDocuments(searchQuery);

        res.status(200).json({
            papers,
            query,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                hasNext: skip + papers.length < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.log("Error in searchPapers", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

// Get papers by author (user or name)
const getPapersByAuthor = async (req, res) => {
    try {
        const { authorSearch } = req.query;
        const { id: organizationId } = req.params;

        if (!authorSearch) {
            return res.status(400).json({ error: "Author search term is required." });
        }

        const papers = await Paper.findByAuthor(authorSearch, organizationId)
            .populate('organization', 'organizationName')
            .select('title authors journal publishedDate paperType citationCount doi originalLink')
            .sort({ publishedDate: -1 });

        res.status(200).json({ papers });

    } catch (error) {
        console.log("Error in getPapersByAuthor", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

export {
    createPaper,
    getOrganizationPapers,
    getPaperById,
    updatePaper,
    deletePaper,
    bulkUploadPapers,
    searchPapers,
    getPapersByAuthor
};