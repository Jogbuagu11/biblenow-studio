import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/use-toast';
import { useAuthStore } from '../stores/authStore';
import shekelService, { ShekelSummary, CombinedTransaction } from '../services/shekelService';

const Shekelz: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [shekelSummary, setShekelSummary] = useState<ShekelSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<CombinedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        const [summary, allGifts] = await Promise.all([
          shekelService.getShekelSummary(user.uid),
          shekelService.getAllGifts(user.uid)
        ]);

        console.log('Summary received:', summary);
        console.log('All gifts received:', allGifts?.length || 0);
        
        setShekelSummary(summary);
        
        // Convert gifts to transactions
        const transactions = shekelService.convertGiftsToTransactions(allGifts, user.uid);
        console.log('Transactions converted:', transactions?.length || 0);
        setRecentTransactions(transactions);
        
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
  }, [user?.uid]); // Only depend on user.uid to prevent infinite loop

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
            <TabsTrigger value="history" className="data-[state=active]:bg-white dark:data-[state=active]:bg-darkBrown-600 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">Transaction History</TabsTrigger>
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
                <CardTitle>Recent Shekelz Activity</CardTitle>
                <CardDescription>Your latest Shekelz transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg animate-pulse">
                        <div className="w-16 h-4 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!isLoading && recentTransactions.length > 0 && (
                  <div className="space-y-2">
                    {recentTransactions.slice(0, 5).map((transaction, index) => (
                      <div key={`${transaction.id}-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getTransactionBadge(transaction.type)}
                          {transaction.gift_type && getGiftTypeBadge(transaction.gift_type)}
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-gray-500">{formatDate(transaction.created_at)}</p>
                            {transaction.message && (
                              <p className="text-xs text-gray-400 italic">"{transaction.message}"</p>
                            )}
                          </div>
                        </div>
                        <div className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}{formatShekels(Math.abs(transaction.amount))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!isLoading && recentTransactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No transactions found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
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
        </Tabs>
      </div>
    </Layout>
  );
};

export default Shekelz; 