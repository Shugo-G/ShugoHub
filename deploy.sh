#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ShugoHub — Deploy producción"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$PROJECT_DIR"

echo ""
echo "==> Bajando cambios del repositorio..."
git fetch origin main
git reset --hard origin/main

echo ""
echo "==> Construyendo imagen y levantando contenedor..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "==> Limpiando imágenes huérfanas..."
docker image prune -f

echo ""
echo "==> Estado del contenedor de producción:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploy completado."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
