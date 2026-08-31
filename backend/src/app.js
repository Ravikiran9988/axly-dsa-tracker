require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { errorHandler } = require('./middleware/errorHandler');
const { getRepository } = require('./db/repositoryFactory');

// Routes
const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoutes');
const practiceRoutes = require('./routes/practiceRoutes');

const dailyChallengeRoutes = require('./routes/dailyChallengeRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const progressRoutes = require('./routes/progressRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const userRoutes = require('./routes/userRoutes');
const codeExecutionRoutes = require('./routes/codeExecutionRoutes');
const cohortRoutes = require('./routes/cohortRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiQuestionRoutes = require('./routes/aiQuestionRoutes');
const auditRoutes = require('./routes/auditRoutes');
const dsaAiRoutes = require('./routes/dsaAiRoutes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'false' ? false : 1);

// Request ID Correlation Middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || uuidv4();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Security Headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://dsatracker.axly.in',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
      } else if (!origin && process.env.NODE_ENV !== 'production') {
        // Allow requests with no origin (like curl) only in development
        cb(null, true);
      } else {
        cb(new Error('CORS policy: Not allowed by origin'));
      }
    },
    credentials: true
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Global API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 500 : 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.'
    }
  }
});
app.use('/api/v1', apiLimiter);

// Structured logging
if (process.env.NODE_ENV !== 'test') {
  morgan.token('reqId', (req) => req.id || '-');
  app.use(morgan('[:date[iso]] [REQ :reqId] :method :url :status :response-time ms'));
}

// Health Checks (Liveness & Readiness)
app.get(['/health', '/health/live'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/health/ready', async (req, res) => {
  if (req.app.locals.startupError) {
    return res.status(503).json({
      status: 'unhealthy',
      error: req.app.locals.startupError,
      timestamp: new Date().toISOString()
    });
  }
  try {
    const repo = getRepository();
    await repo.one('SELECT 1 AS ready');
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/practice', practiceRoutes);

app.use('/api/v1/daily-challenges', dailyChallengeRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/code', codeExecutionRoutes);
app.use('/api/v1/cohorts', cohortRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/ai-questions', aiQuestionRoutes);
app.use('/api/v1/admin/audit-logs', auditRoutes);
app.use('/api/v1/dsa-ai', dsaAiRoutes);

// 404 Fallback Handler
app.use((req, res) =>
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  })
);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
