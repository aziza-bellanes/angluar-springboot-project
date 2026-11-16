#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd frontend && npm ci && npm run build -- --configuration production)
rm -rf backend/src/main/resources/static
mkdir -p backend/src/main/resources/static
cp -a frontend/dist/psm/browser/. backend/src/main/resources/static/
(cd backend && mvn clean package)
echo 'Built: backend/target/psm.jar'
