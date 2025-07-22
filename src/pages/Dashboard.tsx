import React from 'react';
import Layout from '../components/Layout/Layout';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import MetricCard from '../components/Dashboard/MetricCard';
import UsageCard from '../components/Dashboard/UsageCard';
import ChartCard from '../components/Dashboard/ChartCard';

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
          value="12,847" 
          change="+12% from last month"
          changeType="positive"
        />
        <MetricCard 
          title="Active Streams" 
          value="3" 
          change="+1 from yesterday"
          changeType="positive"
        />
        <MetricCard 
          title="Subscribers" 
          value="1,234" 
          change="+5% from last week"
          changeType="positive"
        />
        <MetricCard 
          title="Revenue" 
          value="$2,847" 
          change="-2% from last month"
          changeType="negative"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsageCard 
          title="Storage Usage" 
          current={45.2} 
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
