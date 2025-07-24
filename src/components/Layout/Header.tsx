import React from 'react';

interface HeaderProps {
  title?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  disableDarkMode?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title = "BibleNOW Studio", user, disableDarkMode = false }) => {
  return (
    <header className="shadow-sm border-b border-gray-200 dark:border-yellow-500 bg-offWhite-25 dark:bg-darkBrown-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
              {title}
            </h1>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-darkBrown-200 transition-colors duration-200">
                {user.name}
              </span>
              {user.avatar && (
                <img 
                  className="h-8 w-8 rounded-full" 
                  src={user.avatar} 
                  alt={user.name} 
                />
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
