import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/Dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/AlertDialog';
import Button from './ui/Button';
import { StreamInfo } from '../stores/livestreamStore';
import { format } from 'date-fns';
import { useLivestreamStore } from '../stores/livestreamStore';

interface StreamDetailsModalProps {
  stream: StreamInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StreamDetailsModal: React.FC<StreamDetailsModalProps> = ({ stream, open, onOpenChange }) => {
  const { deleteStream } = useLivestreamStore();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

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

  const handleDelete = async () => {
    try {
      await deleteStream(stream.id);
      onOpenChange(false);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete stream:', error);
      alert('Failed to delete stream. Please try again.');
    }
  };

  const handleReschedule = () => {
    onOpenChange(false);
    // Navigate to schedule page with stream ID for editing
    window.location.href = `/schedule?edit=${stream.id}`;
  };

  // Check if this is a scheduled stream (not live and has scheduled_at in the future)
  const isScheduledStream = !stream.is_live && stream.scheduled_at && new Date(stream.scheduled_at) > new Date();

  return (
    <>
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
                    <span className="text-gray-600 dark:text-gray-400">Room URL:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400 truncate ml-2">
                      https://stream.biblenow.io/live/{stream.room_name?.split('/').pop() || 'room'}
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

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            
            {/* Show delete and reschedule buttons for scheduled streams */}
            {isScheduledStream && (
              <>
                <Button 
                  variant="outline"
                  onClick={handleReschedule}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
                >
                  Reschedule
                </Button>
                <Button 
                  onClick={() => setShowDeleteDialog(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </>
            )}
            
            {/* Show join stream button for live streams */}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stream</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{stream.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Stream
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StreamDetailsModal; 