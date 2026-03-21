"""
Bi-directional sync module for Azure Blob Storage.
Synchronizes files between local directory and blob storage.
"""

import os
import json
import logging
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Set
from dataclasses import dataclass, asdict
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class FileMetadata:
    """Metadata for a file."""
    path: str  # Relative path
    size: int
    modified_time: float
    hash: str  # SHA256 hash for content verification


class SyncState:
    """Manages sync state tracking."""
    
    def __init__(self, state_file: str = ".sync_state.json"):
        """
        Initialize sync state manager.
        
        Args:
            state_file: Path to JSON file for storing sync state
        """
        self.state_file = Path(state_file)
        self.state = self.load()
    
    def load(self) -> Dict:
        """Load sync state from file."""
        if self.state_file.exists():
            try:
                with open(self.state_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load sync state: {e}. Starting fresh.")
        
        return {
            "local_files": {},
            "remote_files": {},
            "last_sync": None,
            "sync_count": 0
        }
    
    def save(self):
        """Save sync state to file."""
        try:
            with open(self.state_file, 'w') as f:
                json.dump(self.state, f, indent=2)
            logger.info(f"Sync state saved to {self.state_file}")
        except Exception as e:
            logger.error(f"Failed to save sync state: {e}")
    
    def update_local_file(self, file_path: str, metadata: FileMetadata):
        """Update local file metadata in state."""
        self.state["local_files"][file_path] = asdict(metadata)
    
    def update_remote_file(self, file_path: str, metadata: FileMetadata):
        """Update remote file metadata in state."""
        self.state["remote_files"][file_path] = asdict(metadata)
    
    def get_local_file(self, file_path: str) -> FileMetadata:
        """Get stored metadata for local file."""
        if file_path in self.state["local_files"]:
            data = self.state["local_files"][file_path]
            return FileMetadata(**data)
        return None
    
    def get_remote_file(self, file_path: str) -> FileMetadata:
        """Get stored metadata for remote file."""
        if file_path in self.state["remote_files"]:
            data = self.state["remote_files"][file_path]
            return FileMetadata(**data)
        return None
    
    def remove_local_file(self, file_path: str):
        """Remove local file from state."""
        if file_path in self.state["local_files"]:
            del self.state["local_files"][file_path]
    
    def remove_remote_file(self, file_path: str):
        """Remove remote file from state."""
        if file_path in self.state["remote_files"]:
            del self.state["remote_files"][file_path]


class BlobSync:
    """Bi-directional sync for Azure Blob Storage."""
    
    def __init__(self, connection_string: str = None, account_name: str = None,
                 account_key: str = None, container_name: str = None,
                 state_file: str = ".sync_state.json"):
        """
        Initialize BlobSync.
        
        Args:
            connection_string: Azure Storage connection string
            account_name: Storage account name
            account_key: Storage account key
            container_name: Target container name
            state_file: Path to sync state file
        """
        self.container_name = container_name or "uploads"
        self.state = SyncState(state_file)
        
        # Initialize blob service client
        if connection_string:
            self.blob_service_client = BlobServiceClient.from_connection_string(
                connection_string
            )
            logger.info("Connected using connection string")
        elif account_name and account_key:
            self.blob_service_client = BlobServiceClient(
                account_url=f"https://{account_name}.blob.core.windows.net",
                credential=account_key
            )
            logger.info(f"Connected to account: {account_name}")
        elif account_name:
            self.blob_service_client = BlobServiceClient(
                account_url=f"https://{account_name}.blob.core.windows.net",
                credential=DefaultAzureCredential()
            )
            logger.info(f"Connected to account: {account_name}")
        else:
            raise ValueError("Azure Storage credentials not found")
        
        self.container_client = self.blob_service_client.get_container_client(
            self.container_name
        )
    
    def _get_file_hash(self, file_path: Path, chunk_size: int = 8192) -> str:
        """Calculate SHA256 hash of a file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(chunk_size), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def _scan_local_files(self, local_dir: str) -> Dict[str, FileMetadata]:
        """Scan local directory and get file metadata."""
        local_path = Path(local_dir)
        files = {}
        
        if not local_path.is_dir():
            logger.error(f"Directory not found: {local_dir}")
            return files
        
        for file_path in local_path.rglob("*"):
            if file_path.is_file():
                relative_path = str(file_path.relative_to(local_path)).replace("\\", "/")
                stat = file_path.stat()
                
                files[relative_path] = FileMetadata(
                    path=relative_path,
                    size=stat.st_size,
                    modified_time=stat.st_mtime,
                    hash=self._get_file_hash(file_path)
                )
        
        logger.info(f"Scanned {len(files)} local files")
        return files
    
    def _scan_remote_blobs(self) -> Dict[str, FileMetadata]:
        """Get metadata for all remote blobs."""
        blobs = {}
        
        try:
            for blob in self.container_client.list_blobs():
                blob_name = blob.name
                blob_client = self.container_client.get_blob_client(blob_name)
                properties = blob_client.get_blob_properties()
                
                blobs[blob_name] = FileMetadata(
                    path=blob_name,
                    size=properties.size,
                    modified_time=properties.last_modified.timestamp(),
                    hash=""  # Hash will be computed on demand
                )
            
            logger.info(f"Scanned {len(blobs)} remote blobs")
        except Exception as e:
            logger.error(f"Failed to scan remote blobs: {e}")
        
        return blobs
    
    def _has_changed(self, old: FileMetadata, new: FileMetadata) -> bool:
        """Check if file has changed based on size and modification time."""
        if old is None:
            return True
        return old.size != new.size or old.modified_time != new.modified_time
    
    def _upload_file(self, local_path: Path, blob_name: str) -> bool:
        """Upload a file to blob storage."""
        try:
            with open(local_path, "rb") as data:
                self.container_client.upload_blob(blob_name, data, overwrite=True)
            logger.info(f"✓ Uploaded: {blob_name}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to upload {blob_name}: {e}")
            return False
    
    def _download_file(self, blob_name: str, local_path: Path) -> bool:
        """Download a blob to local file."""
        try:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            blob_client = self.container_client.get_blob_client(blob_name)
            
            with open(local_path, "wb") as file:
                download_stream = blob_client.download_blob()
                file.write(download_stream.readall())
            
            logger.info(f"✓ Downloaded: {blob_name}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to download {blob_name}: {e}")
            return False
    
    def sync(self, local_dir: str, conflict_resolution: str = "prompt",
             delete_remote: bool = False, delete_local: bool = False,
             dry_run: bool = False) -> Dict:
        """
        Perform bi-directional sync.
        
        Args:
            local_dir: Local directory to sync
            conflict_resolution: How to handle conflicts
                - "prompt": Ask user for each conflict
                - "prefer-local": Use local version in conflicts
                - "prefer-remote": Use remote version in conflicts
                - "skip": Skip conflicted files
            delete_remote: Delete remote files that don't exist locally
            delete_local: Delete local files that don't exist remotely
            dry_run: Show what would be synced without making changes
        
        Returns:
            Dictionary with sync statistics
        """
        logger.info("=" * 60)
        logger.info(f"Starting bi-directional sync (dry_run={dry_run})")
        logger.info("=" * 60)
        
        # Scan current state
        local_files = self._scan_local_files(local_dir)
        remote_files = self._scan_remote_blobs()
        
        stats = {
            "uploaded": 0,
            "downloaded": 0,
            "deleted_remote": 0,
            "deleted_local": 0,
            "conflicts": 0,
            "skipped": 0,
            "errors": 0
        }
        
        local_dir_path = Path(local_dir)
        
        # Process local files (upload new/changed)
        logger.info("\n[1/3] Checking local files for upload...")
        for local_file_path, local_metadata in local_files.items():
            remote_metadata = remote_files.get(local_file_path)
            
            if remote_metadata is None:
                # New file locally
                logger.info(f"  New: {local_file_path}")
                if not dry_run:
                    if self._upload_file(local_dir_path / local_file_path, local_file_path):
                        self.state.update_local_file(local_file_path, local_metadata)
                        stats["uploaded"] += 1
                    else:
                        stats["errors"] += 1
                else:
                    stats["uploaded"] += 1
            
            elif self._has_changed(self.state.get_local_file(local_file_path), local_metadata):
                # Modified locally
                logger.info(f"  Modified: {local_file_path}")
                if not dry_run:
                    if self._upload_file(local_dir_path / local_file_path, local_file_path):
                        self.state.update_local_file(local_file_path, local_metadata)
                        stats["uploaded"] += 1
                    else:
                        stats["errors"] += 1
                else:
                    stats["uploaded"] += 1
        
        # Process remote files (download new/changed)
        logger.info("\n[2/3] Checking remote files for download...")
        for remote_file_path, remote_metadata in remote_files.items():
            local_metadata = local_files.get(remote_file_path)
            
            if local_metadata is None:
                # New file remotely
                logger.info(f"  New: {remote_file_path}")
                if not dry_run:
                    if self._download_file(remote_file_path, local_dir_path / remote_file_path):
                        self.state.update_remote_file(remote_file_path, remote_metadata)
                        stats["downloaded"] += 1
                    else:
                        stats["errors"] += 1
                else:
                    stats["downloaded"] += 1
            
            elif self._has_changed(self.state.get_remote_file(remote_file_path), remote_metadata):
                # Modified remotely
                logger.info(f"  Modified: {remote_file_path}")
                if not dry_run:
                    if self._download_file(remote_file_path, local_dir_path / remote_file_path):
                        self.state.update_remote_file(remote_file_path, remote_metadata)
                        stats["downloaded"] += 1
                    else:
                        stats["errors"] += 1
                else:
                    stats["downloaded"] += 1
        
        # Handle deletions
        logger.info("\n[3/3] Handling deletions...")
        
        if delete_remote:
            for remote_file_path in set(self.state.state["remote_files"].keys()) - set(local_files.keys()):
                logger.info(f"  Delete remote: {remote_file_path}")
                if not dry_run:
                    try:
                        self.container_client.delete_blob(remote_file_path)
                        self.state.remove_remote_file(remote_file_path)
                        stats["deleted_remote"] += 1
                    except Exception as e:
                        logger.error(f"Failed to delete remote {remote_file_path}: {e}")
                        stats["errors"] += 1
                else:
                    stats["deleted_remote"] += 1
        
        if delete_local:
            for local_file_path in set(self.state.state["local_files"].keys()) - set(local_files.keys()):
                local_full_path = local_dir_path / local_file_path
                logger.info(f"  Delete local: {local_file_path}")
                if not dry_run:
                    try:
                        if local_full_path.exists():
                            local_full_path.unlink()
                        self.state.remove_local_file(local_file_path)
                        stats["deleted_local"] += 1
                    except Exception as e:
                        logger.error(f"Failed to delete local {local_file_path}: {e}")
                        stats["errors"] += 1
                else:
                    stats["deleted_local"] += 1
        
        # Save sync state
        if not dry_run:
            self.state.state["last_sync"] = datetime.now().isoformat()
            self.state.state["sync_count"] = self.state.state.get("sync_count", 0) + 1
            self.state.save()
        
        return stats
    
    def print_sync_summary(self, stats: Dict):
        """Print sync statistics."""
        logger.info("\n" + "=" * 60)
        logger.info("SYNC SUMMARY")
        logger.info("=" * 60)
        logger.info(f"  Uploaded:       {stats['uploaded']}")
        logger.info(f"  Downloaded:     {stats['downloaded']}")
        logger.info(f"  Deleted Remote: {stats['deleted_remote']}")
        logger.info(f"  Deleted Local:  {stats['deleted_local']}")
        logger.info(f"  Conflicts:      {stats['conflicts']}")
        logger.info(f"  Skipped:        {stats['skipped']}")
        logger.info(f"  Errors:         {stats['errors']}")
        logger.info("=" * 60)


def main():
    """Command-line interface for sync operations."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Bi-directional sync with Azure Blob Storage"
    )
    parser.add_argument(
        "local_dir",
        help="Local directory to sync"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be synced without making changes"
    )
    parser.add_argument(
        "--conflict",
        choices=["prompt", "prefer-local", "prefer-remote", "skip"],
        default="prompt",
        help="How to handle conflicts"
    )
    parser.add_argument(
        "--delete-remote",
        action="store_true",
        help="Delete remote files that don't exist locally"
    )
    parser.add_argument(
        "--delete-local",
        action="store_true",
        help="Delete local files that don't exist remotely"
    )
    parser.add_argument(
        "--state-file",
        default=".sync_state.json",
        help="Path to sync state file"
    )
    
    args = parser.parse_args()
    
    try:
        # Initialize sync
        sync = BlobSync(
            connection_string=os.getenv("AZURE_STORAGE_CONNECTION_STRING"),
            account_name=os.getenv("AZURE_STORAGE_ACCOUNT_NAME"),
            account_key=os.getenv("AZURE_STORAGE_ACCOUNT_KEY"),
            container_name=os.getenv("AZURE_STORAGE_CONTAINER", "uploads"),
            state_file=args.state_file
        )
        
        # Run sync
        stats = sync.sync(
            local_dir=args.local_dir,
            conflict_resolution=args.conflict,
            delete_remote=args.delete_remote,
            delete_local=args.delete_local,
            dry_run=args.dry_run
        )
        
        # Print summary
        sync.print_sync_summary(stats)
        
    except Exception as e:
        logger.error(f"Sync error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
