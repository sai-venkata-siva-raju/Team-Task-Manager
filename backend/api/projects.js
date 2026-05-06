const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all projects for a user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.id },
        { members: req.user.id }
      ]
    }).populate('owner', 'username email avatar')
      .populate('members', 'username email avatar')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new project
router.post('/', [
  auth,
  body('name').trim().isLength({ min: 1 }).withMessage('Project name is required'),
  body('description').optional().trim()
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
      owner: req.user.id,
      members: [req.user.id]
    });

    await project.save();
    await project.populate('owner', 'username email avatar');
    await project.populate('members', 'username email avatar');

    // Log the action
    await AuditLog.logAction({
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: project._id,
      changedBy: req.user.id,
      description: `Project "${name}" created`,
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        projectId: project._id
      }
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'username email avatar')
      .populate('members', 'username email avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or member
    if (!project.owner._id.equals(req.user.id) && 
        !project.members.some(member => member._id.equals(req.user.id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', [
  auth,
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Project name cannot be empty'),
  body('description').optional().trim()
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

    // Check if user is owner
    if (!project.owner.equals(req.user.id)) {
      return res.status(403).json({ message: 'Only project owner can update project' });
    }

    const { name, description } = req.body;
    const oldName = project.name;
    
    if (name) project.name = name;
    if (description !== undefined) project.description = description;

    await project.save();
    await project.populate('owner', 'username email avatar');
    await project.populate('members', 'username email avatar');

    // Log the action
    await AuditLog.logAction({
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: project._id,
      changedBy: req.user.id,
      description: `Project "${project.name}" updated`,
      changes: name && name !== oldName ? {
        fieldName: 'name',
        oldValue: oldName,
        newValue: name
      } : null,
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        projectId: project._id
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to project
router.post('/:id/members', [
  auth,
  body('email').isEmail().withMessage('Valid email is required')
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

    // Check if user is owner
    if (!project.owner.equals(req.user.id)) {
      return res.status(403).json({ message: 'Only project owner can add members' });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    if (project.members.includes(user._id)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    project.members.push(user._id);
    await project.save();
    await project.populate('owner', 'username email avatar');
    await project.populate('members', 'username email avatar');

    // Log the action
    await AuditLog.logAction({
      action: 'MEMBER_ADDED',
      entityType: 'Project',
      entityId: project._id,
      changedBy: req.user.id,
      description: `Member "${user.username}" added to project "${project.name}"`,
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        projectId: project._id,
        addedMemberId: user._id
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from project
router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner
    if (!project.owner.equals(req.user.id)) {
      return res.status(403).json({ message: 'Only project owner can remove members' });
    }

    const memberId = req.params.memberId;
    const member = await User.findById(memberId);
    
    if (!member) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cannot remove owner
    if (project.owner.equals(memberId)) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    // Remove member
    project.members = project.members.filter(m => !m.equals(memberId));
    await project.save();
    await project.populate('owner', 'username email avatar');
    await project.populate('members', 'username email avatar');

    // Log the action
    await AuditLog.logAction({
      action: 'MEMBER_REMOVED',
      entityType: 'Project',
      entityId: project._id,
      changedBy: req.user.id,
      description: `Member "${member.username}" removed from project "${project.name}"`,
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        projectId: project._id,
        removedMemberId: memberId
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Remove member error:', error);
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

    // Check if user is owner
    if (!project.owner.equals(req.user.id)) {
      return res.status(403).json({ message: 'Only project owner can delete project' });
    }

    // Delete all tasks in the project
    await Task.deleteMany({ project: req.params.id });

    // Delete the project
    await Project.findByIdAndDelete(req.params.id);

    // Log the action
    await AuditLog.logAction({
      action: 'PROJECT_DELETED',
      entityType: 'Project',
      entityId: project._id,
      changedBy: req.user.id,
      description: `Project "${project.name}" deleted`,
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        projectId: project._id,
        projectName: project.name
      }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
