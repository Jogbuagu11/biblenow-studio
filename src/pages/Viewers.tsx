import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Textarea from '../components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';

const Viewers: React.FC = () => {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSendInvite = () => {
    // Logic would go here
    setInviteModalOpen(false);
    setEmail('');
    setMessage('');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">Manage Viewers</h1>
          <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">View and manage viewers for your streams</p>
        </div>

        {/* Followers Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Followers</CardTitle>
                <CardDescription>View and manage followers for your streams.</CardDescription>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Input
                type="text"
                placeholder="Search by name or email..."
                className="pl-10"
              />
            </div>
            <div className="text-center py-8 text-gray-500">
              No followers found
            </div>
          </CardContent>
        </Card>

        {/* Shielded Viewers Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Shielded Viewers</CardTitle>
                <CardDescription>Viewers that are shielded from your streams.</CardDescription>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              No shielded viewers
            </div>
          </CardContent>
        </Card>

        {/* Invite Viewers Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Invite Viewers</CardTitle>
                <CardDescription>Send invitations to people you want to view your streams.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Invite History
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-chocolate-200 mb-2 transition-colors duration-200">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="viewer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white dark:bg-chocolate-800 border-gray-300 dark:border-chocolate-600 text-gray-900 dark:text-white transition-colors duration-200"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-chocolate-200 mb-2 transition-colors duration-200">
                Message (Optional)
              </label>
              <Textarea
                id="message"
                placeholder="Join me for my upcoming streams!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="bg-white dark:bg-chocolate-800 border-gray-300 dark:border-chocolate-600 text-gray-900 dark:text-white transition-colors duration-200"
              />
            </div>
            <Button 
              className="w-full bg-chocolate-600 hover:bg-chocolate-700 text-white flex items-center justify-center gap-2 transition-colors duration-200"
              onClick={handleSendInvite}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Invite
            </Button>
          </CardContent>
        </Card>

        {/* Invite History Modal */}
        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite History</DialogTitle>
              <DialogDescription>
                Track your invitation statistics and history
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-600">Total Invites</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-600">Joined</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">0%</div>
                  <div className="text-sm text-gray-600">Join Rate</div>
                </div>
              </div>

              {/* Loading State */}
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-8 h-8 border-4 border-gray-200 border-t-yellow-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500">Loading invites...</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Viewers; 