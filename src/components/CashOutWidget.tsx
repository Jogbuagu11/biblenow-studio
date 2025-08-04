import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import { Alert, AlertDescription, AlertTitle } from './ui/Alert';
import { useToast } from '../hooks/use-toast';
import { useAuthStore } from '../stores/authStore';
import cashOutService, { CashOutSummary } from '../services/cashOutService';

interface CashOutWidgetProps {
  onCashOutSuccess?: () => void;
}

const CashOutWidget: React.FC<CashOutWidgetProps> = ({ onCashOutSuccess }) => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [summary, setSummary] = useState<CashOutSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState(2000); // Default to minimum amount
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    balance: number;
    minAmount: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);
        const [summaryData, eligibilityData] = await Promise.all([
          cashOutService.getCashOutSummary(user.uid),
          cashOutService.checkEligibility(user.uid)
        ]);

        setSummary(summaryData);
        setEligibility(eligibilityData);

        // Set amount to minimum if user is eligible
        if (eligibilityData.eligible) {
          setAmount(Math.max(eligibilityData.minAmount, 2000));
        }
      } catch (error) {
        console.error('Error fetching cash out data:', error);
        toast({
          title: "Error",
          description: "Failed to load cash out information",
          variant: "destructive",
        });
      } finally {
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
          title: "Cash Out Requested!",
          description: `Your request for ${formatShekels(amount)} has been submitted. You'll receive the payment in 2-3 business days.`,
        });
        
        // Refresh data
        const [summaryData, eligibilityData] = await Promise.all([
          cashOutService.getCashOutSummary(user.uid),
          cashOutService.checkEligibility(user.uid)
        ]);
        setSummary(summaryData);
        setEligibility(eligibilityData);
        
        // Reset amount to minimum
        setAmount(eligibilityData.minAmount);
        
        onCashOutSuccess?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process cash out request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing cash out:', error);
      toast({
        title: "Error",
        description: "Failed to process cash out request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatShekels = (amount: number): string => {
    return `${amount} Shekelz`;
  };

  const formatUSD = (amount: number): string => {
    const usdAmount = (amount * 0.01).toFixed(2);
    return `$${usdAmount}`;
  };

  const getMaxAmount = (): number => {
    if (!eligibility) return 2000;
    return Math.min(eligibility.balance, 100000); // Max 100,000 Shekelz ($1,000)
  };

  const getSliderValue = (): number => {
    return Math.max(eligibility?.minAmount || 2000, Math.min(amount, getMaxAmount()));
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility?.eligible) {
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
            Redeem your Shekelz for cash via Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-600 dark:border-yellow-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <AlertTitle className="text-yellow-600 dark:text-yellow-400">Not Eligible</AlertTitle>
            </div>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              {eligibility?.error || 'You are not eligible for cash out at this time.'}
            </AlertDescription>
          </Alert>
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
            <span className="font-semibold">{formatShekels(eligibility.balance)}</span>
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
              min={eligibility.minAmount}
              max={getMaxAmount()}
              value={getSliderValue()}
              onChange={(e) => setAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #059669 0%, #059669 ${((getSliderValue() - eligibility.minAmount) / (getMaxAmount() - eligibility.minAmount)) * 100}%, #e5e7eb ${((getSliderValue() - eligibility.minAmount) / (getMaxAmount() - eligibility.minAmount)) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Min: {formatShekels(eligibility.minAmount)}</span>
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
          disabled={isProcessing || amount < eligibility.minAmount || amount > eligibility.balance}
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
          <p>• Minimum cash out: $20 ({formatShekels(2000)})</p>
          <p>• Maximum cash out: $1,000 ({formatShekels(100000)})</p>
          <p>• Exchange rate: 1 Shekel = $0.01</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashOutWidget; 