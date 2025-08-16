import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import ChartCard from '../components/Dashboard/ChartCard';
import MetricCard from '../components/Dashboard/MetricCard';

import UsageCard from '../components/Dashboard/UsageCard';
import WeeklyUsageBar from '../components/Dashboard/WeeklyUsageBar';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import { databaseService } from '../services/databaseService';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';

const Dashboard: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const [weeklyUsage, setWeeklyUsage] = useState({ totalHours: 0, totalMinutes: 0 });
  const [daysRemaining, setDaysRemaining] = useState(7);
  const [totalViews, setTotalViews] = useState(0);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('basic');
  const [streamingLimit, setStreamingLimit] = useState<number>(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.uid) {
        console.log('No user found, skipping dashboard data fetch');
        console.log('User object:', user);
        return;
      }

      console.log('Fetching dashboard data for user:', user.uid);
      console.log('Full user object:', user);

      try {
        // Fetch user profile to get subscription plan
        const userProfile = await databaseService.getUserProfile(user.uid);
        console.log('=== USER PROFILE DEBUG ===');
        console.log('Full user profile:', JSON.stringify(userProfile, null, 2));

        if (userProfile) {
          const plan = userProfile.subscription_plan || 'basic';
          setSubscriptionPlan(plan);
          console.log('Set subscription plan to:', plan);
        }

        // Get streaming limit based on subscription plan
        const limit = databaseService.getWeeklyLimitFromPlan(subscriptionPlan);
        setStreamingLimit(limit);

        // Fetch weekly usage
        const usage = await databaseService.getWeeklyUsage(user.uid);
        const remaining = databaseService.getDaysRemainingInWeek();
        console.log('Weekly usage data:', usage, 'Days remaining:', remaining);

        setWeeklyUsage(usage);
        setDaysRemaining(remaining);

        // Fetch total view count
        const views = await databaseService.getTotalViewCount(user.uid);
        setTotalViews(views);

        // Fetch total follower count
        const followers = await databaseService.getTotalFollowerCount(user.uid);
        setTotalFollowers(followers);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [user, subscriptionPlan]);

  return (
    <Layout>
      <DashboardHeader 
        title="Dashboard" 
        subtitle="Welcome to your BibleNow Studio dashboard"
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
        weeklyLimit={streamingLimit}
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
