import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/use-toast';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import shekelService, { ShekelSummary, CombinedTransaction } from '../services/shekelService';
import cashOutService, { CashOutRequest } from '../services/cashOutService';
import CashOutWidget from '../components/CashOutWidget';

const Shekelz: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSupabaseAuthStore();
  const [shekelSummary, setShekelSummary] = useState<ShekelSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<CombinedTransaction[]>([]);
  const [cashOutHistory, setCashOutHistory] = useState<CashOutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingThanks, setSendingThanks] = useState<Set<string>>(new Set());
  const isFetchingRef = useRef(false);
  const toastRef = useRef(toast);
  
  // Update ref when toast changes
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    const fetchShekelData = async () => {
      if (!user?.uid) {
        console.log('No user ID available');
        setIsLoading(false);
        return;
      }

      // Prevent multiple simultaneous requests
      if (isFetchingRef.current) {
        console.log('Already fetching data, skipping...');
        return;
      }

      console.log('Fetching Shekelz data for user:', user.uid);
      isFetchingRef.current = true;

      try {
        setIsLoading(true);
        
        // Fetch real data from shekel_gifts table
        console.log('Fetching summary and gifts...');
        const [summary, allGifts, cashOutRequests] = await Promise.all([
          shekelService.getShekelSummary(user.uid),
          shekelService.getAllGifts(user.uid),
          cashOutService.getCashOutHistory(user.uid)
        ]);

        console.log('Summary received:', summary);
        console.log('All gifts received:', allGifts?.length || 0);
        console.log('Cash out requests received:', cashOutRequests?.length || 0);
        
        setShekelSummary(summary);
        
        // Convert gifts to transactions
        const transactions = shekelService.convertGiftsToTransactions(allGifts, user.uid);
        console.log('Transactions converted:', transactions?.length || 0);
        setRecentTransactions(transactions);
        setCashOutHistory(cashOutRequests);
        
      } catch (error) {
        console.error("Error fetching Shekelz data:", error);
        // Set default values on error
        setShekelSummary({
          total_received: 0,
          total_sent: 0,
          total_purchased: 0,
          balance: 0,
          is_verified_user: false
        });
        setRecentTransactions([]);
        setCashOutHistory([]);
        toastRef.current({
          title: "Error",
          description: "Failed to load Shekelz data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    // Only fetch if we have a user ID
    if (user?.uid) {
      fetchShekelData();
    }
  }, [user?.uid]); // Only depend on user.id to prevent infinite loop

  // Format shekel amounts
  const formatShekels = (amount: number): string => {
    return `${amount} Shekelz`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  // Handle sending thank you email
  const handleSendThankYou = async (transaction: CombinedTransaction) => {
    if (!transaction.sender_email || transaction.is_anonymous) {
      toastRef.current({
        title: "Cannot send thank you",
        description: transaction.is_anonymous ? "Cannot send thank you to anonymous donors" : "Donor email not available",
        variant: "destructive",
      });
      return;
    }

    if (transaction.thanked_at) {
      toastRef.current({
        title: "Already thanked",
        description: "Thank you email already sent for this donation",
        variant: "default",
      });
      return;
    }

    setSendingThanks(prev => new Set(prev).add(transaction.id));

    try {
      const result = await shekelService.sendThankYouEmail(
        transaction.id,
        transaction.sender_email,
        transaction.sender_name || 'Unknown',
        Math.abs(transaction.amount),
        formatDate(transaction.created_at),
        transaction.id
      );

      if (result.success) {
        toastRef.current({
          title: "Thank you sent!",
          description: "Thank you email sent successfully",
          variant: "default",
        });
        
        // Update the transaction to show it's been thanked
        setRecentTransactions(prev => 
          prev.map(t => 
            t.id === transaction.id 
              ? { ...t, thanked_at: new Date().toISOString() }
              : t
          )
        );
      } else {
        toastRef.current({
          title: "Error",
          description: result.error || "Failed to send thank you email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toastRef.current({
        title: "Error",
        description: "Failed to send thank you email",
        variant: "destructive",
      });
    } finally {
      setSendingThanks(prev => {
        const newSet = new Set(prev);
        newSet.delete(transaction.id);
        return newSet;
      });
    }
  };

  // Get transaction type badge
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'gift_received':
        return <Badge variant="default" className="bg-green-100 text-green-800">Gift Received</Badge>;
      case 'gift_sent':
        return <Badge variant="outline" className="border-blue-200 text-blue-800">Gift Sent</Badge>;
      case 'purchase':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Purchase</Badge>;
      case 'balance_change':
        return <Badge variant="outline" className="border-gray-200 text-gray-800">Balance Change</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Get gift type badge
  const getGiftTypeBadge = (giftType: string) => {
    switch (giftType) {
      case 'tip':
        return <Badge variant="outline" className="border-yellow-200 text-yellow-800">Tip</Badge>;
      case 'donation':
        return <Badge variant="outline" className="border-green-200 text-green-800">Donation</Badge>;
      case 'gift':
        return <Badge variant="outline" className="border-purple-200 text-purple-800">Gift</Badge>;
      default:
        return <Badge variant="outline">{giftType}</Badge>;
    }
  };

  // Get cash out status badge
  const getCashOutStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-200 text-yellow-800">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-blue-200 text-blue-800">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-200 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="border-red-200 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shekelz Dashboard</h1>
          <Button 
            onClick={() => navigate('/dashboard')} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 dark:bg-darkBrown-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-darkBrown-600 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="redeem" className="data-[state=active]:bg-white dark:data-[state=active]:bg-darkBrown-600 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">Redeem Shekelz</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="h-24 bg-gray-200">
                      <div></div>
                    </CardHeader>
                    <CardContent className="h-12 bg-gray-100">
                      <div></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatShekels(shekelSummary?.balance || 0)}</div>
                    <p className="text-xs text-gray-600">Available Shekelz</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatShekels(shekelSummary?.total_received || 0)}</div>
                    <p className="text-xs text-gray-600">Lifetime gifts received</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatShekels(shekelSummary?.total_sent || 0)}</div>
                    <p className="text-xs text-gray-600">Lifetime gifts sent</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatShekels(shekelSummary?.total_purchased || 0)}</div>
                    <p className="text-xs text-gray-600">Lifetime purchases</p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Complete history of your Shekelz transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                )}
                {!isLoading && recentTransactions.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Gift Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((transaction, index) => (
                        <TableRow key={`${transaction.id}-${index}`}>
                          <TableCell>
                            {getTransactionBadge(transaction.type)}
                          </TableCell>
                          <TableCell>
                            {transaction.gift_type && getGiftTypeBadge(transaction.gift_type)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{transaction.description}</p>
                              {transaction.message && (
                                <p className="text-xs text-gray-500 italic">"{transaction.message}"</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount > 0 ? '+' : ''}{formatShekels(Math.abs(transaction.amount))}
                          </TableCell>
                          <TableCell>{formatDate(transaction.created_at)}</TableCell>
                          <TableCell>
                            {transaction.type === 'gift_received' && transaction.amount > 0 && (
                              <Button
                                onClick={() => handleSendThankYou(transaction)}
                                disabled={sendingThanks.has(transaction.id) || !!transaction.thanked_at || transaction.is_anonymous}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                {sendingThanks.has(transaction.id) ? 'Sending...' : 
                                 transaction.thanked_at ? 'Thanked ✓' : 'Say Thanks'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {!isLoading && recentTransactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No transaction history available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          <TabsContent value="redeem" className="space-y-4">
            {/* Cash Out Widget for verified users */}
            {!isLoading && shekelSummary?.is_verified_user && (
              <div className="max-w-2xl mx-auto">
                <CashOutWidget onCashOutSuccess={() => {
                // Refresh shekel data after successful cash out
                const fetchShekelData = async () => {
                  if (!user?.uid) return;
                  try {
                    const [summary, allGifts, cashOutRequests] = await Promise.all([
                      shekelService.getShekelSummary(user.uid),
                      shekelService.getAllGifts(user.uid),
                      cashOutService.getCashOutHistory(user.uid)
                    ]);
                    setShekelSummary(summary);
                    const transactions = shekelService.convertGiftsToTransactions(allGifts, user.uid);
                    setRecentTransactions(transactions);
                    setCashOutHistory(cashOutRequests);
                  } catch (error) {
                    console.error("Error refreshing Shekelz data:", error);
                  }
                };
                fetchShekelData();
              }} />
              </div>
            )}

            {/* Message for non-verified users */}
            {!isLoading && !shekelSummary?.is_verified_user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Redeem Shekelz
                  </CardTitle>
                  <CardDescription>
                    Convert your Shekelz to cash via Stripe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Required</h3>
                    <p className="text-gray-600 mb-4">
                      You need to be a verified user to redeem your Shekelz for cash.
                    </p>
                    <p className="text-sm text-gray-500">
                      Contact support to get verified and start redeeming your Shekelz.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Cash Out History</CardTitle>
                  <CardDescription>History of your Shekelz cash out requests</CardDescription>
                </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : cashOutHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Cash Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashOutHistory.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {getCashOutStatusBadge(request.status)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatShekels(request.amount)}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ${(request.cash_amount / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell>
                            {request.processed_at && (
                              <div className="text-xs text-gray-500">
                                Processed: {formatDate(request.processed_at)}
                              </div>
                            )}
                            {request.error_message && (
                              <div className="text-xs text-red-500">
                                Error: {request.error_message}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Cash out history will appear here once you make your first cash out request.</p>
                    <p className="text-sm mt-2">Only verified users can cash out their Shekelz.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Shekelz; 