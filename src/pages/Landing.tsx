import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handleEmailLogin = () => {
    navigate('/login');
  };

  const handleStartStreaming = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-yellow-50 to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="https://jhlawjmyorpmafokxtuh.supabase.co/storage/v1/object/sign/assets/Bible%20NW500.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82OWRmNmQwOC1iYTlmLTQ2NDItYmQ4MS05ZDIzNGNmYTI1M2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvQmlibGUgTlc1MDAucG5nIiwiaWF0IjoxNzUzMzIyOTc5LCJleHAiOjE5MTEwMDI5Nzl9.liuTl6gCtDUYUBi4GNxBO_UUrZ2SYvBpyblwj1aEEMU"
                alt="BibleNOW Studio Logo"
                className="w-12 h-12 mr-3 shadow-lg"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                BibleNOW Studio
          </h1>
            </div>
            
            {/* Login Buttons */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleEmailLogin}
                className="px-6 py-2.5 text-slate-700 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-all duration-200 shadow-sm"
              >
                Email Login
            </button>
              <button className="px-6 py-2.5 text-slate-800 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl font-medium hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-lg hover:shadow-xl">
                Login with Google
            </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Content */}
          <div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              <span className="text-slate-800">Stream Your Ministry to the World with</span>{' '}
              <span className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                BibleNOW
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mb-8 leading-relaxed">
              The professional streaming platform designed specifically for faith-based content creators.
            </p>
            
            {/* Start Streaming Button */}
            <button 
              onClick={handleStartStreaming}
              className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-800 rounded-xl font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Start Streaming Now 
              <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Right Side - Video Placeholder */}
          <div className="relative">
            <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl border-2 border-slate-300 flex items-center justify-center shadow-2xl">
              <div className="text-center relative w-full h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-2xl"></div>
                <div className="relative z-10 pt-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-800 via-slate-800/90 to-transparent p-8 rounded-b-2xl">
                  <h3 className="text-white font-semibold text-xl mb-2">Your Ministry Livestream</h3>
                  <p className="text-slate-300 text-sm">Ready to go live to your audience</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-white/60 backdrop-blur-sm py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-20">
            <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Why Choose BibleNOW Studio
            </span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">High-Quality Streaming</h3>
              <p className="text-slate-600 leading-relaxed">
                Stream in HD with our reliable and optimized platform designed for faith-based content.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Grow Your Community</h3>
              <p className="text-slate-600 leading-relaxed">
                Connect with believers worldwide and build your ministry's online presence.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Interactive Features</h3>
              <p className="text-slate-600 leading-relaxed">
                Engage with your audience through live chat, polls, and other interactive tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-gradient-to-br from-amber-900 via-yellow-900 to-amber-800 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Ready to Start Your Streaming Journey?
            </span>
          </h2>
          <p className="text-amber-200 text-xl mb-10 max-w-3xl mx-auto leading-relaxed">
            Join thousands of faith-based content creators on BibleNOW Studio.
          </p>
          <button className="px-10 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-800 rounded-xl font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1">
            Get Started Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-amber-900 to-yellow-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img 
                src="https://jhlawjmyorpmafokxtuh.supabase.co/storage/v1/object/sign/assets/Bible%20NW500.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82OWRmNmQwOC1iYTlmLTQ2NDItYmQ4MS05ZDIzNGNmYTI1M2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvQmlibGUgTlc1MDAucG5nIiwiaWF0IjoxNzUzMzIyOTc5LCJleHAiOjE5MTEwMDI5Nzl9.liuTl6gCtDUYUBi4GNxBO_UUrZ2SYvBpyblwj1aEEMU"
                alt="BibleNOW Studio Logo"
                className="w-12 h-12 mr-3 shadow-lg"
              />
              <span className="text-white font-semibold text-lg">BibleNOW Studio</span>
            </div>
            <div className="text-amber-200 text-sm">
              © 2025 BibleNOW. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
