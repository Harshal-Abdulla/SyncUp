const mongoose = require('mongoose');

/**
 * Serverless-safe connection.
 *
 * The same container handles many requests, and there may be several containers
 * at once, so the connection is cached on the global object and reused. Without
 * this, every invocation opens a fresh pool and Atlas runs out of connections.
 *
 * It also does NOT call process.exit on failure. In a long-running server that
 * is reasonable; in a serverless function it kills the container for every
 * request rather than returning one error.
 */
let cached = global.__syncupMongoose;
if (!cached) {
  cached = global.__syncupMongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set. See backend/.env.example.');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        // Fail fast instead of hanging until the function times out.
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5,
      })
      .then((m) => {
        console.log(`MongoDB connected: ${m.connection.host}`);
        return m;
      })
      .catch((err) => {
        cached.promise = null; // let the next request retry
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
