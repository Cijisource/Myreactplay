.PHONY: help install dev build clean docker-up docker-down docker-logs seed lint format

help:
	@echo "E-Commerce Application - Available Commands"
	@echo "==========================================="
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install all dependencies"
	@echo "  make seed             Seed database with sample products"
	@echo ""
	@echo "Development:"
	@echo "  make dev              Start development servers"
	@echo "  make dev-backend      Start backend server only"
	@echo "  make dev-frontend     Start frontend server only"
	@echo ""
	@echo "Building:"
	@echo "  make build            Build for production"
	@echo "  make clean            Clean build artifacts"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        Start services with Docker Compose"
	@echo "  make docker-down      Stop Docker services"
	@echo "  make docker-logs      View Docker logs"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint             Run linting"
	@echo "  make format           Format code with Prettier"
	@echo ""

install:
	npm run install-all

dev:
	npm run dev

dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

build:
	npm run build

clean:
	rm -rf frontend/dist backend/dist
	find . -name "node_modules" -type d -prune -exec rm -rf {} \;

docker-up:
	docker-compose up --build

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

seed:
	cd backend && npx ts-node src/seed.ts

lint:
	cd frontend && npm run lint
	cd backend && npm run lint

format:
	npx prettier --write "frontend/src/**/*.{ts,tsx,css}" "backend/src/**/*.ts"

.DEFAULT_GOAL := help
