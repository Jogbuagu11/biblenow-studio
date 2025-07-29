import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import Calendar from '../components/ui/Calendar';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import Textarea from '../components/ui/Textarea';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import ThumbnailUpload from '../components/ThumbnailUpload';
import { format } from 'date-fns';
import { useLivestreamStore } from '../stores';
import { useEffect } from 'react';
import { ThumbnailUploadResult } from '../services/thumbnailService';
import { useAuthStore } from '../stores/authStore';
import { databaseService } from '../services/databaseService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/AlertDialog';
import Separator from '../components/ui/Separator';

const Schedule: React.FC = () => {
  const { createScheduledStream, updateStream, isLoading, setError, clearError, scheduledStreams, fetchScheduledStreams } = useLivestreamStore();
  const { user } = useAuthStore();
  const [date, setDate] = useState<Date>();
  const [editingStreamId, setEditingStreamId] = useState<string | null>(null);
  const [streamingLimit, setStreamingLimit] = useState<{
    hasReachedLimit: boolean;
    currentMinutes: number;
    limitMinutes: number;
    remainingMinutes: number;
    usagePercentage: number;
  } | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
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
      setFormState((prev) => ({
        ...prev,
        thumbnailUrl: result.url,
      }));
    }
  };

  const handleThumbnailRemove = () => {
    setFormState((prev) => ({
      ...prev,
      thumbnailUrl: "",
    }));
  };

  // Fetch scheduled streams on component mount
  useEffect(() => {
    fetchScheduledStreams();
  }, [fetchScheduledStreams]);

  // Check streaming limits on component mount
  useEffect(() => {
    const checkStreamingLimits = async () => {
      if (!user?.uid) return;
      
      try {
        const limitData = await databaseService.checkWeeklyStreamingLimit(user.uid);
        setStreamingLimit(limitData);
      } catch (error) {
        console.error('Error checking streaming limits:', error);
      }
    };

    checkStreamingLimits();
  }, [user?.uid]);

  // Handle URL parameters for editing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editStreamId = urlParams.get('edit');
    
    if (editStreamId) {
      setEditingStreamId(editStreamId);
      // Find the stream to edit
      const streamToEdit = scheduledStreams.find(stream => stream.id === editStreamId);
      
      if (streamToEdit) {
        // Populate form with existing stream data
        const scheduledDate = streamToEdit.scheduled_at ? new Date(streamToEdit.scheduled_at) : null;
        setFormState({
          title: streamToEdit.title || "",
          description: streamToEdit.description || "",
          thumbnailUrl: streamToEdit.thumbnail_url || "",
          platform: streamToEdit.platform || "",
          streamType: streamToEdit.stream_type || "video",
          date: scheduledDate,
          time: scheduledDate ? format(scheduledDate, "HH:mm") : "",
          timeZone: "America/New_York",
          repeating: false,
          repeatFrequency: "weekly",
          repeatCount: "",
        });
        
        // Set the calendar date
        if (scheduledDate) {
          setDate(scheduledDate);
        }
      }
    }
  }, [scheduledStreams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formState);
    
    if (!formState.title.trim()) {
      alert("Please enter a stream title");
      return;
    }

    if (!formState.platform) {
      alert("Please select a platform");
      return;
    }

    if (!formState.date) {
      alert("Please select a date");
      return;
    }

    if (!formState.time) {
      alert("Please select a time");
      return;
    }

    // Check streaming limits before allowing scheduling
    if (streamingLimit?.hasReachedLimit) {
      setShowLimitDialog(true);
      return;
    }

    clearError();
    console.log('Starting to create stream...');
    
    try {
      // Combine date and time
      const dateTime = new Date(formState.date);
      const [hours, minutes] = formState.time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Create room name
      const jaasAppId = "vpaas-magic-cookie-ac668e9fea2743709f7c43628fe9d372";
      const cleanRoomName = formState.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'scheduled_stream';
      
      const streamData = {
        title: formState.title,
        description: formState.description,
        room_name: `${jaasAppId}/${cleanRoomName}`,
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
        // Create multiple recurring streams
        const episodes = parseInt(formState.repeatCount) || 12; // Default to 12 episodes if not specified
        const streams = [];
        
        for (let i = 0; i < episodes; i++) {
          const episodeDateTime = new Date(dateTime);
          
          // Calculate the date for this episode based on frequency
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
          
          const episodeStreamData = {
            ...streamData,
            title: `${formState.title} - Episode ${i + 1}`,
            scheduled_at: episodeDateTime.toISOString(),
            room_name: `${jaasAppId}/${cleanRoomName}_ep${i + 1}`,
          };
          
          streams.push(episodeStreamData);
        }
        
        // Create all streams
        for (const episodeStream of streams) {
          await createScheduledStream(episodeStream);
        }
        
        alert(`Recurring Stream Series Created: ${episodes} episodes of "${formState.title}" have been scheduled!`);
      } else {
        // Create single stream or update existing stream
        if (editingStreamId) {
          // Update existing stream
          await updateStream(editingStreamId, streamData);
          alert(`Stream Updated: ${formState.title} has been updated for ${format(dateTime, "PPP 'at' p")}`);
          
          // Clear editing mode
          setEditingStreamId(null);
          // Remove edit parameter from URL
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          // Create new stream
          await createScheduledStream(streamData);
          alert(`Stream Scheduled: ${formState.title} has been scheduled for ${format(dateTime, "PPP 'at' p")}`);
        }
      }
      
      // Refresh scheduled streams
      await fetchScheduledStreams();
      
      // Reset form
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
      
    } catch (error) {
      console.error('Error scheduling stream:', error);
      console.error('Error details:', error);
      setError('Failed to schedule stream. Please try again.');
      alert('Error scheduling stream. Check console for details.');
    }
  };

  const availablePlatforms = ["YouTube", "Zoom", "Facebook", "Instagram", "TikTok", "Custom"];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">Schedule</h1>
          <p className="text-gray-700 dark:text-chocolate-200 text-lg">
            Plan your upcoming streams and manage recurring broadcasts
          </p>
          
          {/* Streaming Limit Warning - Only show at 75% or 100% usage */}
          {streamingLimit && (streamingLimit.usagePercentage >= 75 || streamingLimit.hasReachedLimit) && (
            <div className={`mt-4 p-4 rounded-lg border ${
              streamingLimit.hasReachedLimit 
                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
                : streamingLimit.usagePercentage >= 75 
                ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            }`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {streamingLimit.hasReachedLimit ? (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : streamingLimit.usagePercentage >= 75 ? (
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    streamingLimit.hasReachedLimit 
                      ? 'text-red-800 dark:text-red-200' 
                      : streamingLimit.usagePercentage >= 75 
                      ? 'text-yellow-800 dark:text-yellow-200'
                      : 'text-blue-800 dark:text-blue-200'
                  }`}>
                    {streamingLimit.hasReachedLimit 
                      ? 'Weekly Streaming Limit Reached' 
                      : streamingLimit.usagePercentage >= 75 
                      ? 'Weekly Streaming Limit Warning'
                      : 'Weekly Streaming Usage'
                    }
                  </h3>
                  <div className={`mt-2 text-sm ${
                    streamingLimit.hasReachedLimit 
                      ? 'text-red-700 dark:text-red-300' 
                      : streamingLimit.usagePercentage >= 75 
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {streamingLimit.hasReachedLimit ? (
                      <p>You have reached your weekly streaming limit. You cannot schedule new streams until next week.</p>
                    ) : (
                      <p>
                        You have used {streamingLimit.currentMinutes} of {streamingLimit.limitMinutes} minutes 
                        ({streamingLimit.usagePercentage.toFixed(1)}% of your weekly limit).
                        {streamingLimit.remainingMinutes > 0 && ` ${streamingLimit.remainingMinutes} minutes remaining.`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <Separator className="my-6" />
        
        <Tabs defaultValue="calendar" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="create">Create Stream</TabsTrigger>
            </TabsList>
            <Button 
              variant="default" 
              className="bg-chocolate-600 text-white hover:bg-chocolate-700"
              disabled={streamingLimit?.hasReachedLimit}
            >
              Go Live Now
            </Button>
          </div>
          
          <TabsContent value="calendar" className="mt-4">
            <div className="bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg shadow-lg border border-gray-200 dark:border-darkBrown-400 p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Upcoming Streams</h2>
                  <p className="text-gray-700 dark:text-darkBrown-200 text-sm">View and manage your scheduled broadcasts</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-lg border border-gray-300 dark:border-yellow-500 shadow-sm"
                  />
                </div>
                <div className="md:w-1/2">
                  {date ? (
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">
                        Events for {format(date, "MMMM d, yyyy")}
                      </h3>
                      <div className="space-y-2">
                        {scheduledStreams
                          .filter(stream => {
                            // For display, use scheduled_at for future streams
                            const streamDate = new Date(stream.scheduled_at || 0);
                            return streamDate.toDateString() === date.toDateString();
                          })
                          .map(stream => (
                            <div key={stream.id} className="rounded-lg border border-gray-200 dark:border-yellow-500 p-2 bg-offWhite-25 dark:bg-darkBrown-700 shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{stream.title}</p>
                                  <p className="text-gray-700 dark:text-darkBrown-200 text-xs">
                                    {format(new Date(stream.scheduled_at || 0), "h:mm a")} - {stream.platform}
                                  </p>
                                  {stream.description && (
                                    <p className="text-gray-600 dark:text-darkBrown-200 mt-1 text-xs line-clamp-2">{stream.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        {scheduledStreams.filter(stream => {
                          // For display, use scheduled_at for future streams
                          const streamDate = new Date(stream.scheduled_at || 0);
                          return streamDate.toDateString() === date.toDateString();
                        }).length === 0 && (
                          <div className="text-center py-3">
                            <p className="text-gray-500 dark:text-darkBrown-200 text-sm">No scheduled streams for this date</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) :
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-darkBrown-200">Select a date to view scheduled streams</p>
                  </div>
                  }
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="create" className="mt-4">
            <div className="bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg shadow-md p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingStreamId ? 'Edit Stream' : 'Schedule a New Stream'}
                </h2>
                <p className="text-gray-600 dark:text-darkBrown-200">
                  {editingStreamId ? 'Update your scheduled livestream event' : 'Create a new livestream event'}
                </p>
              </div>
              
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
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-offWhite-25 dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-offWhite-25 dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          setFormState((prev) => ({ ...prev, date: date || null }))
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
                          className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-offWhite-25 dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-offWhite-25 dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-offWhite-25 dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-offWhite-25 dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        setEditingStreamId(null);
                        window.history.replaceState({}, '', window.location.pathname);
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
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
            </div>
          </TabsContent>
        </Tabs>

        {/* Streaming Limit Dialog */}
        <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Weekly Streaming Limit Reached</AlertDialogTitle>
              <AlertDialogDescription>
                You have reached your weekly streaming limit. You cannot schedule new streams until your limit resets next week. 
                Consider upgrading your subscription plan for unlimited streaming access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => window.location.href = '/payments'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Upgrade Plan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Schedule; 