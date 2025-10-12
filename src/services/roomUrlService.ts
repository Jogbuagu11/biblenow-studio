/**
 * Room URL Service - Ensures consistent room naming between Flutter and Web apps
 */

export interface RoomUrlConfig {
  baseUrl: string;
  roomPrefix: string;
}

export class RoomUrlService {
  private static readonly DEFAULT_CONFIG: RoomUrlConfig = {
    baseUrl: process.env.REACT_APP_BASE_URL || 'https://biblenowstudio.com',
    roomPrefix: 'biblenow-app'
  };

  /**
   * Generate a consistent room name that works for both Flutter and Web apps
   */
  static generateRoomName(streamTitle: string, streamId?: string): string {
    // Clean the title to create a valid room name
    const cleanTitle = streamTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'bible-study';

    // Use streamId if available, otherwise use clean title
    const roomIdentifier = streamId || cleanTitle;
    
    // Return in Flutter-compatible format
    return `${this.DEFAULT_CONFIG.roomPrefix}/${roomIdentifier}`;
  }

  /**
   * Generate the full web URL for joining a room
   */
  static generateWebRoomUrl(roomName: string, streamTitle?: string): string {
    const baseUrl = this.DEFAULT_CONFIG.baseUrl;
    const encodedRoom = encodeURIComponent(roomName);
    const encodedTitle = streamTitle ? encodeURIComponent(streamTitle) : '';
    
    return `${baseUrl}/live-stream?room=${encodedRoom}${encodedTitle ? `&title=${encodedTitle}` : ''}`;
  }

  /**
   * Generate the Jitsi direct URL (for "join in browser" links)
   */
  static generateJitsiDirectUrl(roomName: string): string {
    const jitsiDomain = process.env.REACT_APP_JITSI_DOMAIN || 'stream.biblenow.io';
    return `https://${jitsiDomain}/${roomName}`;
  }

  /**
   * Parse room name from URL parameters
   */
  static parseRoomFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
  }

  /**
   * Validate that a room name follows the expected format
   */
  static validateRoomName(roomName: string): boolean {
    // Should match pattern: biblenow-app/room-identifier
    const pattern = /^biblenow-app\/[a-z0-9-]+$/;
    return pattern.test(roomName);
  }

  /**
   * Extract the room identifier from a full room name
   */
  static extractRoomIdentifier(roomName: string): string | null {
    const match = roomName.match(/^biblenow-app\/(.+)$/);
    return match ? match[1] : null;
  }
}

// Export convenience functions
export const generateRoomName = RoomUrlService.generateRoomName;
export const generateWebRoomUrl = RoomUrlService.generateWebRoomUrl;
export const generateJitsiDirectUrl = RoomUrlService.generateJitsiDirectUrl;
export const parseRoomFromUrl = RoomUrlService.parseRoomFromUrl;
export const validateRoomName = RoomUrlService.validateRoomName;
export const extractRoomIdentifier = RoomUrlService.extractRoomIdentifier;
