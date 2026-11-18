#!/usr/bin/env bash
# Logical data migration without sourcing dotenv files or exposing passwords in command arguments.
# Usage: deployment/database.sh backup > atelier.sql
#        deployment/database.sh restore < atelier.sql
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-}" in
  backup)
    exec docker compose -f deployment/compose.prod.yaml --env-file deployment/.env.prod exec -T db \
      sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"'
    ;;
  restore)
    exec docker compose -f deployment/compose.prod.yaml --env-file deployment/.env.prod exec -T db \
      sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$MYSQL_DATABASE"'
    ;;
  *) echo 'Usage: deployment/database.sh backup|restore' >&2; exit 2 ;;
esac
