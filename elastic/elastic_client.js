/**
 * elastic_client.js
 * Central Elasticsearch client instance and index-setup utility.
 *
 * Set these env vars in .env:
 *   ELASTICSEARCH_URL      (default http://localhost:9200)
 *   ELASTICSEARCH_USERNAME (optional)
 *   ELASTICSEARCH_PASSWORD (optional)
 */

import { Client } from '@elastic/elasticsearch';

const clientOptions = {
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
};

// Add auth only if credentials are provided
if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
  clientOptions.auth = {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  };
}

// For development with self-signed certs
if (process.env.ELASTICSEARCH_URL?.startsWith('https')) {
  clientOptions.tls = { rejectUnauthorized: false };
}

const esClient = new Client(clientOptions);

//  Index definitions 

const kmsPostsMapping = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
  mappings: {
    properties: {
      title:            {
        type: 'text',
        analyzer: 'english',
        fields: { keyword: { type: 'keyword' } },
      },
      bodyText:         { type: 'text', analyzer: 'english' },
      tags:             { type: 'keyword' },
      authorId:         { type: 'keyword' },
      authorName:       {
        type: 'text',
        fields: { keyword: { type: 'keyword' } },
      },
      organizationId:   { type: 'keyword' },
      organizationName: {
        type: 'text',
        fields: { keyword: { type: 'keyword' } },
      },
      status:           { type: 'keyword' },
      likeCount:        { type: 'integer' },
      commentCount:     { type: 'integer' },
      createdAt:        { type: 'date' },
      publishedAt:      { type: 'date' },
      type:             { type: 'keyword' },
      paperIds:         { type: 'keyword' },
      topics:           { type: 'keyword' },
    },
  },
};

const kmsPapersMapping = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
  mappings: {
    properties: {
      title:            {
        type: 'text',
        analyzer: 'english',
        fields: { keyword: { type: 'keyword' } },
      },
      abstract:         { type: 'text', analyzer: 'english' },
      keywords:         { type: 'keyword' },
      authors:          {
        type: 'text',
        analyzer: 'standard',
        fields: { keyword: { type: 'keyword' } },
      },
      journal:          { type: 'text', analyzer: 'standard' },
      isbn:             { type: 'keyword' },
      publicationDate:  { type: 'date' },
      year:             { type: 'integer' },
      doi:              { type: 'keyword' },
      fileUrl:          { type: 'keyword' },
      uploadedBy:       { type: 'keyword' },
      organizationId:   { type: 'keyword' },
      organizationName: { type: 'keyword' },
      sourcePostId:     { type: 'keyword' },
      createdAt:        { type: 'date' },
      downloadCount:    { type: 'integer' },
      topics:           { type: 'keyword' },
    },
  },
};

//  Create indexes if they don't exist 

async function createIndex(name, body) {
  try {
    const exists = await esClient.indices.exists({ index: name });
    if (exists) {
      // Keep existing indexes forward-compatible when new fields are added.
      // Forward-compatible: add new fields to existing indexes
      const newFields = {};
      if (name === 'kms_papers') {
        newFields.fileUrl = { type: 'keyword' };
        newFields.topics = { type: 'keyword' };
      }
      if (name === 'kms_posts') {
        newFields.topics = { type: 'keyword' };
        newFields.organizationName = {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        };
        newFields.authorName = {
          type: 'text',
          fields: { keyword: { type: 'keyword' } },
        };
      }
      if (Object.keys(newFields).length > 0) {
        await esClient.indices.putMapping({
          index: name,
          body: { properties: newFields },
        });
      }
      console.log(`[ES] Index "${name}" already exists - skipping.`);
      return;
    }
    await esClient.indices.create({ index: name, body });
    console.log(`[ES] Index "${name}" created.`);
  } catch (err) {
    console.error(`[ES] Error creating index "${name}":`, err.message);
  }
}

export async function ensureIndexes() {
  try {
    await createIndex('kms_posts', kmsPostsMapping);
    await createIndex('kms_papers', kmsPapersMapping);
    console.log('[ES] Index setup complete.');
  } catch (err) {
    console.error('[ES] Index setup failed:', err.message);
  }
}

//  Bulk sync existing MongoDB data into ES 

export async function syncExistingData() {
  try {

    // Dynamic imports to avoid circular dependency with models that import esSync
    const { default: Post } = await import('../models/post_model.js');
    const { default: Paper } = await import('../models/paper_model.js');

    // Sync published posts (exclude announcements — they are not searchable)
    console.log('[ES sync] Syncing published posts...');
    const posts = await Post.find({ status: 'published', type: { $ne: 'announcement' } })
      .populate('authorId', 'displayName')
      .populate('organizationId', 'name');

    if (posts.length > 0) {
      const postBulkOps = posts.flatMap((post) => [
        { index: { _index: 'kms_posts', _id: post._id.toString() } },
        {
          title:            post.title,
          bodyText:         post.bodyText,
          tags:             post.tags,
          type:             post.type,
          authorId:         post.authorId?._id?.toString() ?? post.authorId?.toString(),
          authorName:       post.authorId?.displayName ?? null,
          organizationId:   post.organizationId?._id?.toString() ?? post.organizationId?.toString() ?? null,
          organizationName: post.organizationId?.name ?? null,
          status:           post.status,
          likeCount:        post.likeCount,
          commentCount:     post.commentCount,
          createdAt:        post.createdAt,
          publishedAt:      post.publishedAt,
          paperIds:         (post.paperIds ?? []).map((id) => id.toString()),
          topics:           post.topics ?? [],
        },
      ]);

      await esClient.bulk({ refresh: true, operations: postBulkOps });
      console.log(`[ES sync] Synced ${posts.length} posts.`);
    } else {
      console.log('[ES sync] No published posts to sync.');
    }

    // Sync published papers
    console.log('[ES sync] Syncing published papers...');
    const papers = await Paper.find({ isPublished: true })
      .populate('uploadedBy', 'displayName')
      .populate('organizationId', 'name');

    if (papers.length > 0) {
      const paperBulkOps = papers.flatMap((paper) => [
        { index: { _index: 'kms_papers', _id: paper._id.toString() } },
        {
          title:            paper.title,
          abstract:         paper.abstract,
          keywords:         paper.keywords,
          authors:          paper.authors,
          journal:          paper.journal,
          isbn:             paper.isbn,
          publicationDate:  paper.publicationDate,
          year:             paper.year,
          doi:              paper.doi,
          fileUrl:          paper.fileUrl,
          uploadedBy:       paper.uploadedBy?._id?.toString() ?? paper.uploadedBy?.toString(),
          organizationId:   paper.organizationId?._id?.toString() ?? paper.organizationId?.toString() ?? null,
          organizationName: paper.organizationId?.name ?? null,
          sourcePostId:     paper.sourcePostId?._id?.toString() ?? paper.sourcePostId?.toString() ?? null,
          createdAt:        paper.createdAt,
          downloadCount:    paper.downloadCount,
          topics:           paper.topics ?? [],
        },
      ]);

      await esClient.bulk({ refresh: true, operations: paperBulkOps });
      console.log(`[ES sync] Synced ${papers.length} papers.`);
    } else {
      console.log('[ES sync] No published papers to sync.');
    }

    console.log('[ES sync] Data synchronization complete.');
  } catch (error) {
    console.error('[ES sync] syncExistingData failed:', error.message);
  }
}

//  Test connection 

esClient.ping()
  .then(() => console.log('[ES] Elasticsearch connected successfully.'))
  .catch((err) => console.error('[ES] Elasticsearch connection failed:', err.message));

export default esClient;
