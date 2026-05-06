import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Camera, Save } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    avatar: ''
  });
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        avatar: user.avatar || ''
      });
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you'd upload this to a service like Cloudinary
      // For now, we'll just create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setFormData({
          ...formData,
          avatar: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`/api/users/${user.id}`, formData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-gray-600" />
                  )}
                </div>
                <label
                  htmlFor="avatar"
                  className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </label>
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
                <p className="text-sm text-gray-600">
                  Upload a new avatar. JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            </div>

            {/* Role Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Account Role</h3>
                  <p className="text-sm text-gray-600">
                    Your current role is <span className="font-medium">{user?.role}</span>
                  </p>
                  {user?.role === 'admin' && (
                    <p className="text-xs text-gray-500 mt-1">
                      As an admin, you can manage users, projects, and have full system access.
                    </p>
                  )}
                  {user?.role === 'member' && (
                    <p className="text-xs text-gray-500 mt-1">
                      As a member, you can participate in projects and manage assigned tasks.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">Member Since</p>
              <p className="text-sm text-gray-600">
                {user ? new Date().toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">Account Type</p>
              <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">Status</p>
              <p className="text-sm text-green-600">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
