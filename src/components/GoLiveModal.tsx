import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import { RadioGroup, RadioGroupItem } from './ui/RadioGroup';
import { useLivestreamStore } from '../stores';



interface GoLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const streamPlatforms = [
  { value: 'prayer', label: 'BibleNOW Prayer', description: 'Interactive prayer sessions', icon: '❤️' },
  { value: 'qna', label: 'BibleNOW Q&A', description: 'Question and answer sessions', icon: '💬' },
  { value: 'lecture', label: 'BibleNOW Lecture', description: 'Educational content and teaching', icon: '📚' },
  { value: 'study', label: 'BibleNOW Study', description: 'Bible study and discussion', icon: '📖' },
  { value: 'reading', label: 'BibleNOW Reading', description: 'Scripture reading and commentary', icon: '🎤' },
  { value: 'worship', label: 'BibleNOW Worship', description: 'Worship and praise sessions', icon: '🎵' },
  { value: 'livestream', label: 'BibleNOW Livestream', description: 'General livestream content', icon: '📺' },
  { value: 'external', label: 'External Platform', description: 'YouTube, Twitch, etc.', icon: '🔗' },
];

const GoLiveModal: React.FC<GoLiveModalProps> = ({ open, onOpenChange }) => {
  const { createStream, isLoading, setError, clearError } = useLivestreamStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    platform: '',
    stream_type: 'video' as 'video' | 'audio' | 'call-based',
    embed_url: '',
    stream_key: '',
    scheduled_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    stream_mode: 'solo' as 'solo' | 'interactive',
    is_scheduled: false,
    redirect_url: 'https://stream.biblenow.io/endstream',
  });

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const defaultThumbnailUrl = "https://jhlawjmyorpmafokxtuh.supabase.co/storage/v1/object/sign/attachments/defaultstream.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82OWRmNmQwOC1iYTlmLTQ2NDItYmQ4MS05ZDIzNGNmYTI1M2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhdHRhY2htZW50cy9kZWZhdWx0c3RyZWFtLnBuZyIsImlhdCI6MTc1MzY0ODA0OSwiZXhwIjoyMDY5MDA4MDQ5fQ.cMcADdSsi7Scklnf0qU_D0yeQnOjn-_wY-bMvFDRnos";

  // Determine platform types
  const isExternalPlatform = formData.platform === 'external';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'platform') {
      let streamType = formData.stream_type;
      let embedUrl = formData.embed_url;
      let streamKey = formData.stream_key;
      
      // Handle platform selection
      if (value !== 'external') {
        streamType = 'video';
        embedUrl = '';
        streamKey = '';
      } else if (value === 'external') {
        streamType = 'video';
      }
      
      setFormData((prev) => ({ 
        ...prev, 
        platform: value, 
        stream_type: streamType,
        embed_url: embedUrl,
        stream_key: streamKey,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if file is JPG or PNG
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert("Please upload a JPG or PNG image");
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      

    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      alert("Please enter a stream title");
      return false;
    }

    if (!formData.platform) {
      alert("Please select a streaming platform");
      return false;
    }

    if (!formData.scheduled_at) {
      alert("Please set a start time for your stream");
      return false;
    }

    // Validate external platform requirements
    if (isExternalPlatform && !formData.embed_url.trim()) {
      alert("Please enter an embed URL for external platforms");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    clearError();
    
    try {
      // Create stream using Zustand store
      // JAAS Room Name Rules: Must start with full App ID followed by room name
      const jaasAppId = "vpaas-magic-cookie-ac668e9fea2743709f7c43628fe9d372";
      const cleanRoomName = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'bible_study';
      
      const streamData = {
        title: formData.title,
        description: formData.description,
        room_name: `${jaasAppId}/${cleanRoomName}`,
        platform: formData.platform,
        stream_type: formData.stream_type,
        scheduled_at: formData.scheduled_at,
        started_at: formData.scheduled_at, // For immediate streams, scheduled = started
        embed_url: formData.embed_url,
        stream_key: formData.stream_key,
        thumbnail_url: thumbnailPreview || defaultThumbnailUrl,
        stream_mode: formData.stream_mode,
        tags: [],
        flag_count: 0,
        is_hidden: false,
        max_viewers: 0,
        jitsi_room_config: {},
        redirect_url: formData.redirect_url || undefined,
      };

      const newStream = await createStream(streamData);
      
      // Close the modal and navigate to the stream URL
      onOpenChange(false);
      
      // Navigate to the stream URL
      const streamUrl = `/live-stream?room=${encodeURIComponent(newStream.room_name || '')}&title=${encodeURIComponent(newStream.title)}&platform=${encodeURIComponent(newStream.platform || '')}`;
      window.location.href = streamUrl;
      
    } catch (error) {
      console.error('Error creating stream:', error);
      setError('Failed to create stream. Please try again.');
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-darkBrown-900 rounded-xl shadow-2xl border-2 border-yellow-500 dark:border-yellow-400">
          <DialogHeader className="pb-6 border-b border-gray-100 dark:border-darkBrown-700 bg-gradient-to-r from-darkBrown-50 to-offWhite-25 dark:from-darkBrown-800 dark:to-darkBrown-900 rounded-t-xl">
            <div className="flex justify-between items-start">
              <div>
                <div className="mb-2">
                  <DialogTitle className="text-4xl font-bold text-gray-900 dark:text-yellow-100">Go Live</DialogTitle>
                </div>
                <DialogDescription className="text-gray-600 dark:text-yellow-200">
                  Set up your livestream details. Required fields are marked with an asterisk (*).
                </DialogDescription>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-yellow-300 dark:hover:text-yellow-100 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-darkBrown-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-8 py-6 bg-gradient-to-b from-white to-offWhite-25 dark:from-darkBrown-900 dark:to-darkBrown-800">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-yellow-100 mb-3">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              name="title"
              type="text"
              placeholder="Enter your stream title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="h-12 text-lg border border-gray-300 dark:border-darkBrown-600 focus:border-yellow-500 focus:ring-yellow-500 dark:bg-darkBrown-800 dark:text-yellow-300 dark:placeholder:text-white/70"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-900 dark:text-yellow-100 mb-3">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe what your stream will be about"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="border border-gray-300 dark:border-darkBrown-600 focus:border-yellow-500 focus:ring-yellow-500 resize-none dark:bg-darkBrown-800 dark:text-yellow-300 dark:placeholder:text-white/70"
            />
          </div>

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-yellow-100 mb-3">
              Platform <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {streamPlatforms.map((platform) => (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => handleSelectChange('platform', platform.value)}
                  className={`p-4 border rounded-lg text-left transition-all duration-200 ${
                    formData.platform === platform.value
                                    ? 'border-yellow-500 bg-yellow-50 dark:bg-darkBrown-700 dark:border-yellow-400 shadow-md'
              : 'border-gray-300 dark:border-darkBrown-600 hover:border-yellow-300 hover:bg-yellow-25 dark:hover:bg-darkBrown-700 dark:bg-darkBrown-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-yellow-100">{platform.label}</div>
                      <div className="text-xs text-gray-500 dark:text-yellow-200 mt-1">{platform.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label htmlFor="scheduled_at" className="block text-sm font-semibold text-gray-900 dark:text-yellow-100 mb-3">
              Start Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                id="scheduled_at"
                name="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={handleInputChange}
                required
                className="h-12 border border-gray-300 dark:border-darkBrown-600 focus:border-yellow-500 focus:ring-yellow-500 dark:bg-darkBrown-800 dark:text-yellow-300 dark:placeholder-white"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Stream Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-yellow-100 mb-3">
              Stream Type <span className="text-red-500">*</span>
            </label>
            <RadioGroup
              value={formData.stream_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, stream_type: value as 'video' | 'audio' | 'call-based' }))}
              className="grid grid-cols-3 gap-4"
            >
              <RadioGroupItem value="video" className="p-4 border border-gray-300 dark:border-darkBrown-600 hover:border-yellow-300 dark:bg-darkBrown-800">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium dark:text-yellow-100">Video Stream</span>
                </div>
              </RadioGroupItem>
              <RadioGroupItem value="audio" className="p-4 border border-gray-300 dark:border-darkBrown-600 hover:border-yellow-300 dark:bg-darkBrown-800">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="font-medium dark:text-yellow-100">Audio Only</span>
                </div>
              </RadioGroupItem>
              <RadioGroupItem value="call-based" className="p-4 border border-gray-300 dark:border-darkBrown-600 hover:border-yellow-300 dark:bg-darkBrown-800">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-medium dark:text-yellow-100">Call-Based</span>
                </div>
              </RadioGroupItem>
            </RadioGroup>
          </div>

          {/* External Platform Fields */}
          {isExternalPlatform && (
            <div className="space-y-4 p-4 bg-offWhite-25 dark:bg-darkBrown-700 rounded-lg border border-gray-200 dark:border-darkBrown-600">
                              <h3 className="font-semibold text-gray-900 dark:text-yellow-100">External Platform Settings</h3>
              <div>
                                  <label htmlFor="embed_url" className="block text-sm font-medium text-gray-700 dark:text-yellow-200 mb-2">
                  Embed URL <span className="text-red-500">*</span>
                </label>
                <Input
                  id="embed_url"
                  name="embed_url"
                  type="url"
                  placeholder="https://www.youtube.com/embed/..."
                  value={formData.embed_url}
                  onChange={handleInputChange}
                  required
                  className="border border-gray-300 dark:border-darkBrown-600 focus:border-yellow-500 focus:ring-yellow-500 dark:bg-darkBrown-800 dark:text-yellow-300 dark:placeholder-white"
                />
              </div>
              <div>
                <label htmlFor="stream_key" className="block text-sm font-medium text-gray-700 dark:text-yellow-200 mb-2">
                  Stream Key
                </label>
                <Input
                  id="stream_key"
                  name="stream_key"
                  type="text"
                  placeholder="Enter your stream key"
                  value={formData.stream_key}
                  onChange={handleInputChange}
                  className="border border-gray-300 dark:border-darkBrown-600 focus:border-yellow-500 focus:ring-yellow-500 dark:bg-darkBrown-800 dark:text-yellow-300 dark:placeholder-white"
                />
              </div>
            </div>
          )}

          {/* Thumbnail */}
          <div>
            <label htmlFor="thumbnail" className="block text-sm font-semibold text-gray-900 dark:text-yellow-100 mb-3">
              Thumbnail (JPG/PNG, 1280x720 max)
            </label>
            <div className="flex gap-6">
              <div className="flex-1">
                <div className="border-2 border-dashed border-gray-300 dark:border-darkBrown-600 rounded-lg p-6 text-center hover:border-yellow-400 dark:hover:border-yellow-300 transition-colors dark:bg-darkBrown-800">
                  <input
                    id="thumbnail"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="thumbnail" className="cursor-pointer">
                    <svg className="w-8 h-8 text-gray-400 dark:text-yellow-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="text-sm text-gray-600 dark:text-yellow-200">
                      <span className="font-medium text-yellow-600 hover:text-yellow-500 dark:text-yellow-400 dark:hover:text-yellow-300">Click to upload</span> or drag and drop
                    </div>
                    <p className="text-xs text-gray-500 dark:text-yellow-300 mt-2">Recommended: 1280x720 pixels (16:9 ratio)</p>
                    <p className="text-xs text-gray-500 dark:text-yellow-300">A default thumbnail will be used if none is uploaded</p>
                  </label>
                </div>
              </div>
              <div className="w-48 h-32 bg-gray-100 dark:bg-darkBrown-800 rounded-lg border-2 border-gray-200 dark:border-darkBrown-600 flex items-center justify-center overflow-hidden">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                ) : (
                  <img 
                    src={defaultThumbnailUrl} 
                    alt="Default thumbnail preview" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-gray-100 dark:border-darkBrown-700 bg-gradient-to-r from-white to-offWhite-25 dark:from-darkBrown-900 dark:to-darkBrown-800 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="px-6 py-3 border-gray-300 dark:border-darkBrown-600 text-gray-700 dark:text-yellow-200 hover:bg-gray-50 dark:hover:bg-darkBrown-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white px-8 py-3 font-semibold shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Start Stream'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GoLiveModal; 