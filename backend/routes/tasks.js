const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all tasks for a user
router.get('/', auth, async (req, res) => {
  try {
    const { projectId, status, assignedTo } = req.query;
    
    // Find projects where user is owner or member
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    }).select('_id');

    const projectIds = projects.map(p => p._id);

    // Build query
    let query = { project: { $in: projectIds } };
    
    if (projectId) query.project = projectId;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate('project', 'name')
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name')
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task's project
    const project = await Project.findById(task.project._id);
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new task
router.post('/', [
  auth,
  body('title').notEmpty().trim().escape(),
  body('description').optional().trim().escape(),
  body('project').isMongoId(),
  body('assignedTo').optional().isMongoId(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('dueDate').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, project, assignedTo, priority, dueDate, tags } = req.body;

    // Check if user has access to the project
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isOwner = projectDoc.owner.toString() === req.user._id.toString();
    const isMember = projectDoc.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If assignedTo is provided, check if the user is a project member
    if (assignedTo) {
      const isAssignedUserMember = projectDoc.members.some(member => 
        member.user.toString() === assignedTo
      ) || projectDoc.owner.toString() === assignedTo;

      if (!isAssignedUserMember) {
        return res.status(400).json({ message: 'Assigned user is not a project member' });
      }
    }

    const task = new Task({
      title,
      description,
      project,
      assignedTo,
      createdBy: req.user._id,
      priority: priority || 'medium',
      dueDate,
      tags: tags || []
    });

    await task.save();
    await task.populate('project', 'name');
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', [
  auth,
  body('title').optional().notEmpty().trim().escape(),
  body('description').optional().trim().escape(),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'completed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('dueDate').optional().isISO8601().toDate()
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

    // Check if user has access to this task's project
    const project = await Project.findById(task.project);
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, status, priority, dueDate, assignedTo, tags } = req.body;

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (assignedTo) {
      // Check if assigned user is a project member
      const isAssignedUserMember = project.members.some(member => 
        member.user.toString() === assignedTo
      ) || project.owner.toString() === assignedTo;

      if (!isAssignedUserMember) {
        return res.status(400).json({ message: 'Assigned user is not a project member' });
      }
      task.assignedTo = assignedTo;
    }
    if (tags) task.tags = tags;

    await task.save();
    await task.populate('project', 'name');
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    res.json(task);
  } catch (error) {
    console.error(error);
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

    // Check if user has access to this task's project
    const project = await Project.findById(task.project);
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = project.members.some(member => 
      member.user.toString() === req.user._id.toString() && 
      member.role === 'admin'
    );

    // Only owner, admin, or task creator can delete
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Task.findByIdAndDelete(task._id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task statistics for dashboard
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    // Find projects where user is owner or member
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    }).select('_id');

    const projectIds = projects.map(p => p._id);

    // Get task statistics
    const stats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'completed'] },
                    { $lt: ['$dueDate', new Date()] },
                    { $ne: ['$dueDate', null] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get tasks assigned to current user
    const myTasksStats = await Task.aggregate([
      { $match: { project: { $in: projectIds }, assignedTo: req.user._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'completed'] },
                    { $lt: ['$dueDate', new Date()] },
                    { $ne: ['$dueDate', null] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      allTasks: stats[0] || { total: 0, todo: 0, inProgress: 0, review: 0, completed: 0, overdue: 0 },
      myTasks: myTasksStats[0] || { total: 0, todo: 0, inProgress: 0, review: 0, completed: 0, overdue: 0 }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
