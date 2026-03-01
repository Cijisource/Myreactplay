# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install build tools required for native modules (sqlite3, etc)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create data and uploads directories
RUN mkdir -p /app/data /app/uploads && chmod 777 /app/data /app/uploads

EXPOSE 5000

CMD ["npm", "start"]
