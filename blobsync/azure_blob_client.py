"""Azure Blob Storage client wrapper"""

import logging
from datetime import datetime
from typing import List, Optional, Dict, BinaryIO
from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient
from azure.identity import DefaultAzureCredential
from config import config

logger = logging.getLogger(__name__)


class FileMetadata:
    """Metadata for a file"""
    def __init__(
        self,
        name: str,
        size: int,
        modified_time: datetime,
        is_blob: bool = False,
    ):
        self.name = name
        self.size = size
        self.modified_time = modified_time
        self.is_blob = is_blob


class AzureBlobClient:
    """Wrapper for Azure Blob Storage operations"""
    
    def __init__(self):
        self.service_client = self._init_blob_service_client()
        self.container_client = self.service_client.get_container_client(
            config.azure.container_name
        )
    
    def _init_blob_service_client(self) -> BlobServiceClient:
        """Initialize Azure Blob Service client"""
        if config.azure.connection_string:
            return BlobServiceClient.from_connection_string(
                config.azure.connection_string
            )
        else:
            account_url = f"https://{config.azure.account_name}.blob.core.windows.net"
            return BlobServiceClient(
                account_url=account_url,
                credential=config.azure.account_key,
            )
    
    def list_blobs(self, prefix: str = "") -> List[FileMetadata]:
        """List all blobs in the container"""
        blobs = []
        try:
            blob_list = self.container_client.list_blobs(name_starts_with=prefix)
            for blob in blob_list:
                blobs.append(
                    FileMetadata(
                        name=blob.name,
                        size=blob.size,
                        modified_time=blob.last_modified,
                        is_blob=True,
                    )
                )
            logger.debug(f"Listed {len(blobs)} blobs from container")
        except Exception as e:
            logger.error(f"Error listing blobs: {e}")
            raise
        return blobs
    
    def download_blob(self, blob_name: str, file_path: str) -> bool:
        """Download a blob to local file"""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            with open(file_path, "wb") as f:
                f.write(blob_client.download_blob().readall())
            logger.info(f"Downloaded blob: {blob_name}")
            return True
        except Exception as e:
            logger.error(f"Error downloading blob {blob_name}: {e}")
            return False
    
    def upload_blob(self, file_path: str, blob_name: str, overwrite: bool = True) -> bool:
        """Upload a local file as a blob"""
        try:
            with open(file_path, "rb") as f:
                self.container_client.upload_blob(
                    blob_name, f, overwrite=overwrite
                )
            logger.info(f"Uploaded file: {file_path} -> {blob_name}")
            return True
        except Exception as e:
            logger.error(f"Error uploading blob {blob_name}: {e}")
            return False
    
    def get_blob_metadata(self, blob_name: str) -> Optional[FileMetadata]:
        """Get metadata for a specific blob"""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            properties = blob_client.get_blob_properties()
            return FileMetadata(
                name=blob_name,
                size=properties.size,
                modified_time=properties.last_modified,
                is_blob=True,
            )
        except Exception as e:
            logger.debug(f"Blob not found: {blob_name}")
            return None
    
    def delete_blob(self, blob_name: str) -> bool:
        """Delete a blob from the container"""
        try:
            self.container_client.delete_blob(blob_name)
            logger.info(f"Deleted blob: {blob_name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting blob {blob_name}: {e}")
            return False
    
    def blob_exists(self, blob_name: str) -> bool:
        """Check if a blob exists"""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            return blob_client.exists()
        except Exception as e:
            logger.error(f"Error checking blob existence {blob_name}: {e}")
            return False
