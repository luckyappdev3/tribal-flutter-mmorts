#!/bin/bash
SOURCE=$1
FILENAME=$(basename "$SOURCE")
DEST=$(find packages -name "$FILENAME" 2>/dev/null | head -1)
if [ -z "$DEST" ]; then
  echo "❌ Fichier '$FILENAME' introuvable dans le projet"
  exit 1
fi
cp "$SOURCE" "$DEST"
echo "✅ $FILENAME → $DEST"
