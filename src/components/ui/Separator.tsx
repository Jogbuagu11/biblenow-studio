import React from 'react';

interface SeparatorProps {
  className?: string;
}

const Separator: React.FC<SeparatorProps> = ({ className = "" }) => {
  return (
    <div className={`border-t border-gray-200 dark:border-yellow-600 ${className}`} />
  );
};

export default Separator; 