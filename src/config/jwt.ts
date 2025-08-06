// JWT Configuration for JAAS authentication
export const jwtConfig = {
  // JWT Secret for signing tokens (should be stored in environment variables)
  secret: process.env.REACT_APP_JAAS_JWT_SECRET || null,
  
  // Token expiration time (in seconds)
  expiresIn: 3600, // 1 hour
  
  // Algorithm to use for signing
  algorithm: 'HS256' as const,
  
  // JAAS App ID (audience and issuer)
  audience: process.env.REACT_APP_JAAS_APP_ID || 'vpaas-magic-cookie-ac668e9fea2743709f7c43628fe9d372',
  issuer: process.env.REACT_APP_JAAS_APP_ID || 'vpaas-magic-cookie-ac668e9fea2743709f7c43628fe9d372',
  
  // Room name prefix for moderator rooms
  roomPrefix: 'moderator-',
  
  // User roles that can generate moderator tokens
  moderatorRoles: ['moderator', 'admin'] as const
};

// Helper function to check if user can be a moderator
export const canBeModerator = (role: string): boolean => {
  return jwtConfig.moderatorRoles.includes(role as any);
};

// Helper function to generate room name for moderators
export const generateModeratorRoomName = (baseRoomName: string): string => {
  return `${jwtConfig.roomPrefix}${baseRoomName}`;
}; 