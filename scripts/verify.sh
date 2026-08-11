#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/5] Backend tests"
(
  cd "${PROJECT_ROOT}/apps/cs-api"
  ./gradlew test --no-daemon
)

echo "[2/5] Browser worker tests"
(
  cd "${PROJECT_ROOT}/apps/browser-worker"
  npm test
)

echo "[3/5] Frontend tests"
(
  cd "${PROJECT_ROOT}/apps/frontend"
  npm test
)

echo "[4/5] Frontend lint and production build"
(
  cd "${PROJECT_ROOT}/apps/frontend"
  npm run lint
  npm run build
)

echo "[5/5] Docker Compose configuration"
docker compose --project-directory "${PROJECT_ROOT}" config --quiet

echo "All verification checks passed."
