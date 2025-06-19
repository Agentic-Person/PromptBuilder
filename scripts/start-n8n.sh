#!/bin/bash

# Start n8n in development mode
echo "🚀 Starting n8n workflow automation..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Use development compose file
docker-compose -f docker-compose.dev.yml up -d

echo "⏳ Waiting for n8n to start..."
sleep 5

# Check if n8n is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz | grep -q "200"; then
    echo "✅ n8n is running!"
    echo "🌐 Access n8n at: http://localhost:5678"
    echo "👤 Username: admin"
    echo "🔑 Password: admin"
else
    echo "❌ n8n failed to start. Check logs with: docker-compose -f docker-compose.dev.yml logs"
fi