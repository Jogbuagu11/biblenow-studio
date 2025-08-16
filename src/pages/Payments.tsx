import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert';

import Separator from '../components/ui/Separator';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { stripeService, StripeAccount } from '../services/stripeService';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { useToast } from '../hooks/use-toast';

const Payments: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const { toast } = useToast();
  const [connectLoading, setConnectLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [accountId, setAccountId] = useState('');
  const [showConnectForm, setShowConnectForm] = useState(false);

  useEffect(() => {
    const checkStripeStatus = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const accountStatus = await stripeService.getAccountStatus(user.uid);
        setStripeAccount(accountStatus);
      } catch (error) {
        console.error('Error checking Stripe status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStripeStatus();
  }, [user?.uid]);

  const handleCreateExpressAccount = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "Please log in to connect your Stripe account",
        variant: "destructive"
      });
      return;
    }

    try {
      setConnectLoading(true);
      
      console.log('Starting Express account creation for user:', user.uid);
      
      // Create new Express account and get onboarding link
      const result = await stripeService.createExpressAccount(user.uid);
      
      if (result.success && result.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = result.onboardingUrl;
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create Stripe account",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating Express account:', error);
      toast({
        title: "Error",
        description: "Failed to create Stripe account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConnectLoading(false);
    }
  };

  const handleConnectExistingAccount = async () => {
    if (!user?.uid || !accountId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Stripe account ID",
        variant: "destructive"
      });
      return;
    }

    try {
      setConnectLoading(true);
      
      console.log('Starting connection process for user:', user.uid);
      
      // Connect the existing Stripe account
      const connectedAccount = await stripeService.connectExistingAccount(accountId, user.uid);
      setStripeAccount(connectedAccount);
      
      toast({
        title: "Success",
        description: "Stripe account connected successfully!"
      });
      
      setAccountId('');
    } catch (error) {
      console.error('Error connecting existing account:', error);
      toast({
        title: "Error",
        description: "Failed to connect Stripe account. Please check the account ID and try again.",
        variant: "destructive"
      });
    } finally {
      setConnectLoading(false);
    }
  };

  const handleStripeDashboard = async () => {
    if (!stripeAccount?.id) return;

    try {
      const loginUrl = await stripeService.getAccountLoginLink(stripeAccount.id);
      if (loginUrl) {
        window.open(loginUrl, "_blank");
      }
    } catch (error) {
      console.error("Error getting Stripe dashboard link:", error);
      toast({
        title: "Error",
        description: "Failed to open Stripe dashboard",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">Payment Settings</h1>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chocolate-600"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">Payment Settings</h1>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="overview">Account</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Stripe Connect Account</CardTitle>
                  <CardDescription>
                    Connect your existing Stripe account to receive donations from your viewers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!stripeAccount ? (
                    <div className="space-y-4">
                      <Alert className="bg-offWhite-25 dark:bg-chocolate-800 border-gray-200 dark:border-chocolate-600 transition-colors duration-200">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-gray-400 dark:bg-chocolate-600 flex items-center justify-center">
                            <span className="text-white text-xs">!</span>
                          </div>
                          <AlertTitle className="text-gray-900 dark:text-white transition-colors duration-200">Not connected</AlertTitle>
                        </div>
                        <AlertDescription className="text-gray-700 dark:text-gray-300 transition-colors duration-200">
                          To receive donations, you must connect your existing Stripe account.
                          This allows viewers to donate directly to your streams.
                        </AlertDescription>
                      </Alert>

                      {!showConnectForm ? (
                        <div className="space-y-4">
                          <div className="text-center">
                            <Button 
                              onClick={() => setShowConnectForm(true)}
                              className="bg-chocolate-600 hover:bg-chocolate-700 text-white transition-colors duration-200"
                            >
                              Set Up Stripe Account
                            </Button>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Already have a Stripe account? 
                              <button 
                                onClick={() => setShowConnectForm(true)}
                                className="text-chocolate-600 hover:text-chocolate-700 ml-1 underline"
                              >
                                Connect existing account
                              </button>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 p-4 border border-gray-200 dark:border-chocolate-600 rounded-lg">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                                Choose Setup Option
                              </Label>
                            </div>
                            
                            <div className="space-y-3">
                              <Button 
                                onClick={handleCreateExpressAccount}
                                disabled={connectLoading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
                              >
                                {connectLoading && (
                                  <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                )}
                                🚀 Quick Setup (Recommended)
                              </Button>
                              
                              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                Complete setup in 5-10 minutes
                              </div>
                            </div>
                            
                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-300" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white dark:bg-chocolate-800 px-2 text-gray-500">Or</span>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="accountId" className="text-sm font-medium text-gray-900 dark:text-white">
                                  Connect Existing Stripe Account
                                </Label>
                                <Input
                                  id="accountId"
                                  type="text"
                                  placeholder="acct_1234567890"
                                  value={accountId}
                                  onChange={(e) => setAccountId(e.target.value)}
                                  className="mt-1"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Find your account ID in your Stripe Dashboard under Account Settings
                                </p>
                              </div>
                              
                              <Button 
                                onClick={handleConnectExistingAccount}
                                disabled={connectLoading || !accountId.trim()}
                                variant="outline"
                                className="w-full"
                              >
                                {connectLoading && (
                                  <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                )}
                                Connect Existing Account
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setShowConnectForm(false);
                                setAccountId('');
                              }}
                              disabled={connectLoading}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : !stripeAccount.detailsSubmitted ? (
                    <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-600 dark:border-yellow-500">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <AlertTitle className="text-yellow-600 dark:text-yellow-400">Account setup incomplete</AlertTitle>
                      </div>
                      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                        Your Stripe account is connected but you need to complete
                        the onboarding process to receive payments.
                      </AlertDescription>
                    </Alert>
                  ) : !stripeAccount.chargesEnabled ? (
                    <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-600 dark:border-yellow-500">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <AlertTitle className="text-yellow-600 dark:text-yellow-400">Verification in progress</AlertTitle>
                      </div>
                      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                        Your account information is being reviewed by Stripe. This process may 
                        take 1-2 business days. You'll be able to receive donations once verified.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-green-50 dark:bg-green-900/20 border-green-600 dark:border-green-500">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <AlertTitle className="text-green-600 dark:text-green-400">Stripe account connected</AlertTitle>
                      </div>
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        Your account is fully set up and ready to receive donations.
                        {stripeAccount.businessProfile?.name && (
                          <span className="block mt-1">
                            Connected account: {stripeAccount.businessProfile.name}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {stripeAccount?.chargesEnabled && (
                    <div className="mt-6">
                      <div className="rounded-md bg-gray-50 dark:!bg-chocolate-800 p-4 border border-gray-200 dark:!border-chocolate-600 transition-colors duration-200">
                        <div className="flex">
                          <div className="flex-grow">
                            <h3 className="text-sm font-medium text-gray-900 dark:!text-white transition-colors duration-200">Account Information</h3>
                            <p className="mt-1 text-sm text-gray-600 dark:!text-gray-300 transition-colors duration-200">
                              Manage your Stripe account, payouts, and banking details
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleStripeDashboard}
                              className="border-gray-300 dark:!border-chocolate-600 text-gray-700 dark:!text-gray-300 hover:bg-gray-50 dark:hover:!bg-chocolate-700 transition-colors duration-200"
                            >
                              <span className="mr-2">↗</span>
                              Stripe Dashboard
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <div>
                    {stripeAccount && stripeAccount.detailsSubmitted && !stripeAccount.chargesEnabled && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">
                        Stripe account ID: {stripeAccount.id}
                      </p>
                    )}
                  </div>
                  {stripeAccount?.chargesEnabled && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setStripeAccount(null);
                        setShowConnectForm(false);
                      }}
                      className="border-gray-300 dark:border-chocolate-600 text-gray-700 dark:text-gray-300"
                    >
                      Disconnect Account
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="payouts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payout Information</CardTitle>
                  <CardDescription>
                    View and manage your donation payouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!stripeAccount || !stripeAccount.chargesEnabled ? (
                    <div className="py-8 text-center">
                      <p className="text-gray-500 dark:text-gray-400 transition-colors duration-200">
                        Connect and complete your Stripe account setup to view payout information.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-md bg-gray-50 dark:!bg-chocolate-800 p-4 border border-gray-200 dark:!border-chocolate-600 transition-colors duration-200">
                        <h3 className="text-sm font-medium text-gray-900 dark:!text-white transition-colors duration-200">Automatic Payouts</h3>
                        <p className="mt-1 text-sm text-gray-600 dark:!text-gray-300 transition-colors duration-200">
                          Donations are automatically transferred to your bank account based on your Stripe payout schedule.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-sm font-medium mb-2 text-gray-900 dark:!text-white transition-colors duration-200">Payout Timeline</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">
                          Payouts are typically processed within 2 business days after a donation is received, 
                          though timing may vary by country and account status.
                        </p>
                      </div>

                      <div className="flex justify-center mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleStripeDashboard}
                          className="border-gray-300 dark:!border-chocolate-600 text-gray-700 dark:!text-gray-300 hover:bg-gray-50 dark:hover:!bg-chocolate-700 transition-colors duration-200"
                        >
                          <span className="mr-2">↗</span>
                          View detailed payout information
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Payments; 