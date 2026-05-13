/**
 * One-time migration: classify existing papers and posts into research topics.
 * Run after deploying the topics schema change.
 *
 * Usage: node --experimental-modules scripts/migrate-topics.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Paper from '../models/paper_model.js';
import Post from '../models/post_model.js';
import { classifyTopics } from '../utils/topic-classifier.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kms';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Migrate papers
  const papers = await Paper.find({});
  let paperUpdated = 0;
  for (const paper of papers) {
    const topics = classifyTopics(paper.keywords || [], paper.title || '', paper.abstract || '');
    if (topics.length > 0) {
      paper.topics = topics;
      await paper.save();
      paperUpdated++;
    }
  }
  console.log(`Migrated ${paperUpdated}/${papers.length} papers with topics`);

  // Migrate posts
  const posts = await Post.find({});
  let postUpdated = 0;
  for (const post of posts) {
    const topics = classifyTopics(post.tags || [], post.title || '', post.bodyText || '');
    if (topics.length > 0) {
      post.topics = topics;
      await post.save();
      postUpdated++;
    }
  }
  console.log(`Migrated ${postUpdated}/${posts.length} posts with topics`);

  await mongoose.disconnect();
  console.log('Done');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
