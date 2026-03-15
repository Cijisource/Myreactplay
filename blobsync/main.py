"""Main CLI for Azure Blob Sync"""

import logging
import sys
import time
from argparse import ArgumentParser
from pathlib import Path
from sync_engine import SyncEngine
from config import config

# Configure logging
def setup_logging(log_level: str):
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def create_argument_parser():
    """Create CLI argument parser"""
    parser = ArgumentParser(
        description="Bidirectional sync between Azure Blob Storage and local folder"
    )
    
    parser.add_argument(
        "--account",
        default=config.azure.account_name,
        help="Azure storage account name",
    )
    
    parser.add_argument(
        "--key",
        default=config.azure.account_key,
        help="Azure storage account key",
    )
    
    parser.add_argument(
        "--container",
        default=config.azure.container_name,
        help="Azure container name",
    )
    
    parser.add_argument(
        "--local-path",
        type=Path,
        default=config.sync.local_folder_path,
        help="Local folder path to sync",
    )
    
    parser.add_argument(
        "--mode",
        choices=["once", "continuous"],
        default="once",
        help="Sync mode: once or continuous",
    )
    
    parser.add_argument(
        "--interval",
        type=int,
        default=config.sync.sync_interval_seconds,
        help="Sync interval in seconds (for continuous mode)",
    )
    
    parser.add_argument(
        "--conflict-resolution",
        choices=["local_wins", "remote_wins", "manual"],
        default=config.sync.conflict_resolution,
        help="Conflict resolution strategy",
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=config.sync.dry_run,
        help="Run in dry-run mode (no changes made)",
    )
    
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default=config.sync.log_level,
        help="Logging level",
    )
    
    return parser


def main():
    """Main entry point"""
    parser = create_argument_parser()
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    # Update config from arguments
    config.sync.local_folder_path = args.local_path
    config.sync.sync_interval_seconds = args.interval
    config.sync.conflict_resolution = args.conflict_resolution
    config.sync.dry_run = args.dry_run
    
    if args.account:
        config.azure.account_name = args.account
    if args.key:
        config.azure.account_key = args.key
    if args.container:
        config.azure.container_name = args.container
    
    logger.info("Starting Azure Blob Sync")
    logger.info(f"Local folder: {config.sync.local_folder_path}")
    logger.info(f"Container: {config.azure.container_name}")
    logger.info(f"Conflict strategy: {config.sync.conflict_resolution}")
    if config.sync.dry_run:
        logger.warning("Running in DRY RUN mode - no changes will be made")
    
    try:
        sync_engine = SyncEngine()
        
        if args.mode == "once":
            logger.info("Running single sync...")
            sync_engine.sync()
            logger.info("Sync completed")
        
        elif args.mode == "continuous":
            logger.info(f"Running continuous sync every {args.interval} seconds")
            logger.info("Press Ctrl+C to stop")
            
            try:
                while True:
                    sync_engine.sync()
                    logger.info(f"Next sync in {args.interval} seconds...")
                    time.sleep(args.interval)
            except KeyboardInterrupt:
                logger.info("Sync stopped by user")
    
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
