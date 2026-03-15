# Azure Blob Bidirectional Sync

A Python program to synchronize files bidirectionally between Azure Blob Storage and a local folder.

## Features

- **Bidirectional Sync**: Automatically sync changes between local folder and Azure Blob Storage
- **Conflict Resolution**: Multiple strategies for handling conflicts (local_wins, remote_wins, manual)
- **Continuous Monitoring**: Run continuous sync at specified intervals
- **Dry Run Mode**: Preview changes before applying them
- **Comprehensive Logging**: Detailed logs for monitoring sync operations
- **Change Detection**: Tracks file additions, modifications, and deletions

## Installation

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Azure credentials**:
   - Copy `.env.example` to `.env`
   - Fill in your Azure Storage account details:
     ```
     AZURE_STORAGE_ACCOUNT_NAME=your_account_name
     AZURE_STORAGE_ACCOUNT_KEY=your_account_key
     AZURE_CONTAINER_NAME=your_container_name
     LOCAL_FOLDER_PATH=./sync_folder
     ```

   Or use connection string:
   ```
   AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
   ```

## Usage

### Single Sync
```bash
python main.py --mode once
```

### Continuous Sync (every 60 seconds)
```bash
python main.py --mode continuous --interval 60
```

### Dry Run Mode (preview changes)
```bash
python main.py --mode once --dry-run
```

### With Custom Options
```bash
python main.py \
    --mode continuous \
    --interval 30 \
    --local-path ./my_sync_folder \
    --container my_container \
    --conflict-resolution remote_wins \
    --log-level DEBUG
```

## Command Line Options

- `--mode`: `once` (single sync) or `continuous` (keep syncing)
- `--interval`: Interval in seconds between syncs (default: 60)
- `--local-path`: Path to local folder for sync
- `--account`: Azure storage account name
- `--container`: Azure container name
- `--conflict-resolution`: How to handle conflicts:
  - `local_wins`: Local file takes precedence
  - `remote_wins`: Remote file takes precedence
  - `manual`: Log conflict for manual resolution
- `--dry-run`: Preview changes without applying them
- `--log-level`: `DEBUG`, `INFO`, `WARNING`, or `ERROR`

## Configuration

### Environment Variables
Configure via `.env` file or command-line arguments:

- `AZURE_STORAGE_ACCOUNT_NAME`: Storage account name
- `AZURE_STORAGE_ACCOUNT_KEY`: Storage account key
- `AZURE_STORAGE_CONNECTION_STRING`: Connection string (alternative to account/key)
- `AZURE_CONTAINER_NAME`: Container name
- `LOCAL_FOLDER_PATH`: Local folder path
- `SYNC_INTERVAL_SECONDS`: Default sync interval
- `CONFLICT_RESOLUTION`: Default conflict strategy
- `DRY_RUN`: Enable dry-run by default
- `LOG_LEVEL`: Default logging level

## How It Works

### Sync Process

1. **Phase 1: Local → Remote**
   - Detects new and modified files locally
   - Uploads them to Azure Blob Storage
   - Deletes remote files that were deleted locally

2. **Phase 2: Remote → Local**
   - Downloads new files from remote
   - Handles conflicts based on strategy
   - Deletes local files that were deleted remotely

### Conflict Resolution

When a file differs between local and remote:

- **local_wins**: Overwrites remote with local version
- **remote_wins**: Overwrites local with remote version
- **manual**: Logs the conflict for manual intervention

## Project Structure

```
blobsync/
├── main.py                 # CLI entry point
├── config.py              # Configuration handling
├── sync_engine.py         # Main sync logic
├── azure_blob_client.py   # Azure Blob operations
├── local_sync.py          # Local file operations
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
└── README.md             # This file
```

## Authentication

### Option 1: Storage Account Key
```
AZURE_STORAGE_ACCOUNT_NAME=myaccount
AZURE_STORAGE_ACCOUNT_KEY=DefaultEndpointsProtocol=https;...
```

### Option 2: Connection String
```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
```

### Option 3: Azure CLI Authentication
Requires `azure-identity` and valid Azure CLI login:
```bash
az login
```

## Error Handling

- Errors are logged but don't stop the sync process
- All errors are tracked in sync summary
- Check logs for details on failed operations
- Dry-run mode can help test before applying changes

## Performance Considerations

- Large files may take time to upload/download
- Frequent syncs with many files may impact performance
- Adjust `--interval` based on your needs
- Use `--log-level WARNING` for production to reduce log overhead

## Troubleshooting

### Connection Issues
- Verify Azure credentials in `.env`
- Check internet connectivity
- Ensure storage account and container exist

### Sync Stalls
- Check log level for more details: `--log-level DEBUG`
- Increase interval for large file sets
- Run with `--dry-run` to verify operation

### Conflicts
- Use `--conflict-resolution remote_wins` to prefer server state
- Check logs for which files are in conflict
- Resolve manually if using `manual` strategy

## License

MIT
