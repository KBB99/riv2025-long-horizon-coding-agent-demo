#!/bin/bash
# Canopy - Project Management App initialization script
# This script sets up the development environment for resuming work

set -e

echo "=== Canopy Development Environment Setup ==="

# Navigate to project root
cd "$(dirname "$0")"

# Install dependencies (npm workspaces)
echo "Installing dependencies..."
npm install 2>/dev/null || true

# Build shared package
echo "Building shared package..."
cd shared && npm run build 2>/dev/null && cd ..

# Get API URL from CloudFormation (if deployed)
echo "Checking deployment status..."
API_URL=$(aws cloudformation describe-stacks --stack-name canopy-app-stack --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "")

if [ -n "$API_URL" ] && [ "$API_URL" != "None" ]; then
  echo "API deployed at: $API_URL"
  echo "VITE_API_URL=$API_URL" > frontend/.env
  echo "Frontend .env configured with API URL"
else
  echo "No deployed API found. Frontend will use localStorage fallback."
fi

# Install Playwright browsers if needed
echo "Checking Playwright..."
npx playwright install chromium 2>/dev/null || true

# Start the dev server
echo "Starting frontend dev server on port 6174..."
npx vite dev frontend --host 0.0.0.0 --port 6174 &

echo ""
echo "=== Setup Complete ==="
echo "Frontend: http://localhost:6174"
if [ -n "$API_URL" ] && [ "$API_URL" != "None" ]; then
  echo "API: $API_URL"
fi
echo ""
