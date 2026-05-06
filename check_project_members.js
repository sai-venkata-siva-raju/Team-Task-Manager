const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/team-task-manager');

const Project = require('./backend/models/Project');
const User = require('./backend/models/User');

async function checkProjectMembers() {
  try {
    const projectId = '69facee960f25c5a0e73563f';
    const userId = '69facf2660f25c5a0e735669';
    
    console.log('Checking project members...');
    
    // Get project details
    const project = await Project.findById(projectId)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');
    
    if (!project) {
      console.log('Project not found');
      return;
    }
    
    console.log('\n=== PROJECT DETAILS ===');
    console.log('Project ID:', project._id);
    console.log('Project Name:', project.name);
    console.log('Owner:', project.owner.username, '(', project.owner.email, ')');
    console.log('Owner ID:', project.owner._id);
    
    console.log('\n=== CURRENT MEMBERS ===');
    if (project.members.length === 0) {
      console.log('No members found');
    } else {
      project.members.forEach((member, index) => {
        console.log(`${index + 1}. ${member.user.username} (${member.user.email}) - ${member.role} - ID: ${member.user._id}`);
      });
    }
    
    console.log('\n=== USER TO ASSIGN ===');
    const userToAssign = await User.findById(userId);
    if (userToAssign) {
      console.log('User:', userToAssign.username, '(', userToAssign.email, ')');
      console.log('User ID:', userToAssign._id);
      
      // Check if user is already a member
      const isMember = project.members.some(member => 
        member.user._id.toString() === userId
      );
      const isOwner = project.owner._id.toString() === userId;
      
      console.log('Is Member:', isMember);
      console.log('Is Owner:', isOwner);
      console.log('Can be assigned:', isMember || isOwner);
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkProjectMembers();
