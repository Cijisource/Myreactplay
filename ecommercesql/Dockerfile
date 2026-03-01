# Frontend build
FROM node:18-alpine as frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Backend
FROM node:18-alpine as backend-builder
WORKDIR /backend

# Install build tools for native modules (sqlite3)
RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./
RUN npm install
COPY backend/ .

# Final image
FROM node:18-alpine
WORKDIR /app

# Install build tools and serve
RUN apk add --no-cache python3 make g++ && npm install -g serve

# Copy backend
COPY --from=backend-builder /backend ./backend

# Copy frontend build
COPY --from=frontend-builder /frontend/build ./frontend/build

# Create necessary directories
RUN mkdir -p /app/backend/data /app/backend/uploads && chmod 777 /app/backend/data /app/backend/uploads

EXPOSE 3000 5000

# Run both services (frontend and backend)
CMD ["sh", "-c", "npm --prefix backend start & serve -s frontend/build -l 3000"]
