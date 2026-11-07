const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

const mongoose = require('mongoose');

// Global connection caching across serverless invocations (e.g., Vercel / AWS Lambda)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

let mongoMemoryServer = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cached.conn) {
    return cached.conn;
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/poll_integrity';

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose
      .connect(mongoUri, opts)
      .then((mongooseInstance) => {
        console.log(`MongoDB connected: ${mongooseInstance.connection.host}`);
        return mongooseInstance.connection;
      })
      .catch(async (primaryError) => {
        cached.promise = null;
        const sanitizedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
        console.error(`Could not connect to configured MongoDB (${sanitizedUri}): ${primaryError.message}`);

        if (process.env.NODE_ENV === 'production') {
          console.error('Fatal: In production mode (NODE_ENV=production), falling back to MongoMemoryServer is disabled.');
          throw primaryError;
        }

        console.warn('Falling back to MongoMemoryServer for development...');
        try {
          const { MongoMemoryServer } = require('mongodb-memory-server');
          mongoMemoryServer = await MongoMemoryServer.create();
          const inMemoryUri = mongoMemoryServer.getUri();
          const conn = await mongoose.connect(inMemoryUri);
          console.log(`Connected to in-memory MongoDB at ${inMemoryUri}`);
          return conn.connection;
        } catch (fallbackError) {
          console.error('Failed to start in-memory MongoDB:', fallbackError.message);
          throw fallbackError;
        }
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

module.exports = connectDB;
