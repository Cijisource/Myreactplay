"""
Azure Blob Storage file upload script.
Uploads files or entire directories to Azure Blob Storage.
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BlobUploader:
    def __init__(self, connection_string: str = None, account_name: str = None, 
                 account_key: str = None, container_name: str = None):
        """
        Initialize BlobUploader with authentication credentials.
        
        Args:
            connection_string: Azure Storage connection string
            account_name: Storage account name (uses DefaultAzureCredential if provided)
            account_key: Storage account key
            container_name: Target container name
        """
        self.container_name = container_name or "uploads"
        
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
            # Use DefaultAzureCredential (managed identity, CLI, environment variables, etc.)
            self.blob_service_client = BlobServiceClient(
                account_url=f"https://{account_name}.blob.core.windows.net",
                credential=DefaultAzureCredential()
            )
            logger.info(f"Connected to account: {account_name} using DefaultAzureCredential")
        else:
            raise ValueError(
                "\nAzure Storage credentials not found.\n\n"
                "Please set up one of the following:\n\n"
                "Option 1 - Connection String:\n"
                "  Set environment variable: AZURE_STORAGE_CONNECTION_STRING\n\n"
                "Option 2 - Account Credentials:\n"
                "  Set environment variables:\n"
                "    AZURE_STORAGE_ACCOUNT_NAME\n"
                "    AZURE_STORAGE_ACCOUNT_KEY\n\n"
                "Option 3 - Use .env file:\n"
                "  1. Copy .env.example to .env\n"
                "  2. Fill in your Azure Storage credentials\n"
                "  3. Run the script again\n\n"
                "Get credentials from: https://portal.azure.com"
            )
        
        self.container_client = self.blob_service_client.get_container_client(
            self.container_name
        )

    def upload_file(self, local_path: str, blob_name: str = None, overwrite: bool = True) -> bool:
        """
        Upload a single file to blob storage.
        
        Args:
            local_path: Path to local file
            blob_name: Name for blob in storage (defaults to filename)
            overwrite: Whether to overwrite existing blob
            
        Returns:
            True if successful, False otherwise
        """
        try:
            file_path = Path(local_path)
            if not file_path.exists():
                logger.error(f"File not found: {local_path}")
                return False
            
            blob_name = blob_name or file_path.name
            
            with open(file_path, "rb") as data:
                self.container_client.upload_blob(
                    blob_name, 
                    data, 
                    overwrite=overwrite
                )
            
            logger.info(f"✓ Uploaded: {file_path.name} → {blob_name}")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to upload {local_path}: {str(e)}")
            return False

    def upload_directory(self, local_dir: str, prefix: str = "", overwrite: bool = True) -> int:
        """
        Upload all files in a directory recursively.
        
        Args:
            local_dir: Path to local directory
            prefix: Prefix for blob names (e.g., subdirectory path)
            overwrite: Whether to overwrite existing blobs
            
        Returns:
            Number of successfully uploaded files
        """
        try:
            dir_path = Path(local_dir)
            if not dir_path.is_dir():
                logger.error(f"Directory not found: {local_dir}")
                return 0
            
            uploaded_count = 0
            
            for file_path in dir_path.rglob("*"):
                if file_path.is_file():
                    # Construct blob name with directory structure
                    relative_path = file_path.relative_to(dir_path)
                    blob_name = f"{prefix}/{relative_path}".lstrip("/")
                    
                    if self.upload_file(str(file_path), blob_name, overwrite):
                        uploaded_count += 1
            
            logger.info(f"Directory upload complete: {uploaded_count} files uploaded")
            return uploaded_count
            
        except Exception as e:
            logger.error(f"Failed to upload directory: {str(e)}")
            return 0

    def list_blobs(self) -> list:
        """
        List all blobs in the container.
        
        Returns:
            List of blob names
        """
        try:
            blobs = self.container_client.list_blobs()
            blob_names = [blob.name for blob in blobs]
            logger.info(f"Found {len(blob_names)} blobs in container '{self.container_name}'")
            return blob_names
        except Exception as e:
            logger.error(f"Failed to list blobs: {str(e)}")
            return []

    def download_blob(self, blob_name: str, local_path: str) -> bool:
        """
        Download a single blob from storage.
        
        Args:
            blob_name: Name of blob to download
            local_path: Local path to save the file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Create parent directories if they don't exist
            local_file = Path(local_path)
            local_file.parent.mkdir(parents=True, exist_ok=True)
            
            blob_client = self.container_client.get_blob_client(blob_name)
            
            with open(local_file, "wb") as file:
                download_stream = blob_client.download_blob()
                file.write(download_stream.readall())
            
            logger.info(f"✓ Downloaded: {blob_name} → {local_path}")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to download {blob_name}: {str(e)}")
            return False

    def download_all_blobs(self, local_dir: str = ".", preserve_structure: bool = True) -> int:
        """
        Download all blobs from the container.
        
        Args:
            local_dir: Local directory to save files to (default: current directory)
            preserve_structure: If True, preserve blob directory structure; 
                              If False, download all to top-level directory
            
        Returns:
            Number of successfully downloaded files
        """
        try:
            # Create local directory if it doesn't exist
            local_path = Path(local_dir)
            local_path.mkdir(parents=True, exist_ok=True)
            
            blobs = self.container_client.list_blobs()
            downloaded_count = 0
            
            for blob in blobs:
                if preserve_structure:
                    # Preserve directory structure from blob name
                    file_path = local_path / blob.name
                else:
                    # Save all files to top-level directory
                    file_path = local_path / Path(blob.name).name
                
                if self.download_blob(blob.name, str(file_path)):
                    downloaded_count += 1
            
            logger.info(f"Download complete: {downloaded_count} files downloaded to '{local_dir}'")
            return downloaded_count
            
        except Exception as e:
            logger.error(f"Failed to download blobs: {str(e)}")
            return 0


def main():
    """Example usage of BlobUploader and BlobSync."""
    
    # Configuration - Update these values
    CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    # OR use account credentials:
    # ACCOUNT_NAME = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
    # ACCOUNT_KEY = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
    CONTAINER_NAME = os.getenv("AZURE_STORAGE_CONTAINER", "uploads")
    
    try:
        # Initialize uploader/downloader
        uploader = BlobUploader(
            connection_string=CONNECTION_STRING,
            container_name=CONTAINER_NAME
        )
        
        # Parse command line arguments
        if len(sys.argv) > 1:
            command = sys.argv[1].lower()
            
            if command == "sync":
                # Bi-directional sync
                from sync import BlobSync
                
                local_dir = sys.argv[2] if len(sys.argv) > 2 else "."
                conflict = sys.argv[3] if len(sys.argv) > 3 else "prompt"
                
                # Check for flags
                dry_run = "--dry-run" in sys.argv
                delete_remote = "--delete-remote" in sys.argv
                delete_local = "--delete-local" in sys.argv
                
                sync = BlobSync(
                    connection_string=CONNECTION_STRING,
                    account_name=os.getenv("AZURE_STORAGE_ACCOUNT_NAME"),
                    account_key=os.getenv("AZURE_STORAGE_ACCOUNT_KEY"),
                    container_name=CONTAINER_NAME
                )
                
                stats = sync.sync(
                    local_dir=local_dir,
                    conflict_resolution=conflict,
                    delete_remote=delete_remote,
                    delete_local=delete_local,
                    dry_run=dry_run
                )
                
                sync.print_sync_summary(stats)
            
            elif command == "download":
                # Download all blobs or specific blob
                if len(sys.argv) > 2:
                    # Download to specific directory or single blob
                    if len(sys.argv) > 3:
                        # download <blob_name> <local_path>
                        blob_name = sys.argv[2]
                        local_path = sys.argv[3]
                        uploader.download_blob(blob_name, local_path)
                    else:
                        # download <directory>
                        local_dir = sys.argv[2]
                        uploader.download_all_blobs(local_dir, preserve_structure=True)
                else:
                    # Download all to current directory
                    uploader.download_all_blobs(".", preserve_structure=True)
            
            elif command == "list":
                # List all blobs
                blobs = uploader.list_blobs()
                if blobs:
                    logger.info("\nBlobs in container:")
                    for blob in blobs:
                        logger.info(f"  - {blob}")
            
            elif command == "upload":
                # Upload operation
                upload_paths = sys.argv[2:] if len(sys.argv) > 2 else ["."]
                total_uploaded = 0
                for upload_path in upload_paths:
                    path = Path(upload_path)
                    if path.is_file():
                        if uploader.upload_file(str(path)):
                            total_uploaded += 1
                    elif path.is_dir():
                        total_uploaded += uploader.upload_directory(str(path))
                    else:
                        logger.error(f"Invalid path: {upload_path}")
                
                logger.info(f"\nTotal files uploaded: {total_uploaded}")
                uploader.list_blobs()
            
            else:
                logger.error(f"Unknown command: {command}")
                print_usage()
        
        else:
            # No command specified - upload from directories specified in env var
            upload_folder_env = os.getenv("UPLOAD_FOLDER", ".")
            upload_paths = [p.strip() for p in upload_folder_env.split(",")]
            
            total_uploaded = 0
            for upload_path in upload_paths:
                path = Path(upload_path)
                if path.is_file():
                    if uploader.upload_file(str(path)):
                        total_uploaded += 1
                elif path.is_dir():
                    total_uploaded += uploader.upload_directory(str(path))
                else:
                    logger.error(f"Invalid path: {upload_path}")
            
            logger.info(f"\nTotal files uploaded: {total_uploaded}")
            uploader.list_blobs()
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        sys.exit(1)


def print_usage():
    """Print usage information."""
    print("""
Usage:
  python upload.py <command> [options]

Commands:
  upload [path ...]           Upload files or directories
                              (default command if no command specified)
  download [directory]        Download all blobs from container
  sync <directory> [flags]    Bi-directional sync with container
  list                        List all blobs in container
  
Sync Options (use with 'sync' command):
  --dry-run                   Preview changes without applying
  --delete-remote             Delete remote files not in local directory
  --delete-local              Delete local files not in remote container
  
Conflict Resolution:
  prompt                      Ask for each conflict (default)
  prefer-local                Use local version in conflicts
  prefer-remote               Use remote version in conflicts
  skip                        Skip conflicted files
  
Examples:
  python upload.py upload file.txt             # Upload single file
  python upload.py upload ./folder             # Upload directory
  python upload.py download ./local_files      # Download all blobs
  python upload.py sync ./sync_folder          # Bi-directional sync
  python upload.py sync ./sync_folder --dry-run          # Preview sync
  python upload.py sync ./sync_folder prefer-local --delete-remote
  python upload.py list                        # List all blobs
""")




if __name__ == "__main__":
    main()
