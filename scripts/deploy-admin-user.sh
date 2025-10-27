#!/bin/bash

# Deploy Admin User Creation Script to Uberspace
# This script uploads and runs the admin user creation script on production

set -e

# Configuration (from .env.deployment)
UBERSPACE_USER="slam25"
UBERSPACE_HOST="slam25.uber.space"
PROJECT_PATH="/home/slam25/slam25"
SCRIPT_NAME="create-production-admin.js"

echo "🚀 Deploying admin user creation script to Uberspace..."

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "❌ No SSH key found. Please set up SSH access to Uberspace first."
    exit 1
fi

# Upload the script
echo "📤 Uploading script to Uberspace..."
scp scripts/$SCRIPT_NAME $UBERSPACE_USER@$UBERSPACE_HOST:$PROJECT_PATH/scripts/

# Run the script on the server
echo "🔧 Running admin user creation script on production..."
ssh $UBERSPACE_USER@$UBERSPACE_HOST "cd $PROJECT_PATH && node scripts/$SCRIPT_NAME"

echo "✅ Admin user creation completed on production server!"
echo ""
echo "You can now login to the production admin panel with:"
echo "Username: slamok"
echo "Password: kanukokst"
