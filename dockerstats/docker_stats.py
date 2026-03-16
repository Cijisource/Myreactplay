#!/usr/bin/env python3
"""
Docker Stats Collector
Pulls Docker container statistics and stores them as JSON files.
"""

import docker
import json
import os
from datetime import datetime
from pathlib import Path


class DockerStatsCollector:
    def __init__(self, output_dir: str = "docker_stats_data"):
        """
        Initialize the Docker stats collector.
        
        Args:
            output_dir: Directory where JSON files will be stored
        """
        self.client = docker.from_env()
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def get_container_stats(self, container_id: str, stream: bool = False) -> dict:
        """
        Get stats for a specific container.
        
        Args:
            container_id: Container ID or name
            stream: If True, returns generator; if False, returns single snapshot
            
        Returns:
            Dictionary with container stats
        """
        try:
            container = self.client.containers.get(container_id)
            stats = container.stats(stream=stream)
            return stats
        except docker.errors.NotFound:
            print(f"Container '{container_id}' not found")
            return None
        except Exception as e:
            print(f"Error getting stats for container '{container_id}': {e}")
            return None
    
    def collect_all_stats(self) -> dict:
        """
        Collect stats for all running containers.
        
        Returns:
            Dictionary with all container stats
        """
        try:
            containers = self.client.containers.list()
            all_stats = {
                "timestamp": datetime.now().isoformat(),
                "containers": []
            }
            
            for container in containers:
                try:
                    stats = container.stats(stream=False)
                    container_info = {
                        "id": container.id[:12],
                        "name": container.name,
                        "status": container.status,
                        "stats": stats
                    }
                    all_stats["containers"].append(container_info)
                    print(f"Collected stats for: {container.name}")
                except Exception as e:
                    print(f"Error collecting stats for {container.name}: {e}")
            
            return all_stats
        except Exception as e:
            print(f"Error collecting stats: {e}")
            return None
    
    def save_stats_to_json(self, stats: dict, filename: str = None) -> str:
        """
        Save stats dictionary to a JSON file.
        
        Args:
            stats: Dictionary containing stats
            filename: Optional custom filename (without .json extension)
            
        Returns:
            Path to saved file
        """
        if not stats:
            print("No stats to save")
            return None
        
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"docker_stats_{timestamp}"
        
        filepath = self.output_dir / f"{filename}.json"
        
        try:
            with open(filepath, "w") as f:
                json.dump(stats, f, indent=2, default=str)
            print(f"Stats saved to: {filepath}")
            return str(filepath)
        except Exception as e:
            print(f"Error saving stats to JSON: {e}")
            return None
    
    def collect_and_save_all(self, filename: str = None) -> str:
        """
        Collect stats for all containers and save to JSON in one operation.
        
        Args:
            filename: Optional custom filename (without .json extension)
            
        Returns:
            Path to saved file
        """
        print("Collecting Docker stats...")
        stats = self.collect_all_stats()
        
        if stats:
            return self.save_stats_to_json(stats, filename)
        return None


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Collect Docker container statistics and save as JSON"
    )
    parser.add_argument(
        "--output-dir",
        default="docker_stats_data",
        help="Directory to store JSON files (default: docker_stats_data)"
    )
    parser.add_argument(
        "--container",
        help="Specific container ID or name to collect stats for"
    )
    parser.add_argument(
        "--filename",
        help="Custom filename for output (without .json extension)"
    )
    
    args = parser.parse_args()
    
    collector = DockerStatsCollector(output_dir=args.output_dir)
    
    if args.container:
        print(f"Collecting stats for container: {args.container}")
        stats = collector.get_container_stats(args.container)
        if stats:
            collector.save_stats_to_json(stats, args.filename)
    else:
        collector.collect_and_save_all(args.filename)


if __name__ == "__main__":
    main()
