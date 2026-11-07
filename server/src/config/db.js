const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/poll_integrity';

  try {
    // Attempt connecting to the configured MongoDB URI with a short timeout
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (primaryError) {
    const sanitizedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.error(`Could not connect to configured MongoDB (${sanitizedUri}): ${primaryError.message}`);

    if (process.env.NODE_ENV === 'production') {
      console.error('Fatal: In production mode (NODE_ENV=production), falling back to MongoMemoryServer is disabled. Exiting process.');
      process.exit(1);
    }

    console.warn('Falling back to MongoMemoryServer for development...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const inMemoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`Connected to in-memory MongoDB at ${inMemoryUri}`);
    } catch (fallbackError) {
      console.error('Failed to start in-memory MongoDB:', fallbackError.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
