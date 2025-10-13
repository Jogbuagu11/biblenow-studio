import React from 'react';
import Layout from '../components/Layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { useThemeStore } from '../stores';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import EmailPreferences from '../components/EmailPreferences';

const Settings: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { user, isLoading: isAuthLoading } = useSupabaseAuthStore();

  if (isAuthLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        </div>
      </Layout>
    );
  }

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

        {/* Email Preferences Component */}
        <EmailPreferences />

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
                  value={user?.displayName || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-chocolate-600 rounded-md shadow-sm bg-white dark:bg-chocolate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
                  disabled
                  placeholder="Loading..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-chocolate-600 rounded-md shadow-sm bg-white dark:bg-chocolate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
                  disabled
                  placeholder="Loading..."
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