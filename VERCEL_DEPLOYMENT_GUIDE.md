# Vercel Deployment Guide - Team Task Manager

## 🚀 **Why Vercel?**
- ✅ **Free tier** - Generous free hosting
- ✅ **Serverless functions** - Perfect for Node.js APIs
- ✅ **Automatic HTTPS** - SSL certificates included
- ✅ **Global CDN** - Fast loading worldwide
- ✅ **Git integration** - Deploy from GitHub
- ✅ **Zero config** - Works out of the box

---

## 📋 **Deployment Steps**

### **Step 1: Prepare Your Project**

#### **1.1 Install Vercel CLI**
```bash
npm install -g vercel
```

#### **1.2 Login to Vercel**
```bash
vercel login
```

### **Step 2: Configure Environment Variables**

#### **2.1 Create `.env.local`**
```bash
# In project root
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/team-task-manager?retryWrites=true&w=majority
JWT_SECRET=your_32_character_secret_key_here
NODE_ENV=production
```

#### **2.2 Set Vercel Environment Variables**
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NODE_ENV
```

### **Step 3: Deploy to Vercel**

#### **3.1 Initial Deployment**
```bash
vercel --prod
```

#### **3.2 Follow the Prompts**
- **Project name**: `team-task-manager`
- **Directory**: `.` (root)
- **Framework**: `Other`
- **Build command**: `npm run build:frontend`
- **Output directory**: `frontend/build`

---

## 🔧 **Configuration Files**

### **vercel.json** (Already Created)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build" }
    },
    {
      "src": "backend/api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/api/$1" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ]
}
```

### **package.json** (Add Build Scripts)
```json
{
  "scripts": {
    "build:frontend": "cd frontend && npm run build",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm start"
  }
}
```

---

## 🌐 **API Structure**

### **Serverless Functions**
```
backend/api/
├── auth.js      # Authentication (register, login)
├── projects.js  # Project management
├── tasks.js     # Task management
└── audit.js     # Audit logging
```

### **API Endpoints**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create project
- `GET /api/tasks/project/:id` - Get project tasks
- `POST /api/tasks` - Create task
- `GET /api/audit/project/:id` - Get project audit logs

---

## 🔐 **MongoDB Atlas Setup**

### **1. Network Access**
Add Vercel's IP to MongoDB Atlas whitelist:
- **Vercel IP ranges**: `0.0.0.0/0` (for testing)
- **Or specific IPs**: Check Vercel docs for current ranges

### **2. Environment Variables**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/team-task-manager
JWT_SECRET=your_secure_32_character_secret
NODE_ENV=production
```

---

## 📱 **Frontend Configuration**

### **Update API Base URL**
In `frontend/src/config.js`:
```javascript
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? ''  // Same domain on Vercel
  : 'http://localhost:5000';
```

---

## 🚀 **Deployment Commands**

### **Development**
```bash
# Local development
npm run dev

# Preview deployment
vercel
```

### **Production**
```bash
# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# View deployment metrics
vercel inspect
```

---

## 📊 **Vercel Features**

### **Free Tier Limits**
- ✅ **100GB Bandwidth** per month
- ✅ **Serverless Functions** - 100k invocations
- ✅ **Static Hosting** - Unlimited
- ✅ **Custom Domains** - 1 domain
- ✅ **HTTPS** - Automatic
- ✅ **Edge Network** - Global CDN

### **Monitoring**
- **Real-time logs** - `vercel logs`
- **Function metrics** - `vercel inspect`
- **Error tracking** - Built-in
- **Performance** - Analytics included

---

## 🎯 **Expected Results**

### **After Deployment**
- ✅ **URL**: `https://team-task-manager.vercel.app`
- ✅ **Full functionality**: All features working
- ✅ **Fast loading**: Global CDN
- ✅ **Secure**: HTTPS included
- ✅ **Scalable**: Serverless functions

### **Features Available**
- ✅ **User authentication** - JWT tokens
- ✅ **Project management** - CRUD operations
- ✅ **Task tracking** - Complete system
- ✅ **Audit logging** - Full change history
- ✅ **Role-based access** - Admin/Member system
- ✅ **Real-time updates** - Live status changes

---

## 🔍 **Troubleshooting**

### **Common Issues**
1. **MongoDB connection**: Check IP whitelist
2. **Environment variables**: Verify all are set
3. **Build errors**: Check package.json scripts
4. **API errors**: Check serverless function logs

### **Debug Commands**
```bash
# Check deployment logs
vercel logs

# Check function metrics
vercel inspect

# Test locally
vercel dev
```

---

## 📈 **Next Steps**

### **Custom Domain (Optional)**
```bash
# Add custom domain
vercel domains add yourdomain.com

# Verify DNS
vercel domains verify
```

### **Analytics**
```bash
# View analytics
vercel analytics
```

---

**Your Team Task Manager will be fully functional on Vercel with all features working perfectly!** 🚀

Vercel provides the best free deployment experience with excellent performance and reliability.
