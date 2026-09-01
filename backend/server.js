const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

/**
 * Two ways to run the same app.
 *
 * On Vercel this file is the serverless function: it exports a handler, connects
 * on the first request, and never calls listen(). Locally it behaves the way it
 * always did, listening on PORT.
 */
if (process.env.VERCEL) {
  module.exports = async (req, res) => {
    try {
      await connectDB();
    } catch (err) {
      console.error('Database connection failed:', err.message);
      return res.status(503).json({ message: 'Database unavailable' });
    }
    return app(req, res);
  };
} else {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error(`Error connecting to MongoDB: ${err.message}`);
      process.exit(1);
    });
}
