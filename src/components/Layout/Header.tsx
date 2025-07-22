import React from 'react';

interface HeaderProps {
  title?: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

const Header: React.FC<HeaderProps> = ({ title = "BibleNow Studio", user }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.name}</span>
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
