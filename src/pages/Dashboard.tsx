import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import ChartCard from '../components/Dashboard/ChartCard';
import MetricCard from '../components/Dashboard/MetricCard';
import UsageCard from '../components/Dashboard/UsageCard';
import WeeklyUsageBar from '../components/Dashboard/WeeklyUsageBar';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import StreamingLimitBanner from '../components/StreamingLimitBanner';
import { databaseService } from '../services/databaseService';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';

const Dashboard: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const [weeklyUsage, setWeeklyUsage] = useState({ totalHours: 0, totalMinutes: 0 });
  const [daysRemaining, setDaysRemaining] = useState(7);
  const [totalViews, setTotalViews] = useState(0);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('');
  const [streamingLimit, setStreamingLimit] = useState<number>(0);
  const [streamingLimitData, setStreamingLimitData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.uid) return;

      try {
        console.log('Fetching dashboard data for user:', user.uid);

        // Get user profile with subscription plan
        const profile = await databaseService.getUserProfile(user.uid);
        console.log('User profile:', profile);

        if (profile) {
          // Set subscription plan name
          setSubscriptionPlan(profile.subscription_plans?.name || '');
          
          // Set streaming limit in minutes
          const limitMinutes = profile.subscription_plans?.streaming_minutes_limit || 0;
          console.log('User profile data:', {
            subscriptionPlan: profile.subscription_plans?.name,
            subscriptionPlanId: profile.subscription_plan_id,
            streamingMinutesLimit: limitMinutes,
            planDetails: profile.subscription_plans
          });
          console.log('Setting streaming limit:', limitMinutes, 'minutes');
          setStreamingLimit(limitMinutes);
        }

        // Get weekly usage
        const usage = await databaseService.getWeeklyUsage(user.uid);
        console.log('Weekly usage:', usage);
        setWeeklyUsage(usage);

        // Get days remaining
        const remaining = databaseService.getDaysRemainingInWeek();
        console.log('Days remaining:', remaining);
        setDaysRemaining(remaining);

        // Get total views
        const views = await databaseService.getTotalViewCount(user.uid);
        console.log('Total views:', views);
        setTotalViews(views);

        // Get total followers
        const followers = await databaseService.getTotalFollowerCount(user.uid);
        console.log('Total followers:', followers);
        setTotalFollowers(followers);

        // Get streaming limit data
        const limitData = await databaseService.checkWeeklyStreamingLimit(user.uid);
        console.log('Streaming limit data:', limitData);
        setStreamingLimitData(limitData);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [user?.uid]);

  return (
    <Layout>
      <DashboardHeader 
        title="Dashboard" 
        subtitle="Welcome to your BibleNow Studio dashboard"
      />
      
      
      {/* Streaming Limit Banner */}
      <StreamingLimitBanner 
        streamingLimit={streamingLimitData}
        subscriptionPlan={subscriptionPlan}
        onUpgrade={() => window.location.href = '/settings'}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Total Views" 
          value={totalViews.toString()} 
          change="No change from last month"
          changeType="neutral"
        />
        <MetricCard 
          title="Active Streams" 
          value="0" 
          change="No change from yesterday"
          changeType="neutral"
        />
        <MetricCard 
          title="Followers" 
          value={totalFollowers.toString()} 
          change="No change from last week"
          changeType="neutral"
        />
        <MetricCard 
          title="Revenue" 
          value="$0" 
          change="No change from last month"
          changeType="neutral"
        />
      </div>

      {/* Weekly Streaming Usage Bar */}
      <WeeklyUsageBar 
        currentHours={weeklyUsage.totalHours}
        weeklyLimit={streamingLimit} // streamingLimit is in minutes
        unit="hours"
        daysRemaining={daysRemaining}
        subscriptionPlan={subscriptionPlan}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsageCard 
          title="Storage Usage" 
          current={0} 
          limit={100} 
          unit="GB"
        />
        <ChartCard title="Viewership Trends">
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart placeholder - Add your chart component here
          </div>
        </ChartCard>
      </div>

    </Layout>
  );
};

export default Dashboard;