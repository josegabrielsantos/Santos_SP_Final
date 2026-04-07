import 'dotenv/config';
import mongoose from 'mongoose';
import InsightCache from '../models/insight_cache_model.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.host}`);

  const before = await InsightCache.countDocuments();
  console.log(`InsightCache documents before: ${before}`);

  const result = await InsightCache.deleteMany({});
  console.log(`Deleted: ${result.deletedCount}`);

  const after = await InsightCache.countDocuments();
  console.log(`InsightCache documents after: ${after}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
