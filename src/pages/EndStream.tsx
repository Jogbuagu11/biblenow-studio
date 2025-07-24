import React, { useEffect, useState } from 'react';

const EndStream: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-darkBrown-900 via-darkBrown-800 to-chocolate-900 overflow-hidden relative">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Floating Elements - Rising from Bottom */}
      <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
        {[
          { text: '✝', fallback: '+', label: 'Cross', color: 'text-yellow-400', size: 'text-4xl' },
          { text: '📖', fallback: '📚', label: 'Bible', color: 'text-yellow-400', size: 'text-7xl' },
          { text: '🙏', fallback: '🙏', label: 'Prayer', color: 'text-yellow-400', size: 'text-5xl' },
          { text: '❤', fallback: '♥', label: 'Heart', color: 'text-red-400', size: 'text-6xl' },
          { text: '✨', fallback: '★', label: 'Sparkle', color: 'text-yellow-400', size: 'text-3xl' },
          { text: '🌟', fallback: '⭐', label: 'Star', color: 'text-yellow-400', size: 'text-8xl' }
        ].map((item, index) => (
          <div
            key={index}
            className={`absolute opacity-60 ${item.color} ${item.size} animate-float-up`}
            style={{
              left: `${15 + (index * 14)}%`,
              bottom: '-100px',
              animationDelay: `${index * 1}s`,
              animationDuration: `${8 + index * 2}s`,
              zIndex: 15,
            }}
            title={item.label}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* Rising Circles */}
      <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
        {Array.from({ length: 8 }).map((_, index) => {
          const sizes = ['w-4 h-4', 'w-6 h-6', 'w-8 h-8', 'w-10 h-10', 'w-12 h-12', 'w-6 h-6', 'w-8 h-8', 'w-5 h-5'];
          return (
            <div
              key={`rising-${index}`}
              className={`absolute ${sizes[index]} bg-yellow-400/40 rounded-full animate-float-up`}
              style={{
                left: `${10 + (index * 10)}%`,
                bottom: '-50px',
                animationDelay: `${index * 0.5}s`,
                animationDuration: `${6 + index * 1}s`,
                zIndex: 15,
              }}
            />
          );
        })}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Glowing Orb Background */}
        <div className="absolute w-96 h-96 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />

        {/* Main Title Container */}
        <div className="text-center relative z-20 animate-fade-in">
          {/* Stream Has Ended Title */}
          <h1 className="text-6xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-gradient">
            Stream Has Ended
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-yellow-200 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-delay">
            Thank you for joining us in this spiritual journey. 
            The connection may have ended, but the message lives on.
          </p>

          {/* Current Time Display */}
          <div className="text-lg text-yellow-300 mb-8 font-mono animate-fade-in-delay-2">
            {currentTime.toLocaleTimeString('en-US', {
              hour12: true,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-delay-3">
            <button
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              onClick={() => window.location.href = 'https://biblenow.io'}
            >
              Return to BibleNOW
            </button>

            <button
              className="px-8 py-4 border-2 border-yellow-400 text-yellow-400 font-semibold rounded-full hover:bg-yellow-400 hover:text-darkBrown-900 transition-all duration-300"
              onClick={() => window.location.href = '/dashboard'}
            >
              View Dashboard
            </button>
          </div>

          {/* Bible Verse */}
          <div className="mt-16 p-6 bg-gradient-to-r from-darkBrown-800/50 to-chocolate-800/50 rounded-2xl backdrop-blur-sm border border-yellow-400/20 animate-fade-in-delay-4">
            <blockquote className="text-yellow-200 text-lg italic">
              "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace."
            </blockquote>
            <cite className="block text-yellow-400 text-sm mt-2">— Numbers 6:24-26</cite>
          </div>
        </div>

        {/* Bottom Wave Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-darkBrown-900 to-transparent animate-pulse" />
      </div>



      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in 1s ease-out 0.5s both;
        }
        
        .animate-fade-in-delay-2 {
          animation: fade-in 1s ease-out 1s both;
        }
        
        .animate-fade-in-delay-3 {
          animation: fade-in 1s ease-out 1.5s both;
        }
        
        .animate-fade-in-delay-4 {
          animation: fade-in 1s ease-out 2s both;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        @keyframes float-up {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        .animate-float-up {
          animation: float-up linear infinite;
        }
      `}</style>
    </div>
  );
};

export default EndStream; 