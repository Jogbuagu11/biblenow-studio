import { ga4ApiService } from './ga4ApiService';

// GA4 Configuration
const GA4_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || 'G-MC0BNXJLBT'; // GA4 Analytics

// TypeScript declarations for gtag
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

class AnalyticsService {
  private isInitialized = false;

  // Initialize GA4
  initializeGA4(streamerId: string) {
    if (typeof window !== 'undefined' && window.gtag && !this.isInitialized) {
      window.gtag('config', GA4_MEASUREMENT_ID, {
        user_id: streamerId,
        custom_map: {
          'custom_dimension1': 'streamer_id',
          'custom_dimension2': 'stream_title',
          'custom_dimension3': 'stream_duration',
          'custom_dimension4': 'viewer_count',
          'custom_dimension5': 'engagement_rate'
        }
      });
      this.isInitialized = true;
    }
  }

  // Track stream start
  trackStreamStart(streamId: string, streamTitle: string, streamerId: string) {
    // Use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'stream_started', {
        stream_id: streamId,
        stream_title: streamTitle,
        streamer_id: streamerId,
        event_category: 'streaming',
        event_label: streamTitle
      });
    }
  }

  // Track stream end
  trackStreamEnd(streamId: string, streamTitle: string, streamerId: string, duration: number, viewerCount: number) {
    // Use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'stream_ended', {
        stream_id: streamId,
        stream_title: streamTitle,
        streamer_id: streamerId,
        stream_duration: duration,
        final_viewer_count: viewerCount,
        event_category: 'streaming',
        event_label: streamTitle
      });
    }
  }

  // Track viewer join
  trackViewerJoin(streamId: string, viewerId: string, streamerId: string) {
    // Use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'viewer_joined', {
        stream_id: streamId,
        viewer_id: viewerId,
        streamer_id: streamerId,
        event_category: 'streaming',
        event_label: streamId
      });
    }
  }

  // Track viewer leave
  trackViewerLeave(streamId: string, viewerId: string, streamerId: string, watchDuration: number, streamDuration: number) {
    // Use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'viewer_left', {
        stream_id: streamId,
        viewer_id: viewerId,
        streamer_id: streamerId,
        watch_duration: watchDuration,
        stream_duration: streamDuration,
        event_category: 'streaming',
        event_label: streamId
      });
    }
  }

  // Track viewer session start
  trackViewerSessionStart(streamId: string, viewerId: string, streamerId: string) {
    // Use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'viewer_session_start', {
        stream_id: streamId,
        viewer_id: viewerId,
        streamer_id: streamerId,
        event_category: 'streaming',
        event_label: streamId
      });
    }
  }

  // Track viewer session end
  trackViewerSessionEnd(streamId: string, viewerId: string, streamerId: string, streamDuration: number) {
    // Use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'viewer_session_end', {
        stream_id: streamId,
        viewer_id: viewerId,
        streamer_id: streamerId,
        stream_duration: streamDuration,
        event_category: 'streaming',
        event_label: streamId
      });
    }
  }

  // Track viewer count update
  trackViewerCountUpdate(streamId: string, streamerId: string, viewerCount: number) {
    // Use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'viewer_count_update', {
        stream_id: streamId,
        streamer_id: streamerId,
        viewer_count: viewerCount,
        event_category: 'streaming',
        event_label: streamId
      });
    }
  }

  // Track engagement metrics
  trackEngagementMetrics(streamId: string, streamerId: string, metrics: {
    averageWatchTime: number;
    engagementRate: number;
    uniqueViewers: number;
    peakViewers: number;
  }) {
    // Use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'engagement_metrics', {
        stream_id: streamId,
        streamer_id: streamerId,
        average_watch_time: metrics.averageWatchTime,
        engagement_rate: metrics.engagementRate,
        unique_viewers: metrics.uniqueViewers,
        peak_viewers: metrics.peakViewers,
        event_category: 'analytics',
        event_label: streamId
      });
    }
  }

  // Get streamer analytics
  async getStreamerAnalytics(streamerId: string, dateRange: { start: string; end: string }) {
    try {
      // Use GA4 API service for advanced analytics
      const analytics = await ga4ApiService.getEngagementData({
        startDate: dateRange.start,
        endDate: dateRange.end,
        streamerId
      });
      return analytics;
    } catch (error) {
      console.error('Error fetching streamer analytics:', error);
      return null;
    }
  }

  // Get engagement rate
  async getEngagementRate(streamerId: string): Promise<number> {
    try {
      // Use GA4 API service for engagement rate
      const engagementRate = await ga4ApiService.getStreamerEngagementRate(streamerId, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        end: new Date().toISOString().split('T')[0] // today
      });
      return engagementRate;
    } catch (error) {
      console.error('Error calculating engagement rate:', error);
      return 0;
    }
  }

  // Calculate engagement from GA4 data
  async calculateEngagementFromGA4(streamerId: string, dateRange: { start: string; end: string }): Promise<number> {
    try {
      // This would use GA4 API to fetch real data
      // For now, return a mock engagement rate
      const mockEngagementRate = Math.random() * 100;
      console.log('GA4 Analytics engagement rate for streamer:', streamerId, '=', mockEngagementRate + '%');
      return mockEngagementRate;
    } catch (error) {
      console.error('Error calculating engagement from GA4:', error);
      return 0;
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService; 