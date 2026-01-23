#!/bin/bash

# ServiceWorker Cleanup Deployment Script
# This script ensures ServiceWorker cleanup is deployed to prevent NS_ERROR_CORRUPTED_CONTENT

set -e

echo "🚀 Deploying ServiceWorker cleanup fix..."

# Build the application
echo "📦 Building application..."
npm run build

# Copy the ServiceWorker cleanup script to dist
echo "📋 Copying ServiceWorker cleanup script..."
cp public/sw-cleanup.js dist/sw-cleanup.js

# Verify the cleanup script is in place
if [ -f "dist/sw-cleanup.js" ]; then
    echo "✅ ServiceWorker cleanup script deployed successfully"
else
    echo "❌ Failed to deploy ServiceWorker cleanup script"
    exit 1
fi

# Check if index.html includes the cleanup script
if grep -q "sw-cleanup.js" dist/index.html; then
    echo "✅ ServiceWorker cleanup script included in index.html"
else
    echo "❌ ServiceWorker cleanup script not found in index.html"
    exit 1
fi

echo "🎉 ServiceWorker cleanup deployment completed!"
echo ""
echo "This fix will:"
echo "  - Unregister any existing ServiceWorker registrations"
echo "  - Clear all browser caches"
echo "  - Reload the page for a clean state"
echo "  - Prevent NS_ERROR_CORRUPTED_CONTENT errors"
echo ""
echo "Users should refresh their browsers to see the fix take effect."
