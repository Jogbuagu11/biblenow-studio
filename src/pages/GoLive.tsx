import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import Button from '../components/ui/Button';
import GoLiveModal from '../components/GoLiveModal';

const GoLive: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">Go Live</h1>
            <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">Set up and manage your livestreams.</p>
          </div>
          <Button 
            onClick={() => setModalOpen(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white flex items-center gap-2 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Go Live
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="border-2 border-dashed border-yellow-400 dark:border-yellow-500 rounded-lg p-12 text-center transition-colors duration-200">
          {/* Large Play Icon */}
          <div className="w-24 h-24 bg-gray-200 dark:bg-darkBrown-600 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-200">
            <svg className="w-12 h-12 text-gray-600 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          
          {/* Question */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-200">Ready to livestream?</h2>
          
          {/* Instructions */}
          <p className="text-gray-600 dark:text-gray-300 mb-8 transition-colors duration-200">
            Click the "Go Live" button above to set up your livestream details.
          </p>

          {/* New Features Box */}
          <div className="bg-offWhite-25 dark:bg-darkBrown-800 border border-yellow-200 dark:border-yellow-500 rounded-lg p-6 max-w-md mx-auto transition-colors duration-200">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 transition-colors duration-200">New Features:</h3>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300 text-left transition-colors duration-200">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                <span><strong>BibleNOW Video</strong> - Use our integrated VideoSDK for video streaming</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                <span><strong>Go Live Room</strong> - Create virtual prayer rooms for your community</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                <span><strong>Supports traditional platforms</strong> like YouTube, Twitch, and more</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Reminder */}
        <div className="mt-8 flex items-start gap-3 p-4 bg-yellow-50 dark:bg-darkBrown-800 border border-yellow-300 dark:border-yellow-500 rounded-lg transition-colors duration-200">
          <svg className="w-5 h-5 text-yellow-700 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-yellow-900 dark:text-darkBrown-200 text-sm transition-colors duration-200">
            <strong>Important Reminder:</strong> If you're using an external platform, make sure you're recording your session if needed. BibleNOW does not save your livestream automatically.
          </p>
        </div>

        {/* Go Live Modal */}
        <GoLiveModal open={modalOpen} onOpenChange={setModalOpen} />
      </div>
    </Layout>
  );
};

export default GoLive; 