const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'task_created',
      'task_updated',
      'task_deleted',
      'status_changed',
      'assignment_changed',
      'priority_changed',
      'due_date_changed',
      'project_created',
      'project_updated',
      'project_deleted',
      'member_added',
      'member_removed',
      'user_created',
      'user_updated'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['task', 'project', 'user']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  changes: {
    type: Map,
    of: {
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      fieldName: String
    }
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    ipAddress: String,
    userAgent: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
auditLogSchema.index({ entityId: 1, timestamp: -1 });
auditLogSchema.index({ changedBy: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'metadata.projectId': 1, timestamp: -1 });

// Static method to create audit log entries
auditLogSchema.statics.logAction = function({
  action,
  entityType,
  entityId,
  changedBy,
  changes = new Map(),
  description,
  metadata = {}
}) {
  return this.create({
    action,
    entityType,
    entityId,
    changedBy,
    changes: Object.fromEntries(changes),
    description,
    metadata: {
      ...metadata,
      timestamp: new Date()
    }
  });
};

// Static method to get task history
auditLogSchema.statics.getTaskHistory = function(taskId, limit = 50) {
  return this.find({ entityId: taskId, entityType: 'task' })
    .populate('changedBy', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get project audit trail
auditLogSchema.statics.getProjectHistory = function(projectId, limit = 100) {
  return this.find({
    $or: [
      { entityId: projectId, entityType: 'project' },
      { 'metadata.projectId': projectId }
    ]
  })
    .populate('changedBy', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
