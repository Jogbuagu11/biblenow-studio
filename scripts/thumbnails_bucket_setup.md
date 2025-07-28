# Thumbnails Bucket RLS Setup

## Option 1: Supabase Dashboard Setup (Recommended)

### Step 1: Create the Thumbnails Bucket
1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Set bucket name: `thumbnails`
5. Make it **Public** (for read access)
6. Set file size limit to **5MB**
7. Add allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`

### Step 2: Set Up RLS Policies via Dashboard
1. Go to **Storage** → **Policies**
2. Find the `thumbnails` bucket
3. Click **New Policy**

#### Policy 1: Allow Authenticated Uploads
- **Policy Name**: `Allow authenticated uploads to thumbnails`
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'thumbnails' 
AND (storage.foldername(name))[1] = 'thumbnails'
AND (storage.foldername(name))[2] = auth.uid()::text
```

#### Policy 2: Allow Public Read Access
- **Policy Name**: `Allow public read access to thumbnails`
- **Allowed operation**: SELECT
- **Target roles**: public
- **Policy definition**:
```sql
bucket_id = 'thumbnails'
```

#### Policy 3: Allow Users to Delete Their Own Files
- **Policy Name**: `Allow users to delete their own thumbnails`
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'thumbnails' 
AND (storage.foldername(name))[1] = 'thumbnails'
AND (storage.foldername(name))[2] = auth.uid()::text
```

#### Policy 4: Allow Users to Update Their Own Files
- **Policy Name**: `Allow users to update their own thumbnails`
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'thumbnails' 
AND (storage.foldername(name))[1] = 'thumbnails'
AND (storage.foldername(name))[2] = auth.uid()::text
```

## Option 2: SQL Setup (Requires Service Role)

If you have the service role key, you can run the SQL script:

```bash
# Set your service role key
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the setup script
node scripts/create_thumbnails_bucket.js
```

## File Structure

The thumbnails will be stored with this structure:
```
thumbnails/
├── {user_id_1}/
│   ├── 1234567890_abc123.jpg
│   └── 1234567891_def456.png
├── {user_id_2}/
│   ├── 1234567892_ghi789.gif
│   └── 1234567893_jkl012.jpg
```

## Security Features

✅ **User Isolation**: Each user can only access their own folder  
✅ **Public Read**: Anyone can view thumbnails  
✅ **Authenticated Upload**: Only logged-in users can upload  
✅ **Ownership Verification**: Users can only delete their own files  
✅ **File Type Validation**: Only images allowed  
✅ **Size Limits**: 5MB maximum file size  

## Testing the Setup

1. Upload a thumbnail through the app
2. Check that it's stored in `thumbnails/{user_id}/filename`
3. Try to delete the thumbnail
4. Verify that users can't access other users' files

## Troubleshooting

### Common Issues:
- **"must be owner of table objects"**: Use the dashboard approach instead of SQL
- **Upload fails**: Check bucket exists and policies are set correctly
- **Delete fails**: Verify user authentication and file ownership
- **Read access denied**: Ensure public read policy is enabled

### Debug Commands:
```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'thumbnails';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- List files in bucket
SELECT * FROM storage.objects WHERE bucket_id = 'thumbnails';
``` 