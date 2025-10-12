export const jitsiConfig = {
  domain: process.env.REACT_APP_JITSI_DOMAIN || 'stream.biblenow.io',
  appId: process.env.REACT_APP_JITSI_APP_ID || 'biblenow',
  jwtSecret: process.env.REACT_APP_JITSI_JWT_SECRET || null,
  // JWT authentication settings - DISABLED FOR NOW
  authenticationRequired: false, // Disable JWT authentication
  passwordRequired: false,
  // Interface settings
  showPrejoinPage: false,
  showWelcomePage: false,
  // Branding
  appName: 'BibleNOW Studio',
  providerName: 'BibleNOW Studio',
  primaryColor: '#D97706'
}; 