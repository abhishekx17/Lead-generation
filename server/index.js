require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter, chatLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const cookieParser = require('cookie-parser');

require('./jobs/scrapeQueue');
require('./jobs/emailQueue');

const campaignRoutes = require('./routes/campaigns');
const leadRoutes = require('./routes/leads');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const emailAccountRoutes = require('./routes/emailAccounts');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LeadAI server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/email-accounts', emailAccountRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
