// Jitsi configuration for self-hosted deployment
export const jaasConfig = {
  domain: process.env.REACT_APP_JITSI_DOMAIN || "stream.biblenow.io",
  appId: undefined as unknown as string, // deprecated; no longer used
  jwtSecret: null as unknown as string | null
}; 