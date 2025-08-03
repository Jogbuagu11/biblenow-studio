const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectDatabase() {
  console.log('🔍 Inspecting Database Schema...\n');

  try {
    // 1. Check tables using direct SQL
    console.log('📋 TABLES:');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables_info');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      // Try a simpler approach
      const { data: simpleTables, error: simpleError } = await supabase
        .from('shekel_gifts')
        .select('*')
        .limit(0);
      
      if (!simpleError) {
        console.log('  - shekel_gifts (BASE TABLE)');
      }
      
      const { data: verifiedProfiles, error: verifiedError } = await supabase
        .from('verified_profiles')
        .select('*')
        .limit(0);
      
      if (!verifiedError) {
        console.log('  - verified_profiles (BASE TABLE)');
      }
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(0);
      
      if (!profilesError) {
        console.log('  - profiles (BASE TABLE)');
      }
      
      const { data: userShields, error: userShieldsError } = await supabase
        .from('user_shields')
        .select('*')
        .limit(0);
      
      if (!userShieldsError) {
        console.log('  - user_shields (BASE TABLE)');
      }
      
      const { data: userFollows, error: userFollowsError } = await supabase
        .from('user_follows')
        .select('*')
        .limit(0);
      
      if (!userFollowsError) {
        console.log('  - user_follows (BASE TABLE)');
      }
    } else {
      tables?.forEach(table => {
        console.log(`  - ${table.table_name} (${table.table_type})`);
      });
    }

    // 2. Check functions
    console.log('\n🔧 FUNCTIONS:');
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_functions_info');

    if (functionsError) {
      console.error('Error fetching functions:', functionsError);
      // Try to call known functions to see if they exist
      try {
        const { data: shieldResult, error: shieldError } = await supabase
          .rpc('shield_user_transaction', { user_id: '00000000-0000-0000-0000-000000000000', shielded_user_id: '00000000-0000-0000-0000-000000000000' });
        
        if (!shieldError || shieldError.message.includes('invalid input syntax')) {
          console.log('  - shield_user_transaction (FUNCTION)');
        }
      } catch (e) {
        // Function doesn't exist
      }
      
      try {
        const { data: handleResult, error: handleError } = await supabase
          .rpc('handle_shekel_gift_activity');
        
        if (!handleError || handleError.message.includes('invalid input syntax')) {
          console.log('  - handle_shekel_gift_activity (FUNCTION)');
        }
      } catch (e) {
        // Function doesn't exist
      }
    } else {
      functions?.forEach(func => {
        console.log(`  - ${func.function_name} (${func.function_type})`);
      });
    }

    // 3. Check table structures by trying to select from them
    console.log('\n📋 TABLE STRUCTURES:');
    
    // Check shekel_gifts structure
    console.log('\n  SHEKEL_GIFTS:');
    try {
      const { data: shekelGiftsSample, error: shekelError } = await supabase
        .from('shekel_gifts')
        .select('*')
        .limit(1);
      
      if (!shekelError && shekelGiftsSample && shekelGiftsSample.length > 0) {
        const sample = shekelGiftsSample[0];
        Object.keys(sample).forEach(key => {
          console.log(`    - ${key}: ${typeof sample[key]}`);
        });
      } else {
        console.log('    - Table exists but no data or error occurred');
      }
    } catch (e) {
      console.log('    - Table may not exist or access denied');
    }

    // Check verified_profiles structure
    console.log('\n  VERIFIED_PROFILES:');
    try {
      const { data: verifiedSample, error: verifiedError } = await supabase
        .from('verified_profiles')
        .select('*')
        .limit(1);
      
      if (!verifiedError && verifiedSample && verifiedSample.length > 0) {
        const sample = verifiedSample[0];
        Object.keys(sample).forEach(key => {
          console.log(`    - ${key}: ${typeof sample[key]}`);
        });
      } else {
        console.log('    - Table exists but no data or error occurred');
      }
    } catch (e) {
      console.log('    - Table may not exist or access denied');
    }

    // Check profiles structure
    console.log('\n  PROFILES:');
    try {
      const { data: profilesSample, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (!profilesError && profilesSample && profilesSample.length > 0) {
        const sample = profilesSample[0];
        Object.keys(sample).forEach(key => {
          console.log(`    - ${key}: ${typeof sample[key]}`);
        });
      } else {
        console.log('    - Table exists but no data or error occurred');
      }
    } catch (e) {
      console.log('    - Table may not exist or access denied');
    }

    // 4. Check for sample data
    console.log('\n📊 SAMPLE DATA:');
    
    // Check shekel_gifts data
    try {
      const { data: shekelCount, error: shekelCountError } = await supabase
        .from('shekel_gifts')
        .select('*', { count: 'exact', head: true });
      
      if (!shekelCountError) {
        console.log(`  - shekel_gifts: ${shekelCount} records`);
      }
    } catch (e) {
      console.log('  - shekel_gifts: Unable to count');
    }

    // Check verified_profiles data
    try {
      const { data: verifiedCount, error: verifiedCountError } = await supabase
        .from('verified_profiles')
        .select('*', { count: 'exact', head: true });
      
      if (!verifiedCountError) {
        console.log(`  - verified_profiles: ${verifiedCount} records`);
      }
    } catch (e) {
      console.log('  - verified_profiles: Unable to count');
    }

    // Check profiles data
    try {
      const { data: profilesCount, error: profilesCountError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (!profilesCountError) {
        console.log(`  - profiles: ${profilesCount} records`);
      }
    } catch (e) {
      console.log('  - profiles: Unable to count');
    }

  } catch (error) {
    console.error('Error inspecting database:', error);
  }
}

// Run the inspection
inspectDatabase().then(() => {
  console.log('\n✅ Database inspection complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Database inspection failed:', error);
  process.exit(1);
}); 