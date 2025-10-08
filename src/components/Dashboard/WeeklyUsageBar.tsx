import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface WeeklyUsageBarProps {
  currentHours?: number;
  weeklyLimit?: number;
  unit?: "hours" | "minutes";
  daysRemaining?: number;
  subscriptionPlan?: string;
}

const WeeklyUsageBar: React.FC<WeeklyUsageBarProps> = ({
  currentHours = 0,
  weeklyLimit = 0,
  unit = "hours",
  daysRemaining = 0,
  subscriptionPlan = ''
}) => {
  // Debug logging
  console.log('WeeklyUsageBar Props:', {
    currentHours,
    weeklyLimit,
    unit,
    daysRemaining,
    subscriptionPlan
  });

  // Convert weekly limit to display unit if needed
  const weeklyLimitInUnit = unit === "hours" ? weeklyLimit / 60 : weeklyLimit;
  const currentInUnit = unit === "hours" ? currentHours : currentHours * 60;
  const remainingInUnit = Math.max(0, weeklyLimitInUnit - currentInUnit);
  
  // Calculate percentage with safety checks
  const percentage = weeklyLimitInUnit > 0 ? (currentInUnit / weeklyLimitInUnit) * 100 : 0;

  // Debug logging for calculations
  console.log('WeeklyUsageBar Calculations:', {
    weeklyLimitInUnit,
    currentInUnit,
    remainingInUnit,
    percentage
  });

  const getColorClass = () => {
    if (weeklyLimitInUnit <= 0) return 'bg-gray-400';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColorClass = () => {
    if (weeklyLimitInUnit <= 0) return 'text-gray-600 dark:text-gray-400';
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
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
            {subscriptionPlan ? `Plan: ${subscriptionPlan}` : 'No plan set'}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getTextColorClass()}`}>
            {`${currentInUnit.toFixed(1)}/${weeklyLimitInUnit.toFixed(1)} ${unit}`}
          </div>
          <div className="text-sm text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">
            {weeklyLimitInUnit > 0 ? `${percentage.toFixed(1)}% used` : (subscriptionPlan ? 'Loading limit...' : 'No plan active')}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-darkBrown-200 mb-2 transition-colors duration-200">
          <span>0 {unit}</span>
          <span>{weeklyLimitInUnit.toFixed(1)} {unit}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-darkBrown-500 rounded-full h-3 transition-colors duration-200">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${getColorClass()}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      </div>

      {/* Usage Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">Remaining</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-200">
            {remainingInUnit.toFixed(1)} {unit}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">Daily Average</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-200">
            {daysRemaining > 0 ? (remainingInUnit / daysRemaining).toFixed(1) : '0.0'} {unit}/day
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-darkBrown-200 transition-colors duration-200">Projected Weekly</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-200">
            {currentInUnit.toFixed(1)} {unit}
          </p>
        </div>
      </div>

      {/* Status Message */}
      <div className="mt-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {percentage >= 75 ? (
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 dark:text-darkBrown-200 transition-colors duration-200">
              {!subscriptionPlan 
                ? 'No streaming plan active. Please subscribe to start streaming.'
                : weeklyLimitInUnit <= 0 
                ? 'Loading your streaming limits...'
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