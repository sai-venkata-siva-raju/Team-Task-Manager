const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('./models/User');
const AuditLog = require('./models/AuditLog');

// Generate JWT token
const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const { url } = req;
    
    // Test endpoint
    if (url === '/api/auth/test' && req.method === 'GET') {
      return res.json({ 
        message: 'Auth route working',
        env: {
          JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
          MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT_SET',
          NODE_ENV: process.env.NODE_ENV || 'development'
        }
      });
    }

    // Status endpoint
    if (url === '/api/auth/status' && req.method === 'GET') {
      return res.json({ 
        status: 'OK',
        message: 'Auth service is running',
        timestamp: new Date().toISOString()
      });
    }

    // Register endpoint
    if (url === '/api/auth/register' && req.method === 'POST') {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      const user = new User({
        username,
        email,
        password
      });

      await user.save();

      // Log the action
      await AuditLog.logAction({
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user._id,
        changedBy: user._id,
        description: `User ${username} registered`,
        metadata: {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        }
      });

      // Generate token
      const token = generateToken(user._id);

      return res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      });
    }

    // Login endpoint
    if (url === '/api/auth/login' && req.method === 'POST') {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Log the action
      await AuditLog.logAction({
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user._id,
        changedBy: user._id,
        description: `User ${user.username} logged in`,
        metadata: {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        }
      });

      // Generate token
      const token = generateToken(user._id);

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      });
    }

    // If no matching endpoint
    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
