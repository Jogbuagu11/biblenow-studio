# Configuration Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Firebase Configuration (for authentication only)
```
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
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

### Chat Configuration
```
REACT_APP_CHAT_COLLECTION=chat_messages
REACT_APP_MAX_MESSAGES=100
REACT_APP_MESSAGE_LIMIT=50
```

### JAAS Configuration
```
REACT_APP_JAAS_DOMAIN=8x8.vc
REACT_APP_JAAS_APP_ID=your-jaas-app-id
REACT_APP_JAAS_JWT_SECRET=your-jwt-secret
```

## Setup Instructions

1. **Firebase Setup (for authentication only):**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Firestore not needed)
   - Get your configuration from Project Settings > General > Your apps
   - Replace the placeholder values in your `.env` file

2. **PostgreSQL Database Setup:**
   - Install PostgreSQL on your system
   - Create a database named `biblenow_studio`
   - Run the provided SQL schema to create the `livestreams` table
   - Update the database configuration in your `.env` file

2. **JAAS Setup:**
   - Sign up for JAAS at https://jaas.8x8.vc
   - Get your App ID and JWT Secret from the dashboard
   - Update the JAAS configuration in your `.env` file

3. **Start the Application:**
   ```bash
   npm start
   ```

## Features

- **Stream URL Navigation:** When users click "Start Stream", they are redirected to `/live-stream` with room parameters
- **JAAS Integration:** Uses 8x8.vc (JAAS) instead of jitsi.meet for better reliability
- **PostgreSQL Database:** Uses PostgreSQL for data persistence with the `livestreams` table
- **Stream Scheduling:** Schedule future streams with date/time selection and calendar view
- **Recurring Streams:** Create recurring stream series (daily, weekly, bi-weekly, monthly) with automatic episode generation
- **Real-time Viewer Count:** Tracks active viewers in real-time using API polling
- **Configurable Database:** All database settings are configurable via environment variables
- **Moderator Bypass:** Users can bypass moderator requirements if needed

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