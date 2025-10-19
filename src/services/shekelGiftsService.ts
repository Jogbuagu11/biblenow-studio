import { supabase } from '../config/supabase';

export interface ShekelGift {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  message?: string;
  is_anonymous: boolean;
  gift_type: 'donation' | 'tip' | 'gift';
  context?: string;
  context_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  tax_amount: number;
  total_amount: number;
  metadata?: string;
  thanked_at?: string;
}

export interface StreamShekelSummary {
  total_gifts: number;
  total_amount: number;
  total_shekelz: number;
  gift_count: number;
}

class ShekelGiftsService {
  /**
   * Get all shekel gifts for a specific stream
   * @param streamId - The ID of the stream
   * @returns Promise<ShekelGift[]>
   */
  async getStreamShekelGifts(streamId: string): Promise<ShekelGift[]> {
    try {
      const { data, error } = await supabase
        .from('shekel_gifts')
        .select('*')
        .eq('context', 'livestream')
        .eq('context_id', streamId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stream shekel gifts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getStreamShekelGifts:', error);
      throw error;
    }
  }

  /**
   * Get summary of shekel gifts for a specific stream
   * @param streamId - The ID of the stream
   * @returns Promise<StreamShekelSummary>
   */
  async getStreamShekelSummary(streamId: string): Promise<StreamShekelSummary> {
    try {
      console.log('🔍 ShekelGiftsService: Fetching summary for stream:', streamId);
      
      // First try the exact stream ID match
      let { data, error } = await supabase
        .from('shekel_gifts')
        .select('amount, total_amount')
        .eq('context', 'livestream')
        .eq('context_id', streamId)
        .eq('status', 'completed');

      console.log('🔍 Direct stream match result:', { data, error, count: data?.length || 0 });

      // If no direct match, also check for gifts with null context_id (general gifts)
      if (!data || data.length === 0) {
        console.log('🔍 No direct stream match, checking for general gifts...');
        
        // Get current user to filter general gifts
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: generalGifts, error: generalError } = await supabase
            .from('shekel_gifts')
            .select('amount, total_amount')
            .eq('recipient_id', user.id)
            .is('context', null)
            .is('context_id', null)
            .eq('status', 'completed');

          console.log('🔍 General gifts result:', { data: generalGifts, error: generalError, count: generalGifts?.length || 0 });
          
          if (generalGifts && generalGifts.length > 0) {
            data = generalGifts;
            error = generalError;
          }
        }
      }

      if (error) {
        console.error('Error fetching stream shekel summary:', error);
        throw error;
      }

      const gifts = data || [];
      console.log('🔍 Final gifts data:', gifts);
      
      const total_gifts = gifts.length;
      const total_amount = gifts.reduce((sum: number, gift: any) => sum + (gift.total_amount || 0), 0);
      const total_shekelz = gifts.reduce((sum: number, gift: any) => sum + (gift.amount || 0), 0);

      const summary = {
        total_gifts,
        total_amount,
        total_shekelz,
        gift_count: total_gifts
      };

      console.log('✅ ShekelGiftsService: Returning summary:', summary);
      return summary;
    } catch (error) {
      console.error('Error in getStreamShekelSummary:', error);
      throw error;
    }
  }

  /**
   * Get shekel gifts for a specific user (all streams)
   * @param userId - The ID of the user
   * @returns Promise<ShekelGift[]>
   */
  async getUserShekelGifts(userId: string): Promise<ShekelGift[]> {
    try {
      const { data, error } = await supabase
        .from('shekel_gifts')
        .select('*')
        .eq('recipient_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user shekel gifts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserShekelGifts:', error);
      throw error;
    }
  }

  /**
   * Get shekel gifts sent by a specific user
   * @param userId - The ID of the user
   * @returns Promise<ShekelGift[]>
   */
  async getSentShekelGifts(userId: string): Promise<ShekelGift[]> {
    try {
      const { data, error } = await supabase
        .from('shekel_gifts')
        .select('*')
        .eq('sender_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent shekel gifts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSentShekelGifts:', error);
      throw error;
    }
  }
}

export const shekelGiftsService = new ShekelGiftsService();
