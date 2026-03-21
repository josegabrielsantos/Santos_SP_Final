import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import connectDB from './database/connectDB.js';
import { ensureIndexes, syncExistingData } from './elastic/elastic_client.js';

// Route imports
import authRoutes from './routes/auth_routes.js';
import userRoutes from './routes/user_routes.js';
import postRoutes from './routes/post_routes.js';
import organizationRoutes from './routes/organization_routes.js';
import paperRoutes from './routes/paper_routes.js';
import adminRoutes from './routes/admin_routes.js';
import searchRoutes from './routes/search_routes.js';
import uploadRoutes from './routes/upload_routes.js';
import notificationRoutes from './routes/notification_routes.js';
import analyticsRoutes from './routes/analytics_routes.js';
import feedbackRoutes from './routes/feedback_routes.js';
import activityRoutes from './routes/activity_routes.js';
import recommendationRoutes from './routes/recommendation_routes.js';
import orgRequestRoutes from './routes/org_request_routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
const FRONTEND_ORIGIN = (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie', 'Content-Disposition'],
  })
);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiters
// Auth: 20 requests / 15 min per IP
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
// Post creation: 30 / 10 min
const writeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
// Upload: 20 / 10 min
const uploadLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
// Search: 60 / 1 min
const searchLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', writeLimiter, postRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchLimiter, searchRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/org-requests', orgRequestRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectDB();
  await ensureIndexes();
  await syncExistingData();
  console.log('Startup complete.');
});
