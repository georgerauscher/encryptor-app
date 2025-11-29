#!/bin/bash
#
# Cleanup old rate-limit files (GDPR compliance)
# Deletes files older than 7 days
# Run daily via cron: 0 3 * * * /path/to/your/httpdocs/security/cleanup-ratelimit.sh

# Get directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURITY_DIR="$SCRIPT_DIR"
LOG_DIR="$SCRIPT_DIR/../logs"
MAX_AGE_DAYS=7

# Delete rate-limit files older than 7 days
find "$SECURITY_DIR" -name "rate-limit-*.json" -type f -mtime +$MAX_AGE_DAYS -delete

# Log cleanup
echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleaned up rate-limit files older than $MAX_AGE_DAYS days" >> "$LOG_DIR/cleanup.log"

