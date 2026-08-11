#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/4] Backend tests"
(
  cd "${PROJECT_ROOT}/apps/cs-api"
  ./gradlew test --no-daemon
)

echo "[2/4] Frontend tests"
(
  cd "${PROJECT_ROOT}/apps/frontend"
  npm test
)

echo "[3/4] Frontend lint and production build"
(
  cd "${PROJECT_ROOT}/apps/frontend"
  npm run lint
  npm run build
)

echo "[4/4] Docker Compose configuration"
docker compose --project-directory "${PROJECT_ROOT}" config --quiet

echo "All verification checks passed."
