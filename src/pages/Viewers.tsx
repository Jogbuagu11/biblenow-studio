import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { databaseService } from '../services/databaseService';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { supabase } from '../config/supabase';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';

const Viewers: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [verifiedFollowers, setVerifiedFollowers] = useState<any[]>([]);
  const [shieldedUsers, setShieldedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifiedSearchTerm, setVerifiedSearchTerm] = useState('');
  const [shieldedSearchTerm, setShieldedSearchTerm] = useState('');
  const [shieldConfirmOpen, setShieldConfirmOpen] = useState(false);
  const [userToShield, setUserToShield] = useState<any>(null);
  const [inviteHistory, setInviteHistory] = useState<any[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  // Fetch followers and following data
  useEffect(() => {
    const fetchFollowersData = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching followers for user ID:', user.uid);
        
        const [followersData, followingData, verifiedFollowersData, shieldedUsersData] = await Promise.all([
          databaseService.getFollowers(user.uid),
          databaseService.getFollowing(user.uid),
          databaseService.getVerifiedFollowers(user.uid),
          databaseService.getShieldedUsers(user.uid)
        ]);
        
        console.log('Raw followers data:', followersData);
        console.log('Raw following data:', followingData);
        console.log('Raw verified followers data:', verifiedFollowersData);
        console.log('Raw shielded users data:', shieldedUsersData);
        
        // Debug: Log each follower's profile data
        followersData.forEach((follower, index) => {
          console.log(`Follower ${index}:`, {
            follower_id: follower.follower_id,
            following_id: follower.following_id,
            created_at: follower.created_at,
            profile: follower.followers,
            hasFirstName: !!follower.followers?.first_name,
            hasLastName: !!follower.followers?.last_name,
            hasEmail: !!follower.followers?.email
          });
        });
        
        setFollowers(followersData);
        setFollowing(followingData);
        setVerifiedFollowers(verifiedFollowersData);
        setShieldedUsers(shieldedUsersData);
      } catch (error) {
        console.error('Error fetching followers data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowersData();
  }, [user?.uid]);

  // Fetch invite history when modal opens
  useEffect(() => {
    const fetchInviteHistory = async () => {
      if (!user?.uid || !inviteModalOpen) return;
      
      try {
        setIsLoadingInvites(true);
        const history = await databaseService.getInviteHistory(user.uid);
        setInviteHistory(history);
      } catch (error) {
        console.error('Error fetching invite history:', error);
      } finally {
        setIsLoadingInvites(false);
      }
    };

    fetchInviteHistory();
  }, [user?.uid, inviteModalOpen]);

  const handleSendInvite = async () => {
    if (!user?.uid || !email.trim()) return;
    
    try {
      await databaseService.sendInvite(user.uid, email.trim(), message.trim() || 'You have been invited to join BibleNOW!');
      
      // Refresh invite history
      const history = await databaseService.getInviteHistory(user.uid);
      setInviteHistory(history);
      
      setInviteModalOpen(false);
      setEmail('');
      setMessage('');
    } catch (error) {
      console.error('Error sending invite:', error);
      // You might want to show a toast notification here
    }
  };

  const handleShieldUser = async (shieldedUserId: string, isFromFollowingSection: boolean = false) => {
    if (!user?.uid) return;
    
    try {
      // First, shield the user
      await databaseService.shieldUser(user.uid, shieldedUserId);
      
      // Only remove from followers if NOT from following section
      if (!isFromFollowingSection) {
        console.log('Attempting to delete follow relationship:', {
          follower_id: shieldedUserId,
          following_id: user.uid
        });
        
        const { error: unfollowError, count } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', shieldedUserId)
          .eq('following_id', user.uid);

        console.log('Delete result:', { error: unfollowError, count });

        if (unfollowError) {
          console.error('Error removing follower during shield:', unfollowError);
        }
      }
      
      // Refresh the data
      const fetchFollowersData = async () => {
        const [followersData, followingData, verifiedFollowersData, shieldedUsersData] = await Promise.all([
          databaseService.getFollowers(user.uid),
          databaseService.getFollowing(user.uid),
          databaseService.getVerifiedFollowers(user.uid),
          databaseService.getShieldedUsers(user.uid)
        ]);
        
        setFollowers(followersData);
        setFollowing(followingData);
        setVerifiedFollowers(verifiedFollowersData);
        setShieldedUsers(shieldedUsersData);
      };
      
      await fetchFollowersData();
      setShieldConfirmOpen(false);
      setUserToShield(null);
    } catch (error) {
      console.error('Error shielding user:', error);
    }
  };

  const openShieldConfirm = (user: any) => {
    setUserToShield(user);
    setShieldConfirmOpen(true);
  };

  const handleUnshieldUser = async (shieldedUserId: string) => {
    if (!user?.uid) return;
    
    try {
      await databaseService.unshieldUser(user.uid, shieldedUserId);
      // Refresh the data
      const fetchFollowersData = async () => {
        const [followersData, followingData, verifiedFollowersData, shieldedUsersData] = await Promise.all([
          databaseService.getFollowers(user.uid),
          databaseService.getFollowing(user.uid),
          databaseService.getVerifiedFollowers(user.uid),
          databaseService.getShieldedUsers(user.uid)
        ]);
        
        setFollowers(followersData);
        setFollowing(followingData);
        setVerifiedFollowers(verifiedFollowersData);
        setShieldedUsers(shieldedUsersData);
      };
      
      await fetchFollowersData();
    } catch (error) {
      console.error('Error unshielding user:', error);
    }
  };

  const handleUnfollowUser = async (followingId: string) => {
    if (!user?.uid) return;
    
    try {
      // Remove from user_follows table
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.uid)
        .eq('following_id', followingId);

      if (error) {
        console.error('Error unfollowing user:', error);
        throw new Error(error.message);
      }

      // Refresh the data
      const fetchFollowersData = async () => {
        const [followersData, followingData, verifiedFollowersData, shieldedUsersData] = await Promise.all([
          databaseService.getFollowers(user.uid),
          databaseService.getFollowing(user.uid),
          databaseService.getVerifiedFollowers(user.uid),
          databaseService.getShieldedUsers(user.uid)
        ]);
        
        setFollowers(followersData);
        setFollowing(followingData);
        setVerifiedFollowers(verifiedFollowersData);
        setShieldedUsers(shieldedUsersData);
      };
      
      await fetchFollowersData();
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  // Filter followers based on search term
  const filteredFollowers = followers.filter(follower => {
    const fullName = `${follower.followers?.first_name || ''} ${follower.followers?.last_name || ''}`.trim();
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           follower.followers?.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Filter verified followers based on search term
  const filteredVerifiedFollowers = verifiedFollowers.filter(follower => {
    const fullName = `${follower.verified_followers?.first_name || ''} ${follower.verified_followers?.last_name || ''}`.trim();
    return fullName.toLowerCase().includes(verifiedSearchTerm.toLowerCase()) ||
           follower.verified_followers?.email?.toLowerCase().includes(verifiedSearchTerm.toLowerCase());
  });

  // Filter shielded users based on search term
  const filteredShieldedUsers = shieldedUsers.filter(shielded => {
    const fullName = `${shielded.shielded_user?.first_name || ''} ${shielded.shielded_user?.last_name || ''}`.trim();
    return fullName.toLowerCase().includes(shieldedSearchTerm.toLowerCase()) ||
           shielded.shielded_user?.email?.toLowerCase().includes(shieldedSearchTerm.toLowerCase());
  });

  // Debug: Log shielded users data
  console.log('Shielded users:', shieldedUsers);
  console.log('Filtered shielded users:', filteredShieldedUsers);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">Manage Viewers</h1>
          <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200">View and manage viewers for your streams</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="followers" className="w-full">
          <TabsList className="!inline-flex !h-10 !items-center !justify-center !rounded-lg !bg-chocolate-800 !p-1 !text-muted-foreground flex w-full !gap-0 !space-x-0">
            <TabsTrigger 
              value="followers" 
              className="flex-1 !inline-flex !items-center !justify-center !whitespace-nowrap !rounded-md !px-4 !py-2 !text-sm !font-medium !ring-offset-background !transition-all !focus-visible:outline-none !focus-visible:ring-2 !focus-visible:ring-ring !focus-visible:ring-offset-2 !disabled:pointer-events-none !disabled:opacity-50 data-[state=active]:bg-chocolate-600 data-[state=active]:text-white data-[state=active]:shadow-sm !m-0 !border-0 !bg-transparent hover:!bg-chocolate-700"
            >
              Followers
            </TabsTrigger>
            <TabsTrigger 
              value="invite" 
              className="flex-1 !inline-flex !items-center !justify-center !whitespace-nowrap !rounded-md !px-4 !py-2 !text-sm !font-medium !ring-offset-background !transition-all !focus-visible:outline-none !focus-visible:ring-2 !focus-visible:ring-ring !focus-visible:ring-offset-2 !disabled:pointer-events-none !disabled:opacity-50 data-[state=active]:bg-chocolate-600 data-[state=active]:text-white data-[state=active]:shadow-sm !m-0 !border-0 !bg-transparent hover:!bg-chocolate-700"
            >
              Invite Users
            </TabsTrigger>
          </TabsList>

          {/* Followers Tab */}
          <TabsContent value="followers" className="space-y-6">
            {/* Regular Followers Section */}
            <Card className="bg-white dark:bg-chocolate-900 shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Followers ({followers.length})</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">View and manage followers for your streams.</CardDescription>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    className="pl-10 bg-white dark:bg-chocolate-800 border-gray-300 dark:border-chocolate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-8 h-8 border-4 border-gray-200 dark:border-gray-600 border-t-chocolate-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading followers...</p>
                  </div>
                ) : filteredFollowers.length > 0 ? (
                  <div className="space-y-3">
                    {filteredFollowers.map((follower) => (
                      <div key={follower.follower_id} className="flex items-center justify-between p-4 bg-white dark:bg-chocolate-800 rounded-lg border border-chocolate-300 dark:border-chocolate-400 hover:bg-gray-50 dark:hover:bg-chocolate-700 transition-colors duration-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-chocolate-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {follower.followers?.profile_photo_url ? (
                              <img 
                                src={follower.followers.profile_photo_url} 
                                alt={`${follower.followers.first_name} ${follower.followers.last_name}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              `${follower.followers?.first_name?.charAt(0) || ''}${follower.followers?.last_name?.charAt(0) || ''}`.toUpperCase() || 'U'
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {`${follower.followers?.first_name || ''} ${follower.followers?.last_name || ''}`.trim() || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {follower.followers?.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Following since {new Date(follower.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" className="border-gray-300 dark:border-chocolate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-chocolate-700">
                            View Profile
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => openShieldConfirm({ 
                              id: follower.follower_id, 
                              name: `${follower.followers?.first_name || ''} ${follower.followers?.last_name || ''}`.trim() || 'Unknown User',
                              isFromFollowingSection: false
                            })}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Shield
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No followers found matching your search' : 'No followers found'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verified Followers Section */}
            <Card className="bg-white dark:bg-chocolate-900 shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Verified Followers ({verifiedFollowers.length})</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">Verified ministry leaders and content creators following your streams.</CardDescription>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Input
                    type="text"
                    placeholder="Search verified followers by name or email..."
                    className="pl-10 bg-white dark:bg-chocolate-800 border-gray-300 dark:border-chocolate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    value={verifiedSearchTerm}
                    onChange={(e) => setVerifiedSearchTerm(e.target.value)}
                  />
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-8 h-8 border-4 border-gray-200 dark:border-gray-600 border-t-chocolate-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading verified followers...</p>
                  </div>
                ) : filteredVerifiedFollowers.length > 0 ? (
                  <div className="space-y-3">
                    {filteredVerifiedFollowers.map((follower) => (
                      <div key={follower.follower_id} className="flex items-center justify-between p-4 bg-white dark:bg-chocolate-800 rounded-lg border-l-4 border-green-500 border border-chocolate-300 dark:border-chocolate-400 hover:bg-gray-50 dark:hover:bg-chocolate-700 transition-colors duration-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {follower.verified_followers?.profile_photo_url ? (
                              <img 
                                src={follower.verified_followers.profile_photo_url} 
                                alt={`${follower.verified_followers.first_name} ${follower.verified_followers.last_name}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              `${follower.verified_followers?.first_name?.charAt(0) || ''}${follower.verified_followers?.last_name?.charAt(0) || ''}`.toUpperCase() || 'V'
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              {`${follower.verified_followers?.first_name || ''} ${follower.verified_followers?.last_name || ''}`.trim() || 'Unknown User'}
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Verified
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {follower.verified_followers?.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {follower.verified_followers?.ministry_name && (
                                <span className="mr-2">Ministry: {follower.verified_followers.ministry_name}</span>
                              )}
                              Following since {new Date(follower.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" className="border-gray-300 dark:border-chocolate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-chocolate-700">
                            View Profile
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => openShieldConfirm({ 
                              id: follower.follower_id, 
                              name: `${follower.verified_followers?.first_name || ''} ${follower.verified_followers?.last_name || ''}`.trim() || 'Unknown User',
                              isFromFollowingSection: false
                            })}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Shield
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {verifiedSearchTerm ? 'No verified followers found matching your search' : 'No verified followers found'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Following Section */}
            <Card className="bg-white dark:bg-chocolate-900 shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Following ({following.length})</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">Users you are following.</CardDescription>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-8 h-8 border-4 border-gray-200 dark:border-gray-600 border-t-chocolate-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading following...</p>
                  </div>
                ) : following.length > 0 ? (
                  <div className="space-y-3">
                    {following.map((follow) => (
                      <div key={follow.following_id} className="flex items-center justify-between p-4 bg-white dark:bg-chocolate-800 rounded-lg border border-chocolate-300 dark:border-chocolate-400 hover:bg-gray-50 dark:hover:bg-chocolate-700 transition-colors duration-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-chocolate-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {follow.following?.profile_photo_url ? (
                              <img 
                                src={follow.following.profile_photo_url} 
                                alt={`${follow.following.first_name} ${follow.following.last_name}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              `${follow.following?.first_name?.charAt(0) || ''}${follow.following?.last_name?.charAt(0) || ''}`.toUpperCase() || 'U'
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {`${follow.following?.first_name || ''} ${follow.following?.last_name || ''}`.trim() || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {follow.following?.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Following since {new Date(follow.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" className="border-gray-300 dark:border-chocolate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-chocolate-700">
                            View Profile
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleUnfollowUser(follow.following_id)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Unfollow
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    You're not following anyone yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shielded Viewers Section */}
            <Card className="bg-white dark:bg-chocolate-900 shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Shielded Viewers ({shieldedUsers.length})</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">Viewers that are shielded from your streams.</CardDescription>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Input
                    type="text"
                    placeholder="Search shielded viewers by name or email..."
                    className="pl-10 bg-white dark:bg-chocolate-800 border-gray-300 dark:border-chocolate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    value={shieldedSearchTerm}
                    onChange={(e) => setShieldedSearchTerm(e.target.value)}
                  />
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-8 h-8 border-4 border-gray-200 dark:border-gray-600 border-t-chocolate-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading shielded viewers...</p>
                  </div>
                ) : filteredShieldedUsers.length > 0 ? (
                  <div className="space-y-3">
                    {filteredShieldedUsers.map((shielded) => (
                      <div key={shielded.shielded_user_id} className="flex items-center justify-between p-4 bg-white dark:bg-chocolate-800 rounded-lg border border-chocolate-300 dark:border-chocolate-400 hover:bg-gray-50 dark:hover:bg-chocolate-700 transition-colors duration-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {shielded.shielded_user?.profile_photo_url ? (
                              <img 
                                src={shielded.shielded_user.profile_photo_url} 
                                alt={`${shielded.shielded_user.first_name} ${shielded.shielded_user.last_name}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              `${shielded.shielded_user?.first_name?.charAt(0) || ''}${shielded.shielded_user?.last_name?.charAt(0) || ''}`.toUpperCase() || 'S'
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              {`${shielded.shielded_user?.first_name || ''} ${shielded.shielded_user?.last_name || ''}`.trim() || 'Unknown User'}
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Shielded
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {shielded.shielded_user?.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Shielded since {new Date(shielded.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" className="border-gray-300 dark:border-chocolate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-chocolate-700">
                            View Profile
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-green-300 dark:border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => handleUnshieldUser(shielded.shielded_user_id)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Unshield
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {shieldedSearchTerm ? 'No shielded viewers found matching your search' : 'No shielded viewers'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invite Users Tab */}
          <TabsContent value="invite" className="space-y-6">
            {/* Invite Viewers Section */}
            <Card className="bg-white dark:bg-chocolate-900 shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Invite Viewers</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">Send invitations to people you want to view your streams.</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInviteModalOpen(true)}
                    className="flex items-center gap-2 border-gray-300 dark:border-chocolate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-chocolate-700"
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
                    className="bg-white dark:bg-chocolate-800 border-gray-300 dark:border-chocolate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
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
                    className="bg-white dark:bg-chocolate-800 border-gray-300 dark:border-chocolate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
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
          </TabsContent>
        </Tabs>

        {/* Invite History Modal */}
        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-chocolate-900 border-gray-200 dark:border-chocolate-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Invite History</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Track your invitation statistics and history
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-chocolate-800 rounded-lg p-4 text-center border border-gray-200 dark:border-chocolate-600 shadow-sm">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{inviteHistory.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Total Invites</div>
                </div>
                <div className="bg-white dark:bg-chocolate-800 rounded-lg p-4 text-center border border-gray-200 dark:border-chocolate-600 shadow-sm">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{inviteHistory.filter(invite => invite.status === 'accepted').length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Accepted</div>
                </div>
                <div className="bg-white dark:bg-chocolate-800 rounded-lg p-4 text-center border border-gray-200 dark:border-chocolate-600 shadow-sm">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {inviteHistory.length > 0 
                      ? Math.round((inviteHistory.filter(invite => invite.status === 'accepted').length / inviteHistory.length) * 100)
                      : 0}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Acceptance Rate</div>
                </div>
              </div>

              {/* Invite History List */}
              {isLoadingInvites ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-8 h-8 border-4 border-gray-200 dark:border-gray-600 border-t-yellow-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading invites...</p>
                </div>
                            ) : inviteHistory.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {inviteHistory.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-4 bg-white dark:bg-chocolate-800 rounded-lg border border-gray-200 dark:border-chocolate-600 shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">{invite.invitee_email}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            invite.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            invite.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            invite.status === 'delivered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            invite.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {invite.message}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Sent: {new Date(invite.sent_at).toLocaleDateString()}
                          {invite.accepted_at && ` • Accepted: ${new Date(invite.accepted_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {invite.status === 'pending' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                if (!user?.uid) return;
                                try {
                                  await databaseService.resendInvite(invite.id);
                                  // Refresh invite history
                                  const history = await databaseService.getInviteHistory(user.uid);
                                  setInviteHistory(history);
                                } catch (error) {
                                  console.error('Error resending invite:', error);
                                }
                              }}
                              className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              Resend
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                if (!user?.uid) return;
                                try {
                                  await databaseService.cancelInvite(invite.id);
                                  // Refresh invite history
                                  const history = await databaseService.getInviteHistory(user.uid);
                                  setInviteHistory(history);
                                } catch (error) {
                                  console.error('Error cancelling invite:', error);
                                }
                              }}
                              className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No invites sent yet. Start inviting viewers to see your invite history here.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteModalOpen(false)} className="border-gray-300 dark:border-chocolate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-chocolate-700">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shield Confirmation Dialog */}
        <Dialog open={shieldConfirmOpen} onOpenChange={setShieldConfirmOpen}>
          <DialogContent className="bg-white dark:bg-chocolate-900 border-gray-200 dark:border-chocolate-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Shield User
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Are you sure you want to shield <strong>{userToShield?.name}</strong>? This will prevent them from viewing your streams.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div className="text-sm text-red-700 dark:text-red-300">
                <strong>Shielded users will:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Not be able to view your live streams</li>
                  <li>Not receive notifications about your streams</li>
                  <li>Be moved to the Shielded Viewers section</li>
                  <li>Be removed from your followers list</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShieldConfirmOpen(false)}
                className="border-gray-300 dark:border-chocolate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-chocolate-700"
              >
                Cancel
              </Button>
                              <Button 
                  onClick={() => {
                    if (userToShield?.id) {
                      handleShieldUser(userToShield.id, userToShield.isFromFollowingSection);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Shield User
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Viewers; 