// models/paper_model.js

import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 500
    },
    
    description: {
        type: String,
        trim: true,
        maxLength: 2000
    },
    
    abstract: {
        type: String,
        trim: true,
        maxLength: 5000
    },
    
    // Link to the original paper or DOI
    originalLink: {
        type: String,
        trim: true
    },
    
    doi: {
        type: String,
        trim: true,
        sparse: true,
        index: true, // Index defined here
        validate: {
            validator: function(v) {
                return !v || /^10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+$/.test(v);
            },
            message: 'Invalid DOI format'
        }
    },
    
    // Authors can be mix of users and strings
    authors: [{
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        middleName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        order: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    
    // Organization that owns this paper
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    
    // User who uploaded the paper
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Publication details
    journal: {
        type: String,
        trim: true
    },
    
    volume: {
        type: String,
        trim: true
    },
    
    issue: {
        type: String,
        trim: true
    },
    
    pages: {
        type: String,
        trim: true
    },
    
    publishedDate: {
        type: Date
    },
    
    submittedDate: {
        type: Date
    },
    
    acceptedDate: {
        type: Date
    },
    
    // Paper type/category
    paperType: {
        type: String,
        enum: ['research', 'review', 'case_study', 'conference', 'preprint', 'thesis', 'other'],
        default: 'research'
    },
    
    // Keywords/tags
    keywords: [{
        type: String,
        trim: true
    }],
    
    // Research fields/categories
    fields: [{
        type: String,
        trim: true
    }],
    
    // Paper status
    status: {
        type: String,
        enum: ['draft', 'published', 'submitted', 'under_review', 'accepted', 'rejected'],
        default: 'published'
    },
    
    // Visibility settings
    isPublic: {
        type: Boolean,
        default: true
    },
    
    // Citations and metrics
    citationCount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Additional metadata
    language: {
        type: String,
        default: 'en'
    },
    
    notes: {
        type: String,
        trim: true,
        maxLength: 1000
    },
    
    // Import information (for bulk uploads)
    importBatch: {
        type: String, // Unique identifier for bulk import batch
        sparse: true
    },
    
    importSource: {
        type: String,
        enum: ['manual', 'csv', 'json', 'api'],
        default: 'manual'
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for better query performance
paperSchema.index({ organization: 1, createdAt: -1 });
paperSchema.index({ 'authors.user': 1 });
// paperSchema.index({ doi: 1 }, { sparse: true });
paperSchema.index({ title: 'text', abstract: 'text', keywords: 'text' });
paperSchema.index({ fields: 1 });
paperSchema.index({ status: 1 });
paperSchema.index({ paperType: 1 });

// Virtual for author count
paperSchema.virtual('authorCount').get(function() {
    return this.authors.length;
});

// Virtual for user authors only
paperSchema.virtual('userAuthors').get(function() {
    return this.authors.filter(author => author.user !== null);
});

// Virtual for string authors only
paperSchema.virtual('externalAuthors').get(function() {
    return this.authors.filter(author => author.user === null);
});

// Method to get formatted citation
paperSchema.methods.getFormattedCitation = function() {
    const authorNames = this.authors
        .sort((a, b) => a.order - b.order)
        .map(author => author.name)
        .join(', ');
    
    let citation = `${authorNames}. "${this.title}."`;
    
    if (this.journal) {
        citation += ` ${this.journal}`;
        if (this.volume) citation += ` ${this.volume}`;
        if (this.issue) citation += ` (${this.issue})`;
        if (this.pages) citation += `: ${this.pages}`;
    }
    
    if (this.publishedDate) {
        citation += `, ${this.publishedDate.getFullYear()}.`;
    }
    
    if (this.doi) {
        citation += ` DOI: ${this.doi}`;
    }
    
    return citation;
};

// Static method to find papers by author (user or name)
paperSchema.statics.findByAuthor = function(searchTerm, organizationId = null) {
    const query = {
        $or: [
            { 'authors.name': { $regex: searchTerm, $options: 'i' } },
            { 'authors.email': { $regex: searchTerm, $options: 'i' } }
        ]
    };
    
    if (organizationId) {
        query.organization = organizationId;
    }
    
    return this.find(query).populate('authors.user', 'firstName lastName email');
};

// Pre-save middleware to update timestamps
paperSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Pre-save middleware to sort authors by order
paperSchema.pre('save', function(next) {
    if (this.authors && this.authors.length > 0) {
        this.authors.sort((a, b) => a.order - b.order);
    }
    next();
});

const Paper = mongoose.model('Paper', paperSchema);

export default Paper;