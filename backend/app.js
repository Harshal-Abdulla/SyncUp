const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

/**
 * The Express app, exported rather than started.
 *
 * Vercel looks for app.js / index.js / server.js in the service root and expects
 * a default export of the Express application, which becomes a single Function
 * on Fluid compute. server.js only exists for running this locally.
 */
const app = express();

// In production the site and the API share one origin, so there is nothing to
// allow. FRONTEND_URL only matters when the React dev server on :3000 talks to
// this API on :5000.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * Strips credentials out of anything before it goes in a response or a log.
 * Mongoose errors often quote the connection string back at you.
 */
const scrub = (text) =>
  String(text || '').replace(/(mongodb(\+srv)?:\/\/)[^@\s]*@/gi, '$1***:***@');

/**
 * Connect on the first request rather than at import time. The connection is
 * cached in config/db.js, so this is a no-op on every later request. Doing it
 * here also means a database problem returns one clean 503 instead of taking
 * down the whole function.
 */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed:', scrub(err.message));
    if (req.path === '/api/health') return next(); // let health report the detail
    res.status(503).json({ message: 'Database unavailable' });
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));

/**
 * Health check that says WHY, not just that something is wrong.
 *
 * It never echoes the connection string. It reports only the shape of what it
 * was given, which is enough to tell a placeholder that was never replaced from
 * a wrong password from a blocked IP.
 */
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const uri = process.env.MONGO_URI || '';

  const diagnostics = {
    mongoUriSet: Boolean(uri),
    startsCorrectly: /^mongodb(\+srv)?:\/\//.test(uri),
    stillHasPlaceholder: uri.includes('<') || uri.includes('>'),
    hasDatabaseName: /\.net\/[^?\/\s]+/.test(uri),
    jwtSecretSet: Boolean(process.env.JWT_SECRET),
    readyState: mongoose.connection.readyState, // 1 means connected
  };

  try {
    await connectDB();
    await mongoose.connection.db.admin().ping();
    return res.json({ ok: true, env: process.env.NODE_ENV, diagnostics });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      error: err.name,
      reason: scrub(err.message).slice(0, 300),
      diagnostics,
    });
  }
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
