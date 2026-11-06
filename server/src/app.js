const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const pollRoutes = require('./routes/poll.routes');
const errorMiddleware = require('./middleware/error.middleware');
const { NotFoundError } = require('./utils/errors');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);

// Catch-all for undefined routes (before error middleware)
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
});

// Central Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
