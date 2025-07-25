import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { useLivestreamStore } from '../../stores/livestreamStore';
import { format } from 'date-fns';
import Button from '../ui/Button';

const UpcomingStreams: React.FC = () => {
  const { scheduledStreams, fetchScheduledStreams, isLoading } = useLivestreamStore();

  useEffect(() => {
    fetchScheduledStreams();
  }, [fetchScheduledStreams]);

  const handleGoLive = (streamId: string) => {
    // Navigate to go live page with stream ID
    window.location.href = `/go-live?stream=${streamId}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Streams</CardTitle>
        <CardDescription>
          Your scheduled livestreams
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500">Loading upcoming streams...</p>
          </div>
        ) : scheduledStreams.length > 0 ? (
          <div className="space-y-4">
            {scheduledStreams.slice(0, 5).map((stream) => (
              <div key={stream.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  {stream.thumbnail_url ? (
                    <img 
                      src={stream.thumbnail_url} 
                      alt={stream.title}
                      className="w-16 h-12 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-16 h-12 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
                      <span className="text-gray-500 text-xs">No Image</span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{stream.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {format(new Date(stream.scheduled_at || 0), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Platform: {stream.platform} • Type: {stream.stream_type}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleGoLive(stream.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Go Live
                </Button>
              </div>
            ))}
            {scheduledStreams.length > 5 && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={() => window.location.href = '/streams'}>
                  View All ({scheduledStreams.length} streams)
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No upcoming streams scheduled.</p>
            <Button 
              onClick={() => window.location.href = '/schedule'}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Schedule a Stream
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingStreams; 