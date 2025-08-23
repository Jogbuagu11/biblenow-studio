#!/bin/bash

# Jitsi Environment Setup Script
# This script helps you set up the required environment variables for Jitsi JWT authentication

echo "🔧 Setting up Jitsi JWT Environment Variables"
echo "=============================================="

# Check if .env file exists in server directory
if [ ! -f "server/.env" ]; then
    echo "📝 Creating server/.env file from template..."
    cp server/env.example server/.env
    echo "✅ Created server/.env file"
else
    echo "📝 server/.env file already exists"
fi

# Generate a strong JWT secret if not already set
if ! grep -q "JITSI_JWT_SECRET=" server/.env || grep -q "your_very_strong_secret_key_here" server/.env; then
    echo "🔑 Generating strong JWT secret..."
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Update the .env file with the new secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JITSI_JWT_SECRET=.*/JITSI_JWT_SECRET=$JWT_SECRET/" server/.env
    else
        # Linux
        sed -i "s/JITSI_JWT_SECRET=.*/JITSI_JWT_SECRET=$JWT_SECRET/" server/.env
    fi
    
    echo "✅ Generated and set JWT secret"
else
    echo "✅ JWT secret already configured"
fi

echo ""
echo "📋 Current Jitsi Configuration:"
echo "================================"
grep -E "JITSI_" server/.env | while read line; do
    if [[ $line == *"SECRET"* ]]; then
        # Hide the secret value for security
        echo "${line%=*}=***HIDDEN***"
    else
        echo "$line"
    fi
done

echo ""
echo "🚀 Next Steps:"
echo "=============="
echo "1. Restart your server to load the new environment variables"
echo "2. Test JWT token generation: node scripts/test-jitsi-jwt.js"
echo "3. Try starting a livestream again"
echo ""
echo "💡 If you're still getting 'Room and token mismatched' errors:"
echo "   - Check that your Jitsi server is configured to accept JWT tokens"
echo "   - Verify the APP_ID matches your Jitsi server configuration"
echo "   - Ensure the domain/subject matches your Jitsi server domain" 