/**
 * esIndexSetup.js
 * Run this ONCE to create the kms_posts and kms_papers indices in Elasticsearch.
 *
 * Usage:
 *   node elastic/esIndexSetup.js
 *
 * Requirements:
 *   npm install @elastic/elasticsearch
 *   ELASTICSEARCH_URL env var (default: http://localhost:9200)
 */

import { ensureIndexes } from './elastic_client.js';

(async () => {
  try {
    await ensureIndexes();
    console.log('[ES] Setup complete.');
    process.exit(0);
  } catch (err) {
    console.error('[ES] Setup failed:', err.message);
    process.exit(1);
  }
})();
