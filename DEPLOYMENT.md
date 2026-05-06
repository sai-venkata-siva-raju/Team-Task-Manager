# Deployment Guide

## Railway Deployment Steps

### 1. Prerequisites
- Railway account
- GitHub account
- MongoDB Atlas account

### 2. Database Setup (MongoDB Atlas)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier is sufficient)
3. Create a database user
4. Get connection string:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

### 3. Railway Deployment
1. **Connect Repository**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Connect your GitHub repository
   - Select the Team-Task-Manager repository

2. **Configure Environment Variables**
   In Railway dashboard, go to your project settings → Variables:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/team-task-manager?retryWrites=true&w=majority
   JWT_SECRET=your_very_secure_random_jwt_secret_key_at_least_32_characters
   NODE_ENV=production
   ```

3. **Deploy Settings**
   - Railway will automatically detect the Node.js app
   - The `railway.toml` and `nixpacks.toml` files handle the build process
   - Make sure the root directory is selected (not a subdirectory)

### 4. Verify Deployment
1. Railway will build and deploy your application
2. Once deployed, you'll get a URL like `https://your-app-name.up.railway.app`
3. Test the application:
   - Register a new user
   - Create a project
   - Add tasks
   - Verify all features work

### 5. Common Issues & Solutions

**Build Failures:**
- Check that all dependencies are in package.json
- Verify Node.js version compatibility (use Node 18+)
- Check for syntax errors in code

**Database Connection Issues:**
- Verify MongoDB URI is correct
- Ensure IP whitelist includes Railway's IP (0.0.0.0/0 for all)
- Check database user credentials

**Environment Variables:**
- Ensure all required variables are set
- Check for typos in variable names
- JWT_SECRET should be a long, random string

**Application Not Starting:**
- Check Railway logs for errors
- Verify PORT configuration (should use process.env.PORT)
- Ensure MongoDB connection is established

### 6. Custom Domain (Optional)
1. In Railway project settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed by Railway
4. Update CORS settings if needed (in backend/server.js)

### 7. Monitoring & Maintenance
- Monitor Railway logs for errors
- Set up MongoDB Atlas monitoring
- Regularly update dependencies
- Backup database regularly

## Local Development Setup

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd Team-Task-Manager
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your local MongoDB URI and JWT secret
```

### 3. Start Development Servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm start
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: mongodb://localhost:27017/team-task-manager

## Testing Checklist

### Authentication
- [ ] User registration works
- [ ] User login works
- [ ] JWT tokens are generated and validated
- [ ] Protected routes require authentication

### Projects
- [ ] Create new project
- [ ] View project list
- [ ] Add/remove team members
- [ ] Update project details
- [ ] Delete project (owner only)

### Tasks
- [ ] Create new task
- [ ] Assign task to team member
- [ ] Update task status
- [ ] Filter tasks by status/project/assignee
- [ ] Delete task
- [ ] Overdue task detection

### Dashboard
- [ ] Task statistics display correctly
- [ ] Personal task summary works
- [ ] Recent tasks show up
- [ ] Quick navigation works

### Role-Based Access
- [ ] Admin can manage all users
- [ ] Member has limited access
- [ ] Project-level permissions work
- [ ] Unauthorized access is blocked

### Error Handling
- [ ] Form validation works
- [ ] API errors display user-friendly messages
- [ ] Network errors are handled gracefully
- [ ] Loading states work correctly

## Production Considerations

### Security
- Use HTTPS (Railway provides this automatically)
- Validate all input on both client and server
- Use environment variables for sensitive data
- Implement rate limiting for API endpoints
- Regularly update dependencies

### Performance
- Implement database indexing for frequently queried fields
- Use pagination for large datasets
- Optimize images and assets
- Monitor application performance

### Scalability
- Consider using Redis for session storage
- Implement caching strategies
- Use CDN for static assets
- Plan for database scaling

## Troubleshooting

### Common Errors

**"Cannot GET /api/auth/me"**
- Check if JWT token is being sent in headers
- Verify token is not expired
- Check authentication middleware

**"MongoDB connection failed"**
- Verify connection string format
- Check network connectivity
- Ensure database user has correct permissions

**"CORS policy error"**
- Check frontend and backend URLs
- Verify CORS configuration in backend
- Ensure environment variables are set correctly

**"Build failed"**
- Check package.json scripts
- Verify all dependencies are installed
- Look for syntax errors in code

### Debugging Tips
1. Check Railway logs for detailed error messages
2. Use browser developer tools for frontend issues
3. Test API endpoints with Postman or curl
4. Check MongoDB Atlas logs for database issues
5. Verify environment variables are correctly set

## Support

For additional help:
1. Check Railway documentation: https://docs.railway.app
2. Check MongoDB Atlas documentation: https://docs.mongodb.com/atlas
3. Review application logs for specific error messages
4. Test functionality locally before deploying
