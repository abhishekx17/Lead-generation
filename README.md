# LeadAI — AI-Powered Lead Generation & Management System

An AI-powered platform that scrapes business leads, stores them in MongoDB, exports to Google Sheets, and provides a RAG-based chat interface for querying lead data.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Scraping:** Puppeteer + Cheerio
- **AI:** OpenAI (GPT-4o + text-embedding-3-small)
- **Vector DB:** ChromaDB (Docker)
- **External:** Google Sheets API v4

## Project Structure

```
Lead-Generation/
├── client/           → React frontend (Vite)
├── server/           → Node.js backend (Express)
├── .env.example      → Environment variable reference
├── structure.md      → Full development pipeline
└── prompt.md         → Phase-by-phase build prompts
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Docker Desktop (for ChromaDB, later stages)

### Setup

```bash
# Install root + workspace dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Configure environment
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env with your values

# Run both client and server
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Development Pipeline

See [structure.md](./structure.md) for the full 10-stage pipeline and [prompt.md](./prompt.md) for phase-by-phase build instructions.

| Stage | Status |
|-------|--------|
| 1 — Project Setup | ✅ Complete |
| 2 — Database Layer | ✅ Complete |
| 3 — Scraping Engine | ✅ Complete |
| 4 — Data Processing | ✅ Complete |
| 5 — Google Sheets | ✅ Complete |
| 6 — AI & RAG Pipeline | ✅ Complete |
| 7 — REST API | ✅ Complete |
| 8 — Frontend UI | ✅ Complete |
| 9 — Testing & Hardening | ✅ Complete |
| 10 — Deployment | ⬜ Next |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run client + server concurrently |
| `npm run server` | Run backend only (nodemon) |
| `npm run client` | Run frontend only (Vite) |
| `npm run seed --prefix server` | Seed test campaign + leads |
| `npm run test:processor --prefix server` | Test lead cleaning pipeline |
| `npm run test:scraper --prefix server` | Manual scrape test (needs network) |
| `npm run test:sheets --prefix server` | Export sample leads to Google Sheets |

### Google Sheets setup

1. Create a [Google Cloud project](https://console.cloud.google.com/) and enable the **Google Sheets API**
2. Create a **Service Account** and download the JSON key
3. Save it as `server/config/google-credentials.json` (see `google-credentials.example.json`)
4. Create a Google Spreadsheet and copy its ID from the URL
5. Share the spreadsheet with the service account email (Editor access)
6. Set `GOOGLE_CREDENTIALS_PATH` and `SPREADSHEET_ID` in `server/.env`

### ChromaDB + RAG setup

1. Start ChromaDB: `docker compose up -d` (from project root)
2. Set `OPENAI_API_KEY` and `CHROMA_URL=http://localhost:8000` in `server/.env`
3. Seed test data: `npm run seed --prefix server`
4. Test RAG pipeline: `npm run test:rag --prefix server`

### Redis (required for background scraping)

1. Install and start Redis locally, or use a cloud Redis URL
2. Set `REDIS_URL=redis://127.0.0.1:6379` in `server/.env`
3. Scrape jobs run in the background via Bull — the frontend polls campaign status every 5 seconds

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/campaigns` | Create campaign |
| `GET` | `/api/campaigns` | List all campaigns |
| `GET` | `/api/campaigns/:id` | Get campaign + lead count |
| `DELETE` | `/api/campaigns/:id` | Delete campaign + leads |
| `POST` | `/api/leads/scrape/:campaignId` | Run full scrape pipeline |
| `GET` | `/api/leads/:campaignId` | Paginated leads (`?page=&limit=&search=`) |
| `POST` | `/api/chat` | RAG chat (`{ question, campaignId? }`) |
