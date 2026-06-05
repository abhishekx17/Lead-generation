

## 🔰 Master Prompt (Start Here)

```
You are a senior full-stack engineer. I want to build an AI-powered Lead Generation and Management System from scratch.

Here is the complete project description:

---

PROJECT OVERVIEW:
An AI-powered platform that:
1. Lets users create "campaigns" (e.g., "Delhi Restaurants", "Mumbai Realtors")
2. Automatically scrapes business leads (name, email, phone, address, website) from the web based on the campaign's location and target industry
3. Stores leads in MongoDB and exports them to Google Sheets (one sheet per campaign)
4. Cleans and deduplicates the data
5. Creates vector embeddings of all leads and stores them in a vector database (ChromaDB)
6. Provides a RAG-based AI chat interface where users can ask natural language questions about their leads

---

TECH STACK:
- Frontend: React.js + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MongoDB + Mongoose
- Scraping: Puppeteer + Cheerio
- AI: OpenAI API (GPT-4o for chat, text-embedding-3-small for embeddings)
- Vector DB: ChromaDB (running locally via Docker)
- External: Google Sheets API v4

---

PROJECT STRUCTURE:
ai-lead-gen/
├── client/           → React frontend
├── server/           → Node.js backend
├── .env
└── README.md

---

YOUR TASK FOR NOW:
1. Scaffold the full project folder structure with all files and folders
2. Initialize package.json for both client/ and server/
3. Install all required dependencies for both
4. Set up a basic Express server in server/index.js with CORS and dotenv
5. Set up a basic React app in client/ using Vite + Tailwind CSS
6. Create a .env.example file listing all required environment variables
7. Create a .gitignore

After scaffolding, confirm what is set up and list what needs to be built next.
```

---

## 📦 Phase 1 Prompt — Database Models & MongoDB Connection

```
Now build Phase 1: MongoDB connection and data models.

1. Connect MongoDB using Mongoose in server/config/db.js and call it in server/index.js

2. Create the following Mongoose models:

   Campaign model (server/models/Campaign.js):
   - name (String, required, unique)
   - location (String, required)
   - targetAudience (String, required)
   - requiredLeads (Number, required)
   - status: enum ["pending", "running", "completed", "failed"], default "pending"
   - totalLeads (Number, default 0)
   - sheetUrl (String)
   - createdAt (Date, default now)

   Lead model (server/models/Lead.js):
   - campaignId (ObjectId, ref Campaign, required)
   - businessName (String)
   - email (String)
   - phone (String)
   - website (String)
   - address (String)
   - industry (String)
   - isValid (Boolean, default true)
   - createdAt (Date, default now)

3. Create a seed script server/scripts/seedTest.js that creates one dummy campaign and 3 dummy leads to verify the DB works.

Show me the complete code for each file.
```

---

## 🕷️ Phase 2 Prompt — Web Scraping Engine

```
Now build Phase 2: the web scraping engine.

1. Create server/services/scraper.js

2. The scraper should:
   - Accept: { location, targetAudience, requiredLeads } as input
   - Use Puppeteer to search Google for: "{targetAudience} in {location} email contact"
   - For each result page, use Cheerio to extract:
     * Business name
     * Email address (regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
     * Phone number (regex for Indian formats: 10-digit numbers)
     * Website URL
     * Address (if available)
   - Paginate through at least 5 Google result pages
   - Stop when requiredLeads count is reached
   - Return an array of lead objects

3. Create server/services/dataProcessor.js that:
   - Removes duplicate emails from lead array
   - Validates email format
   - Removes leads with no email AND no phone
   - Returns cleaned array

4. Add error handling for cases where Puppeteer is blocked or returns no results.

Show me the complete code for each file with detailed comments.
```

---

## 📊 Phase 3 Prompt — Google Sheets Integration

```
Now build Phase 3: Google Sheets integration.

1. Set up Google Sheets API:
   - Use the googleapis npm package
   - Create server/config/googleAuth.js that authenticates using a service account JSON file (path from .env: GOOGLE_CREDENTIALS_PATH)
   - The service account needs Editor access to the target spreadsheet

2. Create server/services/sheets.js with these functions:

   createSheet(spreadsheetId, sheetTitle):
   - Creates a new sheet tab inside the main spreadsheet
   - Returns the sheet URL

   appendLeads(spreadsheetId, sheetTitle, leads):
   - Writes a header row: [Business Name, Email, Phone, Website, Address, Industry]
   - Appends all lead rows below the header
   - Uses batchUpdate for efficiency

   getSheetUrl(spreadsheetId, sheetTitle):
   - Returns the direct URL to the sheet tab

3. Add SPREADSHEET_ID to .env.example

4. Write a test function at the bottom of sheets.js (commented out) showing example usage.

Show me complete code with error handling.
```

---

## 🤖 Phase 4 Prompt — AI Embeddings & RAG Pipeline

```
Now build Phase 4: the RAG pipeline using OpenAI embeddings and ChromaDB.

1. Set up ChromaDB:
   - Create a docker-compose.yml at the project root that runs ChromaDB on port 8000
   - Use the chromadb npm client in the backend

2. Create server/services/embeddings.js:
   - Function: createEmbedding(text) → calls OpenAI text-embedding-3-small and returns the vector
   - Function: embedLeads(leads, campaignName):
     * Converts each lead to a plain text string:
       "Business: {name}, Email: {email}, Phone: {phone}, Address: {address}, Industry: {industry}"
     * Creates embeddings for each
     * Stores them in a ChromaDB collection named after the campaign
     * Stores metadata: { campaignId, email, phone, businessName }

3. Create server/services/rag.js:
   - Function: queryLeads(userQuestion, campaignId):
     * Converts the user's question to an embedding
     * Queries ChromaDB for top 10 most similar leads
     * Builds a context string from those leads
     * Calls GPT-4o with this system prompt:
       "You are a lead management assistant. Answer the user's question using only the lead data provided in context. Be concise and precise. If asked for counts, count accurately."
     * Returns the AI's answer

Show me complete code for docker-compose.yml, embeddings.js, and rag.js.
```

---

## 🛣️ Phase 5 Prompt — Backend API Routes

```
Now build Phase 5: all backend REST API routes.

Create the following route files and register them in server/index.js:

1. server/routes/campaigns.js:
   POST /api/campaigns
   - Validates input (name, location, targetAudience, requiredLeads)
   - Creates campaign in MongoDB with status "pending"
   - Responds with the created campaign object

   GET /api/campaigns
   - Returns all campaigns sorted by createdAt descending

   GET /api/campaigns/:id
   - Returns single campaign with its lead count

   DELETE /api/campaigns/:id
   - Deletes campaign and all its leads from MongoDB

2. server/routes/leads.js:
   POST /api/leads/scrape/:campaignId
   - Sets campaign status to "running"
   - Runs scraper with campaign's location, targetAudience, requiredLeads
   - Cleans data with dataProcessor
   - Saves leads to MongoDB
   - Exports to Google Sheets (creates a new sheet tab)
   - Creates embeddings and stores in ChromaDB
   - Updates campaign: status "completed", totalLeads count, sheetUrl
   - Returns { success: true, totalLeads, sheetUrl }

   GET /api/leads/:campaignId
   - Returns paginated leads for a campaign
   - Supports query params: ?page=1&limit=50&search=gmail

3. server/routes/chat.js:
   POST /api/chat
   - Body: { question: string, campaignId: string (optional) }
   - If campaignId provided, queries only that campaign's ChromaDB collection
   - If no campaignId, queries across all campaigns
   - Returns { answer: string }

Show complete code for all route files with proper error handling and HTTP status codes.
```

---

## 🎨 Phase 6 Prompt — React Frontend

```
Now build Phase 6: the complete React frontend.

Tech: React + Vite + Tailwind CSS. Use fetch() for API calls. No external UI libraries.

Build these pages and components:

1. Layout (client/src/components/Layout.jsx):
   - Sidebar with navigation links: Dashboard, Campaigns, AI Chat
   - Top bar with app name "LeadAI"
   - Main content area

2. Dashboard Page (client/src/pages/Dashboard.jsx):
   - Stats cards: Total Campaigns, Total Leads, Active Campaigns
   - Recent campaigns table with columns: Name, Location, Target, Leads, Status, Actions
   - Fetch from GET /api/campaigns

3. Campaigns Page (client/src/pages/Campaigns.jsx):
   - "New Campaign" button that opens a modal form
   - Form fields: Campaign Name, Location, Target Audience, Required Leads
   - On submit: POST /api/campaigns, then immediately call POST /api/leads/scrape/:id
   - Show a loading spinner while scraping runs (it may take 1-2 minutes)
   - After scraping: show success toast with lead count and a "View in Sheets" link
   - Campaign cards grid showing all campaigns with status badges (color coded)
   - Each card has: Delete button, "View Leads" button, "View Sheet" link

4. Leads Modal (client/src/components/LeadsModal.jsx):
   - Opens when "View Leads" is clicked on a campaign card
   - Shows paginated table of leads: Name, Email, Phone, Website, Address
   - Search bar that filters by email or name (calls GET /api/leads/:id?search=...)
   - Export button (links to the Google Sheet)

5. AI Chat Page (client/src/pages/Chat.jsx):
   - Chat UI similar to ChatGPT
   - Campaign selector dropdown at the top (select a campaign or "All Campaigns")
   - Message input at the bottom
   - Sends POST /api/chat with { question, campaignId }
   - Shows user messages on the right, AI responses on the left
   - AI response supports markdown (use a simple markdown renderer)
   - Suggested questions shown as clickable chips:
     "How many leads do I have?"
     "Show leads from Delhi"
     "Which campaign has the most leads?"

Use a dark theme with blue accents. Make it clean and professional.

Show me complete code for all components and pages.
```

---

## 🔐 Phase 7 Prompt — Environment Setup & Final Integration

```
Now finalize the project for local development.

1. Create a complete .env file template (server/.env.example):
   MONGODB_URI=mongodb://localhost:27017/leadgen
   OPENAI_API_KEY=sk-...
   GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json
   SPREADSHEET_ID=your_google_spreadsheet_id
   CHROMA_URL=http://localhost:8000
   PORT=5000

2. Create client/.env.example:
   VITE_API_URL=http://localhost:5000

3. Create a root-level package.json with these scripts:
   "dev": runs both client and server concurrently using the concurrently package
   "server": runs only the backend with nodemon
   "client": runs only the frontend with vite

4. Create a detailed SETUP.md file that walks through:
   - Installing Node.js, MongoDB, Docker
   - Getting OpenAI API key
   - Setting up Google Cloud service account and enabling Sheets API
   - Creating the Google Spreadsheet and sharing it with the service account
   - Running ChromaDB via Docker: docker-compose up -d
   - Cloning the repo, installing deps, filling .env, running npm run dev
   - How to create the first campaign and test the AI chat

5. Add basic input validation middleware (express-validator) for all POST routes.

6. Add a global error handler in server/index.js that catches unhandled errors and returns { error: message }.

Show me complete code for all of the above.
```

---

## 🧪 Phase 8 Prompt — Testing & Edge Cases

```
Now add robustness to the project.

1. Handle scraping failures gracefully:
   - If Puppeteer gets a CAPTCHA or is blocked, catch the error, set campaign status to "failed", and return a helpful error message to the frontend
   - Add a retry mechanism: retry failed pages up to 2 times before skipping

2. Add rate limiting to the scraper:
   - Add a 2-3 second delay between page requests using a sleep() utility
   - Randomize user-agent headers to reduce blocking

3. Add a background job system using Bull (Redis-based queue):
   - When POST /api/leads/scrape/:id is called, add the job to a queue instead of running it synchronously
   - The frontend should poll GET /api/campaigns/:id every 5 seconds to check status
   - This prevents HTTP timeout issues for large lead counts

4. Add the following validations:
   - Campaign name must be unique
   - requiredLeads must be between 10 and 1000
   - Email must be a valid format before saving to DB
   - Duplicate emails within the same campaign are rejected

5. Add a server/utils/logger.js using winston that logs:
   - Scraping start/end with lead count
   - Any errors with stack traces
   - API requests (method, path, status code)

Show me complete code for the queue setup, retry logic, and logger.
```

---

## 🚀 Bonus Prompt — Deployment

```
Now prepare the project for production deployment.

1. Backend deployment on Railway or Render:
   - Create a Procfile: web: node server/index.js
   - Update CORS in server/index.js to allow only the frontend domain
   - Use MongoDB Atlas instead of local MongoDB (update MONGODB_URI)
   - Use a hosted ChromaDB instance or switch to Pinecone for vector storage

2. Frontend deployment on Vercel:
   - Build command: npm run build (in client/)
   - Set VITE_API_URL to the deployed backend URL

3. ChromaDB alternative — switch to Pinecone:
   - Install @pinecone-database/pinecone
   - Modify embeddings.js to use Pinecone instead of ChromaDB
   - Create index on Pinecone dashboard: dimensions 1536, metric cosine
   - Add PINECONE_API_KEY and PINECONE_INDEX to .env

4. Add basic authentication:
   - Simple API key middleware: all /api routes require an x-api-key header
   - The frontend sends this key from an env variable
   - This prevents unauthorized access to the scraping endpoints

Show me the complete updated files for deployment.
```

---

## 📋 Quick Reference — All Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `OPENAI_API_KEY` | OpenAI API key |
| `GOOGLE_CREDENTIALS_PATH` | Path to service account JSON |
| `SPREADSHEET_ID` | Google Spreadsheet ID |
| `CHROMA_URL` | ChromaDB server URL |
| `PINECONE_API_KEY` | Pinecone API key (if using Pinecone) |
| `PINECONE_INDEX` | Pinecone index name |
| `PORT` | Backend server port |
| `API_KEY` | Your custom API key for auth |
| `VITE_API_URL` | Backend URL (frontend env) |

---

## 📋 Quick Reference — All API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/campaigns` | Create a new campaign |
| GET | `/api/campaigns` | Get all campaigns |
| GET | `/api/campaigns/:id` | Get single campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| POST | `/api/leads/scrape/:campaignId` | Start scraping for a campaign |
| GET | `/api/leads/:campaignId` | Get paginated leads |
| POST | `/api/chat` | Ask AI a question about leads |

---