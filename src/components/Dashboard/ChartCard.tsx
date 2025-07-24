import React from 'react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, className = "" }) => {
  return (
    <div className={`bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg border border-gray-200 dark:border-yellow-500 shadow-md p-6 transition-colors duration-200 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 transition-colors duration-200">{title}</h3>
      {children}
    </div>
  );
};

export default ChartCard;
