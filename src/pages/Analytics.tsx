import React from 'react';
import Layout from '../components/Layout/Layout';
import ChartCard from '../components/Dashboard/ChartCard';
import MetricCard from '../components/Dashboard/MetricCard';

const Analytics: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 transition-colors duration-200">Analytics</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard 
            title="Total Views" 
            value="0" 
            change="No change from last month"
            changeType="neutral"
          />
          <MetricCard 
            title="Unique Viewers" 
            value="0" 
            change="No change from last month"
            changeType="neutral"
          />
          <MetricCard 
            title="Average Watch Time" 
            value="0m 0s" 
            change="No change from last month"
            changeType="neutral"
          />
          <MetricCard 
            title="Engagement Rate" 
            value="0%" 
            change="No change from last month"
            changeType="neutral"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Viewership Trends">
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <p>Chart placeholder - Add your chart component here</p>
              </div>
            </div>
          </ChartCard>
          
          <ChartCard title="Geographic Distribution">
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">🌍</div>
                <p>Map placeholder - Add your map component here</p>
              </div>
            </div>
          </ChartCard>
        </div>

        <div className="bg-offWhite-25 dark:bg-darkBrown-800 rounded-lg shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 transition-colors duration-200">Top Performing Content</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-darkBrown-400 rounded-lg transition-colors duration-200">
              <div className="flex items-center space-x-4">
                                              <div className="w-12 h-12 bg-darkBrown-100 dark:bg-darkBrown-600 rounded-lg flex items-center justify-center transition-colors duration-200">
                  <span className="text-darkBrown-600 dark:text-darkBrown-200 font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white transition-colors duration-200">Sunday Service - March 15</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">2,847 views • 45m average watch time</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">+12%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">vs last week</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-darkBrown-400 rounded-lg transition-colors duration-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-darkBrown-100 dark:bg-darkBrown-600 rounded-lg flex items-center justify-center transition-colors duration-200">
                  <span className="text-darkBrown-600 dark:text-darkBrown-200 font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white transition-colors duration-200">Bible Study - March 12</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">1,234 views • 32m average watch time</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">+8%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">vs last week</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-darkBrown-400 rounded-lg transition-colors duration-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-darkBrown-100 dark:bg-darkBrown-600 rounded-lg flex items-center justify-center transition-colors duration-200">
                  <span className="text-darkBrown-200 font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white transition-colors duration-200">Youth Group - March 10</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">987 views • 28m average watch time</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-red-600">-3%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">vs last week</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics; 