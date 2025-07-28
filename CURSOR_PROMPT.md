You are working on a React TypeScript application for BibleNOW, a live streaming platform. The app uses Supabase for backend with direct frontend fetching (not edge functions) using service role key, not anon key.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Real-time subscriptions)
- **State Management**: Zustand stores
- **Video**: JaaS (Jitsi as a Service) integration
- **Authentication**: Service role key for admin operations

## Database Schema

### Livestreams Table
```sql
livestreams (
  id: uuid PRIMARY KEY,
  title: text,
  description: text,
  streamer_id: uuid REFERENCES auth.users(id),
  room_name: text,
  platform: text,
  stream_type: text,
  scheduled_at: timestamptz,
  started_at: timestamptz,
  ended_at: timestamptz,
  is_live: boolean DEFAULT false,
  viewer_count: integer DEFAULT 0,
  max_viewers: integer DEFAULT 0,
  thumbnail_url: text,
  stream_mode: text DEFAULT 'solo',
  tags: text[],
  flag_count: integer DEFAULT 0,
  is_hidden: boolean DEFAULT false,
  status: text DEFAULT 'active',
  redirect_url: text,
  embed_url: text,
  stream_key: text,
  jitsi_room_config: jsonb,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

## Key Components

### State Management (Zustand)
```typescript
// src/stores/livestreamStore.ts
interface LivestreamStore {
  scheduledStreams: StreamInfo[];
  recentStreams: StreamInfo[];
  liveStreams: StreamInfo[];
  isLoading: boolean;
  error: string | null;
  
  fetchScheduledStreams: () => Promise<void>;
  fetchRecentStreams: () => Promise<void>;
  fetchLiveStreams: () => Promise<void>;
  createScheduledStream: (data: StreamData) => Promise<void>;
  startLivestream: (streamId: string) => Promise<void>;
  stopLivestream: (streamId: string) => Promise<void>;
}
```

### Database Service
```typescript
// src/services/databaseService.ts
class DatabaseService {
  async getScheduledLivestreams(): Promise<StreamInfo[]>
  async getRecentLivestreams(): Promise<StreamInfo[]>
  async getLiveLivestreams(): Promise<StreamInfo[]>
  async createScheduledStream(livestreamData: any): Promise<StreamInfo>
  async startLivestream(id: string): Promise<StreamInfo>
  async stopLivestream(id: string): Promise<StreamInfo>
}
```

## Common Fetching Issues

### 1. RLS Policy Errors
```sql
-- Check if user can access streams
SELECT * FROM livestreams WHERE streamer_id = auth.uid();

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'livestreams';
```

### 2. Authentication Issues
```typescript
// Check user authentication
const user = useAuthStore.getState().user;
if (!user) {
  throw new Error('User not authenticated');
}
```

### 3. Real-time Subscription Problems
```typescript
// Subscribe to live stream updates
const subscription = supabase
  .channel('livestreams')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'livestreams',
    filter: 'is_live=eq.true'
  }, (payload) => {
    console.log('Stream update:', payload);
  })
  .subscribe();
```

### 4. Query Optimization
```typescript
// Efficient queries with proper filters
const { data, error } = await supabase
  .from('livestreams')
  .select('*')
  .eq('streamer_id', user.uid)
  .eq('is_live', false)
  .gte('scheduled_at', new Date().toISOString())
  .order('scheduled_at', { ascending: true });
```

## Debugging Steps

1. **Check Supabase Connection**
   ```typescript
   console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
   console.log('User ID:', user?.uid);
   ```

2. **Verify Data Structure**
   ```typescript
   console.log('Streams data:', streams);
   console.log('Stream count:', streams.length);
   ```

3. **Test RLS Policies**
   ```sql
   -- Run in Supabase SQL editor
   SELECT * FROM livestreams WHERE streamer_id = 'your-user-id';
   ```

4. **Check Real-time Subscriptions**
   ```typescript
   // Add to component
   useEffect(() => {
     const channel = supabase.channel('test');
     channel.subscribe((status) => {
       console.log('Subscription status:', status);
     });
   }, []);
   ```

## Error Patterns

### "new row violates row-level security policy"
- Check RLS policies for INSERT operations
- Verify user authentication
- Ensure user has proper permissions

### "relation does not exist"
- Check table name spelling
- Verify schema permissions
- Ensure Supabase client is properly configured

### "JWT expired"
- Refresh authentication token
- Check token expiration time
- Re-authenticate user if needed

### "Network error"
- Check internet connection
- Verify Supabase URL
- Check CORS settings

## Quick Fixes

### Authentication Issues
```typescript
// Refresh user session
await supabase.auth.refreshSession();
```

### RLS Policy Issues
```sql
-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON livestreams TO authenticated;
```

### Real-time Issues
```typescript
// Reconnect subscription
subscription.unsubscribe();
subscription.subscribe();
```

## Testing Queries

```typescript
// Test basic fetch
const testFetch = async () => {
  const { data, error } = await supabase
    .from('livestreams')
    .select('*')
    .limit(1);
  
  console.log('Test result:', { data, error });
};
```

Focus on these patterns when troubleshooting live video fetching issues in the BibleNOW application. 