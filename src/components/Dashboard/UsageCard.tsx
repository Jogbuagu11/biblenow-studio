import React from 'react';

interface UsageCardProps {
  title: string;
  current: number;
  limit: number;
  unit?: string;
}

const UsageCard: React.FC<UsageCardProps> = ({ title, current, limit, unit = 'GB' }) => {
  const percentage = Math.min((current / limit) * 100, 100);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{current} {unit}</span>
          <span>{limit} {unit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {percentage.toFixed(1)}% used
        </p>
      </div>
    </div>
  );
};

export default UsageCard;
