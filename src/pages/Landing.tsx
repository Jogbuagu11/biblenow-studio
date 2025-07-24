import React from 'react';
import Header from '../components/Layout/Header';

const Landing: React.FC = () => {
  return (
    <div className="landing-page min-h-screen bg-gradient-to-br from-offWhite-50 to-offWhite-100">
      <Header disableDarkMode={true} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to{' '}
            <span className="text-chocolate-800">BibleNow Studio</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Your comprehensive platform for live streaming, content management, and audience engagement.
            Start your journey with powerful tools designed for modern ministry.
          </p>
          
          <div className="mt-10 flex justify-center space-x-4">
            <button className="bg-chocolate-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-chocolate-700 transition-colors">
              Get Started
            </button>
            <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              Learn More
            </button>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-offWhite-25 rounded-lg p-6 shadow-md">
              <div className="text-3xl mb-4">📺</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Streaming</h3>
              <p className="text-gray-600">High-quality live streaming with real-time engagement tools.</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-offWhite-25 rounded-lg p-6 shadow-md">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-gray-600">Comprehensive analytics to track your audience and growth.</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-offWhite-25 rounded-lg p-6 shadow-md">
              <div className="text-3xl mb-4">🤝</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community</h3>
              <p className="text-gray-600">Build and engage with your community effectively.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
