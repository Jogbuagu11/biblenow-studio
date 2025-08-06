import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration (for auth only)
const firebaseConfig = {
  apiKey: "AIzaSyAjFArG3xSq2JGb8bNnqVBI3K-Gyf-dz8c",
  authDomain: "io-biblenow-authapp.firebaseapp.com",
  projectId: "io-biblenow-authapp",
  storageBucket: "io-biblenow-authapp.firebasestorage.app",
  messagingSenderId: "978185521714",
  appId: "1:978185521714:web:840d67807782ec9a928a2b",
  measurementId: "G-MC0BNXJLBT"
};

// Initialize Firebase (for auth only)
const app = initializeApp(firebaseConfig);

// Initialize Firebase services (auth only)
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// PostgreSQL Database configuration
export const dbConfig = {
  host: process.env.REACT_APP_DB_HOST || 'localhost',
  port: parseInt(process.env.REACT_APP_DB_PORT || '5432'),
  database: process.env.REACT_APP_DB_NAME || 'biblenow_studio',
  user: process.env.REACT_APP_DB_USER || 'postgres',
  password: process.env.REACT_APP_DB_PASSWORD || '',
  ssl: process.env.REACT_APP_DB_SSL === 'true',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
};

// Chat configuration
export const chatConfig = {
  collectionName: process.env.REACT_APP_CHAT_COLLECTION || "chat_messages",
  maxMessages: parseInt(process.env.REACT_APP_MAX_MESSAGES || "100"),
  messageLimit: parseInt(process.env.REACT_APP_MESSAGE_LIMIT || "50")
};

// JAAS configuration
export const jaasConfig = {
  domain: process.env.REACT_APP_JAAS_DOMAIN || "8x8.vc",
  appId: process.env.REACT_APP_JAAS_APP_ID || "vpaas-magic-cookie-ac668e9fea2743709f7c43628fe9d372",
  jwtSecret: process.env.REACT_APP_JAAS_JWT_SECRET || null
};

// GA4 Analytics configuration
export const ga4Config = {
  // Firebase Analytics (for event tracking)
  firebaseMeasurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-MC0BNXJLBT",
  
  // Pure GA4 (for advanced analytics)
  ga4MeasurementId: process.env.REACT_APP_GA_MEASUREMENT_ID || "your-vercel-ga4-id",
  apiSecret: process.env.REACT_APP_GA_API_SECRET || "z9AU3dTnS_OmuUUdCNpo_",
  propertyId: process.env.REACT_APP_GA_PROPERTY_ID || "your-ga4-property-id"
};

export default app; 