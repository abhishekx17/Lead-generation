# 🛠️ Development Pipeline — AI-Powered Lead Generation & Management System

A step-by-step execution pipeline to build the project from zero to fully working.

---

## Pipeline Overview

```
Stage 1: Project Setup
      ↓
Stage 2: Database Layer
      ↓
Stage 3: Scraping Engine
      ↓
Stage 4: Data Processing
      ↓
Stage 5: Google Sheets Integration
      ↓
Stage 6: AI & RAG Pipeline
      ↓
Stage 7: REST API
      ↓
Stage 8: Frontend UI
      ↓
Stage 9: Testing & Hardening
      ↓
Stage 10: Deployment
```

---

## Stage 1 — Project Setup & Scaffolding

**Goal:** Get the base project running locally with both client and server connected.

### Steps

- [ ] Create root project folder `ai-lead-gen/`
- [ ] Initialize `server/` with `npm init -y`
- [ ] Initialize `client/` with `npm create vite@latest` (React + JS)
- [ ] Install backend dependencies:
  ```
  express, cors, dotenv, mongoose, nodemon, concurrently
  ```
- [ ] Install frontend dependencies:
  ```
  tailwindcss, axios, react-router-dom
  ```
- [ ] Configure Tailwind CSS in `client/`
- [ ] Set up `server/index.js` with Express, CORS, and dotenv
- [ ] Create `.env` file with placeholder values
- [ ] Create `.gitignore` (node_modules, .env, credentials)
- [ ] Add root `package.json` with `dev` script using `concurrently`
- [ ] Verify: both client and server run with `npm run dev`

### Deliverable
Running React app on `localhost:5173` and Express server on `localhost:5000`

---

## Stage 2 — Database Layer (MongoDB + Mongoose)

**Goal:** Connect MongoDB and define all data models.

### Steps

- [ ] Install `mongoose` in server
- [ ] Create `server/config/db.js` — MongoDB connection with error handling
- [ ] Call `connectDB()` inside `server/index.js`
- [ ] Create `server/models/Campaign.js`:
  ```
  Fields: name, location, targetAudience, requiredLeads,
          status (pending/running/completed/failed),
          totalLeads, sheetUrl, createdAt
  ```
- [ ] Create `server/models/Lead.js`:
  ```
  Fields: campaignId (ref), businessName, email, phone,
          website, address, industry, isValid, createdAt
  ```
- [ ] Create `server/scripts/seedTest.js` to insert dummy data
- [ ] Run seed script and verify data in MongoDB Compass or Atlas
- [ ] Add indexes: `email` (unique per campaign), `campaignId`

### Deliverable
MongoDB connected, both models working, seed data visible in database

---

## Stage 3 — Web Scraping Engine

**Goal:** Automatically extract business leads from the web based on campaign input.

### Steps

- [ ] Install scraping dependencies:
  ```
  puppeteer, cheerio, axios
  ```
- [ ] Create `server/services/scraper.js`
- [ ] Implement `scrapeLeads({ location, targetAudience, requiredLeads })`:
  - Launch Puppeteer in headless mode
  - Build search query: `"{targetAudience} in {location} email contact"`
  - Iterate through Google result pages (up to 10 pages)
  - For each page, use Cheerio to extract:
    - Business name (title tags, h1, h2, strong)
    - Email (regex: `/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g`)
    - Phone (regex for 10-digit Indian numbers)
    - Website (href links)
    - Address (meta description, paragraph text)
  - Add 2–3 second delay between pages to avoid blocking
  - Randomize User-Agent headers on each request
  - Stop loop when `requiredLeads` count is reached
  - Return raw leads array
- [ ] Handle errors: CAPTCHA detection, empty results, timeout
- [ ] Test scraper manually with a sample campaign

### Deliverable
`scrapeLeads()` returns an array of raw lead objects for any location + industry input

---

## Stage 4 — Data Processing & Cleaning

**Goal:** Clean, validate, and deduplicate raw scraped leads.

### Steps

- [ ] Create `server/services/dataProcessor.js`
- [ ] Implement `processLeads(rawLeads)`:
  - Remove leads where both email AND phone are missing
  - Validate email format using regex
  - Remove duplicate emails within the same batch
  - Trim whitespace from all string fields
  - Normalize phone numbers (remove spaces, dashes, country codes)
  - Tag each lead with an `industry` field based on campaign targetAudience
  - Return cleaned leads array
- [ ] Add a `generateLeadSummary(leads)` helper:
  - Total leads count
  - Count with valid email
  - Count with valid phone
  - Count with website
- [ ] Test processor with sample raw data

### Deliverable
Clean, validated lead array ready for storage and export

---

## Stage 5 — Google Sheets Integration

**Goal:** Export leads to Google Sheets automatically, one sheet per campaign.

### Steps

- [ ] Create a Google Cloud project
- [ ] Enable Google Sheets API
- [ ] Create a Service Account and download credentials JSON
- [ ] Share target Google Spreadsheet with the service account email (Editor access)
- [ ] Add `GOOGLE_CREDENTIALS_PATH` and `SPREADSHEET_ID` to `.env`
- [ ] Install `googleapis` in server
- [ ] Create `server/config/googleAuth.js`:
  - Authenticate using service account credentials
  - Return authorized `google.auth.GoogleAuth` instance
- [ ] Create `server/services/sheets.js`:
  - `createSheet(spreadsheetId, sheetTitle)` — adds a new tab
  - `appendLeads(spreadsheetId, sheetTitle, leads)` — writes header row + all lead rows
  - `getSheetUrl(spreadsheetId, sheetTitle)` — returns direct URL to the sheet tab
- [ ] Test: create a campaign, run export, verify sheet appears in Google Sheets

### Deliverable
After scraping, leads are automatically exported to a new Google Sheet tab

---

## Stage 6 — AI & RAG Pipeline

**Goal:** Convert leads into searchable knowledge and enable natural language querying.

### Sub-stages

### 6A — Vector Database Setup
- [ ] Install Docker Desktop
- [ ] Create `docker-compose.yml` at project root:
  ```yaml
  services:
    chromadb:
      image: chromadb/chroma
      ports:
        - "8000:8000"
  ```
- [ ] Run: `docker-compose up -d`
- [ ] Install `chromadb` npm client in server
- [ ] Verify ChromaDB running at `http://localhost:8000`

### 6B — Embeddings Service
- [ ] Add `OPENAI_API_KEY` to `.env`
- [ ] Install `openai` npm package
- [ ] Create `server/services/embeddings.js`:
  - `createEmbedding(text)` — calls OpenAI `text-embedding-3-small`, returns vector
  - `embedLeads(leads, campaignName)`:
    - Convert each lead to plain text string:
      ```
      Business: {name}, Email: {email}, Phone: {phone}, Address: {address}, Industry: {industry}
      ```
    - Batch-create embeddings (max 100 at a time)
    - Store in ChromaDB collection named after campaign
    - Include metadata: `{ campaignId, email, phone, businessName }`

### 6C — RAG Query Service
- [ ] Create `server/services/rag.js`:
  - `queryLeads(userQuestion, campaignId)`:
    - Embed the user's question
    - Query ChromaDB for top 10 most similar leads
    - Build a context string from retrieved leads
    - Call `gpt-4o` with system prompt:
      ```
      You are a lead management assistant. Answer only using the lead data
      in context. Be concise. For count questions, count accurately.
      ```
    - Return the AI's plain text answer
  - `queryAllCampaigns(userQuestion)`:
    - Same flow but queries across all ChromaDB collections

### Deliverable
Users can ask questions in plain English and get accurate answers from their lead data

---

## Stage 7 — REST API Routes

**Goal:** Expose all backend functionality through clean API endpoints.

### Steps

- [ ] Create `server/routes/campaigns.js`:
  ```
  POST   /api/campaigns         → create campaign
  GET    /api/campaigns         → list all campaigns
  GET    /api/campaigns/:id     → get single campaign
  DELETE /api/campaigns/:id     → delete campaign + its leads
  ```
- [ ] Create `server/routes/leads.js`:
  ```
  POST   /api/leads/scrape/:campaignId  → trigger full pipeline
                                           (scrape → clean → save → sheets → embed)
  GET    /api/leads/:campaignId         → paginated leads list
                                           (?page=1&limit=50&search=gmail)
  ```
- [ ] Create `server/routes/chat.js`:
  ```
  POST   /api/chat   → { question, campaignId? } → { answer }
  ```
- [ ] Register all routes in `server/index.js`
- [ ] Add input validation using `express-validator`
- [ ] Add global error handler middleware
- [ ] Test all endpoints with Postman or Thunder Client

### Full Pipeline triggered by `POST /api/leads/scrape/:campaignId`:
```
Set status → "running"
      ↓
Run scraper (Puppeteer)
      ↓
Clean data (dataProcessor)
      ↓
Save leads to MongoDB
      ↓
Export to Google Sheets
      ↓
Create embeddings (OpenAI)
      ↓
Store in ChromaDB
      ↓
Update campaign: status → "completed", totalLeads, sheetUrl
```

### Deliverable
All API endpoints working and tested

---

## Stage 8 — Frontend UI (React + Tailwind)

**Goal:** Build a clean, functional interface for campaign management and AI chat.

### Pages & Components

### 8A — Layout & Navigation
- [ ] Create `Layout.jsx` with sidebar navigation:
  - Dashboard
  - Campaigns
  - AI Chat
- [ ] Add top bar with app name "LeadAI"
- [ ] Set up `react-router-dom` routes

### 8B — Dashboard Page
- [ ] Stats cards: Total Campaigns, Total Leads, Active Campaigns
- [ ] Recent campaigns table: Name, Location, Status, Lead Count, Actions
- [ ] Fetch from `GET /api/campaigns`

### 8C — Campaigns Page
- [ ] Campaign cards grid (all campaigns)
- [ ] Status badge per card (color-coded: pending/running/completed/failed)
- [ ] "New Campaign" button → opens modal form
- [ ] Campaign form fields: Name, Location, Target Audience, Required Leads
- [ ] On submit:
  - `POST /api/campaigns`
  - Immediately call `POST /api/leads/scrape/:id`
  - Show loading spinner with message: "Scraping leads, this may take 1–2 minutes…"
  - On complete: success toast with lead count + "View in Google Sheets" link
- [ ] Each campaign card has:
  - View Leads button
  - View Sheet link
  - Delete button

### 8D — Leads Modal
- [ ] Opens on "View Leads" click
- [ ] Paginated table: Name, Email, Phone, Website, Address
- [ ] Search bar (filters by email or business name)
- [ ] Calls `GET /api/leads/:id?search=...&page=...`

### 8E — AI Chat Page
- [ ] Campaign selector dropdown (choose one or "All Campaigns")
- [ ] Chat message thread (user messages right, AI responses left)
- [ ] Message input + send button
- [ ] Calls `POST /api/chat` with `{ question, campaignId }`
- [ ] Suggested question chips:
  ```
  "How many leads do I have?"
  "Show leads from Delhi"
  "Which campaign has the most leads?"
  "List all Gmail addresses"
  ```
- [ ] Loading indicator while waiting for AI response

### Deliverable
Fully functional frontend connected to all backend APIs

---

## Stage 9 — Testing & Hardening

**Goal:** Make the system reliable and production-ready.

### Steps

- [ ] Add retry logic in scraper (retry failed pages up to 2 times)
- [ ] Add scraping rate limiting (randomized 2–4 second delays)
- [ ] Handle CAPTCHA / block detection gracefully (set campaign status to "failed")
- [ ] Validate all API inputs (express-validator on all POST routes)
- [ ] Add duplicate campaign name check
- [ ] Add `requiredLeads` range validation (10–1000)
- [ ] Set up Bull queue (Redis) for background scraping jobs:
  - Scraping runs in background, not blocking HTTP response
  - Frontend polls `GET /api/campaigns/:id` every 5 seconds for status updates
- [ ] Set up `winston` logger in `server/utils/logger.js`:
  - Log scraping start/end with lead count
  - Log all API requests (method, path, status, duration)
  - Log errors with stack traces to a log file
- [ ] Add rate limiting on API routes using `express-rate-limit`
- [ ] Test edge cases:
  - Campaign with 0 results from scraper
  - Invalid email format in scraped data
  - Google Sheets API quota exceeded
  - ChromaDB collection already exists (upsert, don't duplicate)

### Deliverable
System handles failures gracefully, logs everything, and queues long-running jobs

---

## Stage 10 — Deployment

**Goal:** Get the project live and accessible online.

### Backend — Railway or Render
- [ ] Push code to GitHub
- [ ] Create a new service on Railway/Render pointing to `server/`
- [ ] Add all environment variables in the dashboard
- [ ] Switch to MongoDB Atlas (cloud) — update `MONGODB_URI`
- [ ] Update CORS in `server/index.js` to allow frontend domain only
- [ ] Set start command: `node index.js`

### Vector DB — Hosted ChromaDB or Pinecone
- [ ] Option A: Deploy ChromaDB on a VPS (DigitalOcean/EC2)
- [ ] Option B (recommended): Switch to Pinecone
  - Install `@pinecone-database/pinecone`
  - Update `embeddings.js` and `rag.js` to use Pinecone client
  - Create index: dimensions=1536, metric=cosine
  - Add `PINECONE_API_KEY` and `PINECONE_INDEX` to env

### Frontend — Vercel
- [ ] Import GitHub repo into Vercel
- [ ] Set root directory to `client/`
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Add environment variable: `VITE_API_URL=https://your-backend.railway.app`

### Security Hardening
- [ ] Add API key middleware (x-api-key header on all `/api` routes)
- [ ] Add Helmet.js for HTTP security headers
- [ ] Add request logging on production
- [ ] Rotate Google service account credentials
- [ ] Add `.env` to `.gitignore` and verify it's not committed

### Deliverable
Live, accessible application with all services running in production

---

## Milestone Checklist

| Milestone | Stage | Done |
|---|---|---|
| Project scaffolded and running locally | 1 | ☐ |
| MongoDB connected with working models | 2 | ☐ |
| Scraper extracts leads from web | 3 | ☐ |
| Leads cleaned and validated | 4 | ☐ |
| Leads exported to Google Sheets | 5 | ☐ |
| AI can answer questions about leads | 6 | ☐ |
| All API endpoints working | 7 | ☐ |
| Full frontend UI connected | 8 | ☐ |
| System tested and hardened | 9 | ☐ |
| App deployed and live | 10 | ☐ |

---

## Estimated Timeline

| Stage | Estimated Time |
|---|---|
| Stage 1 — Setup | 1–2 hours |
| Stage 2 — Database | 2–3 hours |
| Stage 3 — Scraping | 4–6 hours |
| Stage 4 — Processing | 1–2 hours |
| Stage 5 — Google Sheets | 2–3 hours |
| Stage 6 — RAG Pipeline | 4–6 hours |
| Stage 7 — API Routes | 3–4 hours |
| Stage 8 — Frontend | 6–10 hours |
| Stage 9 — Testing | 3–4 hours |
| Stage 10 — Deployment | 2–3 hours |
| **Total** | **~3–5 days** |

---

## Environment Variables Reference

| Variable | Used In | Description |
|---|---|---|
| `MONGODB_URI` | Stage 2 | MongoDB connection string |
| `OPENAI_API_KEY` | Stage 6 | OpenAI API key |
| `GOOGLE_CREDENTIALS_PATH` | Stage 5 | Path to service account JSON |
| `SPREADSHEET_ID` | Stage 5 | Google Spreadsheet ID |
| `CHROMA_URL` | Stage 6 | ChromaDB server URL |
| `PINECONE_API_KEY` | Stage 10 | Pinecone API key (production) |
| `PINECONE_INDEX` | Stage 10 | Pinecone index name |
| `REDIS_URL` | Stage 9 | Redis URL for Bull queue |
| `API_KEY` | Stage 10 | Custom API key for auth |
| `PORT` | Stage 1 | Backend server port |
| `VITE_API_URL` | Stage 8 | Backend URL for frontend |