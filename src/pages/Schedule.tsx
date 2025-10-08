import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useLivestreamStore } from '../stores';
import { databaseService } from '../services/databaseService';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import Layout from '../components/Layout/Layout';
import Button from '../components/ui/Button';
import Calendar from '../components/ui/Calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/AlertDialog';
import Separator from '../components/ui/Separator';
import CreateStreamForm from '../components/CreateStreamForm';

const Schedule = (): JSX.Element => {
  const { scheduledStreams, fetchScheduledStreams } = useLivestreamStore();
  const { user } = useSupabaseAuthStore();
  const [activeTab, setActiveTab] = useState<string>('calendar');
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
      setActiveTab('create');
    }
  }, []);

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
        
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
            <div className="grid w-full grid-cols-2 max-w-md bg-gray-100 dark:bg-darkBrown-700 p-1 rounded-lg">
              <button 
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                  activeTab === 'calendar' 
                    ? 'bg-white dark:bg-darkBrown-600 text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-darkBrown-600/50'
                }`}
              >
                Calendar
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                  activeTab === 'create' 
                    ? 'bg-white dark:bg-darkBrown-600 text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-darkBrown-600/50'
                }`}
              >
                Create Stream
              </button>
            </div>
            <Button 
              variant="default" 
              className="bg-chocolate-600 text-white hover:bg-chocolate-700"
              disabled={streamingLimit?.hasReachedLimit}
            >
              Go Live Now
            </Button>
          </div>

          {activeTab === 'calendar' && (
            <div className="mt-4 bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg shadow-lg border border-gray-200 dark:border-darkBrown-400 p-4">
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
                          const streamDate = new Date(stream.scheduled_at || 0);
                          return streamDate.toDateString() === date.toDateString();
                        }).length === 0 && (
                          <div className="text-center py-3">
                            <p className="text-gray-500 dark:text-darkBrown-200 text-sm">No scheduled streams for this date</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-darkBrown-200">Select a date to view scheduled streams</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'create' && (
            <div className="mt-4 bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg shadow-md p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingStreamId ? 'Edit Stream' : 'Schedule a New Stream'}
                </h2>
                <p className="text-gray-600 dark:text-darkBrown-200">
                  {editingStreamId ? 'Update your scheduled livestream event' : 'Create a new livestream event'}
                </p>
              </div>
              
              <CreateStreamForm 
                onSuccess={() => {
                  setActiveTab('calendar');
                  if (editingStreamId) {
                    setEditingStreamId(null);
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                }}
                editingStreamId={editingStreamId}
                streamingLimit={streamingLimit}
                onShowLimitDialog={() => setShowLimitDialog(true)}
              />
            </div>
          )}
        </div>

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