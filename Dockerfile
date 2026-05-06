# Use Node.js 20 Alpine Linux image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy backend application code
COPY backend/ .

# Copy frontend build (pre-built locally)
COPY frontend/build ./frontend/build

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
