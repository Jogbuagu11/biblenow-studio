# Configuration Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Firebase Configuration (for authentication and analytics only)
```
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### PostgreSQL Database Configuration
```
REACT_APP_DB_HOST=localhost
REACT_APP_DB_PORT=5432
REACT_APP_DB_NAME=biblenow_studio
REACT_APP_DB_USER=postgres
REACT_APP_DB_PASSWORD=your-db-password
REACT_APP_DB_SSL=false
REACT_APP_API_URL=http://localhost:3001/api
```

### Supabase Configuration (for chat and database)
```
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### JAAS Configuration
```
REACT_APP_JAAS_DOMAIN=8x8.vc
REACT_APP_JAAS_APP_ID=your-jaas-app-id
REACT_APP_JAAS_JWT_SECRET=your-jwt-secret
```

### Stripe Configuration
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

## Setup Instructions

1. **Firebase Setup (for authentication and analytics):**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication and Analytics
   - Get your configuration from Project Settings > General > Your apps
   - Replace the placeholder values in your `.env` file

2. **Supabase Setup (for database and chat):**
   - Create a Supabase project at https://supabase.com
   - Get your project URL and anon key from Settings > API
   - Run the chat migration: `psql -d your_database -f scripts/apply_chat_migration.sql`
   - Update the Supabase configuration in your `.env` file

3. **JAAS Setup:**
   - Sign up for JAAS at https://jaas.8x8.vc
   - Get your App ID and JWT Secret from the dashboard
   - Update the JAAS configuration in your `.env` file

4. **Stripe Setup:**
   - Create a Stripe account at https://stripe.com
   - Get your publishable and secret keys from the Stripe Dashboard
   - Update the Stripe configuration in your `.env` file
   - Set up webhooks for account updates (see server setup below)

5. **Backend Server Setup:**
   - Navigate to the `server/` directory
   - Copy `env.example` to `.env` and fill in your credentials
   - Install dependencies: `npm install`
   - Start the server: `npm run dev`

6. **Start the Application:**
   ```bash
   # Terminal 1: Start the backend server
   cd server
   npm install
   npm run dev
   
   # Terminal 2: Start the frontend
   npm start
   ```

## Features

- **Stream URL Navigation:** When users click "Start Stream", they are redirected to `/live-stream` with room parameters
- **JAAS Integration:** Uses 8x8.vc (JAAS) instead of jitsi.meet for better reliability
- **Stripe Connect Integration:** Full Stripe Connect onboarding for receiving donations
- **Real-time Account Status:** Live updates of Stripe account verification status

## Database Schema

The application uses the following PostgreSQL table:

- `livestreams` - Main table storing all livestream information including:
  - Basic info: title, description, streamer_id
  - Status: is_live, started_at, ended_at
  - Configuration: stream_type, platform, stream_key, embed_url
  - Metadata: tags, viewer_count, max_viewers, flag_count
  - JAAS config: jitsi_room_config, room_name

## Testing Database Connection

To test if the database is properly connected:

1. Start the application: `npm start`
2. Navigate to `/go-live`
3. Fill out the form and click "Start Stream"
4. You should see livestream data being saved and retrieved
5. Check the browser console for any API-related errors
6. Verify that the `livestreams` table is being populated in your PostgreSQL database 