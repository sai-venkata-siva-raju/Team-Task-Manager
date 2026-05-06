import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Users, Calendar, CheckSquare, UserPlus, Settings, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  const fetchProjectDetails = useCallback(async () => {
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to fetch project details');
      console.error(error);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchProjectTasks = useCallback(async () => {
    try {
      const response = await axios.get(`/api/tasks?projectId=${id}`);
      setTasks(response.data);
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectDetails();
    fetchProjectTasks();
  }, [id, fetchProjectDetails, fetchProjectTasks]);

  const handleAddMember = useCallback(async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/api/projects/${id}/members`, {
        email: memberEmail,
        role: 'member'
      });
      setProject(response.data);
      setShowAddMemberModal(false);
      setMemberEmail('');
      toast.success('Member added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add member');
      console.error(error);
    }
  }, [id, memberEmail]);

  const handleRemoveMember = useCallback(async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from project?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/projects/${id}/members/${userId}`);
      setProject(response.data);
      toast.success('Member removed successfully');
    } catch (error) {
      toast.error('Failed to remove member');
      console.error(error);
    }
  }, [id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'status-todo';
      case 'in-progress': return 'status-in-progress';
      case 'review': return 'status-review';
      case 'completed': return 'status-completed';
      default: return 'status-todo';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'priority-low';
      case 'medium': return 'priority-medium';
      case 'high': return 'priority-high';
      case 'urgent': return 'priority-urgent';
      default: return 'priority-medium';
    }
  };

  const isOwnerOrAdmin = () => {
    if (!project) return false;
    return project.owner._id === user?.id || 
           project.members.some(member => 
             member.user._id === user?.id && member.role === 'admin'
           );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
        <button
          onClick={() => navigate('/projects')}
          className="btn-primary"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-600 mt-1">{project.description || 'No description provided'}</p>
        </div>
        {isOwnerOrAdmin() && (
          <button
            onClick={() => navigate(`/projects/${id}/edit`)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Edit Project</span>
          </button>
        )}
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              <p className="text-sm text-gray-600">Total Tasks</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{project.members.length}</p>
              <p className="text-sm text-gray-600">Team Members</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">Project Start</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="p-1 text-primary-600 hover:text-primary-700"
                >
                  <UserPlus className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="p-4 space-y-3">
              {project.members.map((member) => (
                <div key={member.user._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {member.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.user.username}</p>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {member.role}
                    </span>
                    {isOwnerOrAdmin() && member.user._id !== project.owner._id && (
                      <button
                        onClick={() => handleRemoveMember(member.user._id)}
                        className="p-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Project Tasks</h2>
              <button
                onClick={() => navigate('/tasks?projectId=' + id)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View All Tasks
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {tasks.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-600 mb-4">Create your first task for this project</p>
                  <button
                    onClick={() => navigate('/tasks')}
                    className="btn-primary"
                  >
                    Create Task
                  </button>
                </div>
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <div key={task._id} className={`p-4 ${getPriorityColor(task.priority)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <span className={`status-badge ${getStatusColor(task.status)}`}>
                            {task.status.replace('-', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {task.assignedTo && (
                            <span className="flex items-center space-x-1">
                              <Users className="h-4 w-4" />
                              <span>{task.assignedTo.username}</span>
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {tasks.length > 5 && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => navigate('/tasks?projectId=' + id)}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  View all {tasks.length} tasks →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Team Member</h2>
            <form onSubmit={handleAddMember}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter member's email"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
