#!/bin/bash

# Setup script for environment variables
echo "Setting up environment variables for BibleNOW Studio..."

# Check if .env file already exists
if [ -f ".env" ]; then
    echo "Warning: .env file already exists. This will overwrite it."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Create .env file
cat > .env << 'EOF'
# Supabase Configuration
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key

# Firebase Configuration (for authentication only)
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

# PostgreSQL Database Configuration
REACT_APP_DB_HOST=localhost
REACT_APP_DB_PORT=5432
REACT_APP_DB_NAME=biblenow_studio
REACT_APP_DB_USER=postgres
REACT_APP_DB_PASSWORD=your-db-password
REACT_APP_DB_SSL=false
REACT_APP_API_URL=http://localhost:3001/api

# Chat Configuration
REACT_APP_CHAT_COLLECTION=chat_messages
REACT_APP_MAX_MESSAGES=100
REACT_APP_MESSAGE_LIMIT=50

# JAAS Configuration
REACT_APP_JAAS_DOMAIN=8x8.vc
REACT_APP_JAAS_APP_ID=your-jaas-app-id
REACT_APP_JAAS_JWT_SECRET=your-jwt-secret

# Google OAuth Configuration (for Supabase)
AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-google-oauth-client-id
AUTH_EXTERNAL_GOOGLE_SECRET=your-google-oauth-client-secret
EOF

echo "✅ .env file created successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Open the .env file and replace the placeholder values with your actual credentials"
echo "2. Get your Supabase URL and anon key from your Supabase project dashboard"
echo "3. Get your Firebase config from your Firebase project settings"
echo "4. Update the database and JAAS configuration as needed"
echo ""
echo "🔗 Useful links:"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- Firebase Console: https://console.firebase.google.com"
echo "- JAAS Dashboard: https://jaas.8x8.vc"
echo ""
echo "After updating the .env file, restart your development server:"
echo "npm start" 