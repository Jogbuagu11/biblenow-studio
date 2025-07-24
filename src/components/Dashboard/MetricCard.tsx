import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType = 'neutral' }) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600 dark:text-darkBrown-200';
    }
  };

  return (
    <div className="bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg border-0.5 border-gray-200 dark:border-yellow-500 shadow-md p-6 transition-colors duration-200">
      <h3 className="text-sm font-medium text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2 transition-colors duration-200">{value}</p>
      {change && (
        <p className={`text-sm mt-2 ${getChangeColor()}`}>
          {change}
        </p>
      )}
    </div>
  );
};

export default MetricCard;
