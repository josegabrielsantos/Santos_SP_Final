# UPLB IdSC-FaNS Knowledge Hub

A Knowledge Management System for food and nutrition security research, built as a Special Problem at the UPLB Institute of Computer Science. It pulls research from across UPLB and partner institutions into one place. Organizations curate and moderate what gets published, and AI handles the slow parts (extracting metadata from uploaded papers, generating research insights for each post) on top of full-text search.

## Repository Contents

- `code/` contains the source code for the web app
  - `code/frontend/` is the Next.js client
  - `code/backend/` is the Express.js API
- `Santos_manuscript.pdf` is the final thesis manuscript
- `Santos_poster.pdf` is the defense poster
- `Santos_journal.pdf` is the journal-format paper
- `Santos_presentation.pdf` is the defense presentation slides

## Features

- Search posts and papers with Elasticsearch (filters, sorting, fuzzy matching, BM25 scoring, highlighted results)
- Upload a PDF and Gemini extracts the metadata for you to review before saving
- Every post gets an AI-generated summary, key themes, and research gaps (cached for 7 days)
- Posts are auto-categorized into 8 topics (Food Security, Nutrition & Health, Policy & Governance, and more)
- Site, organization, and public analytics with 14 charts built on Elasticsearch aggregations
- Real-time notifications over Socket.io
- Bulk PDF upload for org admins, with duplicate detection
- Google sign-in with JWT session cookies
- Organizations with a four-tier role hierarchy (Owner, Admin, Member, Follower) and a post-approval workflow

## Tech Stack

### Frontend
- Next.js (React framework, SSR)
- Tailwind CSS and shadcn/ui for styling
- TanStack React Query for server state
- Axios for HTTP
- Recharts for charts
- Socket.io client for live updates
- Google Auth for sign-in

### Backend
- Node.js with Express.js
- MongoDB (via Mongoose) as the primary database
- Elasticsearch for search and analytics
- Socket.io for websockets
- Gemini 2.5 Flash for the AI features
- CrossRef API for DOI lookups

### Infrastructure
- DigitalOcean App Platform for both frontend and backend
- DigitalOcean Managed MongoDB and Elasticsearch
- DigitalOcean Spaces + CDN for PDF and image storage

## Prerequisites

You'll need the following before running the app:

- Node.js v20 or higher, and npm
- A MongoDB instance (local or managed)
- An Elasticsearch instance (local or managed)
- A Google Cloud project with OAuth 2.0 credentials and a Gemini API key
- An S3-compatible object store (DigitalOcean Spaces, AWS S3, or MinIO) with access key, secret key, and bucket name
- A CrossRef contact email for the user-agent header (no API key needed)

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd <repo-name>
```

### 2. Set up the backend

```bash
cd code/backend
npm install
cp .env.example .env
```

Open `code/backend/.env` and fill in:

```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/kms
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GEMINI_API_KEY=...
SPACES_ENDPOINT=...
SPACES_ACCESS_KEY=...
SPACES_SECRET_KEY=...
SPACES_BUCKET=...
FRONTEND_ORIGIN=http://localhost:3000
```

Start the backend:

```bash
npm run dev
```

The API runs on `http://localhost:3001`.

### 3. Set up the frontend

In a separate terminal:

```bash
cd code/frontend
npm install
cp .env.local.example .env.local
```

Open `code/frontend/.env.local` and fill in:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

Start the frontend:

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

### 4. Initial data

The backend creates the `kms_posts` and `kms_papers` Elasticsearch indices on first launch. Any seed or migration scripts live under `code/backend/scripts/`.

## Project Architecture

### High-level

The frontend and backend are deployed separately on DigitalOcean App Platform. The Next.js frontend talks to the Express backend over a REST API using Axios, with auth handled by JWT session cookies (httpOnly, Secure, SameSite=None). A Socket.io websocket runs alongside the REST API for real-time notifications.

### Two databases (MongoDB and Elasticsearch)

The app uses two databases instead of one. MongoDB handles everything transactional: users, organizations, posts, papers, notifications, moderation logs, and the AI-insight cache. Elasticsearch stores denormalized projections of posts (`kms_posts`) and papers (`kms_papers`) optimized for search.

Elasticsearch is there because MongoDB's text index can't do field-level boosting, BM25 relevance scoring, result highlighting, fuzzy matching, or the aggregations the analytics charts depend on.

Syncing MongoDB to Elasticsearch is handled by Mongoose `post('save')` and `post('findOneAndUpdate')` hooks on the Post and Paper schemas. Every write fires a hook that projects the document into the matching Elasticsearch index. No separate sync service.

### File storage

PDFs and images go straight to DigitalOcean Spaces (S3-compatible) and are served through the Spaces CDN. MongoDB only stores the CDN URL, which keeps document size small.

### AI integration

When a user uploads a paper, the PDF is sent to Gemini 2.5 Flash as base64 along with a prompt asking for structured metadata. The result prefills the create-paper form so the user can review and edit before saving (human-in-the-loop).

For related insights, the backend asks Gemini for a summary, key themes, and research gaps related to the post's topics. Each insight is cached in MongoDB for 7 days to keep Gemini usage down.

### Auth

Google OAuth handles sign-in. The backend verifies the Google ID token and issues a JWT session cookie. Roles are split into two levels:

- Site: Registered User, Site Administrator
- Organization: Follower, Member, Admin, Owner

Permissions cascade. For example, Org Admins can do everything Members can, plus approve or reject posts, manage members, and bulk-upload papers.

### Deployment

Frontend and backend run as separate components on DigitalOcean App Platform (`sgp1` region). MongoDB and Elasticsearch are DigitalOcean managed services. PDFs and images live in Spaces with CDN delivery. The only external APIs are Google (OAuth + Gemini) and CrossRef.
