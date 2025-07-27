import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import MetricCard from '../components/Dashboard/MetricCard';
import UsageCard from '../components/Dashboard/UsageCard';
import ChartCard from '../components/Dashboard/ChartCard';
import WeeklyUsageBar from '../components/Dashboard/WeeklyUsageBar';
import { databaseService } from '../services/databaseService';
import { useAuthStore } from '../stores/authStore';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [weeklyUsage, setWeeklyUsage] = useState({ totalHours: 0, totalMinutes: 0 });
  const [daysRemaining, setDaysRemaining] = useState(7);
  const [weeklyLimit, setWeeklyLimit] = useState(0); // Start with 0 minutes
  const [subscriptionPlan, setSubscriptionPlan] = useState(''); // Don't default to any plan

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
        console.log('User profile subscription_plan:', userProfile?.subscription_plan);
        console.log('User profile subscription_plan_id:', userProfile?.subscription_plan_id);
        console.log('Subscription plan details:', userProfile?.subscription_plans);
        console.log('=== END USER PROFILE DEBUG ===');
        
        // Get the actual subscription plan from the user's profile
        const actualPlan = userProfile?.subscription_plan;
        
        // Handle subscription_plans data which might be an array or object
        let streamingMinutesLimit;
        if (Array.isArray(userProfile?.subscription_plans)) {
          streamingMinutesLimit = userProfile?.subscription_plans[0]?.streaming_minutes_limit;
        } else {
          streamingMinutesLimit = userProfile?.subscription_plans?.streaming_minutes_limit;
        }
        
        console.log('Actual subscription plan from database:', actualPlan);
        console.log('Streaming minutes limit:', streamingMinutesLimit);
        console.log('Full subscription plans object:', userProfile?.subscription_plans);
        
        // Only set the plan if it actually exists, don't default to olive
        if (actualPlan) {
          setSubscriptionPlan(actualPlan);
        }
        
        const limit = databaseService.getWeeklyLimitFromPlan(actualPlan, streamingMinutesLimit);
        console.log('Weekly limit based on plan:', actualPlan, '=', limit, 'minutes');
        setWeeklyLimit(limit);

        // Fetch weekly usage
        const usage = await databaseService.getWeeklyUsage(user.uid);
        const remaining = databaseService.getDaysRemainingInWeek();
        console.log('Weekly usage data:', usage, 'Days remaining:', remaining);
        
        setWeeklyUsage(usage);
        setDaysRemaining(remaining);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Set default values on error, but don't assume olive plan
        setWeeklyUsage({ totalHours: 0, totalMinutes: 0 });
        setDaysRemaining(7);
        setWeeklyLimit(0); // No plan = 0 minutes
        // Don't set subscription plan to olive on error
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <Layout>
      <DashboardHeader 
        title="Dashboard" 
        subtitle="Welcome to your BibleNow Studio dashboard"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Total Views" 
          value="0" 
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
          value="0" 
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
        weeklyLimit={weeklyLimit}
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
