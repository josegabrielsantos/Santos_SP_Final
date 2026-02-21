import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v2 as cloudinary } from 'cloudinary';
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

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectDB();
  await ensureIndexes();
  await syncExistingData();
  console.log('Startup complete.');
});
