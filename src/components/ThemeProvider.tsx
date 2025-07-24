import React, { useEffect } from 'react';
import { useThemeStore } from '../stores';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    // Initialize theme on app load
    initializeTheme();
  }, [initializeTheme]);

  return <>{children}</>;
};

export default ThemeProvider; 