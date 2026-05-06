import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Clock, FileText, Users, Settings, AlertCircle } from 'lucide-react';

const AuditTrail = ({ entityType, entityId, showHeader = true }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      if (entityType === 'task') {
        response = await axios.get(`/api/audit/task/${entityId}`);
      } else if (entityType === 'project') {
        response = await axios.get(`/api/audit/project/${entityId}`);
      }
      
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError('Failed to load audit history');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'task_created':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'task_updated':
        return <Settings className="h-4 w-4 text-blue-600" />;
      case 'status_changed':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'assignment_changed':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'task_deleted':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'task_created':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'task_updated':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'status_changed':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'assignment_changed':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'task_deleted':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatTimestamp(timestamp);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No History Yet</h3>
        <p className="text-gray-600">No changes have been made to this {entityType}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Change History</h3>
          <span className="text-sm text-gray-500">({auditLogs.length} events)</span>
        </div>
      )}
      
      <div className="space-y-3">
        {auditLogs.map((log, index) => (
          <div
            key={log._id}
            className={`relative flex items-start space-x-3 p-3 rounded-lg border ${getActionColor(log.action)}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getActionIcon(log.action)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900">
                  {log.changedBy?.username || 'Unknown User'}
                </span>
                <span className="text-sm text-gray-500">
                  {getRelativeTime(log.timestamp)}
                </span>
              </div>
              
              <p className="text-sm text-gray-700 mb-2">
                {log.description}
              </p>
              
              {log.changes && Object.keys(log.changes).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(log.changes).map(([field, change]) => (
                    <div key={field} className="text-xs bg-white bg-opacity-50 rounded p-2">
                      <span className="font-medium text-gray-600 capitalize">
                        {change.fieldName || field}:
                      </span>
                      {change.oldValue !== undefined && change.newValue !== undefined ? (
                        <span className="ml-2">
                          <span className="line-through text-gray-500">
                            {typeof change.oldValue === 'boolean' 
                              ? (change.oldValue ? 'Yes' : 'No')
                              : (change.oldValue || 'None')
                            }
                          </span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="text-gray-900 font-medium">
                            {typeof change.newValue === 'boolean'
                              ? (change.newValue ? 'Yes' : 'No')
                              : (change.newValue || 'None')
                            }
                          </span>
                        </span>
                      ) : (
                        <span className="ml-2 text-gray-900">
                          {change.newValue || 'None'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                <span>ID: {log._id.slice(-8)}</span>
                {log.metadata?.ipAddress && (
                  <span>IP: {log.metadata.ipAddress}</span>
                )}
              </div>
            </div>
            
            {index < auditLogs.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-300"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditTrail;
