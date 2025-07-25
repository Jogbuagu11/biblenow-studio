import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import Calendar from '../components/ui/Calendar';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import Textarea from '../components/ui/Textarea';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import { format } from 'date-fns';
import { useLivestreamStore } from '../stores';
import { useEffect } from 'react';

const Schedule: React.FC = () => {
  const { createScheduledStream, isLoading, setError, clearError, scheduledStreams, fetchScheduledStreams } = useLivestreamStore();
  const [date, setDate] = useState<Date>();
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    platform: "",
    streamType: "video",
    date: null as Date | null,
    time: "",
    timeZone: "America/New_York",
    repeating: false,
    repeatFrequency: "weekly",
    repeatCount: "",
  });

  // Fetch scheduled streams on component mount
  useEffect(() => {
    fetchScheduledStreams();
  }, [fetchScheduledStreams]);

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

    clearError();
    console.log('Starting to create stream...');
    
    try {
      // Combine date and time
      const dateTime = new Date(formState.date);
      const [hours, minutes] = formState.time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Convert to ISO string for the database
      const startTime = dateTime.toISOString();
      
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
        start_time: startTime,
        embed_url: '',
        stream_key: '',
        thumbnail_url: undefined,
        type: formState.streamType,
        stream_mode: 'solo',
        livestream_type: 'public',
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
            start_time: episodeDateTime.toISOString(),
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
        // Create single stream
        await createScheduledStream(streamData);
        alert(`Stream Scheduled: ${formState.title} has been scheduled for ${format(dateTime, "PPP 'at' p")}`);
      }
      
      // Refresh scheduled streams
      await fetchScheduledStreams();
      
      // Reset form
      setFormState({
        title: "",
        description: "",
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">Schedule</h1>
          <p className="text-gray-700 dark:text-chocolate-200 text-lg">
            Plan your upcoming streams and manage recurring broadcasts
          </p>
        </div>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="create">Create Stream</TabsTrigger>
          </TabsList>
          
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
                            const streamDate = new Date(stream.start_time);
                            return streamDate.toDateString() === date.toDateString();
                          })
                          .map(stream => (
                            <div key={stream.id} className="rounded-lg border border-gray-200 dark:border-yellow-500 p-2 bg-offWhite-25 dark:bg-darkBrown-700 shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{stream.title}</p>
                                  <p className="text-gray-700 dark:text-darkBrown-200 text-xs">
                                    {format(new Date(stream.start_time), "h:mm a")} - {stream.platform}
                                  </p>
                                  {stream.description && (
                                    <p className="text-gray-600 dark:text-darkBrown-200 mt-1 text-xs line-clamp-2">{stream.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        {scheduledStreams.filter(stream => {
                          const streamDate = new Date(stream.start_time);
                          return streamDate.toDateString() === date.toDateString();
                        }).length === 0 && (
                          <div className="text-center py-3">
                            <p className="text-gray-500 dark:text-darkBrown-200 text-sm">No scheduled streams for this date</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500 dark:text-darkBrown-200 text-sm">Select a date to view scheduled streams</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="create" className="mt-4">
            <div className="bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg shadow-md p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Schedule a New Stream</h2>
                <p className="text-gray-600 dark:text-darkBrown-200">Create a new livestream event</p>
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
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Scheduling...</span>
                      </div>
                    ) : (
                      'Schedule Stream'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Schedule; 