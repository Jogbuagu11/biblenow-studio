import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default to dark mode
      isDarkMode: true,
      
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        set({ 
          theme: newTheme, 
          isDarkMode: newTheme === 'dark' 
        });
        
        // Apply theme to document
        applyThemeToDocument(newTheme);
      },
      
      setTheme: (theme: Theme) => {
        set({ 
          theme, 
          isDarkMode: theme === 'dark' 
        });
        
        // Apply theme to document
        applyThemeToDocument(theme);
      },

      initializeTheme: () => {
        const currentTheme = get().theme;
        applyThemeToDocument(currentTheme);
      },
    }),
    {
      name: 'biblenow-theme', // Local storage key
      onRehydrateStorage: () => (state) => {
        // Apply theme when store is rehydrated
        if (state) {
          applyThemeToDocument(state.theme);
        }
      },
    }
  )
);

// Helper function to apply theme to document
function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

// Initialize theme on app load
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('biblenow-theme');
  if (savedTheme) {
    try {
      const parsed = JSON.parse(savedTheme);
      if (parsed.state?.theme) {
        applyThemeToDocument(parsed.state.theme);
      }
    } catch (error) {
      console.error('Error parsing saved theme:', error);
      applyThemeToDocument('dark'); // Fallback to dark
    }
  } else {
    applyThemeToDocument('dark'); // Default to dark
  }
} 