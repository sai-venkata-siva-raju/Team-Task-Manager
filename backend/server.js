const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('node:fs');
const path = require('node:path');

dotenv.config();

console.log('Starting Team Task Manager Backend...');
console.log('Environment Configuration:', {
  NODE_ENV: process.env.NODE_ENV || 'undefined',
  PORT: process.env.PORT || 'undefined',
  MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT_SET',
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET'
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const getDatabaseStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
};

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString()
  });
});

const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
const frontendIndexPath = path.join(frontendBuildPath, 'index.html');

app.get('/deployment-status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    nodeEnv: process.env.NODE_ENV || null,
    cwd: process.cwd(),
    dirname: __dirname,
    frontendBuildPath,
    frontendIndexPath,
    frontendBuildExists: fs.existsSync(frontendBuildPath),
    frontendIndexExists: fs.existsSync(frontendIndexPath)
  });
});

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/team-task-manager';

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error('The app is still running. API routes that need the database will fail until MongoDB is reachable.');
  }
};

// Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const auditRoutes = require('./routes/audit');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);

// Serve static files from the React app whenever the build is present.
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

if (!hasFrontendBuild) {
  console.error(`Frontend build not found at ${frontendIndexPath}`);
}

app.use(express.static(frontendBuildPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found' });
  }

  if (!hasFrontendBuild) {
    return res.status(503).json({
      message: 'Frontend build not found. Run the frontend build during deployment.',
      expectedFile: frontendIndexPath
    });
  }

  res.sendFile(frontendIndexPath);
});

const PORT = process.env.PORT || 5000;

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  console.error('Promise:', promise);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Ready to accept connections');
  connectDB();
});
