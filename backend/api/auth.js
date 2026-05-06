const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
};

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth route working',
    env: {
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });
});

// Health check endpoint
router.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

// Register user
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
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

    res.status(201).json({
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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
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

    res.json({
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
