import React from 'react';
import { Apple, Play, Download } from 'lucide-react';

const DownloadApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 to-amber-700 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center text-white p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">BibleNOW Studio</h1>
          <p className="text-xl mb-6">Download our app to join live ministry streams</p>
        </div>

        <div className="space-y-4">
          {/* iOS App Store */}
          <a
            href="https://apps.apple.com/app/biblenow-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-3 bg-black bg-opacity-30 hover:bg-opacity-50 rounded-lg p-4 transition-all"
          >
            <Apple className="w-8 h-8" />
            <div className="text-left">
              <p className="text-sm opacity-75">Download on the</p>
              <p className="font-semibold">App Store</p>
            </div>
          </a>

          {/* Google Play Store */}
          <a
            href="https://play.google.com/store/apps/details?id=com.biblenow.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-3 bg-black bg-opacity-30 hover:bg-opacity-50 rounded-lg p-4 transition-all"
          >
            <Play className="w-8 h-8" />
            <div className="text-left">
              <p className="text-sm opacity-75">Get it on</p>
              <p className="font-semibold">Google Play</p>
            </div>
          </a>

          {/* Direct Download */}
          <a
            href="/download/biblenow-studio.apk"
            className="flex items-center justify-center space-x-3 bg-amber-600 hover:bg-amber-700 rounded-lg p-4 transition-all"
          >
            <Download className="w-8 h-8" />
            <div className="text-left">
              <p className="text-sm opacity-75">Direct Download</p>
              <p className="font-semibold">APK File</p>
            </div>
          </a>
        </div>

        <div className="mt-8 text-sm opacity-75">
          <p>Already have the app?</p>
          <a href="/login" className="text-amber-300 hover:text-amber-200 underline">
            Log in here
          </a>
        </div>
      </div>
    </div>
  );
};

export default DownloadApp; 