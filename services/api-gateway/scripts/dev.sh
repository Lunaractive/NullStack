#!/bin/bash

# NullStack API Gateway Development Script

set -e

echo "Starting NullStack API Gateway in development mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Creating from .env.example..."
    cp .env.example .env
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start in development mode with hot reload
echo "Starting development server with hot reload..."
npm run dev
