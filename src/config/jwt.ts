// JWT Configuration for JAAS authentication
export const jwtConfig = {
  // JWT Secret for signing tokens (should be stored in environment variables)
  secret: process.env.REACT_APP_JAAS_JWT_SECRET || 'eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtYWM2NjhlOWZlYTI3NDM3MDlmN2M0MzYyOGZlOWQzNzIvZDEwZDI4LVNBTVBMRV9BUFAiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJqaXRzaSIsImlzcyI6ImNoYXQiLCJpYXQiOjE3NTMzNzk1NjgsImV4cCI6MTc1MzM4Njc2OCwibmJmIjoxNzUzMzc5NTYzLCJzdWIiOiJ2cGFhcy1tYWdpYy1jb29raWUtYWM2NjhlOWZlYTI3NDM3MDlmN2M0MzYyOGZlOWQzNzIiLCJjb250ZXh0Ijp7ImZlYXR1cmVzIjp7ImxpdmVzdHJlYW1pbmciOnRydWUsImZpbGUtdXBsb2FkIjp0cnVlLCJvdXRib3VuZC1jYWxsIjp0cnVlLCJzaXAtb3V0Ym91bmQtY2FsbCI6ZmFsc2UsInRyYW5zY3JpcHRpb24iOnRydWUsImxpc3QtdmlzaXRvcnMiOmZhbHNlLCJyZWNvcmRpbmciOnRydWUsImZsaXAiOmZhbHNlfSwidXNlciI6eyJoaWRkZW4tZnJvbS1yZWNvcmRlciI6ZmFsc2UsIm1vZGVyYXRvciI6dHJ1ZSwibmFtZSI6ImFkbWluJWJpYmxlbm93LmlvIiwiaWQiOiJnb29nbGUtb2F1dGgyfDExMjA4MzE4MDIwMzcxNTU0NjI5MiIsImF2YXRhciI6IiIsImVtYWlsIjoiYWRtaW4lYmlibGVub3cuaW9AZ3RlbXBhY2NvdW50LmNvbSJ9fSwicm9vbSI6IioifQ.avsazYWmgnPQmMsKp3PJxm0QbkoFnETz07hVgJxBY9F61_EauKFL_gBVVysXPFpISdLweFHaBZaqoCMQkM-vqzLIgNlj530eTIAvRvJPBsQiWOczMG2GYCPWhHAaxvUfWjCwRfW0aGyuktnIGo3uUZojnxMOaU1bK2tUk9CgzG0brha21qWSZ6Su2105WrB_gAoSoj8bwsnakNZbCTRL4Z1wr9TEgMQFIB7Qwqs72ddzdTDTvluPbFmP5MSMD1DOa7Dn1rw4SoXBw6d1k4p24N9rISeqKDwBXH66fmxbQyKRBT75N_8B54sooe3i_ALDVX0aUVzIRjQymy-YYJkjvQ',
  
  // Token expiration time (in seconds)
  expiresIn: 3600, // 1 hour
  
  // Algorithm to use for signing
  algorithm: 'HS256',
  
  // JAAS App ID (audience and issuer)
  audience: process.env.REACT_APP_JAAS_APP_ID || 'your-jaas-app-id',
  issuer: process.env.REACT_APP_JAAS_APP_ID || 'your-jaas-app-id',
  
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