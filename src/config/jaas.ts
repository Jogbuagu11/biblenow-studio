// JAAS configuration for video conferencing
export const jaasConfig = {
  domain: process.env.REACT_APP_JAAS_DOMAIN || "8x8.vc",
  appId: process.env.REACT_APP_JAAS_APP_ID || "vpaas-magic-cookie-ac668e9fea2743709f7c43628fe9d372",
  jwtSecret: process.env.REACT_APP_JAAS_JWT_SECRET || null
}; 