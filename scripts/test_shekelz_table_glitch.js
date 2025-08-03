const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testShekelzTableGlitch() {
  console.log('🔍 Testing Shekelz Table Glitch...\n');

  try {
    // Get a real user ID from the system
    const { data: verifiedUsers, error: verifiedError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, email, ministry_name, shekel_balance')
      .limit(1);

    if (verifiedError || !verifiedUsers || verifiedUsers.length === 0) {
      console.error('No verified users found');
      return;
    }

    const testUserId = verifiedUsers[0].id;
    console.log('Testing with user ID:', testUserId);
    console.log('User:', verifiedUsers[0]);

    // Test the exact data that would be fetched for the table
    console.log('\n1. Testing data fetching for table...');

    // Get all gifts for this user
    const { data: allGifts, error: allGiftsError } = await supabase
      .from('shekel_gifts')
      .select('*')
      .or(`sender_id.eq.${testUserId},recipient_id.eq.${testUserId}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (allGiftsError) {
      console.error('Error fetching all gifts:', allGiftsError);
      return;
    }

    console.log('✅ All gifts found:', allGifts.length);
    console.log('Sample gifts:', allGifts.slice(0, 3));

    // Get unique user IDs for profile fetching
    const allUserIds = [
      ...new Set([
        ...allGifts.map(g => g.sender_id),
        ...allGifts.map(g => g.recipient_id)
      ])
    ];

    console.log('Unique user IDs:', allUserIds);

    // Get profiles for all users
    const { data: verifiedProfiles, error: verifiedProfilesError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, email, ministry_name')
      .in('id', allUserIds);

    const { data: regularProfiles, error: regularProfilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', allUserIds);

    console.log('✅ Verified profiles found:', verifiedProfiles?.length || 0);
    console.log('✅ Regular profiles found:', regularProfiles?.length || 0);

    // Combine profiles
    const profiles = [];
    
    verifiedProfiles?.forEach(verified => {
      profiles.push({
        id: verified.id,
        name: verified.ministry_name || `${verified.first_name || ''} ${verified.last_name || ''}`.trim() || verified.email,
        email: verified.email
      });
    });

    regularProfiles?.forEach(profile => {
      if (!profiles.find(p => p.id === profile.id)) {
        profiles.push({
          id: profile.id,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
          email: profile.email
        });
      }
    });

    console.log('✅ Combined profiles:', profiles);

    // Simulate the table data processing
    console.log('\n2. Simulating table data processing...');

    const transactions = allGifts.map(gift => {
      const isReceived = gift.recipient_id === testUserId;
      const otherUserId = isReceived ? gift.sender_id : gift.recipient_id;
      const otherProfile = profiles.find(p => p.id === otherUserId);
      
      return {
        id: gift.id,
        type: isReceived ? 'gift_received' : 'gift_sent',
        amount: gift.amount,
        description: isReceived 
          ? `Received ${gift.gift_type} from ${otherProfile?.name || 'Unknown'}`
          : `Sent ${gift.gift_type} to ${otherProfile?.name || 'Unknown'}`,
        created_at: gift.created_at,
        reference_id: gift.id,
        sender_name: isReceived ? otherProfile?.name : undefined,
        receiver_name: isReceived ? undefined : otherProfile?.name,
        gift_type: gift.gift_type,
        message: gift.message,
        is_anonymous: gift.is_anonymous
      };
    });

    console.log('✅ Processed transactions:', transactions.length);
    console.log('Sample transactions:', transactions.slice(0, 3));

    // Test potential glitch sources
    console.log('\n3. Testing potential glitch sources...');

    // Check for null/undefined values
    const nullChecks = transactions.map(t => ({
      id: t.id,
      hasNullAmount: t.amount === null || t.amount === undefined,
      hasNullDescription: t.description === null || t.description === undefined,
      hasNullDate: t.created_at === null || t.created_at === undefined,
      hasNullType: t.type === null || t.type === undefined
    }));

    const nullIssues = nullChecks.filter(check => 
      check.hasNullAmount || check.hasNullDescription || check.hasNullDate || check.hasNullType
    );

    if (nullIssues.length > 0) {
      console.log('⚠️ Found null/undefined values:', nullIssues);
    } else {
      console.log('✅ No null/undefined values found');
    }

    // Check for invalid dates
    const dateChecks = transactions.map(t => ({
      id: t.id,
      date: t.created_at,
      isValidDate: !isNaN(new Date(t.created_at).getTime())
    }));

    const invalidDates = dateChecks.filter(check => !check.isValidDate);
    if (invalidDates.length > 0) {
      console.log('⚠️ Found invalid dates:', invalidDates);
    } else {
      console.log('✅ All dates are valid');
    }

    // Check for missing profile names
    const missingNames = transactions.filter(t => 
      (t.type === 'gift_received' && !t.sender_name) ||
      (t.type === 'gift_sent' && !t.receiver_name)
    );

    if (missingNames.length > 0) {
      console.log('⚠️ Found missing profile names:', missingNames.length);
    } else {
      console.log('✅ All profile names are present');
    }

    // Test the exact format that would be used in the table
    console.log('\n4. Testing table format...');

    const tableRows = transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: new Date(t.created_at).toISOString(),
      formattedDate: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(t.created_at)),
      sender: t.sender_name || 'Unknown',
      receiver: t.receiver_name || 'Unknown',
      giftType: t.gift_type,
      message: t.message || ''
    }));

    console.log('✅ Table rows processed:', tableRows.length);
    console.log('Sample table row:', tableRows[0]);

    // Check for any rendering issues
    console.log('\n5. Checking for rendering issues...');

    const renderingIssues = tableRows.filter(row => 
      !row.id || 
      !row.type || 
      row.amount === null || 
      row.amount === undefined ||
      !row.description ||
      !row.date ||
      row.formattedDate === 'Invalid Date'
    );

    if (renderingIssues.length > 0) {
      console.log('⚠️ Found rendering issues:', renderingIssues);
    } else {
      console.log('✅ No rendering issues found');
    }

    console.log('\n✅ Table glitch testing complete');

  } catch (error) {
    console.error('Error testing table glitch:', error);
  }
}

// Run the test
testShekelzTableGlitch().then(() => {
  console.log('\n✅ Table glitch testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Table glitch testing failed:', error);
  process.exit(1);
}); 