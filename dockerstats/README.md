# Docker Stats Collector

A Python script to collect Docker container statistics and store them as JSON files.

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage - Collect all containers
```bash
python docker_stats.py
```

This will:
- Collect stats for all running Docker containers
- Save the results to `docker_stats_data/docker_stats_YYYYMMDD_HHMMSS.json`

### Collect stats for a specific container
```bash
python docker_stats.py --container <container_id_or_name>
```

### Custom output directory
```bash
python docker_stats.py --output-dir /path/to/directory
```

### Custom filename
```bash
python docker_stats.py --filename my_stats
```

This saves to `docker_stats_data/my_stats.json`

## Options

- `--output-dir`: Directory to store JSON files (default: `docker_stats_data`)
- `--container`: Specific container ID or name (optional)
- `--filename`: Custom filename without .json extension (optional)

## Output Format

The script generates JSON files with the following structure:

```json
{
  "timestamp": "2026-03-04T10:30:45.123456",
  "containers": [
    {
      "id": "a1b2c3d4e5f6",
      "name": "container_name",
      "status": "running",
      "stats": {
        "read": "2026-03-04T10:30:45.123456Z",
        "pids_stats": {...},
        "blkio_stats": {...},
        "cpu_stats": {...},
        "memory_stats": {...},
        ...
      }
    }
  ]
}
```

## Requirements

- Docker daemon must be running and accessible
- Docker Python library (installed via requirements.txt)
- Python 3.6+
