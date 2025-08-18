export const jitsiConfig = {
  // Use the public Jitsi Meet server as a fallback since the self-hosted server has issues
  domain: process.env.REACT_APP_JITSI_DOMAIN || 'meet.jit.si'
};

export const viewerBaseUrl =
  process.env.REACT_APP_VIEWER_BASE_URL || 'https://meet.jit.si'; 