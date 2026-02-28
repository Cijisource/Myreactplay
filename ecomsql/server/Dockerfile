# Build stage
# Using specific Node version tag for reliability
# Fallback: if slim doesn't work, Docker will use latest 18.x
FROM node:18.19.0-slim

WORKDIR /app

# Install build essentials and dependencies
# Required for native module compilation (mssql native modules, etc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json .npmrc* ./

# Install production dependencies
# Using npm install for better compatibility instead of npm ci
# --prefer-offline helps with network issues
# --no-audit speeds up installation
RUN npm install --production --prefer-offline --no-audit --legacy-peer-deps 2>&1

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port 5000
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD npm run test || exit 1

# Start the server
CMD ["npm", "start"]
