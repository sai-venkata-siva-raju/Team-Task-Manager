# Team Task Manager

A full-stack web application for team collaboration and task management with role-based access control.

## Features

### Authentication
- User registration and login
- JWT-based authentication
- Role-based access (Admin/Member)

### Project Management
- Create and manage projects
- Add/remove team members
- Project member roles (Admin/Member)
- Project status tracking

### Task Management
- Create, assign, and track tasks
- Task priority levels (Low, Medium, High, Urgent)
- Task status tracking (Todo, In Progress, Review, Completed)
- Due date management with overdue notifications
- Task filtering and searching

### Dashboard
- Task statistics and overview
- Personal task summary
- Quick navigation to key features
- Recent activity tracking

### User Management
- Profile management
- Avatar upload
- Account settings
- Admin user management

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT authentication
- Express-validator for input validation
- CORS for cross-origin requests

### Frontend
- React 18 with React Router
- Tailwind CSS for styling
- Lucide React for icons
- Axios for API calls
- React Hook Form for form management
- React Hot Toast for notifications

### Deployment
- Railway for hosting
- MongoDB Atlas for database

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add member
- `DELETE /api/projects/:id/members/:userId` - Remove member

### Tasks
- `GET /api/tasks` - Get tasks with filters
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/stats/dashboard` - Get dashboard statistics

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `PUT /api/users/:id/role` - Update user role (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

## Installation and Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Team-Task-Manager
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update .env with your MongoDB URI and JWT secret
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Environment Variables**
   Create a `.env` file in the backend directory:
   ```
   MONGODB_URI=mongodb://localhost:27017/team-task-manager
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   ```

## Deployment

### Railway Deployment

1. **Connect Repository**
   - Connect your GitHub repository to Railway
   - Railway will automatically detect the Node.js application

2. **Environment Variables**
   Set the following environment variables in Railway:
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secure_jwt_secret
   NODE_ENV=production
   ```

3. **Build Configuration**
   The project includes `railway.toml` and `nixpacks.toml` for automatic deployment configuration.

4. **Database Setup**
   - Create a MongoDB Atlas cluster
   - Add your Railway IP to the whitelist
   - Use the connection string in environment variables

## Usage

### Getting Started

1. **Register an Account**
   - Visit the application
   - Click "Create account"
   - Choose your role (Admin or Member)

2. **Create Your First Project**
   - Navigate to Projects
   - Click "New Project"
   - Add project details

3. **Add Team Members**
   - Go to project details
   - Click "Add Member"
   - Enter member email

4. **Create and Assign Tasks**
   - Navigate to Tasks
   - Click "New Task"
   - Fill in task details and assign to team members

### Role Permissions

**Admin:**
- Manage all users
- Create/delete projects
- Add/remove project members
- Full task management access

**Member:**
- Participate in assigned projects
- Manage assigned tasks
- View project details
- Update personal profile

## Features in Detail

### Task Management
- **Priority Levels**: Low, Medium, High, Urgent
- **Status Tracking**: Todo, In Progress, Review, Completed
- **Due Dates**: Automatic overdue detection
- **Assignments**: Assign tasks to team members
- **Filtering**: Filter by status, project, or assignee

### Project Collaboration
- **Member Management**: Add/remove team members
- **Role-Based Access**: Project-level admin/member roles
- **Activity Tracking**: See all project tasks
- **Team Overview**: Member list and roles

### Dashboard Analytics
- **Task Statistics**: Overview of all task statuses
- **Personal Summary**: Tasks assigned to current user
- **Overdue Alerts**: Visual indication of overdue tasks
- **Quick Actions**: Easy navigation to key features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.
