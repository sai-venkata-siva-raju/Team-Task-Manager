const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all projects for a user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'username email')
    .populate('members.user', 'username email')
    .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or member
    const isOwner = project.owner._id.toString() === req.user._id.toString();
    const isMember = project.members.some(member => 
      member.user._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new project
router.post('/', [
  auth,
  body('name').notEmpty().trim().escape(),
  body('description').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    const project = new Project({
      name,
      description,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin'
      }]
    });

    await project.save();
    await project.populate('owner', 'username email');
    await project.populate('members.user', 'username email');

    // Log project creation
    await AuditLog.logAction({
      action: 'project_created',
      entityType: 'project',
      entityId: project._id,
      changedBy: req.user._id,
      description: `Created project "${name}"`,
      metadata: {
        projectId: project._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', [
  auth,
  body('name').optional().notEmpty().trim().escape(),
  body('description').optional().trim().escape(),
  body('status').optional().isIn(['active', 'completed', 'on-hold'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or admin member
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = project.members.some(member => 
      member.user.toString() === req.user._id.toString() && 
      member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, description, status, endDate } = req.body;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (endDate) project.endDate = endDate;

    await project.save();
    await project.populate('owner', 'username email');
    await project.populate('members.user', 'username email');

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to project
router.post('/:id/members', [
  auth,
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or admin member
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = project.members.some(member => 
      member.user.toString() === req.user._id.toString() && 
      member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { email, role } = req.body;
    const User = require('../models/User');
    
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = project.members.find(member => 
      member.user.toString() === userToAdd._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    project.members.push({
      user: userToAdd._id,
      role: role || 'member'
    });

    await project.save();
    await project.populate('members.user', 'username email');

    // Log member addition
    await AuditLog.logAction({
      action: 'member_added',
      entityType: 'project',
      entityId: project._id,
      changedBy: req.user._id,
      description: `Added member "${userToAdd.username}" (${role || 'member'}) to project "${project.name}"`,
      metadata: {
        projectId: project._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from project
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or admin member
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = project.members.some(member => 
      member.user.toString() === req.user._id.toString() && 
      member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const removedMember = project.members.find(member => 
      member.user.toString() === req.params.userId
    );

    project.members = project.members.filter(member => 
      member.user.toString() !== req.params.userId
    );

    await project.save();
    await project.populate('members.user', 'username email');

    // Log member removal
    await AuditLog.logAction({
      action: 'member_removed',
      entityType: 'project',
      entityId: project._id,
      changedBy: req.user._id,
      description: `Removed member "${removedMember.user.username}" from project "${project.name}"`,
      metadata: {
        projectId: project._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only owner can delete project
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ project: project._id });

    await Project.findByIdAndDelete(project._id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
