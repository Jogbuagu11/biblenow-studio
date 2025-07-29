export interface ThumbnailUploadResult {
  url: string;
  error?: string;
}

class ThumbnailService {
  // For now, we'll use a simple approach with data URLs
  // In production, you might want to use a service like Cloudinary, Imgur, or similar
  async uploadThumbnail(file: File): Promise<ThumbnailUploadResult> {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPG, PNG, and GIF are allowed');
      }

      // For now, convert to data URL
      // In production, you would upload to an external service here
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            url: reader.result as string
          });
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
      });

    } catch (error) {
      console.error('Thumbnail upload error:', error);
      return {
        url: '',
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Method to upload to external service (placeholder for future implementation)
  async uploadToExternalService(file: File): Promise<ThumbnailUploadResult> {
    // This is where you would implement upload to services like:
    // - Cloudinary
    // - Imgur
    // - AWS S3
    // - Google Cloud Storage
    // - etc.
    
    // For now, return the data URL approach
    return this.uploadThumbnail(file);
  }

  // Method to validate thumbnail URL
  isValidThumbnailUrl(url: string): boolean {
    if (!url) return false;
    
    // Check if it's a data URL
    if (url.startsWith('data:image/')) {
      return true;
    }
    
    // Check if it's a valid HTTP/HTTPS URL
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Method to get a default thumbnail URL
  getDefaultThumbnailUrl(): string {
    return "https://jhlawjmyorpmafokxtuh.supabase.co/storage/v1/object/sign/attachments/defaultstream.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82OWRmNmQwOC1iYTlmLTQ2NDItYmQ4MS05ZDIzNGNmYTI1M2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhdHRhY2htZW50cy9kZWZhdWx0c3RyZWFtLnBuZyIsImlhdCI6MTc1MzY0ODA0OSwiZXhwIjoyMDY5MDA4MDQ5fQ.cMcADdSsi7Scklnf0qU_D0yeQnOjn-_wY-bMvFDRnos";
  }
}

export const thumbnailService = new ThumbnailService();
export default thumbnailService; 