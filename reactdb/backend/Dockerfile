# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /app/dist ./dist

# Create complains directory with proper permissions before app starts
RUN mkdir -p /app/complains && \
    chmod 755 /app/complains && \
    chmod 755 /app

# Set environment variable for complains directory
ENV COMPLAINS_DIR=/app/complains

EXPOSE 5000

CMD ["npm", "start"]
