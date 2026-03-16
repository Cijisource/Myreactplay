# Docker Stats Collector - Docker Support

This project includes Docker support for containerizing and running the Docker stats collector.

## Docker Setup

### Build the Docker Image

```bash
docker build -t docker-stats-collector .
```

### Run with Docker

#### Collect all containers (one-time run)
```bash
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v $(pwd)/docker_stats_data:/app/docker_stats_data \
  docker-stats-collector
```

#### Collect for specific container
```bash
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v $(pwd)/docker_stats_data:/app/docker_stats_data \
  docker-stats-collector --container <container_name>
```

#### Custom output directory
```bash
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /path/to/output:/app/docker_stats_data \
  docker-stats-collector --output-dir /app/docker_stats_data
```

### Using Docker Compose

#### Build and run
```bash
docker-compose up
```

#### Build the image
```bash
docker-compose build
```

#### Run in detached mode
```bash
docker-compose up -d
```

#### View logs
```bash
docker-compose logs -f
```

#### Stop and remove containers
```bash
docker-compose down
```

## Important Notes

- The container needs access to the Docker daemon via the socket mount: `/var/run/docker.sock`
- The `docker_stats_data` directory should be mounted as a volume to persist collected statistics
- On Windows with Docker Desktop, you may need to adjust the socket path

## Files

- `Dockerfile` - Container image definition
- `docker-compose.yml` - Docker Compose orchestration
- `.dockerignore` - Ignore unnecessary files during Docker build
