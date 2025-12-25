#!/bin/bash

# NullStack API Gateway Startup Script

set -e

echo "Starting NullStack API Gateway..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "Please update .env with your configuration before running in production."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Start the server
echo "Starting server..."
npm start
