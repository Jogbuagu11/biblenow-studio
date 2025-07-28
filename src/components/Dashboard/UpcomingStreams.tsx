import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { useLivestreamStore } from '../../stores/livestreamStore';
import { format } from 'date-fns';
import Button from '../ui/Button';
import StreamDetailsModal from '../StreamDetailsModal';
import Pagination from '../ui/Pagination';
import { StreamInfo } from '../../stores/livestreamStore';

const UpcomingStreams: React.FC = () => {
  const { scheduledStreams, fetchScheduledStreams, isLoading } = useLivestreamStore();
  const [selectedStream, setSelectedStream] = useState<StreamInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchScheduledStreams();
  }, [fetchScheduledStreams]);

  const handleGoLive = (streamId: string) => {
    // Navigate to go live page with stream ID
    window.location.href = `/go-live?stream=${streamId}`;
  };

  const handleViewDetails = (stream: StreamInfo) => {
    setSelectedStream(stream);
    setIsModalOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate pagination
  const totalPages = Math.ceil(scheduledStreams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStreams = scheduledStreams.slice(startIndex, endIndex);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {currentStreams.map((stream) => (
              <div key={stream.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                  {stream.thumbnail_url ? (
                    <img 
                      src={stream.thumbnail_url} 
                      alt={stream.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                                      <img 
                    src="https://jhlawjmyorpmafokxtuh.supabase.co/storage/v1/object/sign/attachments/defaultstream.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82OWRmNmQwOC1iYTlmLTQ2NDItYmQ4MS05ZDIzNGNmYTI1M2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhdHRhY2htZW50cy9kZWZhdWx0c3RyZWFtLnBuZyIsImlhdCI6MTc1MzY0ODA0OSwiZXhwIjoyMDY5MDA4MDQ5fQ.cMcADdSsi7Scklnf0qU_D0yeQnOjn-_wY-bMvFDRnos"
                    alt="Default Stream Thumbnail"
                    className="w-full h-full object-cover"
                  />
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      Scheduled
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-xs line-clamp-2 mb-1">
                    {stream.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                    {format(new Date(stream.scheduled_at || 0), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>{stream.platform}</span>
                    <span>{stream.stream_type}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      onClick={() => handleViewDetails(stream)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs py-1"
                    >
                      Details
                    </Button>
                    <Button 
                      onClick={() => handleGoLive(stream.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1"
                    >
                      Go Live
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
        {scheduledStreams.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={scheduledStreams.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </CardContent>
      
      <StreamDetailsModal
        stream={selectedStream}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </Card>
  );
};

export default UpcomingStreams; 