const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const pollRoutes = require('./routes/poll.routes');
const errorMiddleware = require('./middleware/error.middleware');
const { NotFoundError } = require('./utils/errors');

const app = express();

// Parse CLIENT_ORIGIN (supporting comma-separated list)
const clientOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...clientOrigins,
];

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow non-browser requests (e.g. curl, server-to-server)
  const clean = origin.trim().replace(/\/+$/, '');

  // Wildcard allowed
  if (allowedOrigins.includes('*')) return true;

  // Exact match against allowed origins
  if (allowedOrigins.includes(clean)) return true;

  // Local development ports
  if (clean.startsWith('http://localhost:') || clean.startsWith('http://127.0.0.1:')) return true;

  // Any https://community-poll-integrity*.vercel.app link
  if (/^https:\/\/community-poll-integrity.*\.vercel\.app$/i.test(clean)) return true;

  // Any Vercel deployment of this project
  if (clean.endsWith('.vercel.app')) return true;

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Explicit OPTIONS preflight handler
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
      return res.status(204).end();
    }
  }
  next();
});

app.use(express.json());

// GET /api/health returning MongoDB connection status
app.get('/api/health', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (_) {}
  }

  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const isConnected = mongoose.connection.readyState === 1;
  const mongoStatus = states[mongoose.connection.readyState] || 'unknown';

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'ok' : 'degraded',
    mongodb: mongoStatus,
    readyState: mongoose.connection.readyState,
    host: isConnected ? mongoose.connection.host : null,
    timestamp: new Date().toISOString(),
  });
});

// Ensure database is connected for all subsequent routes (essential for serverless deployments e.g. Vercel)
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);

// Fallback aliases for requests made without the /api prefix
app.use('/auth', authRoutes);
app.use('/polls', pollRoutes);

// Catch-all for undefined routes (before error middleware)
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
});

// Central Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
