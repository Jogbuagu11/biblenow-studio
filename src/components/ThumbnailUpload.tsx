import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import Button from './ui/Button';
import Label from './ui/Label';
import { thumbnailService, ThumbnailUploadResult } from '../services/thumbnailService';

interface ThumbnailUploadProps {
  onUploadComplete: (result: ThumbnailUploadResult) => void;
  onRemove: () => void;
  currentUrl?: string;
  disabled?: boolean;
}

const ThumbnailUpload: React.FC<ThumbnailUploadProps> = ({
  onUploadComplete,
  onRemove,
  currentUrl,
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const result = await thumbnailService.uploadThumbnail(file);
      
      if (result.error) {
        setUploadError(result.error);
        return;
      }

      setPreviewUrl(result.url);
      onUploadComplete(result);
    } catch (error) {
      setUploadError('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    setUploadError('');
    onRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const input = fileInputRef.current;
      if (input) {
        input.files = files;
        await handleFileSelect({ target: { files } } as any);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-3">
      <Label>Thumbnail Image</Label>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          disabled 
            ? 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800' 
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Thumbnail preview"
              className="w-full h-32 object-cover rounded-md"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="mb-2"
              >
                {isUploading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload Image</span>
                  </div>
                )}
              </Button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                or drag and drop
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                PNG, JPG, GIF up to 5MB
              </p>
            </div>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>

      {uploadError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Recommended dimensions: 1280x720 pixels (16:9 aspect ratio). 
        Maximum file size: 5MB. Supported formats: JPG, PNG, GIF.
      </p>
    </div>
  );
};

export default ThumbnailUpload; 