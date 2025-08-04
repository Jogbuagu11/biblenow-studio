# GA4 Integration Setup Guide for BibleNow Studio

## Overview
This guide will help you set up Google Analytics 4 (GA4) integration for tracking viewer engagement and stream analytics in BibleNow Studio.

## Step 1: GA4 Property Setup

### 1.1 Create GA4 Property
1. Go to [Google Analytics](https://analytics.google.com/)
2. Click "Start measuring" or "Create Property"
3. Enter property name: "BibleNow Studio"
4. Choose your reporting time zone and currency
5. Click "Next" and complete the setup

### 1.2 Get Measurement ID
1. In your GA4 property, go to **Admin** → **Data Streams**
2. Click on your web stream
3. Copy the **Measurement ID** (format: G-XXXXXXXXXX)
4. This is already configured in your Firebase config as `G-MC0BNXJLBT`

## Step 2: Environment Configuration

### 2.1 Add Environment Variable
Create or update your `.env` file:
```bash
REACT_APP_GA_MEASUREMENT_ID=G-MC0BNXJLBT
```

### 2.2 Update index.html
The GA4 script is already added to `public/index.html`. Replace `GA_MEASUREMENT_ID` with your actual measurement ID:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-MC0BNXJLBT"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-MC0BNXJLBT', {
    page_title: 'BibleNOW Studio',
    page_location: window.location.href
  });
</script>
```

## Step 3: Custom Dimensions Setup

### 3.1 Create Custom Dimensions in GA4
In your GA4 property, go to **Admin** → **Custom Definitions** → **Custom Dimensions** and create:

1. **streamer_id** (User-scoped)
2. **stream_title** (Event-scoped)
3. **stream_duration** (Event-scoped)
4. **viewer_count** (Event-scoped)
5. **engagement_rate** (Event-scoped)

### 3.2 Event Parameters
The following events are tracked with parameters:

#### Stream Events:
- `stream_started`
  - `stream_id`
  - `stream_title`
  - `streamer_id`
  - `event_category`
  - `event_label`

- `stream_ended`
  - `stream_id`
  - `stream_title`
  - `streamer_id`
  - `stream_duration`
  - `final_viewer_count`

#### Viewer Events:
- `viewer_joined`
  - `stream_id`
  - `viewer_id`
  - `streamer_id`

- `viewer_left`
  - `stream_id`
  - `viewer_id`
  - `streamer_id`
  - `watch_duration`
  - `stream_duration`
  - `engagement_rate`

#### Analytics Events:
- `engagement_metrics`
  - `stream_id`
  - `streamer_id`
  - `average_watch_time`
  - `engagement_rate`
  - `unique_viewers`
  - `peak_viewers`

## Step 4: Analytics Dashboard Setup

### 4.1 Create Custom Reports
In GA4, create custom reports for:

1. **Streamer Performance Dashboard**
   - Filter by `streamer_id`
   - Show engagement rate, watch time, viewer count

2. **Stream Analytics**
   - Filter by `stream_id`
   - Show individual stream performance

3. **Viewer Engagement**
   - Filter by `engagement_rate`
   - Show viewer retention metrics

### 4.2 Sample Queries
Use GA4 Query Explorer to create reports:

```sql
-- Sample query for streamer engagement
SELECT 
  event_name,
  streamer_id,
  AVG(engagement_rate) as avg_engagement,
  COUNT(DISTINCT stream_id) as total_streams,
  SUM(viewer_count) as total_viewers
FROM events
WHERE event_name IN ('stream_started', 'stream_ended')
  AND streamer_id = 'your_streamer_id'
GROUP BY event_name, streamer_id
```

## Step 5: Implementation Status

### ✅ Completed:
- Analytics service with Firebase Analytics integration
- Event tracking for stream start/end
- Viewer join/leave tracking
- Engagement rate calculation
- Analytics page integration

### 🔄 In Progress:
- Real GA4 API integration (currently using mock data)
- Individual viewer session tracking
- Precise watch time calculation

### 📋 Next Steps:
1. **Implement GA4 API Integration**
   - Use Google Analytics Data API v1
   - Fetch real engagement data
   - Replace mock data with live metrics

2. **Enhanced Viewer Tracking**
   - Track individual viewer sessions
   - Calculate precise watch times
   - Implement viewer retention metrics

3. **Real-time Analytics**
   - Live engagement rate updates
   - Real-time viewer count
   - Stream performance alerts

## Step 6: Testing

### 6.1 Test Events
1. Start a stream and check GA4 for `stream_started` event
2. Have viewers join/leave and check for `viewer_joined`/`viewer_left` events
3. End stream and check for `stream_ended` event

### 6.2 Debug Mode
Enable GA4 debug mode by adding this to your browser console:
```javascript
gtag('config', 'G-MC0BNXJLBT', { debug_mode: true });
```

## Step 7: Production Deployment

### 7.1 Environment Variables
Ensure these are set in production:
```bash
REACT_APP_GA_MEASUREMENT_ID=G-MC0BNXJLBT
```

### 7.2 Privacy Compliance
- Add privacy policy for analytics tracking
- Implement cookie consent if required
- Ensure GDPR/CCPA compliance

## Current Analytics Features

### Dashboard & Analytics Pages:
- ✅ **Total Views**: Real count from livestreams
- ✅ **Followers**: Real count from user_follows table
- ✅ **Top Performing Content**: Real streams ordered by viewer count
- ✅ **Average Watch Time**: Stream duration calculation
- ✅ **Engagement Rate**: Mock data (ready for GA4 integration)

### Event Tracking:
- ✅ Stream start/end events
- ✅ Viewer join/leave events
- ✅ Engagement metrics
- ✅ Viewer count updates

## Support

For issues or questions:
1. Check GA4 DebugView for event tracking
2. Verify measurement ID is correct
3. Ensure Firebase Analytics is properly configured
4. Check browser console for any errors

## Next Phase: Real GA4 Integration

To implement real GA4 data fetching, you'll need to:

1. **Set up Google Analytics Data API v1**
2. **Create service account and get credentials**
3. **Implement API calls to fetch real engagement data**
4. **Replace mock data with live metrics**

This will provide true engagement rates based on actual viewer behavior rather than mock data. 