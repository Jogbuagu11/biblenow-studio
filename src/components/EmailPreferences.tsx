import React, { useState, useEffect } from 'react';
import { StudioEmailPreferencesService, StudioEmailPreferences } from '../services/studioEmailPreferencesService';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import Switch from './ui/Switch';
import Label from './ui/Label';
import { useToast } from '../hooks/use-toast';

const EmailPreferences: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<StudioEmailPreferences>({
    livestreamNotifications: true,
    streamingLimitEmails: true,
    weeklyDigest: false,
    marketingEmails: false,
    systemNotifications: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences using the correct service
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        console.log('🔍 EmailPreferences: Loading preferences using StudioEmailPreferencesService');
        const prefs = await StudioEmailPreferencesService.getEmailPreferences(user.uid);
        console.log('✅ EmailPreferences: Received preferences:', prefs);
        setPreferences(prefs);
      } catch (error) {
        console.error('❌ EmailPreferences: Error loading preferences:', error);
        toast({
          title: "Error",
          description: "Failed to load email preferences",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user, toast]);

  const handlePreferenceChange = (key: keyof StudioEmailPreferences, value: boolean) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    // Update preferences asynchronously
    updatePreferencesAsync(key, value, newPreferences);
  };

  const updatePreferencesAsync = async (key: keyof StudioEmailPreferences, value: boolean, newPreferences: StudioEmailPreferences) => {
    try {
      setSaving(true);
      console.log('🔍 EmailPreferences: Updating preference:', key, 'to', value);
      
      await StudioEmailPreferencesService.updateEmailPreferences(user!.uid, {
        [key]: value
      });
      
      toast({
        title: "Success",
        description: "Email preferences updated successfully"
      });
    } catch (error) {
      console.error('Error updating email preferences:', error);
      // Revert the change on error
      setPreferences(preferences);
      toast({
        title: "Error",
        description: "Failed to update email preferences",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>Loading your email notification settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Preferences</CardTitle>
        <CardDescription>
          Manage your email notification preferences for BibleNOW Studio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Livestream Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Livestream Notifications
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Get notified via email when streamers you follow start a livestream
            </p>
          </div>
          <Switch
            checked={preferences.livestreamNotifications}
            onCheckedChange={(checked: boolean) => handlePreferenceChange('livestreamNotifications', checked)}
            disabled={saving}
          />
        </div>

        {/* Streaming Limit Emails */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Streaming Limit Emails
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Receive email notifications about your weekly streaming limits
            </p>
          </div>
          <Switch
            checked={preferences.streamingLimitEmails}
            onCheckedChange={(checked: boolean) => handlePreferenceChange('streamingLimitEmails', checked)}
            disabled={saving}
          />
        </div>

        {/* Weekly Digest */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Weekly Digest
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Receive a weekly summary of your streaming activity and platform updates
            </p>
          </div>
          <Switch
            checked={preferences.weeklyDigest}
            onCheckedChange={(checked: boolean) => handlePreferenceChange('weeklyDigest', checked)}
            disabled={saving}
          />
        </div>

        {/* Marketing Emails */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Marketing Emails
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Receive promotional emails about new features and special offers
            </p>
          </div>
          <Switch
            checked={preferences.marketingEmails}
            onCheckedChange={(checked: boolean) => handlePreferenceChange('marketingEmails', checked)}
            disabled={saving}
          />
        </div>

        {/* System Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              System Notifications
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Important account and security notifications
            </p>
          </div>
          <Switch
            checked={preferences.systemNotifications}
            onCheckedChange={(checked: boolean) => handlePreferenceChange('systemNotifications', checked)}
            disabled={saving}
          />
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Email Notification Info</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                You can change these preferences at any time. Disabling notifications will stop all email alerts for that category.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button (if needed for bulk changes) */}
        {saving && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Saving preferences...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailPreferences;
