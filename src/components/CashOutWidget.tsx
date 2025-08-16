import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import { Alert, AlertDescription, AlertTitle } from './ui/Alert';
import { useToast } from '../hooks/use-toast';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import cashOutService, { CashOutSummary } from '../services/cashOutService';

interface CashOutWidgetProps {
  onCashOutSuccess?: () => void;
}

const CashOutWidget: React.FC<CashOutWidgetProps> = ({ onCashOutSuccess }) => {
  const { user } = useSupabaseAuthStore();
  const { toast } = useToast();
  const [summary, setSummary] = useState<CashOutSummary | null>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        console.log('CashOutWidget: No user UID available');
        setIsLoading(false);
        return;
      }

      console.log('CashOutWidget: Fetching data for user:', user.uid);

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('CashOutWidget: Timeout reached, stopping loading');
        setIsLoading(false);
      }, 10000);

      try {
        console.log('CashOutWidget: Testing service methods...');
        try {
          const testResult = await cashOutService.testEmptyTableHandling(user.uid);
          console.log('CashOutWidget: Service test result:', testResult);
        } catch (testError) {
          console.log('CashOutWidget: Service test failed:', testError);
        }

        // Simplified approach - just check eligibility first
        console.log('CashOutWidget: Checking eligibility...');
        const eligibilityData = await cashOutService.checkEligibility(user.uid);
        console.log('CashOutWidget: Eligibility data:', eligibilityData);

        if (eligibilityData.eligible) {
          try {
            console.log('CashOutWidget: Getting summary...');
            const summaryData = await cashOutService.getCashOutSummary(user.uid);
            console.log('CashOutWidget: Summary data:', summaryData);
            setSummary(summaryData);
          } catch (summaryError) {
            console.error('CashOutWidget: Error fetching summary:', summaryError);
          }
        }

        setEligibility(eligibilityData);
      } catch (error) {
        console.error('CashOutWidget: Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load cash out data. Please try again.',
          variant: 'destructive'
        });
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.uid, toast]);

  const handleCashOut = async () => {
    if (!user?.uid || !eligibility?.eligible) return;

    try {
      setIsProcessing(true);
      const result = await cashOutService.requestCashOut(user.uid, amount);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Cash out request submitted successfully!'
        });

        // Refresh data
        const [summaryData, eligibilityData] = await Promise.all([
          cashOutService.getCashOutSummary(user.uid),
          cashOutService.checkEligibility(user.uid)
        ]);
        setSummary(summaryData);
        setEligibility(eligibilityData);

        if (onCashOutSuccess) {
          onCashOutSuccess();
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to submit cash out request.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('CashOutWidget: Error during cash out:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit cash out request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatShekels = (amount: number): string => {
    return `${amount} Shekelz`;
  };

  const formatUSD = (amount: number): string => {
    const usdAmount = (amount * 0.10).toFixed(2);
    return `$${usdAmount}`;
  };

  const getMaxAmount = (): number => {
    if (!eligibility) return 0;
    return Math.min(eligibility.balance, 100000); // Max 100,000 Shekelz ($1,000)
  };

  const getSliderValue = (): number => {
    const maxAmount = getMaxAmount();
    if (maxAmount === 0) return 0;
    return Math.max(eligibility?.minAmount || 200, Math.min(amount, maxAmount));
  };

  // Quick check - if user is not verified, show message immediately
  if (!user?.uid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Out</CardTitle>
          <CardDescription>Withdraw your shekelz balance</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Not Available</AlertTitle>
            <AlertDescription>
              Please log in to access cash out functionality.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show fallback if no eligibility data after loading
  if (!isLoading && !eligibility) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Cash Out Shekelz
          </CardTitle>
          <CardDescription>
            Unable to load cash out information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Error</h3>
            <p className="text-gray-600 mb-4">
              Failed to load cash out information. Please try refreshing the page.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="mt-2"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Cash Out Shekelz
        </CardTitle>
        <CardDescription>
          Redeem your Shekelz for cash via Stripe. Minimum $20 required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Available Balance:</span>
            <span className="font-semibold">{formatShekels(eligibility?.balance || 0)}</span>
          </div>
          {summary && summary.pending_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Pending Cash Outs:</span>
              <span className="font-semibold text-yellow-600">{formatShekels(summary.pending_amount)}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Cash Out Amount:</span>
            <span className="font-semibold">
              {formatShekels(amount)} ({formatUSD(amount)})
            </span>
          </div>
          
          <div className="space-y-2">
            <input
              type="range"
              min={eligibility?.minAmount || 200}
              max={getMaxAmount()}
              value={getSliderValue()}
              onChange={(e) => setAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #059669 0%, #059669 ${getMaxAmount() > 0 ? ((getSliderValue() - (eligibility?.minAmount || 200)) / (getMaxAmount() - (eligibility?.minAmount || 200))) * 100 : 0}%, #e5e7eb ${getMaxAmount() > 0 ? ((getSliderValue() - (eligibility?.minAmount || 200)) / (getMaxAmount() - (eligibility?.minAmount || 200))) * 100 : 0}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Min: {formatShekels(eligibility?.minAmount || 200)}</span>
              <span>Max: {formatShekels(getMaxAmount())}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">You'll receive:</div>
          <div className="text-lg font-bold text-green-600">
            {formatUSD(amount)}
          </div>
          <div className="text-xs text-gray-500">
            Processed in 2-3 business days
          </div>
        </div>

        <Button
          onClick={handleCashOut}
          disabled={isProcessing || amount < (eligibility?.minAmount || 200) || amount > (eligibility?.balance || 0)}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {isProcessing ? (
            <>
              <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            `Cash Out ${formatShekels(amount)}`
          )}
        </Button>

        <div className="text-xs text-gray-500 text-center">
          <p>• Minimum cash out: $20 ({formatShekels(200)})</p>
          <p>• Maximum cash out: $1,000 ({formatShekels(10000)})</p>
          <p>• Exchange rate: 1 Shekel = $0.10</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashOutWidget; 