"""Local file system sync operations"""

import logging
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple
from config import config

logger = logging.getLogger(__name__)


class LocalFileTracker:
    """Track local file changes"""
    
    def __init__(self):
        self.local_folder = config.sync.local_folder_path
        self.file_state: Dict[str, Tuple[int, float]] = {}
    
    def get_local_files(self) -> Dict[str, Tuple[int, float]]:
        """Get all local files with their size and modification time"""
        files = {}
        try:
            for root, dirs, filenames in os.walk(self.local_folder):
                for filename in filenames:
                    file_path = Path(root) / filename
                    # Get relative path from sync folder
                    rel_path = file_path.relative_to(self.local_folder)
                    # Convert to blob path format (forward slashes)
                    blob_path = rel_path.as_posix()
                    
                    stat = file_path.stat()
                    files[blob_path] = (stat.st_size, stat.st_mtime)
            
            logger.debug(f"Found {len(files)} local files")
        except Exception as e:
            logger.error(f"Error scanning local folder: {e}")
        
        return files
    
    def get_local_file_metadata(self, file_path: str) -> Tuple[int, float]:
        """Get size and modification time for a local file"""
        full_path = self.local_folder / file_path
        if full_path.exists():
            stat = full_path.stat()
            return (stat.st_size, stat.st_mtime)
        return (0, 0)
    
    def file_exists_locally(self, file_path: str) -> bool:
        """Check if a file exists locally"""
        full_path = self.local_folder / file_path
        return full_path.exists()
    
    def delete_local_file(self, file_path: str) -> bool:
        """Delete a local file"""
        try:
            full_path = self.local_folder / file_path
            if full_path.exists():
                full_path.unlink()
                logger.info(f"Deleted local file: {file_path}")
                return True
        except Exception as e:
            logger.error(f"Error deleting local file {file_path}: {e}")
        return False
    
    def create_local_file_path(self, file_path: str) -> Path:
        """Create directory structure for a file path"""
        full_path = self.local_folder / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        return full_path
    
    def get_changes(self) -> Dict[str, str]:
        """Detect changes since last sync (added, modified, deleted)"""
        current_files = self.get_local_files()
        changes = {"added": [], "modified": [], "deleted": []}
        
        # Check for added/modified files
        for file_path, (size, mtime) in current_files.items():
            if file_path not in self.file_state:
                changes["added"].append(file_path)
            else:
                old_size, old_mtime = self.file_state[file_path]
                if size != old_size or mtime != old_mtime:
                    changes["modified"].append(file_path)
        
        # Check for deleted files
        for file_path in self.file_state:
            if file_path not in current_files:
                changes["deleted"].append(file_path)
        
        # Update state
        self.file_state = current_files
        
        total_changes = len(changes["added"]) + len(changes["modified"]) + len(changes["deleted"])
        if total_changes > 0:
            logger.info(
                f"Detected {total_changes} local changes: "
                f"+{len(changes['added'])}, ~{len(changes['modified'])}, "
                f"-{len(changes['deleted'])}"
            )
        
        return changes
