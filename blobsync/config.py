"""Configuration management for Azure Blob Sync"""

import os
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class AzureConfig(BaseModel):
    """Azure Storage configuration"""
    account_name: str = Field(default_factory=lambda: os.getenv("AZURE_STORAGE_ACCOUNT_NAME", ""))
    account_key: str = Field(default_factory=lambda: os.getenv("AZURE_STORAGE_ACCOUNT_KEY", ""))
    connection_string: str = Field(default_factory=lambda: os.getenv("AZURE_STORAGE_CONNECTION_STRING", ""))
    container_name: str = Field(default_factory=lambda: os.getenv("AZURE_CONTAINER_NAME", ""))
    
    def __init__(self, **data):
        super().__init__(**data)
        if not self.connection_string and not (self.account_name and self.account_key):
            raise ValueError(
                "Either connection_string or (account_name + account_key) must be provided"
            )


class SyncConfig(BaseModel):
    """Sync operation configuration"""
    local_folder_path: Path = Field(
        default_factory=lambda: Path(os.getenv("LOCAL_FOLDER_PATH", "./sync_folder"))
    )
    sync_interval_seconds: int = Field(
        default_factory=lambda: int(os.getenv("SYNC_INTERVAL_SECONDS", "60"))
    )
    conflict_resolution: Literal["local_wins", "remote_wins", "manual"] = Field(
        default_factory=lambda: os.getenv("CONFLICT_RESOLUTION", "local_wins")
    )
    dry_run: bool = Field(
        default_factory=lambda: os.getenv("DRY_RUN", "false").lower() == "true"
    )
    log_level: str = Field(
        default_factory=lambda: os.getenv("LOG_LEVEL", "INFO")
    )


class Config:
    """Main configuration class"""
    def __init__(self):
        self.azure = AzureConfig()
        self.sync = SyncConfig()
        
        # Create local folder if it doesn't exist
        self.sync.local_folder_path.mkdir(parents=True, exist_ok=True)


# Global config instance
config = Config()
