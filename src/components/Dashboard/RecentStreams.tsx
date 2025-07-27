import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { useLivestreamStore } from '../../stores/livestreamStore';
import { format } from 'date-fns';

const RecentStreams: React.FC = () => {
  const { recentStreams, fetchRecentStreams, isLoading } = useLivestreamStore();

  useEffect(() => {
    fetchRecentStreams();
  }, [fetchRecentStreams]);

  const calculateDuration = (startedAt: string, endedAt: string) => {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Streams</CardTitle>
        <CardDescription>
          Your past livestreams
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500">Loading recent streams...</p>
          </div>
        ) : recentStreams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentStreams.slice(0, 6).map((stream) => (
              <div key={stream.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                  {stream.thumbnail_url ? (
                    <img 
                      src={stream.thumbnail_url} 
                      alt={stream.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-500 text-sm">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                      Ended
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-2">
                    {stream.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    {format(new Date(stream.ended_at || stream.updated_at), "MMM d, yyyy")}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>{stream.platform}</span>
                    <span>{stream.stream_type}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    {stream.started_at && stream.ended_at && (
                      <span>Duration: {calculateDuration(stream.started_at, stream.ended_at)}</span>
                    )}
                    <span>{stream.viewer_count || 0} viewers</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent streams found.</p>
            <p className="text-sm text-gray-400 mt-1">Start streaming to see your history here.</p>
          </div>
        )}
        {recentStreams.length > 6 && (
          <div className="text-center pt-4">
            <button 
              onClick={() => window.location.href = '/streams'}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All ({recentStreams.length} streams)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentStreams; 