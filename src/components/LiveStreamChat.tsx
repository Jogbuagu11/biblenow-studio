import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Users } from 'lucide-react';
import { firebaseChatService, ChatMessage } from '../services/firebaseChatService';
import { useAuthStore } from '../stores/authStore';

interface LiveStreamChatProps {
  roomId: string;
  isModerator?: boolean;
  className?: string;
}

const LiveStreamChat: React.FC<LiveStreamChatProps> = ({ 
  roomId, 
  isModerator = false, 
  className = '' 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to chat messages
  useEffect(() => {
    const handleMessages = (newMessages: ChatMessage[]) => {
      setMessages(newMessages);
    };

    firebaseChatService.subscribeToMessages(roomId, handleMessages);

    return () => {
      firebaseChatService.unsubscribeFromMessages();
    };
  }, [roomId]);

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await firebaseChatService.sendMessage(roomId, newMessage, isModerator);
      setNewMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Live Chat</h3>
          {isModerator && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
              Moderator
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
          <Users className="w-4 h-4" />
          <span>{messages.length > 0 ? messages.length : 0}</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
                <img
                  src={message.userAvatar || `https://via.placeholder.com/32/8B4513/FFFFFF?text=${message.userName.charAt(0)}`}
                  alt={message.userName}
                  className="w-8 h-8 rounded-full"
                />
              </div>

              {/* Message Content */}
              <div className={`flex-1 max-w-xs ${
                message.userId === user?.uid ? 'text-right' : ''
              }`}>
                <div className={`inline-block px-3 py-2 rounded-lg ${
                  message.userId === user?.uid
                    ? 'bg-blue-600 text-white'
                    : message.isModerator
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-xs font-medium ${
                      message.userId === user?.uid
                        ? 'text-blue-100'
                        : message.isModerator
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.userName}
                      {message.isModerator && (
                        <span className="ml-1 text-xs">👑</span>
                      )}
                    </span>
                    <span className={`text-xs ${
                      message.userId === user?.uid
                        ? 'text-blue-200'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
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
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveStreamChat; 