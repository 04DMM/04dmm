#!/bin/bash

# Set source and backup directories
SOURCE_DIR="/home/streamsnipezlul/04dmm/04dmm/data/players/main/"
BACKUP_DIR="/home/streamsnipezlul/sav_backup"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Enable nullglob so *.sav expands to nothing if no files exist
shopt -s nullglob

# Get the list of .sav files
sav_files=("$SOURCE_DIR"/*.sav)

# Check if there are any .sav files
if [ ${#sav_files[@]} -gt 0 ]; then
    cp "${sav_files[@]}" "$BACKUP_DIR"
fi

# Optional: log to a file
# echo "$(date): Backup completed" >> /path/to/backup.log
