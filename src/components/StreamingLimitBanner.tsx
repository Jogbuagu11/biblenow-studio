import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock, Zap, TrendingUp } from 'lucide-react';
import { useToast } from "../hooks/use-toast";

interface StreamingLimitData {
  hasReachedLimit: boolean;
  currentMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
  usagePercentage: number;
}

interface StreamingLimitBannerProps {
  streamingLimit: StreamingLimitData | null;
  subscriptionPlan?: string;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

const StreamingLimitBanner: React.FC<StreamingLimitBannerProps> = ({
  streamingLimit,
  subscriptionPlan,
  onUpgrade,
  onDismiss
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastNotificationPercentage, setLastNotificationPercentage] = useState(0);
  const { toast } = useToast();

  // Show progressive notifications
  useEffect(() => {
    if (!streamingLimit) return;

    const { usagePercentage } = streamingLimit;
    
    // Only show notifications when crossing thresholds (not on every render)
    if (usagePercentage >= 100 && lastNotificationPercentage < 100) {
      toast({
        title: "🚫 Streaming Limit Reached",
        description: "You cannot start new streams until your limit resets next week.",
        variant: "destructive"
      });
      setLastNotificationPercentage(100);
    } else if (usagePercentage >= 90 && lastNotificationPercentage < 90) {
      toast({
        title: "⚠️ 90% Limit Reached",
        description: "You're very close to your weekly streaming limit!",
        variant: "destructive"
      });
      setLastNotificationPercentage(90);
    } else if (usagePercentage >= 75 && lastNotificationPercentage < 75) {
      toast({
        title: "📊 75% Limit Reached",
        description: "Consider upgrading your plan for more streaming time.",
        variant: "default"
      });
      setLastNotificationPercentage(75);
    } else if (usagePercentage >= 50 && lastNotificationPercentage < 50) {
      toast({
        title: "📈 Halfway There",
        description: "You've used 50% of your weekly streaming limit.",
        variant: "default"
      });
      setLastNotificationPercentage(50);
    }
  }, [streamingLimit?.usagePercentage, lastNotificationPercentage, toast]);

  // Don't show banner if dismissed or no limit data
  if (isDismissed || !streamingLimit) return null;

  const { hasReachedLimit, currentMinutes, limitMinutes, remainingMinutes, usagePercentage } = streamingLimit;

  // Only show banner for significant usage or limits reached
  if (usagePercentage < 50 && !hasReachedLimit) return null;

  const getBannerStyle = () => {
    if (hasReachedLimit) {
      return {
        bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        text: 'text-red-800 dark:text-red-200',
        icon: 'text-red-600 dark:text-red-400'
      };
    } else if (usagePercentage >= 90) {
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        text: 'text-orange-800 dark:text-orange-200',
        icon: 'text-orange-600 dark:text-orange-400'
      };
    } else if (usagePercentage >= 75) {
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-800 dark:text-yellow-200',
        icon: 'text-yellow-600 dark:text-yellow-400'
      };
    } else {
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        text: 'text-blue-800 dark:text-blue-200',
        icon: 'text-blue-600 dark:text-blue-400'
      };
    }
  };

  const style = getBannerStyle();

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getNextResetDate = () => {
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (7 - now.getDay() + 1) % 7);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`${style.bg} border rounded-lg p-4 mb-6 transition-all duration-300`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className={`h-6 w-6 ${style.icon}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${style.text}`}>
              {hasReachedLimit 
                ? '🚫 Weekly Streaming Limit Reached'
                : usagePercentage >= 90 
                ? '⚠️ Approaching Streaming Limit'
                : usagePercentage >= 75 
                ? '📊 High Usage Alert'
                : '📈 Streaming Usage Update'
              }
            </h3>
            
            <button
              onClick={handleDismiss}
              className={`${style.text} hover:opacity-70 transition-opacity`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className={`mt-2 text-sm ${style.text}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div className="flex items-center">
                <TrendingUp className={`h-4 w-4 mr-2 ${style.icon}`} />
                <span>
                  <strong>{usagePercentage.toFixed(1)}%</strong> used 
                  ({formatTime(currentMinutes)} of {formatTime(limitMinutes)})
                </span>
              </div>
              
              <div className="flex items-center">
                <Clock className={`h-4 w-4 mr-2 ${style.icon}`} />
                <span>
                  <strong>{formatTime(remainingMinutes)}</strong> remaining
                </span>
              </div>
              
              <div className="flex items-center">
                <Zap className={`h-4 w-4 mr-2 ${style.icon}`} />
                <span>
                  Resets <strong>{getNextResetDate()}</strong>
                </span>
              </div>
            </div>
            
            <p className="mb-3">
              {hasReachedLimit 
                ? `You've reached your ${subscriptionPlan || 'current'} plan's weekly streaming limit. You can schedule streams for after ${getNextResetDate()} or upgrade your plan for immediate access.`
                : usagePercentage >= 90 
                ? `You're using ${usagePercentage.toFixed(1)}% of your weekly limit. Consider upgrading to avoid interruptions.`
                : usagePercentage >= 75 
                ? `You've used ${usagePercentage.toFixed(1)}% of your weekly streaming allocation. Plan accordingly or upgrade for more time.`
                : `You're at ${usagePercentage.toFixed(1)}% of your weekly streaming limit. You're doing great!`
              }
            </p>
            
            {(hasReachedLimit || usagePercentage >= 75) && onUpgrade && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onUpgrade}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Upgrade Plan
                </button>
                
                {hasReachedLimit && (
                  <button
                    onClick={() => {
                      // Navigate to schedule page with future date
                      window.location.href = '/schedule';
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Schedule for Next Week
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingLimitBanner;
