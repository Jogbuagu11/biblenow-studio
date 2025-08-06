import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { useThemeStore } from '../stores';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { databaseService } from '../services/databaseService';

const Settings: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { user } = useSupabaseAuthStore();
  const [streamingLimitEmails, setStreamingLimitEmails] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load email preferences on component mount
  useEffect(() => {
    const loadEmailPreferences = async () => {
      if (!user?.uid) return;
      
      try {
        const preferences = await databaseService.getEmailPreferences(user.uid);
        setStreamingLimitEmails(preferences.streamingLimitEmails);
      } catch (error) {
        console.error('Error loading email preferences:', error);
      }
    };

    loadEmailPreferences();
  }, [user?.uid]);

  const handleStreamingLimitEmailsToggle = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const newValue = !streamingLimitEmails;
      await databaseService.updateEmailPreferences(user.uid, {
        streamingLimitEmails: newValue
      });
      setStreamingLimitEmails(newValue);
    } catch (error) {
      console.error('Error updating email preferences:', error);
      // Revert the toggle if update failed
      setStreamingLimitEmails(!streamingLimitEmails);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account preferences and settings.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel of your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Switch between light and dark themes.</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDarkMode ? 'bg-yellow-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Configure your email notification preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Weekly Streaming Limit Emails</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive email notifications when you reach 75% or 100% of your weekly streaming limit.
                  </p>
                </div>
                <button 
                  onClick={handleStreamingLimitEmailsToggle}
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    streamingLimitEmails ? 'bg-yellow-500' : 'bg-gray-200'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      streamingLimitEmails ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings and preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  defaultValue="John Doe"
                  className="dark:bg-chocolate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  defaultValue="john@example.com"
                  className="dark:bg-chocolate-800"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings; 