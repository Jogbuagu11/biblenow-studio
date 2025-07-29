# Livestreams CRUD Operations Guide

## Overview

This guide provides comprehensive CRUD (Create, Read, Update, Delete) operations for users to manage their livestreams in the BibleNow Studio application. The system includes Row Level Security (RLS) policies and helper functions to ensure data security and ease of use.

## Table Structure

The `livestreams` table contains the following key fields:

```sql
CREATE TABLE public.livestreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_live BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  embed_url TEXT,
  stream_type VARCHAR(50) DEFAULT 'video',
  platform VARCHAR(100),
  stream_key TEXT,
  thumbnail_url TEXT,
  stream_url TEXT,
  scheduled_at TIMESTAMPTZ,
  flag_count INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  stream_mode VARCHAR(50) DEFAULT 'solo',
  tags TEXT[] DEFAULT '{}',
  viewer_count INTEGER DEFAULT 0,
  max_viewers INTEGER DEFAULT 0,
  jitsi_room_config JSONB DEFAULT '{}',
  room_name VARCHAR(255),
  redirect_url TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended', 'scheduled'))
);
```

## Security Features

### Row Level Security (RLS)
- **Users can only access their own livestreams** for create, update, and delete operations
- **Public read access** for livestream discovery
- **Automatic user verification** through `verified_profiles` table

### RLS Policies
```sql
-- Users can create livestreams with their own streamer_id
CREATE POLICY "Users can insert their own livestreams" ON public.livestreams
    FOR INSERT WITH CHECK (auth.uid() = streamer_id);

-- Users can read their own livestreams, public can view all
CREATE POLICY "Users can read their own livestreams" ON public.livestreams
    FOR SELECT USING (auth.uid() = streamer_id OR true);

-- Users can update their own livestreams
CREATE POLICY "Users can update their own livestreams" ON public.livestreams
    FOR UPDATE USING (auth.uid() = streamer_id);

-- Users can delete their own livestreams
CREATE POLICY "Users can delete their own livestreams" ON public.livestreams
    FOR DELETE USING (auth.uid() = streamer_id);
```

## CRUD Operations

### 1. CREATE Operations

#### Create a New Livestream
```sql
-- Using the helper function
SELECT create_livestream(
    'My Bible Study Session',
    'Join me for an interactive Bible study',
    'prayer',
    'https://example.com/thumbnail.jpg',
    '2024-01-15 19:00:00+00'
);

-- Direct INSERT (with RLS protection)
INSERT INTO public.livestreams (
    title,
    description,
    platform,
    thumbnail_url,
    scheduled_at,
    status
) VALUES (
    'My Bible Study Session',
    'Join me for an interactive Bible study',
    'prayer',
    'https://example.com/thumbnail.jpg',
    '2024-01-15 19:00:00+00',
    'scheduled'
);
```

#### Create with Advanced Options
```sql
-- Using the comprehensive function
SELECT create_user_livestream(
    'Interactive Prayer Session',
    'Join our community prayer session',
    'prayer',
    'video',
    NULL, -- embed_url
    NULL, -- stream_key
    'https://example.com/thumbnail.jpg',
    '2024-01-15 19:00:00+00', -- scheduled_at
    'interactive', -- stream_mode
    ARRAY['prayer', 'community', 'bible'], -- tags
    'prayer-room-1', -- room_name
    'https://stream.biblenow.io/endstream' -- redirect_url
);
```

### 2. READ Operations

#### Get User's Livestreams
```sql
-- Get all user's livestreams
SELECT * FROM get_my_livestreams();

-- Get only active livestreams
SELECT * FROM get_my_livestreams('active');

-- Get only scheduled livestreams
SELECT * FROM get_my_livestreams('scheduled');

-- Get with custom limit
SELECT * FROM get_my_livestreams(NULL, 10);
```

#### Get Specific Livestream
```sql
-- Get livestream by ID
SELECT * FROM get_livestream('stream-uuid-here');

-- Direct SELECT (with RLS protection)
SELECT * FROM public.livestreams 
WHERE id = 'stream-uuid-here';
```

#### Get Livestream Statistics
```sql
-- Get user's streaming statistics
SELECT * FROM get_user_livestream_stats(auth.uid());
```

#### Discovery Queries
```sql
-- Get all active livestreams (for discovery)
SELECT 
    l.id,
    l.title,
    l.description,
    l.platform,
    l.thumbnail_url,
    l.viewer_count,
    l.started_at,
    vp.display_name as streamer_name
FROM public.livestreams l
JOIN public.verified_profiles vp ON l.streamer_id = vp.id
WHERE l.is_live = true
AND l.is_hidden = false
ORDER BY l.started_at DESC;

-- Get user's scheduled streams
SELECT 
    id,
    title,
    description,
    scheduled_at,
    platform,
    thumbnail_url
FROM public.livestreams
WHERE streamer_id = auth.uid()
AND status = 'scheduled'
ORDER BY scheduled_at ASC;
```

### 3. UPDATE Operations

#### Update Livestream Details
```sql
-- Using the helper function
SELECT update_livestream(
    'stream-uuid-here',
    'Updated Bible Study Title',
    'Updated description',
    'qna',
    'https://example.com/new-thumbnail.jpg',
    '2024-01-16 20:00:00+00'
);

-- Direct UPDATE (with RLS protection)
UPDATE public.livestreams
SET 
    title = 'Updated Title',
    description = 'Updated description',
    thumbnail_url = 'https://example.com/new-thumbnail.jpg',
    updated_at = NOW()
WHERE id = 'stream-uuid-here';
```

#### Start a Livestream
```sql
-- Start livestream
SELECT start_livestream('stream-uuid-here');

-- Direct UPDATE
UPDATE public.livestreams
SET 
    is_live = true,
    started_at = NOW(),
    status = 'active',
    updated_at = NOW()
WHERE id = 'stream-uuid-here' 
AND streamer_id = auth.uid()
AND is_live = false;
```

#### End a Livestream
```sql
-- End livestream
SELECT end_livestream('stream-uuid-here');

-- Direct UPDATE
UPDATE public.livestreams
SET 
    is_live = false,
    ended_at = NOW(),
    status = 'ended',
    updated_at = NOW()
WHERE id = 'stream-uuid-here' 
AND streamer_id = auth.uid()
AND is_live = true;
```

### 4. DELETE Operations

#### Delete a Livestream
```sql
-- Using the helper function
SELECT delete_livestream('stream-uuid-here');

-- Direct DELETE (with RLS protection)
DELETE FROM public.livestreams
WHERE id = 'stream-uuid-here';
```

## Frontend Integration Examples

### TypeScript/JavaScript Examples

#### Create Livestream
```typescript
// Using Supabase client
const createNewLivestream = async (livestreamData: {
  title: string;
  description?: string;
  platform?: string;
  thumbnailUrl?: string;
  scheduledAt?: string;
}) => {
  const { data, error } = await supabase.rpc('create_livestream', {
    p_title: livestreamData.title,
    p_description: livestreamData.description,
    p_platform: livestreamData.platform,
    p_thumbnail_url: livestreamData.thumbnailUrl,
    p_scheduled_at: livestreamData.scheduledAt
  });
  
  if (error) throw error;
  return data;
};
```

#### Get User's Livestreams
```typescript
const getUserLivestreams = async (status?: string, limit: number = 50) => {
  const { data, error } = await supabase.rpc('get_my_livestreams', {
    p_status: status,
    p_limit: limit
  });
  
  if (error) throw error;
  return data;
};
```

#### Update Livestream
```typescript
const updateLivestream = async (id: string, updates: {
  title?: string;
  description?: string;
  platform?: string;
  thumbnailUrl?: string;
  scheduledAt?: string;
}) => {
  const { data, error } = await supabase.rpc('update_livestream', {
    p_id: id,
    p_title: updates.title,
    p_description: updates.description,
    p_platform: updates.platform,
    p_thumbnail_url: updates.thumbnailUrl,
    p_scheduled_at: updates.scheduledAt
  });
  
  if (error) throw error;
  return data;
};
```

#### Start/End Livestream
```typescript
const startLivestream = async (id: string) => {
  const { data, error } = await supabase.rpc('start_livestream', {
    p_id: id
  });
  
  if (error) throw error;
  return data;
};

const endLivestream = async (id: string) => {
  const { data, error } = await supabase.rpc('end_livestream', {
    p_id: id
  });
  
  if (error) throw error;
  return data;
};
```

## Status Management

### Livestream Statuses
- **`active`**: Livestream is ready to go live
- **`scheduled`**: Livestream is scheduled for future
- **`ended`**: Livestream has ended
- **`inactive`**: Livestream is inactive/hidden

### Status Transitions
```sql
-- Schedule a livestream
UPDATE public.livestreams
SET status = 'scheduled', scheduled_at = '2024-01-15 19:00:00+00'
WHERE id = 'stream-uuid-here';

-- Start a livestream
UPDATE public.livestreams
SET status = 'active', is_live = true, started_at = NOW()
WHERE id = 'stream-uuid-here';

-- End a livestream
UPDATE public.livestreams
SET status = 'ended', is_live = false, ended_at = NOW()
WHERE id = 'stream-uuid-here';
```

## Best Practices

### 1. Error Handling
```typescript
try {
  const result = await supabase.rpc('create_livestream', params);
  if (result.error) {
    console.error('Database error:', result.error);
    throw new Error(result.error.message);
  }
  return result.data;
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
}
```

### 2. Validation
- Always validate input data before sending to database
- Check user permissions before operations
- Validate livestream status before state changes

### 3. Performance
- Use pagination for large datasets
- Add appropriate indexes for frequently queried fields
- Cache frequently accessed data

### 4. Security
- Never trust client-side data
- Always use RLS policies
- Validate user authentication before operations

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check if user is authenticated
   - Verify user has verified profile
   - Ensure RLS policies are properly set

2. **Livestream Not Found**
   - Verify the livestream ID exists
   - Check if user owns the livestream
   - Ensure livestream is not deleted

3. **Status Update Failed**
   - Verify current status allows the transition
   - Check if livestream is owned by user
   - Ensure all required fields are provided

### Debug Queries
```sql
-- Check user's livestreams
SELECT * FROM public.livestreams WHERE streamer_id = auth.uid();

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'livestreams';

-- Check user verification
SELECT * FROM public.verified_profiles WHERE user_id = auth.uid();
```

## Migration Notes

When implementing these CRUD operations:

1. **Run the SQL scripts** in the correct order
2. **Test RLS policies** thoroughly
3. **Update frontend code** to use the new functions
4. **Monitor performance** and add indexes as needed
5. **Backup existing data** before major changes

This CRUD system provides a secure, scalable foundation for livestream management in the BibleNow Studio application. 