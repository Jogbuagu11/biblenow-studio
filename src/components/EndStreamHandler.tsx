import React, { useEffect, useState, useCallback } from 'react';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { databaseService } from '../services/databaseService';

interface EndStreamHandlerProps {
  streamId?: string;
  onStreamEnded?: () => void;
  onError?: (error: string | Error) => void;
  autoEnd?: boolean;
}

const EndStreamHandler: React.FC<EndStreamHandlerProps> = ({
  streamId,
  onStreamEnded,
  onError,
  autoEnd = true
}) => {
  const { user } = useSupabaseAuthStore();
  const [isEnding, setIsEnding] = useState(false);
  const [streamStatus, setStreamStatus] = useState<any>(null);

  const endStream = useCallback(async () => {
    if (!user) {
      onError?.('User not authenticated');
      return;
    }

    setIsEnding(true);
    
    try {
      console.log('EndStreamHandler: Starting end stream process');
      
      // If specific stream ID is provided, end that stream
      if (streamId) {
        console.log('EndStreamHandler: Ending specific stream:', streamId);
        await databaseService.endStreamById(streamId);
      } else {
        // Otherwise, end all active streams for the user
        console.log('EndStreamHandler: Ending all active streams for user:', user.uid);
        await databaseService.endStreamOnRedirect(user.uid);
      }
      
      console.log('EndStreamHandler: Stream ended successfully');
      onStreamEnded?.();
      
    } catch (error) {
      console.error('EndStreamHandler: Error ending stream:', error);
      onError?.(error instanceof Error ? error.message : String(error));
    } finally {
      setIsEnding(false);
    }
  }, [user, streamId, onStreamEnded, onError]);

  // Auto-end stream when component mounts
  useEffect(() => {
    if (autoEnd && user) {
      endStream();
    }
  }, [user, autoEnd, endStream]);

  const getStreamStatus = async () => {
    if (!streamId) return;
    
    try {
      const status = await databaseService.getStreamStatus(streamId);
      setStreamStatus(status);
    } catch (error) {
      console.error('Error getting stream status:', error);
    }
  };

  const forceEndAllStreams = async () => {
    if (!user) {
      onError?.('User not authenticated');
      return;
    }

    setIsEnding(true);
    
    try {
      console.log('EndStreamHandler: Force ending all streams');
      await databaseService.forceEndAllStreams();
      console.log('EndStreamHandler: All streams force ended');
      onStreamEnded?.();
    } catch (error) {
      console.error('EndStreamHandler: Error force ending streams:', error);
      onError?.(error instanceof Error ? error.message : String(error));
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="end-stream-handler">
      {streamStatus && (
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-2">Stream Status</h3>
          <div className="text-sm">
            <p><strong>Title:</strong> {streamStatus.stream?.title}</p>
            <p><strong>Status:</strong> {streamStatus.stream?.status}</p>
            <p><strong>Live:</strong> {streamStatus.stream?.is_live ? 'Yes' : 'No'}</p>
            <p><strong>Duration:</strong> {streamStatus.stream?.duration_minutes} minutes</p>
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={endStream}
          disabled={isEnding}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          {isEnding ? 'Ending...' : 'End Stream'}
        </button>
        
        {streamId && (
          <button
            onClick={getStreamStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Check Status
          </button>
        )}
        
        <button
          onClick={forceEndAllStreams}
          disabled={isEnding}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
        >
          Force End All
        </button>
      </div>
    </div>
  );
};

export default EndStreamHandler; 