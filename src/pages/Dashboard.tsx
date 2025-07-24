import React from 'react';
import Layout from '../components/Layout/Layout';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import MetricCard from '../components/Dashboard/MetricCard';
import UsageCard from '../components/Dashboard/UsageCard';
import ChartCard from '../components/Dashboard/ChartCard';
import WeeklyUsageBar from '../components/Dashboard/WeeklyUsageBar';

const Dashboard: React.FC = () => {
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
        currentHours={0}
        weeklyLimit={3}
        unit="hours"
        daysRemaining={7}
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
