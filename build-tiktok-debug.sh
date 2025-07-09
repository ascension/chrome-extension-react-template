#!/bin/bash

# Build the TikTok Shop debug extension
echo "Building TikTok Shop debug extension..."

# Run the full build
echo "Running full build..."
npm run build

# Make sure CSS files are copied
echo "Copying CSS files..."
cp src/contentScript/tiktokShop.css dist/assets/
cp src/contentScript/tiktokShopDebug.css dist/assets/

echo "Build complete! The extension is ready to be loaded in Chrome."
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist' directory" 