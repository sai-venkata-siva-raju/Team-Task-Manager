const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('node:path');

dotenv.config();

console.log('🚀 Starting Simple Server Test...');
console.log('🔧 Environment Check:', {
  NODE_ENV: process.env.NODE_ENV || 'undefined',
  PORT: process.env.PORT || 'undefined',
  MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT_SET',
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET'
});

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Simple server is running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT
  });
});

// MongoDB connection with better error handling
const connectDB = async () => {
  try {
    console.log('🔌 Attempting MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/team-task-manager', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️ Continuing without database for testing...');
  }
};

// Start server
const startServer = async () => {
  const PORT = process.env.PORT || 5000;
  
  // Try to connect to MongoDB but don't fail if it doesn't work
  await connectDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Simple server running on port ${PORT}`);
    console.log('🌐 Ready to accept connections');
    console.log('📊 Health check: /health');
  });
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();
