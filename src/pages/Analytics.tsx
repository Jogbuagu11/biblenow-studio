import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import ChartCard from '../components/Dashboard/ChartCard';
import MetricCard from '../components/Dashboard/MetricCard';
import { databaseService } from '../services/databaseService';
import { analyticsService } from '../services/analyticsService';
import { ga4ApiService } from '../services/ga4ApiService';
import { useAuthStore } from '../stores/authStore';

const Analytics: React.FC = () => {
  const { user } = useAuthStore();
  const [totalViews, setTotalViews] = useState(0);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [topPerformingStreams, setTopPerformingStreams] = useState<any[]>([]);
  const [averageWatchTime, setAverageWatchTime] = useState('0m 0s');
  const [engagementRate, setEngagementRate] = useState(0);
  const [uniqueViewers, setUniqueViewers] = useState(0);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user?.uid) {
        console.log('No user found, skipping analytics data fetch');
        return;
      }

      try {
        // Fetch total view count
        const views = await databaseService.getTotalViewCount(user.uid);
        setTotalViews(views);

        // Fetch total follower count
        const followers = await databaseService.getTotalFollowerCount(user.uid);
        setTotalFollowers(followers);

        // Fetch top performing streams
        const topStreams = await databaseService.getTopPerformingStreams(user.uid);
        setTopPerformingStreams(topStreams);

        // Fetch average watch time
        const watchTime = await databaseService.getAverageWatchTime(user.uid);
        setAverageWatchTime(watchTime.formattedTime);

        // Fetch engagement rate from GA4
        const engagement = await analyticsService.getEngagementRate(user.uid);
        setEngagementRate(engagement);

        // Fetch additional GA4 data
        const dateRange = {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        };
        
        const ga4Data = await ga4ApiService.getEngagementData({
          startDate: dateRange.start,
          endDate: dateRange.end,
          streamerId: user.uid
        });
        
        setUniqueViewers(ga4Data.uniqueViewers);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
        setTotalViews(0);
        setTotalFollowers(0);
        setTopPerformingStreams([]);
        setAverageWatchTime('0m 0s');
        setEngagementRate(0);
        setUniqueViewers(0);
      }
    };

    fetchAnalyticsData();
  }, [user]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 transition-colors duration-200">Analytics</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard 
            title="Total Views" 
            value={totalViews.toString()} 
            change="No change from last month"
            changeType="neutral"
          />
          <MetricCard 
            title="Engagement Rate" 
            value={`${engagementRate}%`} 
            change="No change from last month"
            changeType="neutral"
          />
          <MetricCard 
            title="Unique Viewers" 
            value={uniqueViewers.toString()} 
            change="No change from last month"
            changeType="neutral"
          />
          <MetricCard 
            title="Average Watch Time" 
            value={averageWatchTime} 
            change="No change from last month"
            changeType="neutral"
          />
          <MetricCard 
            title="Followers" 
            value={totalFollowers.toString()} 
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
          
          {topPerformingStreams.length > 0 ? (
            <div className="space-y-4">
              {topPerformingStreams.map((stream) => (
                <div key={stream.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-darkBrown-400 rounded-lg transition-colors duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-darkBrown-100 dark:bg-darkBrown-600 rounded-lg flex items-center justify-center transition-colors duration-200">
                      <span className="text-darkBrown-600 dark:text-darkBrown-200 font-semibold">{stream.rank}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                        {stream.title || 'Untitled Stream'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">
                        {stream.viewer_count} views
                        {stream.duration && ` • ${stream.duration}m duration`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">Top Performer</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">
                      {stream.started_at ? new Date(stream.started_at).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-500 dark:text-gray-400">No content available yet. Start streaming to see your top performing content here.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Analytics; 