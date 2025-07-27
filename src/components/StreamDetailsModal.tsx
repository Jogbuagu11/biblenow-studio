import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/Dialog';
import Button from './ui/Button';
import { StreamInfo } from '../stores/livestreamStore';
import { format } from 'date-fns';
import { jaasConfig } from '../config/firebase';

interface StreamDetailsModalProps {
  stream: StreamInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StreamDetailsModal: React.FC<StreamDetailsModalProps> = ({ stream, open, onOpenChange }) => {
  if (!stream) return null;

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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stream.title}</DialogTitle>
          <DialogDescription>
            Stream details and statistics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Thumbnail */}
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
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
          </div>

          {/* Description */}
          {stream.description && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">{stream.description}</p>
            </div>
          )}

          {/* Stream Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Stream Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`font-medium ${stream.is_live ? 'text-green-600' : 'text-red-600'}`}>
                    {stream.is_live ? 'Live' : 'Ended'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Stream Type:</span>
                  <span className="font-medium">{stream.stream_mode || 'Standard'}</span>
                </div>
                {stream.scheduled_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Scheduled:</span>
                    <span className="font-medium">{formatDate(stream.scheduled_at)}</span>
                  </div>
                )}
                {stream.started_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Started:</span>
                    <span className="font-medium">{formatDate(stream.started_at)}</span>
                  </div>
                )}
                {stream.ended_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Ended:</span>
                    <span className="font-medium">{formatDate(stream.ended_at)}</span>
                  </div>
                )}
                {stream.started_at && stream.ended_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="font-medium">{calculateDuration(stream.started_at, stream.ended_at)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Viewer Count:</span>
                  <span className="font-medium">{stream.viewer_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Max Viewers:</span>
                  <span className="font-medium">{stream.max_viewers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Flag Count:</span>
                  <span className="font-medium">{stream.flag_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Hidden:</span>
                  <span className="font-medium">{stream.is_hidden ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                  <span className="font-medium">{formatDate(stream.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {stream.tags && stream.tags.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {stream.tags.map((tag: string, index: number) => (
                  <span 
                    key={index}
                    className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Room Information */}
          {stream.room_name && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Room Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Room Name:</span>
                  <span className="font-medium font-mono">{stream.room_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Custom Branded URL:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400 truncate ml-2">
                    https://stream.biblenow.io/{stream.room_name?.split('/').pop() || 'room'}
                  </span>
                </div>
                {stream.redirect_url && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Redirect URL:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400 truncate ml-2">
                      {stream.redirect_url}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {stream.is_live && (
            <Button 
              onClick={() => {
                onOpenChange(false);
                window.location.href = `/streams/${stream.id}`;
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Join Stream
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StreamDetailsModal; 