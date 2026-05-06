const express = require('express');
const mongoose = require('mongoose');

const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

const router = express.Router();

// Get audit history for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if user has access to the project
    const Project = require('../models/Project');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.owner.equals(req.user.id) && 
        !project.members.some(member => member.equals(req.user.id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const auditLogs = await AuditLog.getProjectHistory(projectId);

    res.json(auditLogs);
  } catch (error) {
    console.error('Get project audit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get audit history for a task
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check if user has access to the task
    const Task = require('../models/Task');
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const Project = require('../models/Project');
    const project = await Project.findById(task.project);
    if (!project.owner.equals(req.user.id) && 
        !project.members.some(member => member.equals(req.user.id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const auditLogs = await AuditLog.getTaskHistory(taskId);

    res.json(auditLogs);
  } catch (error) {
    console.error('Get task audit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
