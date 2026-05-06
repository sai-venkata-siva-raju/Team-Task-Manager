import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  FolderOpen, 
  Users, 
  Calendar,
  Edit,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      toast.error('Failed to fetch projects');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/projects', formData);
      setProjects([...projects, response.data]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      toast.success('Project created successfully');
    } catch (error) {
      toast.error('Failed to create project');
      console.error(error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This will also delete all associated tasks.')) {
      return;
    }

    try {
      await axios.delete(`/api/projects/${projectId}`);
      setProjects(projects.filter(p => p._id !== projectId));
      toast.success('Project deleted successfully');
    } catch (error) {
      toast.error('Failed to delete project');
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-2">Manage your projects and team collaboration</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-4">Create your first project to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => navigate(`/projects/${project._id}`)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {project.owner._id === user?.id && (
                      <button
                        onClick={() => handleDeleteProject(project._id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {project.description || 'No description provided'}
                </p>

                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{project.members.length} members</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-primary-600 rounded-full"></div>
                    <span>Owner: {project.owner.username}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center space-x-2">
                  {project.members.slice(0, 3).map((member, index) => (
                    <div
                      key={member.user._id}
                      className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-700 border-2 border-white"
                      style={{ marginLeft: index > 0 ? '-8px' : '0' }}
                    >
                      {member.user.username.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {project.members.length > 3 && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
                      +{project.members.length - 3}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <Link
                  to={`/projects/${project._id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center space-x-1"
                >
                  <span>View Details</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter project description (optional)"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
