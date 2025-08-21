export const jitsiConfig = {
  domain: process.env.REACT_APP_JITSI_DOMAIN || 'stream.biblenow.io',
  appId: process.env.REACT_APP_JITSI_APP_ID || 'biblenow',
  jwtSecret: process.env.REACT_APP_JITSI_JWT_SECRET || null
}; 