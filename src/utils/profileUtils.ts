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
export const getUserRole = (profile: VerifiedProfile): 'user' => {
  return 'user'; // All verified profiles are users
};

/**
 * Check if user is active
 */
export const isUserActive = (profile: VerifiedProfile): boolean => {
  return true; // All verified profiles are considered active
};

/**
 * Check if user can be moderator
 */
export const canBeModerator = (profile: VerifiedProfile): boolean => {
  return false; // No moderator roles - all verified profiles are regular users
}; 