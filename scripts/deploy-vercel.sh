#!/bin/bash

echo "🚀 Deploying to Vercel with CORS fixes..."

# Clear any existing build cache
echo "🧹 Clearing build cache..."
rm -rf build
rm -rf .vercel

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Your app should now be available at: https://studio.biblenow.io"
echo "📝 CORS issues should be resolved with the new configuration." 