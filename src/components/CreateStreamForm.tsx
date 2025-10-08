import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addWeeks, isBefore } from 'date-fns';
import { useToast } from "../hooks/use-toast";
import { useLivestreamStore } from '../stores';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import Button from './ui/Button';
import Input from './ui/Input';
import Label from './ui/Label';
import Textarea from './ui/Textarea';
import Checkbox from './ui/Checkbox';
import Calendar from './ui/Calendar';
import ThumbnailUpload from './ThumbnailUpload';
import type { ThumbnailUploadResult } from '../services/thumbnailService';

interface CreateStreamFormProps {
  onSuccess?: () => void;
  editingStreamId?: string | null;
  streamingLimit?: {
    hasReachedLimit: boolean;
    currentMinutes: number;
    limitMinutes: number;
    remainingMinutes: number;
    usagePercentage: number;
  } | null;
  onShowLimitDialog?: () => void;
}

const CreateStreamForm: React.FC<CreateStreamFormProps> = ({
  onSuccess,
  editingStreamId,
  streamingLimit,
  onShowLimitDialog
}) => {
  const { createScheduledStream, updateStream, isLoading, setError, clearError } = useLivestreamStore();

  const [formState, setFormState] = useState({
    title: "",
    description: "",
    thumbnailUrl: "",
    platform: "",
    streamType: "video",
    date: null as Date | null,
    time: "",
    timeZone: "America/New_York",
    repeating: false,
    repeatFrequency: "weekly",
    repeatCount: "",
  });

  const handleThumbnailUpload = (result: ThumbnailUploadResult) => {
    if (result.url) {
      setFormState(prev => ({ ...prev, thumbnailUrl: result.url }));
    }
  };

  const handleThumbnailRemove = () => {
    setFormState(prev => ({ ...prev, thumbnailUrl: "" }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  };

  const resetForm = () => {
    setFormState({
      title: "",
      description: "",
      thumbnailUrl: "",
      platform: "",
      streamType: "video",
      date: null,
      time: "",
      timeZone: "America/New_York",
      repeating: false,
      repeatFrequency: "weekly",
      repeatCount: "",
    });
  };

  const { toast } = useToast();

  // Get next week's start date (when limits reset)
  const nextWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);

  // Check if selected date is within current limit period
  const isWithinLimitPeriod = (date: Date) => {
    return isBefore(date, nextWeekStart);
  };

  // Show warning for scheduled streams during limit period
  useEffect(() => {
    if (streamingLimit?.hasReachedLimit && formState.date && isWithinLimitPeriod(formState.date)) {
      toast({
        title: "Warning: Stream Scheduled During Limit Period",
        description: "This stream is scheduled before your streaming limit resets. You may need to reschedule or upgrade your plan.",
        variant: "destructive"
      });
    }
  }, [formState.date, streamingLimit?.hasReachedLimit]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Validate form fields
    if (!formState.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a stream title",
        variant: "destructive"
      });
      return;
    }

    if (!formState.platform) {
      toast({
        title: "Missing Platform",
        description: "Please select a platform",
        variant: "destructive"
      });
      return;
    }

    if (!formState.date) {
      toast({
        title: "Missing Date",
        description: "Please select a date",
        variant: "destructive"
      });
      return;
    }

    if (!formState.time) {
      toast({
        title: "Missing Time",
        description: "Please select a time",
        variant: "destructive"
      });
      return;
    }

    // Check if stream is scheduled during limit period
    const streamDateTime = new Date(formState.date);
    const [hours, minutes] = formState.time.split(':');
    streamDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (streamingLimit?.hasReachedLimit && isWithinLimitPeriod(streamDateTime)) {
      toast({
        title: "Cannot Schedule Stream",
        description: "You have reached your weekly streaming limit. You can only schedule streams after " + 
                    format(nextWeekStart, "MMMM d, yyyy") + " when your limit resets.",
        variant: "destructive"
      });
      return;
    }

    try {
      clearError();
      
      // Combine date and time
      const dateTime = new Date(formState.date);
      const [hours, minutes] = formState.time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Create room name
      const cleanRoomName = formState.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'scheduled_stream';
      
      const platformPrefix = (formState.platform || 'livestream').toLowerCase();
      const baseRoomName = `${platformPrefix}-${cleanRoomName}`;
      
      const streamData = {
        title: formState.title,
        description: formState.description,
        room_name: baseRoomName,
        platform: formState.platform,
        stream_type: formState.streamType,
        scheduled_at: dateTime.toISOString(),
        embed_url: '',
        stream_key: '',
        thumbnail_url: formState.thumbnailUrl || undefined,
        stream_mode: 'solo',
        tags: [],
        flag_count: 0,
        is_hidden: false,
        max_viewers: 0,
        jitsi_room_config: {},
      };

      if (formState.repeating) {
        // Create recurring streams
        const episodes = parseInt(formState.repeatCount) || 12;
        const streams = [];
        let warningShown = false;
        
        for (let i = 0; i < episodes; i++) {
          const episodeDateTime = new Date(dateTime);
          
          switch (formState.repeatFrequency) {
            case 'daily':
              episodeDateTime.setDate(episodeDateTime.getDate() + i);
              break;
            case 'weekly':
              episodeDateTime.setDate(episodeDateTime.getDate() + (i * 7));
              break;
            case 'biweekly':
              episodeDateTime.setDate(episodeDateTime.getDate() + (i * 14));
              break;
            case 'monthly':
              episodeDateTime.setMonth(episodeDateTime.getMonth() + i);
              break;
          }

          // Skip episodes during limit period if limit is reached
          if (streamingLimit?.hasReachedLimit && isWithinLimitPeriod(episodeDateTime)) {
            if (!warningShown) {
              toast({
                title: "Some Episodes Skipped",
                description: `Episodes before ${format(nextWeekStart, "MMMM d, yyyy")} will be skipped due to streaming limit.`,
                variant: "default"
              });
              warningShown = true;
            }
            continue;
          }
          
          streams.push({
            ...streamData,
            title: `${formState.title} - Episode ${i + 1}`,
            scheduled_at: episodeDateTime.toISOString(),
            room_name: `${baseRoomName}-ep${i + 1}`,
          });
        }
        
        if (streams.length === 0) {
          toast({
            title: "Cannot Schedule Streams",
            description: "All episodes fall within the current limit period. Please choose a later start date.",
            variant: "destructive"
          });
          return;
        }
        
        // Create all valid streams
        for (const episodeStream of streams) {
          await createScheduledStream(episodeStream);
        }
        
        toast({
          title: "Recurring Streams Created",
          description: `${streams.length} episodes of "${formState.title}" have been scheduled!`,
          variant: "default"
        });
      } else {
        if (editingStreamId) {
          await updateStream(editingStreamId, streamData);
          alert(`Stream Updated: ${formState.title} has been updated for ${format(dateTime, "PPP 'at' p")}`);
        } else {
          await createScheduledStream(streamData);
          alert(`Stream Scheduled: ${formState.title} has been scheduled for ${format(dateTime, "PPP 'at' p")}`);
        }
      }
      
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error('Error scheduling stream:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to schedule stream. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Stream Title</Label>
          <Input 
            id="title" 
            name="title"
            placeholder="Enter your stream title"
            value={formState.title}
            onChange={handleInputChange}
            required 
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description"
            name="description"
            placeholder="Describe what your stream will be about"
            value={formState.description}
            onChange={handleInputChange}
            rows={3}
          />
        </div>
        
        <ThumbnailUpload
          onUploadComplete={handleThumbnailUpload}
          onRemove={handleThumbnailRemove}
          currentUrl={formState.thumbnailUrl}
          disabled={isLoading}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="platform">Platform</Label>
            <select
              id="platform"
              value={formState.platform}
              onChange={(e) => handleSelectChange("platform", e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-white dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            >
              <option value="">Select platform</option>
              <option value="prayer">BibleNOW Prayer</option>
              <option value="qna">BibleNOW Q&A</option>
              <option value="lecture">BibleNOW Lecture</option>
              <option value="study">BibleNOW Study</option>
              <option value="reading">BibleNOW Reading</option>
              <option value="worship">BibleNOW Worship</option>
              <option value="livestream">BibleNOW Livestream</option>
              <option value="external">External Platform</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="streamType">Stream Type</Label>
            <select
              id="streamType"
              value={formState.streamType}
              onChange={(e) => handleSelectChange("streamType", e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-white dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            >
              <option value="">Select type</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="call">Call-Based</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Date</Label>
            <Calendar
              mode="single"
              selected={formState.date || undefined}
              onSelect={(date) => 
                setFormState(prev => ({ ...prev, date: date || null }))
              }
              className="rounded-md border"
            />
          </div>
          
          <div>
            <Label htmlFor="time">Time</Label>
            <div className="relative">
              <Input
                id="time"
                name="time"
                type="time"
                value={formState.time}
                onChange={handleInputChange}
                required
                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-white dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="timeZone">Time Zone</Label>
          <select
            id="timeZone"
            value={formState.timeZone}
            onChange={(e) => handleSelectChange("timeZone", e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-white dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Central European (CET)</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="repeating" 
            checked={formState.repeating}
            onCheckedChange={(checked) => 
              handleCheckboxChange("repeating", checked)
            }
          />
          <Label htmlFor="repeating" className="cursor-pointer">
            Recurring stream
          </Label>
        </div>
        
        {formState.repeating && (
          <div className="space-y-4 p-4 bg-blue-50 dark:bg-chocolate-700 rounded-lg border border-blue-200 dark:border-chocolate-500">
            <div>
              <Label htmlFor="repeatFrequency">Repeat Frequency</Label>
              <select
                id="repeatFrequency"
                value={formState.repeatFrequency}
                onChange={(e) => handleSelectChange("repeatFrequency", e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-white dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="repeatCount">Number of Episodes</Label>
              <Input
                id="repeatCount"
                name="repeatCount"
                type="number"
                min="1"
                max="52"
                placeholder="e.g., 12 for 3 months of weekly streams"
                value={formState.repeatCount}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-white dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <p className="text-xs text-gray-500 dark:text-chocolate-200 mt-1">
                Leave empty for ongoing (no end date)
              </p>
            </div>
            
            <div className="bg-blue-100 dark:bg-chocolate-600 p-3 rounded-md">
              <p className="text-sm text-blue-800 dark:text-chocolate-200">
                <strong>Preview:</strong> {formState.repeatFrequency === 'weekly' && formState.date && formState.time ? 
                  `Every ${format(formState.date, 'EEEE')} at ${formState.time}` :
                  `Recurring ${formState.repeatFrequency} streams`
                }
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        {editingStreamId && (
          <Button 
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onSuccess?.();
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          className="bg-yellow-600 hover:bg-yellow-700 text-white"
          disabled={isLoading || streamingLimit?.hasReachedLimit}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{editingStreamId ? 'Updating...' : 'Scheduling...'}</span>
            </div>
          ) : (
            editingStreamId ? 'Update Stream' : 'Schedule Stream'
          )}
        </Button>
      </div>
    </form>
  );
};

export default CreateStreamForm;
