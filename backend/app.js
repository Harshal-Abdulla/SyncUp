const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// In production the API and the site are served from the same origin, so there
// is nothing to allow. FRONTEND_URL is only needed when running the React dev
// server on :3000 against this API on :5000.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));

// Lets you check the API is alive without creating an account.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
