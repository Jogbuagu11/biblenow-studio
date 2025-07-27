// Script to create thumbnails bucket in Supabase
// Run this script to set up the storage bucket for thumbnails

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need the service role key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createThumbnailsBucket() {
  try {
    console.log('Creating thumbnails bucket...');
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('thumbnails', {
      public: true, // Make bucket public for read access
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    });

    if (error) {
      console.error('Error creating bucket:', error);
      return;
    }

    console.log('Thumbnails bucket created successfully!');
    console.log('Bucket details:', data);

    // Set up RLS policies
    console.log('Setting up RLS policies...');
    
    // Allow authenticated users to upload
    const { error: insertPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'thumbnails',
      policy_name: 'Allow authenticated uploads',
      policy_definition: {
        type: 'insert',
        definition: { role: 'authenticated' }
      }
    });

    if (insertPolicyError) {
      console.log('Note: Insert policy setup failed (may already exist):', insertPolicyError.message);
    }

    // Allow public read access
    const { error: selectPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'thumbnails',
      policy_name: 'Allow public read access',
      policy_definition: {
        type: 'select',
        definition: { role: 'anon' }
      }
    });

    if (selectPolicyError) {
      console.log('Note: Select policy setup failed (may already exist):', selectPolicyError.message);
    }

    console.log('Thumbnails bucket setup complete!');
    console.log('You can now upload thumbnails to the thumbnails bucket.');

  } catch (error) {
    console.error('Error setting up thumbnails bucket:', error);
  }
}

// Run the setup
createThumbnailsBucket(); 