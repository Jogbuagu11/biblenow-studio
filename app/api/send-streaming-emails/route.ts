// API endpoint to manually send streaming limit emails
// This provides a simple way to trigger emails without relying on database triggers

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      forceSend = false, 
      action = 'all' // 'all', 'warning', 'reached', 'check'
    } = body;

    console.log('📧 [API] Streaming email request:', { userId, forceSend, action });

    let result;

    switch (action) {
      case 'check':
        // Check all users streaming usage
        const { data: usageData, error: usageError } = await supabase
          .rpc('check_all_users_streaming_usage');
        
        if (usageError) throw usageError;
        
        result = {
          action: 'check',
          users: usageData,
          total_users: usageData?.length || 0,
          users_needing_warnings: usageData?.filter((u: any) => u.needs_warning_email && !u.last_warning_sent).length || 0,
          users_needing_reached: usageData?.filter((u: any) => u.needs_reached_email && !u.last_reached_sent).length || 0
        };
        break;

      case 'warning':
        // Send warning emails only
        if (userId) {
          const { data: warningData, error: warningError } = await supabase
            .rpc('send_streaming_limit_emails_manual', {
              target_user_id: userId,
              force_send: forceSend
            });
          
          if (warningError) throw warningError;
          
          result = {
            action: 'warning',
            user_id: userId,
            emails_sent: warningData?.filter((e: any) => e.email_type === 'warning' && e.email_sent).length || 0,
            results: warningData
          };
        } else {
          // Send warning emails to all users who need them
          const { data: allWarningData, error: allWarningError } = await supabase
            .rpc('send_streaming_limit_emails_manual', {
              target_user_id: null,
              force_send: forceSend
            });
          
          if (allWarningError) throw allWarningError;
          
          result = {
            action: 'warning',
            emails_sent: allWarningData?.filter((e: any) => e.email_type === 'warning' && e.email_sent).length || 0,
            results: allWarningData
          };
        }
        break;

      case 'reached':
        // Send limit reached emails only
        if (userId) {
          const { data: reachedData, error: reachedError } = await supabase
            .rpc('send_streaming_limit_emails_manual', {
              target_user_id: userId,
              force_send: forceSend
            });
          
          if (reachedError) throw reachedError;
          
          result = {
            action: 'reached',
            user_id: userId,
            emails_sent: reachedData?.filter((e: any) => e.email_type === 'reached' && e.email_sent).length || 0,
            results: reachedData
          };
        } else {
          // Send limit reached emails to all users who need them
          const { data: allReachedData, error: allReachedError } = await supabase
            .rpc('send_streaming_limit_emails_manual', {
              target_user_id: null,
              force_send: forceSend
            });
          
          if (allReachedError) throw allReachedError;
          
          result = {
            action: 'reached',
            emails_sent: allReachedData?.filter((e: any) => e.email_type === 'reached' && e.email_sent).length || 0,
            results: allReachedData
          };
        }
        break;

      case 'all':
      default:
        // Send all pending emails
        const { data: allData, error: allError } = await supabase
          .rpc('send_all_pending_streaming_emails');
        
        if (allError) throw allError;
        
        result = {
          action: 'all',
          ...allData?.[0]
        };
        break;
    }

    console.log('✅ [API] Streaming email request completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Streaming limit emails processed successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ [API] Error processing streaming email request:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to process streaming limit emails',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'check';

    console.log('📧 [API] Streaming email GET request:', { action });

    let result;

    switch (action) {
      case 'check':
        // Check all users streaming usage
        const { data: usageData, error: usageError } = await supabase
          .rpc('check_all_users_streaming_usage');
        
        if (usageError) throw usageError;
        
        result = {
          action: 'check',
          users: usageData,
          total_users: usageData?.length || 0,
          users_needing_warnings: usageData?.filter((u: any) => u.needs_warning_email && !u.last_warning_sent).length || 0,
          users_needing_reached: usageData?.filter((u: any) => u.needs_reached_email && !u.last_reached_sent).length || 0
        };
        break;

      case 'test':
        // Test the system
        const { data: testData, error: testError } = await supabase
          .rpc('test_independent_email_system');
        
        if (testError) throw testError;
        
        result = {
          action: 'test',
          tests: testData
        };
        break;

      default:
        result = {
          action: 'unknown',
          message: 'Unknown action. Use: check, test'
        };
    }

    console.log('✅ [API] Streaming email GET request completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Request processed successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ [API] Error processing streaming email GET request:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to process request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
