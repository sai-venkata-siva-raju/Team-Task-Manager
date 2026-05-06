const express = require('express');
const { auth } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const Task = require('../models/Task');
const Project = require('../models/Project');

const router = express.Router();

// Get audit history for a specific task
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { limit = 50 } = req.query;

    // Verify user has access to this task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findById(task.project);
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const auditHistory = await AuditLog.getTaskHistory(taskId, parseInt(limit));
    res.json(auditHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get audit history for a specific project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 100 } = req.query;

    // Verify user has access to this project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isOwner = project.owner.toString() === req.user._id.toString();
    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const auditHistory = await AuditLog.getProjectHistory(projectId, parseInt(limit));
    res.json(auditHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's own audit history
router.get('/my-history', auth, async (req, res) => {
  try {
    const { limit = 100, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const auditHistory = await AuditLog.find({ changedBy: req.user._id })
      .populate('entityId', 'title name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments({ changedBy: req.user._id });

    res.json({
      auditHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent audit logs for admin dashboard
router.get('/recent', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Only admins can see all recent logs
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const recentLogs = await AuditLog.find()
      .populate('changedBy', 'username email')
      .populate('entityId', 'title name')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(recentLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get audit statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // Only admins can see audit statistics
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const stats = await AuditLog.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalActions = await AuditLog.countDocuments({
      timestamp: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    });

    const topUsers = await AuditLog.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      },
      {
        $group: {
          _id: '$changedBy',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          username: '$user.username',
          count: 1
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      actionStats: stats,
      totalActions,
      topUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
