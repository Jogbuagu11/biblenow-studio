import { supabase } from '../config/supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

class FileUploadService {
  private bucketName = 'thumbnails';
  private fallbackBucketName = 'attachments';

  async uploadThumbnail(file: File): Promise<UploadResult> {
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

      // Generate unique filename with better naming
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${timestamp}_${randomId}.${fileExtension}`;

      console.log('Uploading thumbnail to bucket:', this.bucketName);
      console.log('File name:', fileName);
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);

      // Try to upload to thumbnails bucket first
      let { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      // If thumbnails bucket doesn't exist, fall back to attachments bucket
      if (error && (error.message.includes('bucket') || error.message.includes('not found'))) {
        console.log('Thumbnails bucket not found, falling back to attachments bucket');
        const fallbackResult = await supabase.storage
          .from(this.fallbackBucketName)
          .upload(`thumbnails/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        data = fallbackResult.data;
        error = fallbackResult.error;
        
        if (!error) {
          // Get public URL from fallback bucket
          const { data: urlData } = supabase.storage
            .from(this.fallbackBucketName)
            .getPublicUrl(`thumbnails/${fileName}`);

          console.log('Upload successful to fallback bucket, URL:', urlData.publicUrl);

          return {
            url: urlData.publicUrl,
            path: `thumbnails/${fileName}`
          };
        }
      }

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log('Upload successful, data:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      console.log('Public URL:', urlData.publicUrl);

      return {
        url: urlData.publicUrl,
        path: fileName
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        url: '',
        path: '',
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async deleteThumbnail(path: string): Promise<boolean> {
    try {
      console.log('Deleting thumbnail from bucket:', this.bucketName);
      console.log('File path:', path);
      
      let { error } = await supabase.storage
        .from(this.bucketName)
        .remove([path]);

      // If thumbnails bucket doesn't exist, try attachments bucket
      if (error && (error.message.includes('bucket') || error.message.includes('not found'))) {
        console.log('Thumbnails bucket not found, trying attachments bucket');
        const fallbackResult = await supabase.storage
          .from(this.fallbackBucketName)
          .remove([path]);
        
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      console.log('Delete successful');
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }
}

export const fileUploadService = new FileUploadService();
export default fileUploadService; 