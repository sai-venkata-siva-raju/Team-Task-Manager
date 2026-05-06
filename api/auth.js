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

    console.log('Auth endpoint called:', req.method, req.url);

    // Simple test
    if (req.url === '/api/auth/test' && req.method === 'GET') {
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
    if (req.url === '/api/auth/status' && req.method === 'GET') {
      return res.json({ 
        status: 'OK',
        message: 'Auth service is running',
        timestamp: new Date().toISOString()
      });
    }

    // Login endpoint - simplified
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      console.log('Login endpoint hit');
      
      const { email, password } = req.body;
      console.log('Login attempt for:', email);

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

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

      // Generate token
      const token = generateToken(user._id);

      console.log('Login successful for:', user.username);

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
    console.log('No matching endpoint for:', req.url);
    return res.status(404).json({ message: 'Endpoint not found', url: req.url });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
