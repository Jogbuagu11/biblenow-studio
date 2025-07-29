// Script to delete the thumbnails bucket from Supabase
// Run this script to clean up the thumbnail bucket system

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need the service role key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteThumbnailsBucket() {
  try {
    console.log('Checking if thumbnails bucket exists...');
    
    // List all buckets to check if thumbnails exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const thumbnailsBucket = buckets.find(bucket => bucket.id === 'thumbnails');
    
    if (!thumbnailsBucket) {
      console.log('Thumbnails bucket does not exist. Nothing to delete.');
      return;
    }

    console.log('Found thumbnails bucket. Deleting...');
    
    // Delete the bucket
    const { error: deleteError } = await supabase.storage.deleteBucket('thumbnails');
    
    if (deleteError) {
      console.error('Error deleting thumbnails bucket:', deleteError);
      return;
    }

    console.log('Thumbnails bucket deleted successfully!');
    console.log('Thumbnail bucket system cleanup complete.');

  } catch (error) {
    console.error('Error deleting thumbnails bucket:', error);
  }
}

// Run the cleanup
deleteThumbnailsBucket(); 