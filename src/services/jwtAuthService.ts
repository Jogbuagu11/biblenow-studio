import { jwtConfig } from '../config/jwt';
import { supabase } from '../config/supabase';
import { VerifiedProfile } from '../types/database';
import { getDisplayName } from '../utils/profileUtils';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  aud: string; // Audience (your app ID)
  iss: string; // Issuer (your app ID)
  sub: string; // Subject (user email)
  room: string; // Room name
  context: {
    user: {
      id: string;
      name: string;
      email: string;
      moderator: boolean;
      avatar?: string;
    };
  };
  exp: number; // Expiration time
  nbf: number; // Not before time
}

export class JWTAuthService {
  private static instance: JWTAuthService;
  private jwtSecret: string | null;

  private constructor() {
    this.jwtSecret = jwtConfig.secret;
  }

  public static getInstance(): JWTAuthService {
    if (!JWTAuthService.instance) {
      JWTAuthService.instance = new JWTAuthService();
    }
    return JWTAuthService.instance;
  }

  /**
   * Generate JWT token for moderator authentication
   */
  public async generateModeratorToken(
    user: { uid: string; email: string; displayName: string },
    roomName: string
  ): Promise<string | null> {
    if (!this.jwtSecret) {
      console.error('JWT secret not configured');
      return null;
    }

    // All verified users are moderators, so no need to check role
    console.log('Generating moderator token for user:', user.email);

    try {
      // Get user profile to fetch avatar_url
      const profileResult = await this.getUserProfile(user.uid);
      const avatarUrl = profileResult.success && profileResult.profile?.avatar_url 
        ? profileResult.profile.avatar_url 
        : undefined;

      const now = Math.floor(Date.now() / 1000);
      const payload: JWTPayload = {
        aud: jwtConfig.audience,
        iss: jwtConfig.issuer,
        sub: user.email,
        room: roomName,
        context: {
          user: {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            moderator: true,
            avatar: avatarUrl
          }
        },
        exp: now + jwtConfig.expiresIn,
        nbf: now
      };

      return this.createJWTToken(payload);
    } catch (error) {
      console.error('Error generating JWT token:', error);
      return null;
    }
  }

  /**
   * Create JWT token using proper JWT library
   */
  private createJWTToken(payload: JWTPayload): string {
    if (!this.jwtSecret) {
      throw new Error('JWT secret not configured');
    }
    
    return jwt.sign(payload, this.jwtSecret, { 
      algorithm: 'HS256',
      expiresIn: '1h'
    });
  }

  /**
   * Verify JWT token using proper JWT library
   */
  public verifyToken(token: string): JWTPayload | null {
    try {
      if (!this.jwtSecret) {
        console.error('JWT secret not configured');
        return null;
      }

      const decoded = jwt.verify(token, this.jwtSecret, { 
        algorithms: [jwtConfig.algorithm],
        audience: jwtConfig.audience,
        issuer: jwtConfig.issuer
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      console.error('Error verifying JWT token:', error);
      return null;
    }
  }

  /**
   * Check if user is a moderator
   */
  public isModerator(token: string): boolean {
    const payload = this.verifyToken(token);
    return payload?.context?.user?.moderator === true;
  }

  /**
   * Get user info from JWT token
   */
  public getUserFromToken(token: string): { id: string; name: string; email: string; moderator: boolean } | null {
    const payload = this.verifyToken(token);
    if (!payload) return null;

    return {
      id: payload.context.user.id,
      name: payload.context.user.name,
      email: payload.context.user.email,
      moderator: payload.context.user.moderator
    };
  }

  /**
   * Authenticate user against Supabase verified_profiles table
   */
  public async authenticateUser(email: string, password: string): Promise<{
    success: boolean;
    user?: {
      id: string;
      email: string;
      displayName: string;
      role: 'user';
    };
    error?: string;
  }> {
    try {
      // Query the verified_profiles table
      const { data, error } = await supabase
        .from('verified_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'Email not found in verified profiles. Please contact support for access.'
        };
      }

      // Simple password check used previously; replace with your auth as needed
      if (password !== 'biblenow123') {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if user is active (optional - comment out if you don't want this check)
      // if (data.status !== 'active') {
      //   return {
      //     success: false,
      //     error: 'Account is not active. Please contact support.'
      //   };
      // }

      // Generate display name using utility function
      const displayName = getDisplayName(data);

      // Update last_login timestamp
      await this.updateLastLogin(data.id);

      return {
        success: true,
        user: {
          id: data.id,
          email: data.email,
          displayName: displayName,
          role: 'user' // All verified profiles are users
        }
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      };
    }
  }

  /**
   * Get user profile from Supabase
   */
  public async getUserProfile(userId: string): Promise<{
    success: boolean;
    profile?: VerifiedProfile;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('verified_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      return {
        success: true,
        profile: data
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        error: 'Failed to fetch user profile'
      };
    }
  }

  /**
   * Update user profile in Supabase
   */
  public async updateUserProfile(userId: string, updates: Partial<VerifiedProfile>): Promise<{
    success: boolean;
    profile?: VerifiedProfile;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('verified_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        profile: data
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error: 'Failed to update user profile'
      };
    }
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from('verified_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Generate JWT token for Jitsi authentication
   */
  public async generateJitsiToken(user: {
    uid: string;
    email: string;
    displayName: string;
  }, roomName: string, isModerator: boolean = false): Promise<string | null> {
    try {
      // Get JWT token from server endpoint
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      console.log('Generating JWT token for room:', roomName, 'moderator:', isModerator);
      
      const resp = await fetch(`${apiBase}/api/jitsi/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: roomName,
          moderator: isModerator,
          name: user.displayName,
          email: user.email
        })
      });
      
      if (!resp.ok) {
        console.error('Server responded with status:', resp.status);
        const errorText = await resp.text();
        console.error('Server error response:', errorText);
        return null;
      }
      
      const json = await resp.json();
      if (json?.jwt) {
        console.log('JWT token received successfully from server');
        return json.jwt;
      }
      
      console.error('Failed to get JWT token from server response:', json);
      return null;
    } catch (error) {
      console.error('Error generating Jitsi JWT token:', error);
      return null;
    }
  }
}

const jwtAuthService = JWTAuthService.getInstance();

export default jwtAuthService; 