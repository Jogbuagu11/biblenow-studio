import React, { useState } from 'react';
import { Video, VideoOff, Mic, MicOff, MessageCircle } from 'lucide-react';

interface ViewerParticipationProps {
  onEnableCamera: () => void;
  onEnableMicrophone: () => void;
  onDisableCamera: () => void;
  onDisableMicrophone: () => void;
  isCameraEnabled: boolean;
  isMicrophoneEnabled: boolean;
  isParticipating: boolean;
}

const ViewerParticipation: React.FC<ViewerParticipationProps> = ({
  onEnableCamera,
  onEnableMicrophone,
  onDisableCamera,
  onDisableMicrophone,
  isCameraEnabled,
  isMicrophoneEnabled,
  isParticipating
}) => {
  const [showParticipationOptions, setShowParticipationOptions] = useState(false);

  if (!showParticipationOptions) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowParticipationOptions(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Join Discussion
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 border">
      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Join the discussion
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={isCameraEnabled ? onDisableCamera : onEnableCamera}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              isCameraEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isCameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            {isCameraEnabled ? 'Camera On' : 'Enable Camera'}
          </button>
          
          <button
            onClick={isMicrophoneEnabled ? onDisableMicrophone : onEnableMicrophone}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              isMicrophoneEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isMicrophoneEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {isMicrophoneEnabled ? 'Mic On' : 'Enable Mic'}
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          {isParticipating 
            ? 'You are participating in the discussion' 
            : 'You are watching only. Enable camera/mic to participate.'
          }
        </div>
        
        <button
          onClick={() => setShowParticipationOptions(false)}
          className="text-xs text-gray-400 hover:text-gray-600 self-end"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ViewerParticipation;
