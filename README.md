# UPLB IdSC-FaNS Knowledge Hub

A Knowledge Management System (KMS) for food and nutrition security research, developed as a Special Problem at the University of the Philippines Los Baños Institute of Computer Science. The platform centralizes food and nutrition security research from across UPLB and partner institutions, supports community-driven curation through organizations, and applies AI-assisted metadata extraction and insight generation on top of full-text search.

## Repository Contents

- `code/` — Full source code for the web application
  - `code/frontend/` — Next.js client
  - `code/backend/` — Express.js API server
- `Santos_manuscript.pdf` — Final thesis manuscript
- `Santos_poster.pdf` — Defense poster
- `Santos_journal.pdf` — Journal-format paper
- `Santos_presentation.pdf` — Defense presentation slides

## Features

- **Centralized research repository.** Posts and research papers are organized under Organizations, with a four-tier role hierarchy (Owner, Admin, Member, Follower) plus a site-wide administrator. Submissions enter a pending state and are published only after an organization administrator approves them.
- **Advanced search.** BM25-weighted full-text search across posts and papers via Elasticsearch, with field-level boosting (title, abstract, keywords, authors), filters, sorting, fuzzy matching, and result highlighting.
- **AI-assisted metadata extraction.** Uploaded PDFs are sent to Google Gemini 2.5 Flash, which returns title, authors, abstract, keywords, and year/journal. Extracted fields prefill the create-paper form for user review (human-in-the-loop).
- **AI-generated research insights.** Each post page renders a Gemini-generated summary, key themes, and research gaps related to the post's topics. Insights are cached for 7 days to reduce API usage.
- **Automatic topic classification.** Each post is categorized into eight subtopics: Food Security, Nutrition & Health, Food Science & Technology, Agricultural Systems, Policy & Governance, Traditional Knowledge, Education & Communication, and Environment & Sustainability.
- **Analytics and data visualization.** Fourteen charts across site, organization, and public scopes — posts/papers over time, top tags, post-type distribution, organization comparisons, and more — rendered with Recharts on top of Elasticsearch aggregations.
- **Real-time notifications.** Persistent Socket.io websocket channel for delivering activity notifications.
- **Bulk paper upload** for organization administrators, with duplicate detection.
- **Google OAuth sign-in** with JWT session cookies.

## Tech Stack

### Frontend
- **Next.js** — React framework with server-side rendering
- **React** — UI library
- **Tailwind CSS** — utility-first CSS framework
- **shadcn/ui + Radix UI** — accessible component primitives
- **TanStack React Query** — server-state management, caching, and synchronization
- **Axios** — HTTP client
- **Recharts** — charting library
- **Socket.io client** — real-time updates
- **Google Auth** — sign-in

### Backend
- **Node.js** — runtime
- **Express.js** — REST API framework
- **MongoDB + Mongoose** — primary datastore
- **Elasticsearch** — search index and analytics aggregations
- **Socket.io** — websocket server
- **Google Gemini 2.5 Flash** — AI metadata extraction and insight generation
- **CrossRef REST API** — DOI-based metadata enrichment

### Infrastructure
- **DigitalOcean App Platform** — frontend and backend hosting
- **DigitalOcean Managed MongoDB** — production database
- **DigitalOcean Managed Elasticsearch** — production search
- **DigitalOcean Spaces + CDN** — PDF and image object storage (S3-compatible)

## Prerequisites

Before running the app you will need:

- **Node.js** v20 or higher and **npm**
- A running **MongoDB** instance (local or managed)
- A running **Elasticsearch** instance (local or managed)
- A **Google Cloud project** with:
  - OAuth 2.0 credentials (for Google Sign-In)
  - A **Gemini API** key
- An **S3-compatible object store** (DigitalOcean Spaces, AWS S3, or MinIO) with an access key, secret key, and bucket name
- A **CrossRef** user-agent / email (for DOI enrichment; no API key required)

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

The API will be available at `http://localhost:3001`.

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

The app will be available at `http://localhost:3000`.

### 4. Initial data

The site administrator account, organization seeding, and Elasticsearch index creation are handled by backend startup scripts. On first launch the backend will create the `kms_posts` and `kms_papers` indices automatically. Refer to `code/backend/scripts/` for any seed or migration utilities.

## Project Architecture

### High-Level

The system is a separated frontend and backend deployed on DigitalOcean App Platform. The Next.js frontend is compiled to a production bundle and communicates with the Express backend over a REST API using Axios. Authentication uses JWT session cookies set as `httpOnly`, `Secure`, and `SameSite=None` to allow cross-origin requests from the authenticated frontend. A persistent Socket.io websocket channel runs alongside the REST API to deliver real-time notifications.

### Polyglot Persistence (MongoDB + Elasticsearch)

The application uses two databases to balance transactional integrity with search performance:

- **MongoDB** stores all transactional and relational data: users, organizations, posts, papers, notifications, organization-creation requests, user activities, featured posts, reports, moderation logs, and the AI-insight cache. Mongoose is the ODM.
- **Elasticsearch** stores denormalized projections of posts (`kms_posts` index) and papers (`kms_papers` index), optimized for full-text search and aggregations. Elasticsearch provides field-level boosting, BM25 relevance scoring, `<mark>` result highlighting, fuzzy matching, and analytics aggregations — capabilities MongoDB's text index lacks.

Synchronization from MongoDB to Elasticsearch is handled by Mongoose `post('save')` and `post('findOneAndUpdate')` hooks defined directly on the Post and Paper schemas. The hooks fire after each write and project the document into the corresponding Elasticsearch index, keeping the two stores consistent without a separate sync service.

### File Storage

PDFs and images are uploaded to DigitalOcean Spaces (S3-compatible object storage) and served through the Spaces CDN. MongoDB persists only the CDN URL on the relevant document, keeping document size small and offloading file delivery to the CDN.

### AI Integration

- **Metadata extraction.** A PDF uploaded through the Submit-a-Post dialog is sent to Gemini 2.5 Flash as base64 with a prompt instructing it to return structured paper metadata. The result prefills the create-paper form for user review before submission — a human-in-the-loop design consistent with Human-Centered AI principles.
- **Related insights.** When a post page is viewed, the backend requests a Gemini-generated summary, key themes, and research gaps related to the post's topics. Each insight is cached in MongoDB for 7 days to reduce Gemini API consumption.

### Authentication and Authorization

Google OAuth handles sign-in; the backend verifies the Google ID token and issues a JWT session cookie. Authorization is role-based:

- **Site roles:** Registered User, Site Administrator
- **Organization roles:** Follower, Member, Admin, Owner

Permissions cascade — for example, Organization Admins inherit all Member capabilities plus the ability to approve/reject posts, manage members, and bulk-upload papers.

### Deployment

Both the frontend and backend are deployed as separate components on DigitalOcean App Platform (`sgp1` region). MongoDB and Elasticsearch run as DigitalOcean managed services. Object storage and CDN are handled by DigitalOcean Spaces. Outbound integrations are Google (OAuth + Gemini) and CrossRef.
