import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen flex transition-colors duration-200">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={toggleSidebar}
        className="h-screen sticky top-0"
      />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 text-gray-900 dark:text-white transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
