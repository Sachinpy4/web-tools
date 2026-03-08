#!/bin/sh
set -e

# Ensure required directories exist with correct ownership
mkdir -p /app/uploads/processed /app/uploads/archives /app/backups /app/logs
chown -R appuser:appgroup /app/uploads /app/backups /app/logs

# Drop privileges and run the application as appuser
exec su-exec appuser "$@"
