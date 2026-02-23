# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g http-server

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["http-server", "dist", "-p", "3000", "--host", "0.0.0.0"]
