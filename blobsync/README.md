# Azure Blob Storage Upload/Download/Sync Script

Python script for uploading, downloading, and syncing files with Azure Blob Storage.

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure credentials:
   - Copy `.env.example` to `.env` and fill in your Azure Storage credentials
   - Or set environment variables directly

## Usage

### Upload a single file:
```bash
python upload.py upload path/to/file.txt
```

### Upload a directory:
```bash
python upload.py upload path/to/directory
```

### Upload current directory:
```bash
python upload.py
```

### Download all files from blob container:
```bash
python upload.py download ./local_folder
```

### Download to current directory:
```bash
python upload.py download
```

### Bi-Directional Sync

Synchronize a local directory with blob storage, automatically:
- Uploading new or changed local files
- Downloading new or changed remote files
- Optionally deleting files that don't exist on the other side

#### Basic sync:
```bash
python upload.py sync ./sync_folder
```

#### Dry-run (preview changes without applying):
```bash
python upload.py sync ./sync_folder --dry-run
```

#### Sync with conflict resolution:
```bash
python upload.py sync ./sync_folder prefer-local   # Prefer local files in conflicts
python upload.py sync ./sync_folder prefer-remote  # Prefer remote files in conflicts
```

#### Sync with cleanup:
```bash
python upload.py sync ./sync_folder --delete-remote   # Remove remote files not in local
python upload.py sync ./sync_folder --delete-local    # Remove local files not in remote
python upload.py sync ./sync_folder --delete-remote --delete-local  # Full bidirectional sync
```

### List all blobs in container:
```bash
python upload.py list
```

## Sync Features

The sync command maintains a `.sync_state.json` file to track:
- Last modification times
- File sizes
- Sync history

This allows efficient incremental syncs - only modified files are transferred on subsequent runs.

### How it works:

1. **Initial scan**: Compares local files with remote blobs
2. **Upload phase**: Uploads new or modified local files
3. **Download phase**: Downloads new or modified remote files
4. **Cleanup phase** (optional): Removes files based on delete flags

### Conflict handling:

When a file is modified on both sides:
- `prompt` (default): Ask user for each conflict
- `prefer-local`: Use local version
- `prefer-remote`: Use remote version
- `skip`: Skip the file

## Configuration

Set one of these environment variables:

- **`AZURE_STORAGE_CONNECTION_STRING`** - Connection string from Azure portal
- **`AZURE_STORAGE_ACCOUNT_NAME`** + **`AZURE_STORAGE_ACCOUNT_KEY`** - Account credentials
- **`AZURE_STORAGE_CONTAINER`** - Target container name (default: "uploads")

## Example Python Usage

```python
from upload import BlobUploader
from sync import BlobSync

# Initialize uploader
uploader = BlobUploader(
    connection_string="DefaultEndpointsProtocol=https;...",
    container_name="photos"
)

# Upload operations
uploader.upload_file("photo.jpg", "photos/2024/photo.jpg")
uploader.upload_directory("./photos")

# Initialize sync
sync = BlobSync(
    connection_string="DefaultEndpointsProtocol=https;...",
    container_name="photos"
)

# Perform bi-directional sync
stats = sync.sync(
    local_dir="./photos",
    conflict_resolution="prefer-local",
    delete_remote=False,
    delete_local=False,
    dry_run=False
)

# Download operations
uploader.download_blob("photos/2024/photo.jpg", "./downloads/photo.jpg")
uploader.download_all_blobs("./downloads")
```

## Files

- `upload.py` - Main script with upload/download/sync commands
- `sync.py` - Bi-directional sync module
- `.sync_state.json` - Automatically created to track sync state


# Upload a file
uploader.upload_file("photo.jpg", "2026/photo.jpg")

# Upload directory
uploader.upload_directory("./photos", prefix="photos")

# List blobs
blobs = uploader.list_blobs()
```

## Features

- ✓ Single file upload
- ✓ Directory upload (recursive)
- ✓ Customizable blob names
- ✓ Overwrite control
- ✓ Comprehensive logging
- ✓ Error handling
- ✓ Multiple authentication methods

## Authentication Methods

1. **Connection String** (simplest)
2. **Account Key** (explicit credentials)
3. **DefaultAzureCredential** (managed identity, CLI, environment)
