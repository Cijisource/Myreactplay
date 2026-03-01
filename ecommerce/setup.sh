#!/bin/bash

echo "🚀 E-Commerce Application Setup"
echo "==============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Check if Docker is installed (optional)
if command -v docker &> /dev/null; then
    echo "✓ Docker is installed: $(docker --version)"
else
    echo "⚠️  Docker is not installed (optional, needed for containerized deployment)"
fi

echo ""
echo "Installing dependencies..."
echo ""

# Install root dependencies
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "✓ All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure environment variables:"
echo "   - Backend: backend/.env"
echo "   - Frontend: frontend/.env (optional)"
echo ""
echo "2. Start MongoDB (if not using Docker):"
echo "   docker run -d -p 27017:27017 mongo"
echo ""
echo "3. Start the application:"
echo "   npm run dev          # Local development"
echo "   docker-compose up    # Docker deployment"
echo ""
echo "Happy coding! 🎉"
