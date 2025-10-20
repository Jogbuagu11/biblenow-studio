import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin access
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface ShekelGift {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  message: string | null;
  is_anonymous: boolean;
  gift_type: 'donation' | 'tip' | 'gift';
  context: string | null;
  context_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  tax_amount: number;
  total_amount: number;
  metadata: string | null;
  sender_name?: string;
  recipient_name?: string;
  thanked_at?: string;
  sender_email?: string;
  recipient_email?: string;
}

export interface ShekelSummary {
  total_received: number;
  total_sent: number;
  total_purchased: number;
  balance: number;
  is_verified_user: boolean;
}

export interface CombinedTransaction {
  id: string;
  type: 'gift_sent' | 'gift_received' | 'purchase' | 'balance_change';
  amount: number;
  description: string;
  created_at: string;
  reference_id?: string;
  sender_name?: string;
  receiver_name?: string;
  pack_name?: string;
  gift_type?: string;
  message?: string;
  is_anonymous?: boolean;
  thanked_at?: string;
  sender_email?: string;
}

class ShekelService {
  // Check if user is a verified user (exists in verified_profiles with ministry_name)
  async isVerifiedUser(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('verified_profiles')
        .select('id, ministry_name')
        .eq('id', userId)
        .not('ministry_name', 'is', null)
        .single();

      if (error) {
        return false;
      }

      return !!data && !!data.ministry_name;
    } catch (error) {
      return false;
    }
  }

  // Get user's shekel balance - handles both regular and verified users
  async getUserBalance(userId: string): Promise<{ balance: number; is_verified_user: boolean }> {
    try {
      console.log('getUserBalance called for user:', userId);
      
      // First check verified_profiles for verified users
      const { data: verifiedData } = await supabaseAdmin
        .from('verified_profiles')
        .select('shekel_balance, ministry_name')
        .eq('id', userId)
        .single();

      if (verifiedData && verifiedData.ministry_name) {
        // This is a verified user
        console.log('Found verified user with balance:', verifiedData.shekel_balance);
        return { balance: verifiedData.shekel_balance || 0, is_verified_user: true };
      }

      // If not found in verified_profiles or no ministry_name, check profiles table
      console.log('User not found in verified_profiles, checking profiles table...');
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('shekel_balance')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching from profiles table:', profileError);
        // If user exists in verified_profiles but no ministry_name, use that balance
        if (verifiedData) {
          console.log('Using verified_profiles balance as fallback:', verifiedData.shekel_balance);
          return { balance: verifiedData.shekel_balance || 0, is_verified_user: false };
        }
        return { balance: 0, is_verified_user: false };
      }

      console.log('Found regular user with balance:', profileData.shekel_balance);
      return { balance: profileData.shekel_balance || 0, is_verified_user: false };
    } catch (error) {
      console.error('Error in getUserBalance:', error);
      return { balance: 0, is_verified_user: false };
    }
  }

  // Get user profile data from appropriate table
  async getUserProfile(userId: string): Promise<{ name: string; email: string } | null> {
    try {
      // First check verified_profiles
      const { data: verifiedData } = await supabaseAdmin
        .from('verified_profiles')
        .select('id, first_name, last_name, email, ministry_name')
        .eq('id', userId)
        .single();

      if (verifiedData && verifiedData.ministry_name) {
        // This is a verified user
        return {
          name: verifiedData.ministry_name || `${verifiedData.first_name || ''} ${verifiedData.last_name || ''}`.trim(),
          email: verifiedData.email
        };
      }

      // Check profiles table for regular users
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', userId)
        .single();

      if (profileData) {
        return {
          name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || profileData.email,
          email: profileData.email
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }

  // Get multiple user profiles by IDs
  async getUserProfilesByIds(userIds: string[]): Promise<{ id: string; name: string; email: string }[]> {
    if (userIds.length === 0) return [];

    try {
      // Get verified profiles first
      const { data: verifiedData } = await supabaseAdmin
        .from('verified_profiles')
        .select('id, first_name, last_name, email, ministry_name')
        .in('id', userIds);

      // Get regular profiles
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      const profiles: { id: string; name: string; email: string }[] = [];

      // Process verified profiles
      verifiedData?.forEach(verified => {
        profiles.push({
          id: verified.id,
          name: verified.ministry_name || `${verified.first_name || ''} ${verified.last_name || ''}`.trim() || verified.email,
          email: verified.email
        });
      });

      // Process regular profiles (only if not already added as verified)
      profileData?.forEach(profile => {
        if (!profiles.find(p => p.id === profile.id)) {
          profiles.push({
            id: profile.id,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
            email: profile.email
          });
        }
      });

      return profiles;
    } catch (error) {
      console.error('Error in getUserProfilesByIds:', error);
      return [];
    }
  }

  // Get shekel gifts where user is recipient
  async getReceivedGifts(userId: string): Promise<ShekelGift[]> {
    try {
      console.log('getReceivedGifts called for user:', userId);
      
      // Get gifts without joins first
      const { data, error } = await supabaseAdmin
        .from('shekel_gifts')
        .select('*')
        .eq('recipient_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received gifts:', error);
        return [];
      }

      console.log('Received gifts found:', data?.length || 0);

      // Get sender information separately
      const senderIds = Array.from(new Set(data?.map(gift => gift.sender_id) || []));
      console.log('Sender IDs to fetch:', senderIds);
      
      const senderProfiles = await this.getUserProfilesByIds(senderIds);
      console.log('Sender profiles found:', senderProfiles.length);

      const result = data?.map(gift => {
        const senderProfile = senderProfiles.find((profile: any) => profile.id === gift.sender_id);
        const sender_name = senderProfile?.name || 'Unknown';

        return {
          ...gift,
          sender_name,
          sender_email: senderProfile?.email
        };
      }) || [];

      console.log('Processed received gifts:', result.length);
      return result;
    } catch (error) {
      console.error('Error in getReceivedGifts:', error);
      return [];
    }
  }

  // Get shekel gifts where user is sender
  async getSentGifts(userId: string): Promise<ShekelGift[]> {
    try {
      console.log('getSentGifts called for user:', userId);
      
      // Get gifts without joins first
      const { data, error } = await supabaseAdmin
        .from('shekel_gifts')
        .select('*')
        .eq('sender_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent gifts:', error);
        return [];
      }

      console.log('Sent gifts found:', data?.length || 0);

      // Get recipient information separately
      const recipientIds = Array.from(new Set(data?.map(gift => gift.recipient_id) || []));
      console.log('Recipient IDs to fetch:', recipientIds);
      
      const recipientProfiles = await this.getUserProfilesByIds(recipientIds);
      console.log('Recipient profiles found:', recipientProfiles.length);

      const result = data?.map(gift => {
        const recipientProfile = recipientProfiles.find((profile: any) => profile.id === gift.recipient_id);
        const recipient_name = recipientProfile?.name || 'Unknown';

        return {
          ...gift,
          recipient_name,
          recipient_email: recipientProfile?.email
        };
      }) || [];

      console.log('Processed sent gifts:', result.length);
      return result;
    } catch (error) {
      console.error('Error in getSentGifts:', error);
      return [];
    }
  }

  // Get all gifts for a user (both sent and received)
  async getAllGifts(userId: string): Promise<ShekelGift[]> {
    try {
      console.log('getAllGifts called for user:', userId);
      
      const [receivedGifts, sentGifts] = await Promise.all([
        this.getReceivedGifts(userId),
        this.getSentGifts(userId)
      ]);

      console.log('Received gifts:', receivedGifts.length);
      console.log('Sent gifts:', sentGifts.length);

      const allGifts = [...receivedGifts, ...sentGifts].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('All gifts combined:', allGifts.length);
      return allGifts;
    } catch (error) {
      console.error('Error in getAllGifts:', error);
      return [];
    }
  }

  // Get paginated gifts for a user (both sent and received)
  async getPaginatedGifts(userId: string, page: number = 1, limit: number = 10): Promise<{
    gifts: ShekelGift[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    try {
      console.log('getPaginatedGifts called for user:', userId, 'page:', page, 'limit:', limit);
      
      // Get total count first
      const { count: receivedCount } = await supabaseAdmin
        .from('shekel_gifts')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('status', 'completed');

      const { count: sentCount } = await supabaseAdmin
        .from('shekel_gifts')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .eq('status', 'completed');

      const totalCount = (receivedCount || 0) + (sentCount || 0);
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

      // Get paginated received gifts
      const { data: receivedGifts, error: receivedError } = await supabaseAdmin
        .from('shekel_gifts')
        .select('*')
        .eq('recipient_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      // Get paginated sent gifts
      const { data: sentGifts, error: sentError } = await supabaseAdmin
        .from('shekel_gifts')
        .select('*')
        .eq('sender_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (receivedError || sentError) {
        console.error('Error fetching paginated gifts:', receivedError || sentError);
        return {
          gifts: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          hasNextPage: false,
          hasPreviousPage: false
        };
      }

      // Combine and sort all gifts
      const allGifts = [...(receivedGifts || []), ...(sentGifts || [])].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply pagination
      const paginatedGifts = allGifts.slice(offset, offset + limit);

      // Get sender/recipient information for paginated gifts
      const senderIds = Array.from(new Set(paginatedGifts.map(gift => gift.sender_id)));
      const recipientIds = Array.from(new Set(paginatedGifts.map(gift => gift.recipient_id)));
      const allUserIds = Array.from(new Set([...senderIds, ...recipientIds]));

      const userProfiles = await this.getUserProfilesByIds(allUserIds);

      const enrichedGifts = paginatedGifts.map(gift => {
        const senderProfile = userProfiles.find((profile: any) => profile.id === gift.sender_id);
        const recipientProfile = userProfiles.find((profile: any) => profile.id === gift.recipient_id);

        return {
          ...gift,
          sender_name: senderProfile?.name || 'Unknown',
          sender_email: senderProfile?.email,
          recipient_name: recipientProfile?.name || 'Unknown',
          recipient_email: recipientProfile?.email
        };
      });

      console.log('Paginated gifts:', enrichedGifts.length, 'of', totalCount);

      return {
        gifts: enrichedGifts,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    } catch (error) {
      console.error('Error in getPaginatedGifts:', error);
      return {
        gifts: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }

  // Get shekel summary for a user
  async getShekelSummary(userId: string): Promise<ShekelSummary> {
    try {
      console.log('getShekelSummary called for user:', userId);
      
      const [balanceInfo, receivedGifts, sentGifts] = await Promise.all([
        this.getUserBalance(userId),
        this.getReceivedGifts(userId),
        this.getSentGifts(userId)
      ]);

      console.log('Balance info:', balanceInfo);
      console.log('Received gifts count:', receivedGifts.length);
      console.log('Sent gifts count:', sentGifts.length);

      const total_received = receivedGifts.reduce((sum, gift) => sum + gift.amount, 0);
      const total_sent = sentGifts.reduce((sum, gift) => sum + gift.amount, 0);

      const summary = {
        total_received,
        total_sent,
        total_purchased: 0, // This would come from a separate purchases table
        balance: balanceInfo.balance,
        is_verified_user: balanceInfo.is_verified_user
      };

      console.log('Summary calculated:', summary);
      return summary;
    } catch (error) {
      console.error('Error in getShekelSummary:', error);
      return {
        total_received: 0,
        total_sent: 0,
        total_purchased: 0,
        balance: 0,
        is_verified_user: false
      };
    }
  }

  // Convert gifts to transactions for display
  convertGiftsToTransactions(gifts: ShekelGift[], userId: string): CombinedTransaction[] {
    const transactions: CombinedTransaction[] = [];

    gifts.forEach((gift) => {
      if (gift.recipient_id === userId) {
        // Received gift
        transactions.push({
          id: gift.id,
          type: 'gift_received',
          amount: gift.amount,
          description: gift.is_anonymous ? 
            `Anonymous ${gift.gift_type}` : 
            `${gift.gift_type} from ${gift.sender_name || 'Unknown'}`,
          created_at: gift.created_at,
          reference_id: gift.context_id || undefined,
          sender_name: gift.is_anonymous ? 'Anonymous' : gift.sender_name,
          gift_type: gift.gift_type,
          message: gift.message || undefined,
          is_anonymous: gift.is_anonymous,
          thanked_at: gift.thanked_at,
          sender_email: gift.sender_email
        });
      } else if (gift.sender_id === userId) {
        // Sent gift
        transactions.push({
          id: gift.id,
          type: 'gift_sent',
          amount: -gift.amount, // Negative for sent
          description: `${gift.gift_type} to ${gift.recipient_name || 'Unknown'}`,
          created_at: gift.created_at,
          reference_id: gift.context_id || undefined,
          receiver_name: gift.recipient_name,
          gift_type: gift.gift_type,
          message: gift.message || undefined,
          is_anonymous: gift.is_anonymous,
          thanked_at: gift.thanked_at
        });
      }
    });

    // Sort by date (newest first)
    return transactions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // Send thank you email for a donation
  async sendThankYouEmail(giftId: string, donorEmail: string, donorName: string, donationAmount: number, donationDate: string, transactionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
      const response = await fetch(`${supabaseUrl}/functions/v1/send-thank-you-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({
          gift_id: giftId,
          donor_email: donorEmail,
          donor_name: donorName,
          donation_amount: donationAmount,
          donation_date: donationDate,
          transaction_id: transactionId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Error sending thank you email:', result);
        return { success: false, error: result.error || 'Failed to send thank you email' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in sendThankYouEmail:', error);
      return { success: false, error: 'Failed to send thank you email' };
    }
  }
}

export const shekelService = new ShekelService();
export default shekelService; 