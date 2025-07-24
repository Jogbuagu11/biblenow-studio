import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp] = useState(false); // Signup is disabled
  const [displayName] = useState(''); // Not used
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signUp, isLoading, error, clearError } = useAuthStore();

  // Get the intended destination from location state
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await login(email, password);
      }
      
      // Navigate to the intended destination or dashboard
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled by the auth store
      console.error('Authentication error:', error);
    }
  };

  // Signup is disabled, so no toggle functionality needed

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-yellow-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-3xl p-10 shadow-2xl border border-slate-600/50 max-w-md w-full backdrop-blur-sm relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-3xl"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <img 
              src="https://jhlawjmyorpmafokxtuh.supabase.co/storage/v1/object/sign/assets/Bible%20NW500.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82OWRmNmQwOC1iYTlmLTQ2NDItYmQ4MS05ZDIzNGNmYTI1M2QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvQmlibGUgTlc1MDAucG5nIiwiaWF0IjoxNzUzMzIyOTc5LCJleHAiOjE5MTEwMDI5Nzl9.liuTl6gCtDUYUBi4GNxBO_UUrZ2SYvBpyblwj1aEEMU"
              alt="BibleNOW Studio Logo"
              className="w-16 h-16 mx-auto mb-4 shadow-lg"
            />
            <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="text-slate-300 text-lg">
              Sign in to access BibleNOW Studio
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-semibold text-slate-200 mb-3 text-lg">
                  Display Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-slate-400 group-focus-within:text-yellow-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                                     <input
                     type="text"
                     id="displayName"
                     value={displayName}
                     onChange={() => {}} // Disabled
                     placeholder="Enter your display name"
                     className="block w-full pl-12 pr-4 py-4 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 bg-slate-700/50 text-white placeholder-slate-400 transition-all duration-300 hover:bg-slate-700/70"
                     required={isSignUp}
                     disabled
                   />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-200 mb-3 text-lg">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <svg className="h-6 w-6 text-slate-400 group-focus-within:text-yellow-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="block w-full pl-12 pr-4 py-4 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 bg-slate-700/50 text-white placeholder-slate-400 transition-all duration-300 hover:bg-slate-700/70"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-200 mb-3 text-lg">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <svg className="h-6 w-6 text-slate-400 group-focus-within:text-yellow-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-12 pr-4 py-4 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 bg-slate-700/50 text-white placeholder-slate-400 transition-all duration-300 hover:bg-slate-700/70"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 text-slate-800 py-4 px-6 rounded-2xl font-bold text-lg hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-500 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02] relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-800 mr-2"></div>
                  Signing In...
                </div>
              ) : (
                <>
                  <span className="relative z-10">Sign In</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </>
              )}
            </button>
          </form>
          
          {/* Verified Profiles Notice */}
          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              Access restricted to verified profiles only.
            </p>
          </div>

          {/* Back to Landing */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-slate-200 text-sm transition-all duration-200"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 