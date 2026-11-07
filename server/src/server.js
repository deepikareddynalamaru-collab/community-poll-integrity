require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const startServer = async () => {
  await connectDB();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
  return server;
};

if (require.main === module) {
  startServer();
}

app.startServer = startServer;
module.exports = app;
module.exports.app = app;
module.exports.startServer = startServer;
