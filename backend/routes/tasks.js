const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const AuditLog = require('../models/AuditLog');
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

    // If assignedTo is provided, check if the user is a project member or owner
    if (assignedTo) {
      const isAssignedUserMember = projectDoc.members.some(member => 
        member.user.toString() === assignedTo.toString()
      );
      const isAssignedUserOwner = projectDoc.owner.toString() === assignedTo.toString();

      console.log('Debug - Assigned User ID:', assignedTo.toString());
      console.log('Debug - Project Owner ID:', projectDoc.owner.toString());
      console.log('Debug - Project Members:', projectDoc.members.map(m => ({ user: m.user.toString(), role: m.role })));
      console.log('Debug - Is Assigned User Member:', isAssignedUserMember);
      console.log('Debug - Is Assigned User Owner:', isAssignedUserOwner);

      if (!isAssignedUserMember && !isAssignedUserOwner) {
        return res.status(400).json({ message: 'Assigned user is not a project member or owner' });
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

    // Log task creation
    await AuditLog.logAction({
      action: 'task_created',
      entityType: 'task',
      entityId: task._id,
      changedBy: req.user._id,
      description: `Created task "${title}" in project "${projectDoc.name}"`,
      metadata: {
        projectId: project,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

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
    
    const changes = new Map();
    const oldTask = { ...task.toObject() };

    if (title) {
      changes.set('title', {
        oldValue: task.title,
        newValue: title,
        fieldName: 'title'
      });
      task.title = title;
    }
    if (description !== undefined) {
      changes.set('description', {
        oldValue: task.description,
        newValue: description,
        fieldName: 'description'
      });
      task.description = description;
    }
    if (status) {
      changes.set('status', {
        oldValue: task.status,
        newValue: status,
        fieldName: 'status'
      });
      task.status = status;
      
      // Log specific status change
      await AuditLog.logAction({
        action: 'status_changed',
        entityType: 'task',
        entityId: task._id,
        changedBy: req.user._id,
        changes: new Map([['status', {
          oldValue: oldTask.status,
          newValue: status,
          fieldName: 'status'
        }]]),
        description: `Changed task status from "${oldTask.status}" to "${status}"`,
        metadata: {
          projectId: task.project,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    }
    if (priority) {
      changes.set('priority', {
        oldValue: task.priority,
        newValue: priority,
        fieldName: 'priority'
      });
      task.priority = priority;
    }
    if (dueDate) {
      changes.set('dueDate', {
        oldValue: task.dueDate,
        newValue: dueDate,
        fieldName: 'dueDate'
      });
      task.dueDate = dueDate;
    }
    if (assignedTo) {
      // Check if assigned user is a project member or owner
      const isAssignedUserMember = project.members.some(member => 
        member.user.toString() === assignedTo.toString()
      );
      const isAssignedUserOwner = project.owner.toString() === assignedTo.toString();

      if (!isAssignedUserMember && !isAssignedUserOwner) {
        return res.status(400).json({ message: 'Assigned user is not a project member or owner' });
      }

      const oldAssignedTo = task.assignedTo ? task.assignedTo.toString() : null;
      const newAssignedTo = assignedTo.toString();
      
      if (oldAssignedTo !== newAssignedTo) {
        // Find user details for description
        const User = require('../models/User');
        const [oldUser, newUser] = await Promise.all([
          oldAssignedTo ? User.findById(oldAssignedTo).select('username') : null,
          User.findById(newAssignedTo).select('username')
        ]);

        const oldUsername = oldUser ? oldUser.username : 'Unassigned';
        const newUsername = newUser ? newUser.username : 'Unknown';

        // Log specific assignment change
        await AuditLog.logAction({
          action: 'assignment_changed',
          entityType: 'task',
          entityId: task._id,
          changedBy: req.user._id,
          changes: new Map([['assignedTo', {
            oldValue: oldAssignedTo,
            newValue: newAssignedTo,
            fieldName: 'assignedTo'
          }]]),
          description: `Reassigned task from "${oldUsername}" to "${newUsername}"`,
          metadata: {
            projectId: task.project,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        });
      }

      changes.set('assignedTo', {
        oldValue: oldAssignedTo,
        newValue: newAssignedTo,
        fieldName: 'assignedTo'
      });
      task.assignedTo = assignedTo;
    }
    if (tags) {
      changes.set('tags', {
        oldValue: task.tags,
        newValue: tags,
        fieldName: 'tags'
      });
      task.tags = tags;
    }

    await task.save();
    await task.populate('project', 'name');
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    // Log general task update if there were changes other than status/assignment
    if (changes.size > 0 && !status && !assignedTo) {
      await AuditLog.logAction({
        action: 'task_updated',
        entityType: 'task',
        entityId: task._id,
        changedBy: req.user._id,
        changes,
        description: `Updated task "${task.title}"`,
        metadata: {
          projectId: task.project,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    }

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
