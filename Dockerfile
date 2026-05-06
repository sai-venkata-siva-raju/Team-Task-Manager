# Use Node.js 20 Alpine Linux image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install --omit=dev

# Copy backend application code
COPY backend/ .

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --omit=dev
COPY frontend/ .
RUN npm run build

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend files from builder
COPY --from=builder /app/server.js ./
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/models ./models
COPY --from=builder /app/middleware ./middleware

# Copy frontend build from builder
COPY --from=builder /app/frontend/build ./frontend/build

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
