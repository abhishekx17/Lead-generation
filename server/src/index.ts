import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth';
import { db } from './db'; // ensure Drizzle client initializes

// CJS modules — still JS
const connectDB = require('../config/db');
const errorHandler = require('../middleware/errorHandler');
const requestLogger = require('../middleware/requestLogger');
const { apiLimiter, chatLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const cookieParser = require('cookie-parser');

require('../jobs/scrapeQueue');
require('../jobs/emailQueue');

// TS routes
import campaignRoutes from './routes/campaigns';
import leadRoutes from './routes/leads';
import chatRoutes from './routes/chat';
import organizationRoutes from './routes/organizations';
import adminRoutes from './routes/admin';
import { requireAuth } from './auth/middleware';

const app = express();
const PORT = process.env.PORT ?? '5000';

// ── Connect databases ─────────────────────────────────────────────────────────
connectDB(); // MongoDB

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL ?? 'http://localhost:5173',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true, // Required for better-auth session cookies
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use('/api', apiLimiter);

// ── better-auth HTTP handler (session, login, register, OAuth) ────────────────
// Must be registered BEFORE other routes so /api/auth/* is handled correctly
// Gmail OAuth CJS router first — only handles /google/connect and /google/callback;
// unmatched /api/auth/* paths fall through to better-auth below.
app.use('/api/auth', require('../routes/auth'));
app.all('/api/auth/*splat', toNodeHandler(auth));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'LeadAI server is running' });
});

// ── Application routes ────────────────────────────────────────────────────────
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email-accounts', requireAuth, require('../routes/emailAccounts'));

// ── 404 fallthrough ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(parseInt(PORT, 10), () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
