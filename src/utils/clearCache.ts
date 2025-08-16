/**
 * Utility functions to clear browser cache and service workers
 * This helps resolve CORS issues that might be caused by cached resources
 */

export const clearBrowserCache = async (): Promise<void> => {
  try {
    // Clear service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Service worker unregistered');
      }
    }

    // Clear cache storage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Cache storage cleared');
    }

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    console.log('Local and session storage cleared');

  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

export const checkForCorsIssues = (): void => {
  // Monitor for CORS errors in console
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('CORS') || message.includes('manifest.json')) {
      console.warn('CORS issue detected. Consider clearing browser cache or checking network requests.');
    }
    originalError.apply(console, args);
  };
};

export const clearAuthCache = (): void => {
  try {
    // Clear authentication-related storage
    localStorage.removeItem('auth-storage');
    sessionStorage.clear();
    
    // Clear any cached user data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('user') || key.includes('firebase'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('Authentication cache cleared. Please log in again.');
  } catch (error) {
    console.error('Error clearing auth cache:', error);
  }
};

export const validateUserIdFormat = (userId: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
}; 