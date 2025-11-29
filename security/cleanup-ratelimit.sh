#!/bin/bash
#
# Cleanup old rate-limit files (GDPR compliance)
# Deletes files older than 7 days
# Run daily via cron: 0 3 * * * /var/www/encryptor.app/httpdocs/security/cleanup-ratelimit.sh
#

SECURITY_DIR="/var/www/encryptor.app/httpdocs/security"
MAX_AGE_DAYS=7

# Delete rate-limit files older than 7 days
find "$SECURITY_DIR" -name "rate-limit-*.json" -type f -mtime +$MAX_AGE_DAYS -delete

# Log cleanup
echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleaned up rate-limit files older than $MAX_AGE_DAYS days" >> /var/www/encryptor.app/logs/cleanup.log

