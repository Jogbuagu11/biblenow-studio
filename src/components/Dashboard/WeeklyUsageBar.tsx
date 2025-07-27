import React from 'react';

interface WeeklyUsageBarProps {
  currentHours: number;
  weeklyLimit: number;
  unit?: string;
  daysRemaining?: number;
  subscriptionPlan?: string;
}

const WeeklyUsageBar: React.FC<WeeklyUsageBarProps> = ({
  currentHours = 0,
  weeklyLimit = 0, // Default to 0 minutes
  unit = "hours",
  daysRemaining = 7,
  subscriptionPlan = ""
}) => {
  // Convert weekly limit from minutes to the display unit
  const weeklyLimitInUnit = unit === "hours" ? weeklyLimit / 60 : weeklyLimit;
  const percentage = weeklyLimitInUnit > 0 ? Math.min((currentHours / weeklyLimitInUnit) * 100, 100) : 0;
  const remainingInUnit = Math.max(weeklyLimitInUnit - currentHours, 0);
  
  // Calculate daily average (avoid division by zero)
  const daysElapsed = Math.max(7 - daysRemaining, 1); // At least 1 day to avoid division by zero
  const dailyAverage = currentHours / daysElapsed;
  const projectedWeekly = dailyAverage * 7;
  
  // Determine color based on usage
  const getColorClass = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getTextColorClass = () => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    if (percentage >= 50) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg border border-gray-200 dark:border-darkBrown-400 shadow-md p-6 mb-8 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">Weekly Streaming Usage</h3>
          <p className="text-sm text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">
            {daysRemaining} days remaining this week
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {subscriptionPlan ? `Plan: ${subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1).toLowerCase()}` : 'No plan set'}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getTextColorClass()}`}>
            {weeklyLimitInUnit > 0 ? `${currentHours.toFixed(1)}/${weeklyLimitInUnit} ${unit}` : `${currentHours.toFixed(1)}/0 ${unit}`}
          </div>
          <div className="text-sm text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">
            {weeklyLimitInUnit > 0 ? `${percentage.toFixed(1)}% used` : 'No streaming limit set'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-darkBrown-200 mb-2 transition-colors duration-200">
          <span>0 {unit}</span>
          <span>{weeklyLimitInUnit > 0 ? `${weeklyLimitInUnit} ${unit}` : `0 ${unit}`}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-darkBrown-500 rounded-full h-3 transition-colors duration-200">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${getColorClass()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Usage Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-lg border border-gray-200 dark:border-yellow-500 transition-colors duration-200">
          <div className="text-sm text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">Remaining</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
            {weeklyLimitInUnit > 0 ? `${remainingInUnit.toFixed(1)} ${unit}` : `0 ${unit}`}
          </div>
        </div>
        <div className="text-center p-3 rounded-lg border border-gray-200 dark:border-yellow-500 transition-colors duration-200">
          <div className="text-sm text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">Daily Average</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
            {dailyAverage.toFixed(1)} {unit}/day
          </div>
        </div>
        <div className="text-center p-3 rounded-lg border border-gray-200 dark:border-yellow-500 transition-colors duration-200">
          <div className="text-sm text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">Projected Weekly</div>
          <div className={`text-lg font-semibold transition-colors duration-200 ${
            weeklyLimitInUnit > 0 && projectedWeekly > weeklyLimitInUnit ? 'text-red-600' : 'text-gray-900 dark:text-white'
          }`}>
            {projectedWeekly.toFixed(1)} {unit}
          </div>
        </div>
      </div>

      {/* Usage Status */}
      <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-darkBrown-600 border border-blue-200 dark:border-yellow-500 transition-colors duration-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {percentage >= 90 ? (
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : percentage >= 75 ? (
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 dark:text-darkBrown-200 transition-colors duration-200">
              {weeklyLimitInUnit === 0 
                ? `No streaming plan active. Please subscribe to start streaming.`
                : percentage >= 90 
                ? `You're approaching your weekly limit. Consider upgrading your plan.`
                : percentage >= 75 
                ? `You're using ${percentage.toFixed(1)}% of your weekly allocation.`
                : `You have ${remainingInUnit.toFixed(1)} ${unit} remaining this week.`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyUsageBar; 