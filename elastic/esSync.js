/**
 * esSync.js
 * Elasticsearch sync helpers called from Mongoose post-save hooks.
 * All errors are caught here — a failing ES write NEVER fails the API response.
 *
 * Usage in schema files:
 *   import { indexPost, deletePost, indexPaper, deletePaper } from '../elastic/esSync.js';
 *
 * Set ELASTICSEARCH_URL in your .env (e.g. http://localhost:9200)
 */

import esClient from './elastic_client.js';

// ── Posts ─────────────────────────────────────────────────────────────────────

/**
 * Index (create or update) a published post document in kms_posts.
 * Call .populate('authorId organizationId') on the post before passing it here,
 * or populate inside this function if you prefer.
 */
export async function indexPost(post) {
  try {
    // If post is not populated, populate it
    let populatedPost = post;
    if (post.populate) {
      populatedPost = await post.populate('authorId organizationId');
    }

    const docId = populatedPost._id.toString();
    const doc = {
      title:            populatedPost.title,
      bodyText:         populatedPost.bodyText,
      tags:             populatedPost.tags,
      type:             populatedPost.type,
      authorId:         populatedPost.authorId?._id?.toString() ?? populatedPost.authorId?.toString(),
      authorName:       populatedPost.authorId?.displayName ?? null,
      organizationId:   populatedPost.organizationId?._id?.toString() ?? populatedPost.organizationId?.toString() ?? null,
      organizationName: populatedPost.organizationId?.name ?? null,
      status:           populatedPost.status,
      likeCount:        populatedPost.likeCount,
      commentCount:     populatedPost.commentCount,
      createdAt:        populatedPost.createdAt,
      publishedAt:      populatedPost.publishedAt,
      paperIds:         (populatedPost.paperIds ?? []).map((id) => id.toString()),
      topics:           populatedPost.topics ?? [],
    };

    await esClient.index({
      index: 'kms_posts',
      id:    docId,
      document: doc,
    });
    console.log(`[ES sync] Post indexed: ${docId}`);
  } catch (err) {
    console.error('[ES sync] indexPost failed:', err.message);
  }
}

/**
 * Remove a post document from kms_posts (on hide or hard delete).
 * Treats 404 as a no-op.
 */
export async function deletePost(postId) {
  try {
    await esClient.delete({ index: 'kms_posts', id: postId });
    console.log(`[ES sync] Post deleted from index: ${postId}`);
  } catch (err) {
    if (err?.meta?.statusCode !== 404) {
      console.error('[ES sync] deletePost failed:', err.message);
    }
  }
}

// ── Papers ────────────────────────────────────────────────────────────────────

/**
 * Index (create or update) a published paper document in kms_papers.
 */
export async function indexPaper(paper) {
  try {
    let populatedPaper = paper;
    if (paper.populate) {
      populatedPaper = await paper.populate('uploadedBy organizationId');
    }

    const docId = populatedPaper._id.toString();
    const doc = {
      title:            populatedPaper.title,
      abstract:         populatedPaper.abstract,
      keywords:         populatedPaper.keywords,
      authors:          populatedPaper.authors,
      journal:          populatedPaper.journal,
      isbn:             populatedPaper.isbn,
      publicationDate:  populatedPaper.publicationDate,
      year:             populatedPaper.year,
      doi:              populatedPaper.doi,
      fileUrl:          populatedPaper.fileUrl,
      uploadedBy:       populatedPaper.uploadedBy?._id?.toString() ?? populatedPaper.uploadedBy?.toString(),
      organizationId:   populatedPaper.organizationId?._id?.toString() ?? populatedPaper.organizationId?.toString() ?? null,
      organizationName: populatedPaper.organizationId?.name ?? null,
      sourcePostId:     populatedPaper.sourcePostId?._id?.toString() ?? populatedPaper.sourcePostId?.toString() ?? null,
      createdAt:        populatedPaper.createdAt,
      downloadCount:    populatedPaper.downloadCount,
      topics:           populatedPaper.topics ?? [],
    };

    await esClient.index({
      index: 'kms_papers',
      id:    docId,
      document: doc,
    });
    console.log(`[ES sync] Paper indexed: ${docId}`);
  } catch (err) {
    console.error('[ES sync] indexPaper failed:', err.message);
  }
}

/**
 * Remove a paper document from kms_papers (on soft-delete / unpublish).
 * Treats 404 as a no-op.
 */
export async function deletePaper(paperId) {
  try {
    await esClient.delete({ index: 'kms_papers', id: paperId });
    console.log(`[ES sync] Paper deleted from index: ${paperId}`);
  } catch (err) {
    if (err?.meta?.statusCode !== 404) {
      console.error('[ES sync] deletePaper failed:', err.message);
    }
  }
}
