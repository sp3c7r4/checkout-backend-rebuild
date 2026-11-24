#!/usr/bin/env bash
# Nightly Postgres backup. Root crontab:
#   0 3 * * * /srv/checkout/deploy/backup.sh >> /var/log/checkout-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p backups
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-checkout}" "${POSTGRES_DB:-checkout}" \
  | gzip > "backups/checkout-${STAMP}.sql.gz"
find backups -name 'checkout-*.sql.gz' -mtime +14 -delete
# optional: aws s3 cp "backups/checkout-${STAMP}.sql.gz" "s3://$BACKUP_BUCKET/"
