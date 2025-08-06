import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Users } from 'lucide-react';
import { supabaseChatService, ChatMessage } from '../services/supabaseChatService';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';

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
  const { user } = useSupabaseAuthStore();

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
      await supabaseChatService.sendMessage(roomId, newMessage, isModerator);
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
    <div className={`flex flex-col h-full bg-amber-900 dark:bg-amber-950 border-l border-amber-700 dark:border-amber-800 ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-700 dark:border-amber-800 bg-amber-800 dark:bg-amber-900">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-yellow-400 dark:text-yellow-300" />
          <h3 className="font-semibold text-yellow-100 dark:text-yellow-200">Live Chat</h3>
          {isModerator && (
            <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
              Moderator
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 text-sm text-yellow-200 dark:text-yellow-300">
          <Users className="w-4 h-4" />
          <span>{messages.length > 0 ? messages.length : 0}</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-yellow-200 dark:text-yellow-300 py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-yellow-400" />
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
                    ? 'bg-yellow-600 text-white'
                    : message.isModerator
                    ? 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    : 'bg-amber-100 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-xs font-medium ${
                      message.userId === user?.uid
                        ? 'text-yellow-100'
                        : message.isModerator
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-amber-600 dark:text-amber-300'
                    }`}>
                      {message.userName}
                      {message.isModerator && (
                        <span className="ml-1 text-xs">👑</span>
                      )}
                    </span>
                    <span className={`text-xs ${
                      message.userId === user?.uid
                        ? 'text-yellow-200'
                        : 'text-amber-500 dark:text-amber-400'
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
      <div className="p-4 border-t border-amber-700 dark:border-amber-800">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-amber-600 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-amber-800 dark:text-yellow-100"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isLoading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveStreamChat; 