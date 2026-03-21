#!/bin/bash
# Script d'export du projet MGK Transport
# Usage: ./export-project.sh

PROJECT_DIR="/home/z/my-project"
OUTPUT_DIR="/home/z/my-project/download"
DATE=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="mgk-transport-backup-${DATE}.zip"

echo "📦 Export du projet MGK Transport..."
echo "Date: $(date)"
echo ""

cd "$PROJECT_DIR"

# Créer le ZIP en excluant les dossiers volumineux
zip -r "${OUTPUT_DIR}/${ZIP_NAME}" . \
  -x "node_modules/*" \
  -x ".next/*" \
  -x ".turbo/*" \
  -x "*.log" \
  -x "dev.log"

echo ""
echo "✅ Export terminé !"
echo "📁 Fichier: ${OUTPUT_DIR}/${ZIP_NAME}"
echo "📊 Taille: $(ls -lh "${OUTPUT_DIR}/${ZIP_NAME}" | awk '{print $5}')"
echo ""
echo "💡 Pour restaurer:"
echo "   1. Téléchargez le fichier ZIP"
echo "   2. Extrayez-le dans un nouveau dossier"
echo "   3. Exécutez: bun install && bun run db:push && bun run db:seed"
