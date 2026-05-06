# Use Node.js 20 Alpine Linux image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# ------------------------
# Backend build/install
# ------------------------
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./

# ------------------------
# Frontend build/install
# ------------------------
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --omit=dev
COPY frontend/ ./
RUN npm run build

# ------------------------
# Production stage
# ------------------------
FROM node:20-alpine

WORKDIR /app

# Copy backend (including node_modules) preserving folder structure: /app/backend/*
COPY --from=builder /app/backend/ ./backend/

# Copy frontend build output to /app/frontend/build
COPY --from=builder /app/frontend/build ./frontend/build

EXPOSE 5000

# Start backend directly (matches server.js expectations for __dirname)
CMD ["node", "backend/server.js"]


