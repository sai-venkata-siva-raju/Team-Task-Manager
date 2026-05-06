const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

const Task = require('./models/Task');
const Project = require('./models/Project');
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');
const auth = require('./middleware/auth');

const router = express.Router();

// Get all tasks for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if user has access to the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.owner.equals(req.user.id) && 
        !project.members.some(member => member.equals(req.user.id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'username email avatar')
      .populate('createdBy', 'username email avatar')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new task
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 1 }).withMessage('Task title is required'),
  body('description').optional().trim(),
  body('project').isMongoId().withMessage('Valid project ID is required'),
  body('assignedTo').optional().isMongoId().withMessage('Valid user ID is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, project, assignedTo, priority, dueDate } = req.body;

    // Check if user has access to the project
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!projectDoc.owner.equals(req.user.id) && 
        !projectDoc.members.some(member => member.equals(req.user.id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If assignedTo is provided, check if user is a project member
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({ message: 'Assigned user not found' });
      }

      if (!projectDoc.owner.equals(assignedTo) && 
          !projectDoc.members.some(member => member.equals(assignedTo))) {
        return res.status(400).json({ message: 'Assigned user is not a project member' });
      }
    }

    const task = new Task({
      title,
      description,
      project,
      assignedTo: assignedTo || null,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user.id
    });

    await task.save();
    await task.populate('assignedTo', 'username email avatar');
    await task.populate('createdBy', 'username email avatar');

    // Log the action
    await AuditLog.logAction({
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task._id,
      changedBy: req.user.id,
      description: `Task "${title}" created in project "${projectDoc.name}"`,
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        projectId: project,
        taskId: task._id
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Task title cannot be empty'),
  body('description').optional().trim(),
  body('assignedTo').optional().isMongoId().withMessage('Valid user ID is required'),
  body('status').optional().isIn(['todo', 'in-progress', 'completed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const project = await Project.findById(task.project);
    if (!project.owner.equals(req.user.id) && 
        !project.members.some(member => member.equals(req.user.id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = {};
    const oldValues = {};
    const { title, description, assignedTo, status, priority, dueDate } = req.body;

    // Track changes for audit log
    if (title !== undefined && title !== task.title) {
      updates.title = title;
      oldValues.title = task.title;
    }
    if (description !== undefined && description !== task.description) {
      updates.description = description;
      oldValues.description = task.description;
    }
    if (assignedTo !== undefined && !assignedTo.equals(task.assignedTo)) {
      updates.assignedTo = assignedTo;
      oldValues.assignedTo = task.assignedTo;
    }
    if (status !== undefined && status !== task.status) {
      updates.status = status;
      oldValues.status = task.status;
    }
    if (priority !== undefined && priority !== task.priority) {
      updates.priority = priority;
      oldValues.priority = task.priority;
    }
    if (dueDate !== undefined) {
      const newDueDate = dueDate ? new Date(dueDate) : null;
      if (!task.dueDate || !newDueDate || task.dueDate.getTime() !== newDueDate.getTime()) {
        updates.dueDate = newDueDate;
        oldValues.dueDate = task.dueDate;
      }
    }

    // Validate assignedTo if provided
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({ message: 'Assigned user not found' });
      }

      if (!project.owner.equals(assignedTo) && 
          !project.members.some(member => member.equals(assignedTo))) {
        return res.status(400).json({ message: 'Assigned user is not a project member' });
      }
    }

    Object.assign(task, updates);
    await task.save();
    await task.populate('assignedTo', 'username email avatar');
    await task.populate('createdBy', 'username email avatar');

    // Log the action
    await AuditLog.logAction({
      action: 'TASK_UPDATED',
      entityType: 'Task',
      entityId: task._id,
      changedBy: req.user.id,
      description: `Task "${task.title}" updated`,
      changes: Object.keys(oldValues).length > 0 ? {
        fieldName: Object.keys(oldValues)[0],
        oldValue: oldValues[Object.keys(oldValues)[0]],
        newValue: updates[Object.keys(oldValues)[0]]
      } : null,
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        projectId: project._id,
        taskId: task._id
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const project = await Project.findById(task.project);
    if (!project.owner.equals(req.user.id) && 
        !project.members.some(member => member.equals(req.user.id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Log the action
    await AuditLog.logAction({
      action: 'TASK_DELETED',
      entityType: 'Task',
      entityId: task._id,
      changedBy: req.user.id,
      description: `Task "${task.title}" deleted from project "${project.name}"`,
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        projectId: project._id,
        taskId: task._id,
        taskTitle: task.title
      }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get audit history for a task
router.get('/:id/audit', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const project = await Project.findById(task.project);
    if (!project.owner.equals(req.user.id) && 
        !project.members.some(member => member.equals(req.user.id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const auditLogs = await AuditLog.getTaskHistory(task._id);

    res.json(auditLogs);
  } catch (error) {
    console.error('Get task audit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
