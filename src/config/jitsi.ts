export const jitsiConfig = {
  domain: process.env.REACT_APP_JITSI_DOMAIN || 'stream.biblenow.io',
  appId: process.env.REACT_APP_JITSI_APP_ID || 'biblenow',
  jwtSecret: process.env.REACT_APP_JITSI_JWT_SECRET || process.env.JWT_APP_SECRET || null,
  // JWT authentication settings
  authenticationRequired: true, // JWT handles auth
  passwordRequired: false,
  // Interface settings
  showPrejoinPage: false,
  showWelcomePage: false,
  
  // Mobile and deep linking settings
  disableDeepLinking: true,
  mobileAppPromo: false,
  
  // Room and prejoin settings
  enableInsecureRoomNameWarning: false,
  prejoinPageEnabled: true,
  // Branding
  appName: 'biblenow',
  providerName: 'biblenow',
  primaryColor: '#D97706'
}; 