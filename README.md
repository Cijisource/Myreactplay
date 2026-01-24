# Photo Upload App

A React application for uploading photos, built with Vite and TypeScript, featuring an Express backend for file handling, and containerized with Docker for easy deployment.

## Features

- Upload photos via a simple React interface
- Backend API built with Express and Multer for file uploads
- Docker containerization with volume mount for persistent storage of uploaded photos
- TypeScript support for type safety

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

   This will start both the Vite dev server (frontend) and the Express server (backend) concurrently.

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run server
   ```

   The app will be available at [http://localhost:3001](http://localhost:3001).

### Docker

1. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

   The app will be available at [http://localhost:3001](http://localhost:3001).

   Uploaded photos are persisted in the `./uploads` directory on the host machine via a Docker volume mount.

## API Endpoints

- `POST /upload`: Upload a photo file
- `GET /uploads/:filename`: Retrieve an uploaded photo

## Project Structure

- `src/`: React frontend source code
- `server/`: Express backend source code
- `dist/`: Built frontend assets
- `uploads/`: Directory for uploaded photos (mounted in Docker)
- `Dockerfile`: Docker image configuration
- `docker-compose.yml`: Docker Compose configuration

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
