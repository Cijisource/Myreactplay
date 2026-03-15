"""Bidirectional sync engine for Azure Blob Storage and local folder"""

import logging
from datetime import datetime
from typing import Dict, List, Tuple
from pathlib import Path
from azure_blob_client import AzureBlobClient, FileMetadata
from local_sync import LocalFileTracker
from config import config

logger = logging.getLogger(__name__)


class ConflictHandler:
    """Handle sync conflicts"""
    
    def __init__(self, strategy: str = "local_wins"):
        self.strategy = strategy
    
    def resolve(
        self,
        local_mtime: float,
        remote_mtime: float,
    ) -> str:
        """
        Resolve conflict based on strategy
        Returns: 'use_local', 'use_remote', or 'manual'
        """
        if self.strategy == "local_wins":
            return "use_local"
        elif self.strategy == "remote_wins":
            return "use_remote"
        elif self.strategy == "manual":
            return "manual"
        else:
            # Default: use most recent
            return "use_local" if local_mtime > remote_mtime else "use_remote"


class SyncEngine:
    """Main bidirectional sync engine"""
    
    def __init__(self):
        self.azure_client = AzureBlobClient()
        self.local_tracker = LocalFileTracker()
        self.conflict_handler = ConflictHandler(config.sync.conflict_resolution)
        self.sync_stats = {
            "downloaded": 0,
            "uploaded": 0,
            "deleted_local": 0,
            "deleted_remote": 0,
            "conflicts": 0,
            "errors": 0,
        }
    
    def sync(self) -> Dict[str, int]:
        """Execute bidirectional sync"""
        logger.info("=== Starting bidirectional sync ===")
        self.sync_stats = {
            "downloaded": 0,
            "uploaded": 0,
            "deleted_local": 0,
            "deleted_remote": 0,
            "conflicts": 0,
            "errors": 0,
        }
        
        try:
            # Get current state
            remote_blobs = self._get_remote_file_index()
            local_files = self.local_tracker.get_local_files()
            local_changes = self.local_tracker.get_changes()
            
            # Phase 1: Handle local changes (push to remote)
            self._sync_local_to_remote(local_files, remote_blobs, local_changes)
            
            # Phase 2: Handle remote changes (pull to local)
            self._sync_remote_to_local(remote_blobs, local_files)
            
        except Exception as e:
            logger.error(f"Sync error: {e}")
            self.sync_stats["errors"] += 1
        
        self._log_sync_summary()
        return self.sync_stats
    
    def _get_remote_file_index(self) -> Dict[str, FileMetadata]:
        """Get index of all remote files"""
        blobs = self.azure_client.list_blobs()
        return {blob.name: blob for blob in blobs}
    
    def _sync_local_to_remote(
        self,
        local_files: Dict[str, Tuple[int, float]],
        remote_blobs: Dict[str, FileMetadata],
        local_changes: Dict[str, List[str]],
    ):
        """Sync local changes to remote"""
        logger.info("Phase 1: Syncing local changes to remote...")
        
        # Upload new and modified files
        for blob_name in local_changes["added"] + local_changes["modified"]:
            local_file_path = self.local_tracker.local_folder / blob_name
            
            if config.sync.dry_run:
                logger.info(f"[DRY RUN] Would upload: {blob_name}")
            else:
                if self.azure_client.upload_blob(str(local_file_path), blob_name):
                    self.sync_stats["uploaded"] += 1
                else:
                    self.sync_stats["errors"] += 1
        
        # Delete remote files that were deleted locally
        for blob_name in remote_blobs:
            if blob_name not in local_files:
                if config.sync.dry_run:
                    logger.info(f"[DRY RUN] Would delete remote: {blob_name}")
                else:
                    if self.azure_client.delete_blob(blob_name):
                        self.sync_stats["deleted_remote"] += 1
                    else:
                        self.sync_stats["errors"] += 1
    
    def _sync_remote_to_local(
        self,
        remote_blobs: Dict[str, FileMetadata],
        local_files: Dict[str, Tuple[int, float]],
    ):
        """Sync remote changes to local"""
        logger.info("Phase 2: Syncing remote changes to local...")
        
        for blob_name, blob_meta in remote_blobs.items():
            if blob_name not in local_files:
                # New file on remote
                self._download_blob_safely(blob_name, blob_meta)
            else:
                # File exists locally - check for conflicts
                local_size, local_mtime = local_files[blob_name]
                if (local_size != blob_meta.size or
                    local_mtime != blob_meta.modified_time.timestamp()):
                    # File differs
                    self._handle_conflict(blob_name, blob_meta, local_mtime)
        
        # Delete local files that don't exist on remote (already handled in local_to_remote)
        for blob_name in local_files:
            if blob_name not in remote_blobs:
                if config.sync.dry_run:
                    logger.info(f"[DRY RUN] Would delete local: {blob_name}")
                else:
                    if self.local_tracker.delete_local_file(blob_name):
                        self.sync_stats["deleted_local"] += 1
                    else:
                        self.sync_stats["errors"] += 1
    
    def _download_blob_safely(self, blob_name: str, blob_meta: FileMetadata):
        """Safely download a blob"""
        try:
            local_path = self.local_tracker.create_local_file_path(blob_name)
            
            if config.sync.dry_run:
                logger.info(f"[DRY RUN] Would download: {blob_name}")
            else:
                if self.azure_client.download_blob(blob_name, str(local_path)):
                    self.sync_stats["downloaded"] += 1
                else:
                    self.sync_stats["errors"] += 1
        except Exception as e:
            logger.error(f"Error downloading {blob_name}: {e}")
            self.sync_stats["errors"] += 1
    
    def _handle_conflict(self, blob_name: str, blob_meta: FileMetadata, local_mtime: float):
        """Handle file conflict"""
        resolve_to = self.conflict_handler.resolve(local_mtime, blob_meta.modified_time.timestamp())
        
        self.sync_stats["conflicts"] += 1
        
        if resolve_to == "use_local":
            logger.warning(f"Conflict (using local): {blob_name}")
            if not config.sync.dry_run:
                local_path = self.local_tracker.local_folder / blob_name
                self.azure_client.upload_blob(str(local_path), blob_name, overwrite=True)
        
        elif resolve_to == "use_remote":
            logger.warning(f"Conflict (using remote): {blob_name}")
            if not config.sync.dry_run:
                self._download_blob_safely(blob_name, blob_meta)
        
        else:  # manual
            logger.warning(f"Conflict (manual resolution needed): {blob_name}")
    
    def _log_sync_summary(self):
        """Log sync operation summary"""
        logger.info("=== Sync Summary ===")
        logger.info(f"Downloaded: {self.sync_stats['downloaded']}")
        logger.info(f"Uploaded: {self.sync_stats['uploaded']}")
        logger.info(f"Deleted (local): {self.sync_stats['deleted_local']}")
        logger.info(f"Deleted (remote): {self.sync_stats['deleted_remote']}")
        logger.info(f"Conflicts: {self.sync_stats['conflicts']}")
        logger.info(f"Errors: {self.sync_stats['errors']}")
