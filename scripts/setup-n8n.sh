#!/bin/bash

echo "🚀 Setting up n8n for PromptBuilder..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p n8n-dev-data
mkdir -p n8n/workflows
mkdir -p n8n/credentials

# Start n8n in development mode
echo "🐳 Starting n8n with Docker Compose..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for n8n to be ready
echo "⏳ Waiting for n8n to start..."
sleep 10

# Check if n8n is running
if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "✅ n8n is running!"
    echo ""
    echo "📌 n8n Details:"
    echo "   URL: http://localhost:5678"
    echo "   Username: admin"
    echo "   Password: admin"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Open http://localhost:5678 in your browser"
    echo "2. Log in with admin/admin"
    echo "3. The n8n API is available at http://localhost:5678/api/v1"
    echo ""
    echo "💡 To stop n8n, run: docker-compose -f docker-compose.dev.yml down"
else
    echo "❌ Failed to start n8n. Check the logs with:"
    echo "   docker-compose -f docker-compose.dev.yml logs"
fi