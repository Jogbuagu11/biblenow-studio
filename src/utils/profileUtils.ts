import { VerifiedProfile } from '../types/database';

/**
 * Get display name from verified profile
 */
export const getDisplayName = (profile: VerifiedProfile): string => {
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  
  if (profile.ministry_name) {
    return profile.ministry_name;
  }
  
  return profile.email;
};

/**
 * Get user role from profile
 */
export const getUserRole = (profile: VerifiedProfile): 'user' | 'moderator' | 'admin' => {
  return profile.role || 'user';
};

/**
 * Check if user is active
 */
export const isUserActive = (profile: VerifiedProfile): boolean => {
  return profile.status === 'active';
};

/**
 * Check if user can be moderator
 */
export const canBeModerator = (profile: VerifiedProfile): boolean => {
  return profile.role === 'moderator' || profile.role === 'admin';
}; 