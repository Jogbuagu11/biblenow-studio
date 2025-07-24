import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import Separator from '../components/ui/Separator';
import Button from '../components/ui/Button';

interface StripeAccount {
  id: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  loginLink?: string;
}

const Payments: React.FC = () => {
  const [connectLoading, setConnectLoading] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);

  const handleConnectStripe = async () => {
    try {
      setConnectLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, simulate a connected account
      setStripeAccount({
        id: 'acct_demo123',
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        loginLink: 'https://dashboard.stripe.com'
      });
    } catch (error) {
      console.error("Error connecting Stripe account:", error);
    } finally {
      setConnectLoading(false);
    }
  };

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
                  <CardTitle>Stripe Connected Account</CardTitle>
                  <CardDescription>
                    Connect your Stripe account to receive donations from your viewers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!stripeAccount ? (
                    <Alert className="bg-offWhite-25 dark:bg-chocolate-800 border-gray-200 dark:border-chocolate-600 transition-colors duration-200">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gray-400 dark:bg-chocolate-600 flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <AlertTitle className="text-gray-900 dark:text-white transition-colors duration-200">Not connected</AlertTitle>
                      </div>
                      <AlertDescription className="text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        To receive donations, you must connect your Stripe account.
                        This allows viewers to donate directly to your streams.
                      </AlertDescription>
                    </Alert>
                  ) : !stripeAccount.detailsSubmitted ? (
                    <Alert className="bg-gray-50 border-yellow-600">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <AlertTitle className="text-yellow-600">Account setup incomplete</AlertTitle>
                      </div>
                      <AlertDescription>
                        You've started setting up your Stripe account, but you need to complete
                        the onboarding process to receive payments.
                      </AlertDescription>
                    </Alert>
                  ) : !stripeAccount.chargesEnabled ? (
                    <Alert className="bg-gray-50 border-yellow-600">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <AlertTitle className="text-yellow-600">Verification in progress</AlertTitle>
                      </div>
                      <AlertDescription>
                        Your account information is being reviewed by Stripe. This process may 
                        take 1-2 business days. You'll be able to receive donations once verified.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-gray-50 border-green-600">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <AlertTitle className="text-green-600">Stripe account connected</AlertTitle>
                      </div>
                      <AlertDescription>
                        Your account is fully set up and ready to receive donations.
                      </AlertDescription>
                    </Alert>
                  )}

                  {stripeAccount?.chargesEnabled && (
                    <div className="mt-6">
                      <div className="rounded-md bg-gray-50 p-4">
                        <div className="flex">
                          <div className="flex-grow">
                            <h3 className="text-sm font-medium">Account Information</h3>
                            <p className="mt-1 text-sm text-gray-600">
                              Manage your Stripe account, payouts, and banking details
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => stripeAccount.loginLink && window.open(stripeAccount.loginLink, "_blank")}
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
                      <p className="text-xs text-gray-500">
                        Stripe account ID: {stripeAccount.id}
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleConnectStripe} 
                    disabled={connectLoading || (stripeAccount?.chargesEnabled)}
                    className="bg-chocolate-600 hover:bg-chocolate-700 text-white transition-colors duration-200"
                  >
                    {connectLoading && (
                      <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {!stripeAccount 
                      ? "Connect Stripe Account" 
                      : !stripeAccount.detailsSubmitted 
                        ? "Complete Stripe Setup" 
                        : !stripeAccount.chargesEnabled 
                          ? "Update Account Information" 
                          : "Account Connected"
                    }
                  </Button>
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
                      <p className="text-gray-500">
                        Connect and complete your Stripe account setup to view payout information.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-md bg-gray-50 p-4">
                        <h3 className="text-sm font-medium">Automatic Payouts</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Donations are automatically transferred to your bank account based on your Stripe payout schedule.
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-sm font-medium mb-2">Payout Timeline</h3>
                        <p className="text-sm text-gray-600">
                          Payouts are typically processed within 2 business days after a donation is received, 
                          though timing may vary by country and account status.
                        </p>
                      </div>

                      <div className="flex justify-center mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => stripeAccount.loginLink && window.open(stripeAccount.loginLink, "_blank")}
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