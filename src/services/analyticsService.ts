import { analytics } from '../config/firebase';
import { logEvent } from 'firebase/analytics';
import { ga4ApiService } from './ga4ApiService';

// GA4 Configuration
const FIREBASE_MEASUREMENT_ID = process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-MC0BNXJLBT'; // Firebase Analytics

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
      window.gtag('config', FIREBASE_MEASUREMENT_ID, {
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
    // Use Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'stream_started', {
        stream_id: streamId,
        stream_title: streamTitle,
        streamer_id: streamerId,
        event_category: 'streaming',
        event_label: streamTitle
      });
    }
    
    // Also use gtag for GA4
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
    // Use Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'stream_ended', {
        stream_id: streamId,
        stream_title: streamTitle,
        streamer_id: streamerId,
        stream_duration: duration,
        final_viewer_count: viewerCount,
        event_category: 'streaming',
        event_label: streamTitle
      });
    }
    
    // Also use gtag for GA4
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
    // Use Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'viewer_joined', {
        stream_id: streamId,
        viewer_id: viewerId,
        streamer_id: streamerId,
        event_category: 'viewer_engagement',
        event_label: 'viewer_join'
      });
    }
    
    // Also use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'viewer_joined', {
        stream_id: streamId,
        viewer_id: viewerId,
        streamer_id: streamerId,
        event_category: 'viewer_engagement',
        event_label: 'viewer_join'
      });
    }
  }

  // Track viewer leave with engagement data
  trackViewerLeave(streamId: string, viewerId: string, streamerId: string, watchDuration: number, streamDuration: number) {
    const engagementRate = streamDuration > 0 ? (watchDuration / streamDuration) * 100 : 0;
    
    // Use Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'viewer_left', {
        stream_id: streamId,
        viewer_id: viewerId,
        streamer_id: streamerId,
        watch_duration: watchDuration,
        stream_duration: streamDuration,
        engagement_rate: engagementRate,
        event_category: 'viewer_engagement',
        event_label: 'viewer_leave'
      });
    }
    
    // Also use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'viewer_left', {
        stream_id: streamId,
        viewer_id: viewerId,
        streamer_id: streamerId,
        watch_duration: watchDuration,
        stream_duration: streamDuration,
        engagement_rate: engagementRate,
        event_category: 'viewer_engagement',
        event_label: 'viewer_leave'
      });
    }
  }

  // Track viewer session start
  trackViewerSessionStart(streamId: string, viewerId: string, streamerId: string) {
    const sessionStartTime = Date.now();
    
    // Store session start time in localStorage for calculation
    const sessionKey = `session_${streamId}_${viewerId}`;
    localStorage.setItem(sessionKey, sessionStartTime.toString());
    
    // Use Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'viewer_session_start', {
        stream_id: streamId,
        viewer_id: viewerId,
        streamer_id: streamerId,
        session_start_time: sessionStartTime,
        event_category: 'viewer_engagement',
        event_label: 'session_start'
      });
    }
  }

  // Track viewer session end with calculated duration
  trackViewerSessionEnd(streamId: string, viewerId: string, streamerId: string, streamDuration: number) {
    const sessionKey = `session_${streamId}_${viewerId}`;
    const sessionStartTime = localStorage.getItem(sessionKey);
    
    if (sessionStartTime) {
      const startTime = parseInt(sessionStartTime);
      const endTime = Date.now();
      const watchDuration = Math.round((endTime - startTime) / 60000); // minutes
      const engagementRate = streamDuration > 0 ? (watchDuration / streamDuration) * 100 : 0;
      
      // Clear session data
      localStorage.removeItem(sessionKey);
      
      // Use Firebase Analytics
      if (analytics) {
        logEvent(analytics, 'viewer_session_end', {
          stream_id: streamId,
          viewer_id: viewerId,
          streamer_id: streamerId,
          watch_duration: watchDuration,
          stream_duration: streamDuration,
          engagement_rate: engagementRate,
          session_duration_ms: endTime - startTime,
          event_category: 'viewer_engagement',
          event_label: 'session_end'
        });
      }
      
      // Also use gtag for GA4
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'viewer_session_end', {
          stream_id: streamId,
          viewer_id: viewerId,
          streamer_id: streamerId,
          watch_duration: watchDuration,
          stream_duration: streamDuration,
          engagement_rate: engagementRate,
          session_duration_ms: endTime - startTime,
          event_category: 'viewer_engagement',
          event_label: 'session_end'
        });
      }
    }
  }

  // Track viewer count updates
  trackViewerCountUpdate(streamId: string, streamerId: string, viewerCount: number) {
    // Use Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'viewer_count_update', {
        stream_id: streamId,
        streamer_id: streamerId,
        viewer_count: viewerCount,
        event_category: 'streaming',
        event_label: 'viewer_count'
      });
    }
    
    // Also use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'viewer_count_update', {
        stream_id: streamId,
        streamer_id: streamerId,
        viewer_count: viewerCount,
        event_category: 'streaming',
        event_label: 'viewer_count'
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
    // Use Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'engagement_metrics', {
        stream_id: streamId,
        streamer_id: streamerId,
        average_watch_time: metrics.averageWatchTime,
        engagement_rate: metrics.engagementRate,
        unique_viewers: metrics.uniqueViewers,
        peak_viewers: metrics.peakViewers,
        event_category: 'analytics',
        event_label: 'engagement_metrics'
      });
    }
    
    // Also use gtag for GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'engagement_metrics', {
        stream_id: streamId,
        streamer_id: streamerId,
        average_watch_time: metrics.averageWatchTime,
        engagement_rate: metrics.engagementRate,
        unique_viewers: metrics.uniqueViewers,
        peak_viewers: metrics.peakViewers,
        event_category: 'analytics',
        event_label: 'engagement_metrics'
      });
    }
  }

  // Get analytics data for a streamer
  async getStreamerAnalytics(streamerId: string, dateRange: { start: string; end: string }) {
    // This would integrate with GA4 API to fetch data
    // For now, return a placeholder with mock data
    // In production, you would use GA4 API to fetch real data
    
    // Mock data for demonstration
    const mockData = {
      averageWatchTime: 25, // minutes
      engagementRate: 68, // percentage
      totalViewers: 150,
      uniqueViewers: 89
    };
    
    console.log('Fetching analytics for streamer:', streamerId, 'Date range:', dateRange);
    console.log('Mock analytics data:', mockData);
    
    return mockData;
  }

  // Get engagement rate for a streamer
  async getEngagementRate(streamerId: string): Promise<number> {
    try {
      // Use GA4 API service to get real engagement data
      const dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        end: new Date().toISOString().split('T')[0] // today
      };
      
      const engagementRate = await ga4ApiService.getStreamerEngagementRate(streamerId, dateRange);
      console.log('Real GA4 engagement rate for streamer:', streamerId, '=', engagementRate + '%');
      return engagementRate;
    } catch (error) {
      console.error('Error fetching engagement rate:', error);
      return 0;
    }
  }

  // Calculate engagement rate from Firebase Analytics data
  async calculateEngagementFromFirebase(streamerId: string, dateRange: { start: string; end: string }): Promise<number> {
    try {
      // This would use Firebase Analytics API to fetch real data
      // For now, return a calculated engagement rate
      
      // In production, you would:
      // 1. Use Firebase Analytics API to get viewer session data
      // 2. Calculate average watch time per viewer
      // 3. Calculate engagement rate as (avg_watch_time / avg_stream_duration) * 100
      
      const mockEngagementRate = Math.floor(Math.random() * 50) + 25; // 25-75%
      console.log('Firebase Analytics engagement rate for streamer:', streamerId, '=', mockEngagementRate + '%');
      return mockEngagementRate;
    } catch (error) {
      console.error('Error calculating engagement from Firebase:', error);
      return 0;
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService; 