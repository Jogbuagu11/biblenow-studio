import React, { useState, useEffect, useRef } from 'react';
import { Send, Play, MessageCircle, X, Maximize2, Minimize2, CheckCircle } from 'lucide-react';
import { supabaseChatService, ChatMessage } from '../services/supabaseChatService';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { databaseService } from '../services/databaseService';

interface LiveStreamInterfaceProps {
  roomId: string;
  isModerator?: boolean;
  streamTitle?: string;
  hostName?: string;
  hostAvatar?: string;
  viewerCount?: number;
  className?: string;
}

const LiveStreamInterface: React.FC<LiveStreamInterfaceProps> = ({ 
  roomId, 
  isModerator = false,
  streamTitle: propStreamTitle,
  hostName: propHostName,
  hostAvatar: propHostAvatar,
  viewerCount: propViewerCount,
  className = '' 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamData, setStreamData] = useState<{
    title: string;
    hostName: string;
    hostAvatar: string;
    viewerCount: number;
    hostId?: string;
  }>({
    title: propStreamTitle || "Wednesday Night Bible Study",
    hostName: propHostName || "Señor Arturo",
    hostAvatar: propHostAvatar || "",
    viewerCount: propViewerCount || 0,
    hostId: undefined
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useSupabaseAuthStore();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch stream data and user profile
  useEffect(() => {
    const fetchStreamData = async () => {
      try {
        // Parse URL parameters to get stream info
        const urlParams = new URLSearchParams(window.location.search);
        const titleParam = urlParams.get('title');
        
        if (titleParam) {
          setStreamData(prev => ({
            ...prev,
            title: decodeURIComponent(titleParam)
          }));
        }

        // Get current user's profile for avatar and name
        if (user?.uid) {
          try {
            const userProfile = await databaseService.getUserProfile(user.uid);
            if (userProfile) {
              // Construct full name from first_name and last_name
              const firstName = userProfile.first_name || '';
              const lastName = userProfile.last_name || '';
              const fullName = [firstName, lastName].filter(Boolean).join(' ') || userProfile.display_name || userProfile.full_name || "BibleNOW User";
              
              setStreamData(prev => ({
                ...prev,
                hostName: fullName,
                hostAvatar: userProfile.avatar_url || "",
                hostId: user.uid
              }));
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        }

        // Get current stream info from database
        try {
          const activeStreams = await databaseService.listActiveStreams();
          const currentStream = activeStreams.find(stream => 
            stream.room_name === roomId || stream.title === titleParam
          );
          
          if (currentStream) {
            setStreamData(prev => ({
              ...prev,
              title: currentStream.title || prev.title,
              viewerCount: currentStream.viewer_count || 0
            }));
          }
        } catch (error) {
          console.error('Error fetching stream data:', error);
        }
      } catch (error) {
        console.error('Error fetching stream data:', error);
      }
    };

    fetchStreamData();
  }, [roomId, user?.uid]);

  // Check if user is already following the streamer
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user?.uid || !streamData.hostId) return;
      
      try {
        const following = await databaseService.getFollowing(user.uid);
        const isFollowingStreamer = following.some(follow => follow.following_id === streamData.hostId);
        setIsFollowing(isFollowingStreamer);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [user?.uid, streamData.hostId]);

  // Real-time viewer count updates
  useEffect(() => {
    const updateViewerCount = async () => {
      try {
        // Simulate real-time viewer count updates
        // In a real implementation, this would come from WebSocket or polling
        const interval = setInterval(async () => {
          try {
            const activeStreams = await databaseService.listActiveStreams();
            const currentStream = activeStreams.find(stream => 
              stream.room_name === roomId || stream.title === streamData.title
            );
            
            if (currentStream) {
              setStreamData(prev => ({
                ...prev,
                viewerCount: currentStream.viewer_count || prev.viewerCount
              }));
            }
          } catch (error) {
            console.error('Error updating viewer count:', error);
          }
        }, 5000); // Update every 5 seconds

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Error setting up viewer count updates:', error);
      }
    };

    updateViewerCount();
  }, [roomId, streamData.title]);

  // Subscribe to chat messages
  useEffect(() => {
    const handleMessages = (newMessages: ChatMessage[]) => {
      setMessages(newMessages);
    };

    supabaseChatService.subscribeToMessages(roomId, handleMessages);

    return () => {
      supabaseChatService.unsubscribeFromMessages();
    };
  }, [roomId]);

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Allow all users to chat, not just verified users
      await supabaseChatService.sendMessage(roomId, newMessage, false);
      setNewMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Format viewer count
  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle follow/unfollow button click
  const handleFollowClick = async () => {
    if (!user?.uid || !streamData.hostId || isFollowLoading) return;
    
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await databaseService.unfollowUser(user.uid, streamData.hostId);
        setIsFollowing(false);
      } else {
        await databaseService.followUser(user.uid, streamData.hostId);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      // You could show a toast notification here
    } finally {
      setIsFollowLoading(false);
    }
  };

  return (
    <div className={`flex flex-col lg:flex-row h-screen bg-gray-900 ${className}`}>
      {/* Main Video Area */}
      <div className={`relative bg-black flex-1`}>
        {/* Video Player */}
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-center">
            <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Live Video Feed</p>
          </div>
        </div>

        {/* Stream Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="bg-amber-950 bg-opacity-95 p-4 border-t border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Host Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center overflow-hidden">
                  {streamData.hostAvatar ? (
                    <img 
                      src={streamData.hostAvatar} 
                      alt={streamData.hostName}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        // Fallback to initial if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('span');
                          fallback.className = 'text-white font-semibold';
                          fallback.textContent = streamData.hostName.charAt(0);
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-white font-semibold">
                      {streamData.hostName.charAt(0)}
                    </span>
                  )}
                </div>
                
                {/* Stream Info */}
                <div>
                  <h1 className="text-white text-xl font-bold">{streamData.title}</h1>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300 text-lg font-medium">{streamData.hostName}</span>
                      <CheckCircle className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                    </div>
                    <span className="text-gray-300 text-sm">{formatViewerCount(streamData.viewerCount)} watching</span>
                  </div>
                </div>
              </div>
              
              {/* Follow/Unfollow Button */}
              <button 
                onClick={handleFollowClick}
                disabled={isFollowLoading}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isFollowLoading 
                    ? 'bg-gray-500 text-white cursor-not-allowed' 
                    : isFollowing 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                }`}
              >
                {isFollowLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="absolute top-4 right-4 flex space-x-2">
          {/* Chat Toggle Button */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-all"
            title={showChat ? 'Hide Chat' : 'Show Chat'}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Chat Panel - Desktop */}
      {showChat && (
        <div className="hidden lg:flex w-80 lg:w-96 xl:w-80 bg-gray-900 border-l border-gray-700 flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-yellow-500 bg-gray-800">
            <h3 className="text-white font-semibold">Live Chat</h3>
            <p className="text-gray-400 text-xs mt-1">All BibleNOW users can chat</p>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.userId === user?.uid ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center overflow-hidden">
                      {message.userAvatar ? (
                        <img
                          src={message.userAvatar}
                          alt={message.userName}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to initial if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement('span');
                              fallback.className = 'text-white text-sm font-semibold';
                              fallback.textContent = message.userName.charAt(0);
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <span className="text-white text-sm font-semibold">
                          {message.userName.charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className={`flex-1 max-w-xs ${
                    message.userId === user?.uid ? 'text-right' : ''
                  }`}>
                    <div className={`inline-block px-3 py-2 rounded-lg ${
                      message.userId === user?.uid
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-white'
                    }`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-medium ${
                          message.userId === user?.uid
                            ? 'text-black'
                            : 'text-gray-300'
                        }`}>
                          {message.userName}
                        </span>
                      </div>
                      <p className="text-sm break-words">{message.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-red-900 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t border-gray-700">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isLoading}
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Chat Overlay */}
      {showChat && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-75 z-50">
          <div className="flex flex-col h-full bg-gray-900">
            {/* Mobile Chat Header */}
            <div className="p-4 border-b border-yellow-500 bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Live Chat</h3>
                  <p className="text-gray-400 text-xs mt-1">All BibleNOW users can chat</p>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Mobile Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.userId === user?.uid ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center overflow-hidden">
                        {message.userAvatar ? (
                          <img
                            src={message.userAvatar}
                            alt={message.userName}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to initial if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('span');
                                fallback.className = 'text-white text-sm font-semibold';
                                fallback.textContent = message.userName.charAt(0);
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-white text-sm font-semibold">
                            {message.userName.charAt(0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className={`flex-1 max-w-xs ${
                      message.userId === user?.uid ? 'text-right' : ''
                    }`}>
                      <div className={`inline-block px-3 py-2 rounded-lg ${
                        message.userId === user?.uid
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-700 text-white'
                      }`}>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-xs font-medium ${
                            message.userId === user?.uid
                              ? 'text-black'
                              : 'text-gray-300'
                          }`}>
                            {message.userName}
                          </span>
                        </div>
                        <p className="text-sm break-words">{message.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mobile Error Message */}
            {error && (
              <div className="px-4 py-2 bg-red-900 text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Mobile Message Input */}
            <div className="p-4 border-t border-gray-700">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isLoading}
                  className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStreamInterface; 