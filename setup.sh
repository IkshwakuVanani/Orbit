#!/usr/bin/env bash
set -euo pipefail
[ -f .env ] || cp .env.example .env
npm ci
npm run build
printf "Run npm start, then open http://localhost:4000\n"
