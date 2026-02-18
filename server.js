import express from "express";
import dotenv from "dotenv";
import cors from "cors"; // ← MAKE SURE THIS IS IMPORTED
import authRoutes from "./routes/auth_routes.js";
import userRoutes from "./routes/user_routes.js";
// import postRoutes from "./routes/post_routes.js";
import organizationRoutes from "./routes/organization_routes.js";
import paperRoutes from "./routes/paper_routes.js";
import adminRoutes from "./routes/admin_routes.js";
import searchRoutes from "./routes/search_routes.js";
import connectDB from "./database/connectDB.js";
import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";
import { syncExistingData } from './elastic/elastic_client.js';
import Organization from "./models/organization_model.js";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CRITICAL: CORS MUST BE FIRST - BEFORE ALL OTHER MIDDLEWARE
app.use(cors({
    origin: "http://localhost:3001", // ← EXACT match for your frontend
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
}));

// Then other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes - these come AFTER middleware
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
// app.use("/api/post", postRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/paper", paperRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search", searchRoutes);

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    connectDB();
    syncExistingData();
    (async () => {
        const indexes = await Organization.collection.getIndexes();
        const allowedIndexes = ["_id_"];
        for (const indexName of Object.keys(indexes)) {
            if (!allowedIndexes.includes(indexName)) {
                console.log(`Dropping unused index: ${indexName}`);
                await Organization.collection.dropIndex(indexName);
            }
        }
        console.log("✅ Cleaned up unused indexes");
    })();
});