#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ARCHIVE_PATH="${ARCHIVE_PATH:-$ROOT_DIR/dist/ios/DeepSeekHarness.xcarchive}"
mkdir -p "$(dirname "$ARCHIVE_PATH")"

if [[ ! -d ios/DeepSeekHarness.xcworkspace ]]; then
  echo "Missing ios/DeepSeekHarness.xcworkspace. Run 'cd ios && pod install' first." >&2
  exit 1
fi

xcodebuild \
  -workspace ios/DeepSeekHarness.xcworkspace \
  -scheme DeepSeekHarness \
  -configuration Release \
  -sdk iphoneos \
  -archivePath "$ARCHIVE_PATH" \
  archive

echo "Created iOS archive: $ARCHIVE_PATH"
echo "Export with a distribution ExportOptions.plist or use 'pnpm release:eas'."
