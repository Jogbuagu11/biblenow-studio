// JWT Configuration for self-hosted Jitsi authentication
export const jwtConfig = {
  // JWT Secret for signing tokens (frontend should not sign; this is for verification only if used)
  secret: process.env.REACT_APP_JITSI_JWT_SECRET || null,
  // Token expiration time (in seconds)
  expiresIn: 3600 as const,
  // Algorithm to use for signing
  algorithm: 'HS256' as const,
  // App ID (audience and issuer)
  audience: process.env.REACT_APP_JITSI_APP_ID || 'biblenow',
  issuer: process.env.REACT_APP_JITSI_APP_ID || 'biblenow',
  // Room name prefix for moderators (optional)
  roomPrefix: 'moderator-',
  // Roles allowed to be moderators
  moderatorRoles: ['moderator', 'admin'] as const
};

export const canBeModerator = (role: string): boolean => {
  return jwtConfig.moderatorRoles.includes(role as any);
};

export const generateModeratorRoomName = (baseRoomName: string): string => {
  return `${jwtConfig.roomPrefix}${baseRoomName}`;
}; 