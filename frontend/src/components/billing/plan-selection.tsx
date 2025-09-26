'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Loader2, Star, Zap, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { billingService } from '@/services/billing-service';
import { SubscriptionPlan, OrganizationSubscriptionWithPlan, CreditBalance } from '@/types/billing';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { getStripe } from '@/lib/stripe';
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans';
import { useCreditBalance } from '@/hooks/use-credit-balance';

interface PlanSelectionProps {
  organizationId: string;
  currentSubscription?: OrganizationSubscriptionWithPlan | null;
  onPlanSelected?: (plan: SubscriptionPlan) => void;
}

export function PlanSelection({ organizationId, currentSubscription, onPlanSelected }: PlanSelectionProps) {
  const { data: plans, isLoading: loadingPlans, error: plansError } = useSubscriptionPlans();
  const { data: currentCreditBalance, isLoading: loadingCredits, error: creditsError } = useCreditBalance();
  const [subscribingToPlan, setSubscribingToPlan] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const { user } = useAuth();

  const loading = loadingPlans || loadingCredits;
  const error = plansError || creditsError;

  if (error) {
    toast.error(error.message);
  }

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    // Show confirmation dialog for plan changes
    if (currentSubscription && currentSubscription.plan) {
      setSelectedPlan(plan);
      setShowConfirmation(true);
      return;
    }

    // Direct subscription for new users
    await proceedWithSubscription(plan);
  };

  const proceedWithSubscription = async (plan: SubscriptionPlan) => {
    setSubscribingToPlan(plan.id);
    setShowConfirmation(false);

    try {
      // Create Stripe checkout session
      const { session_id } = await billingService.createSubscriptionCheckout(plan.id, organizationId);

      // Get Stripe instance
      const stripe = await getStripe();

      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      // Redirect to Stripe Checkout using Stripe.js
      const { error } = await stripe.redirectToCheckout({
        sessionId: session_id,
      });

      if (error) {
        throw new Error(error.message);
      }

      onPlanSelected?.(plan);
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast.error('Failed to start checkout process');
      setSubscribingToPlan(null);
    }
  };

  const getCreditImpact = (newPlan: SubscriptionPlan) => {
    if (!currentSubscription?.plan || !currentCreditBalance) return null;

    const currentCredits = currentSubscription.plan.included_credits;
    const newCredits = newPlan.included_credits;
    const currentBalance = currentCreditBalance.total_credits;

    return {
      currentCredits,
      newCredits,
      currentBalance,
      difference: newCredits - currentBalance,
      isUpgrade: newCredits > currentCredits,
      isDowngrade: newCredits < currentCredits
    };
  };

  const formatPrice = (amount: number, currency: string, interval: string) => {
    const price = (amount / 100).toFixed(2);
    return `$${price}/${interval}`;
  };

  const formatFeatures = (features: unknown) => {
    if (!features || typeof features !== 'object') return [];
    
    return Object.entries(features).map(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Handle boolean values
      if (typeof value === 'boolean') {
        return value ? label : null;
      }
      
      // Handle null, undefined, or empty string values (after trimming whitespace)
      if (value === null || value === undefined || 
          (typeof value === 'string' && value.trim() === '')) {
        return label;
      }
      
      // For all other values, show label with value
      return `${label}: ${value}`;
    }).filter(Boolean);
  };

  const isPlanCurrent = (plan: SubscriptionPlan) => {
    return currentSubscription?.plan?.id === plan.id;
  };

  const isTrialPlan = (plan: SubscriptionPlan) => {
    return plan.trial_period_days && plan.trial_period_days > 0;
  };

  const getPopularPlan = () => {
    if (!plans) return null;
    // Mark the middle-priced plan as popular
    const sortedPlans = [...plans].sort((a, b) => a.price_amount - b.price_amount);
    return sortedPlans[Math.floor(sortedPlans.length / 2)]?.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading subscription plans...</span>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No subscription plans available</p>
      </div>
    );
  }

  // Separate monthly and annual plans and sort by price (lowest to highest)
  const monthlyPlans = plans
    .filter(plan => plan.interval === 'monthly')
    .sort((a, b) => a.price_amount - b.price_amount);
  const annualPlans = plans
    .filter(plan => plan.interval === 'annual')
    .sort((a, b) => a.price_amount - b.price_amount);

  return (
    <div className="space-y-8">
      {/* Monthly Plans */}
      {monthlyPlans.length > 0 && (
        <div>
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold">Monthly Plans</h3>
            <p className="text-muted-foreground">Pay monthly, cancel anytime</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monthlyPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${getPopularPlan() === plan.id ? 'border-primary shadow-lg' : ''}`}
              >
                {getPopularPlan() === plan.id && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge variant="default" className="bg-primary">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isTrialPlan(plan) && (
                      <Badge variant="secondary">
                        <Zap className="w-3 h-3 mr-1" />
                        Free Trial
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-3xl font-bold">
                    {formatPrice(plan.price_amount, plan.currency, plan.interval)}
                  </div>
                  {isTrialPlan(plan) && (
                    <p className="text-sm text-muted-foreground">
                      {plan.trial_period_days} days free trial
                    </p>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      <span>{plan.included_credits.toLocaleString()} credits included</span>
                    </div>
                    
                    {plan.max_users && (
                      <div className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        <span>Up to {plan.max_users} users</span>
                      </div>
                    )}
                    
                    {formatFeatures(plan.features).map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                
                <CardFooter>
                  {isPlanCurrent(plan) ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan)}
                      disabled={subscribingToPlan === plan.id}
                      className="w-full"
                    >
                      {subscribingToPlan === plan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Subscribe to ${plan.name}`
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Annual Plans */}
      {annualPlans.length > 0 && (
        <div>
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold">Annual Plans</h3>
            <p className="text-muted-foreground">Save with yearly billing</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {annualPlans.map((plan) => (
              <Card key={plan.id} className="relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="bg-green-600">
                    Save 17%
                  </Badge>
                </div>
                
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isTrialPlan(plan) && (
                      <Badge variant="secondary">
                        <Zap className="w-3 h-3 mr-1" />
                        Free Trial
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">
                      {formatPrice(plan.price_amount, plan.currency, plan.interval)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${(plan.price_amount / 100 / 12).toFixed(2)}/month billed annually
                    </div>
                  </div>
                  {isTrialPlan(plan) && (
                    <p className="text-sm text-muted-foreground">
                      {plan.trial_period_days} days free trial
                    </p>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      <span>{plan.included_credits.toLocaleString()} credits included</span>
                    </div>
                    
                    {plan.max_users && (
                      <div className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        <span>Up to {plan.max_users} users</span>
                      </div>
                    )}
                    
                    {formatFeatures(plan.features).map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                
                <CardFooter>
                  {isPlanCurrent(plan) ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan)}
                      disabled={subscribingToPlan === plan.id}
                      className="w-full"
                    >
                      {subscribingToPlan === plan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Subscribe to ${plan.name}`
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Plan Change Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlan && getCreditImpact(selectedPlan)?.isUpgrade && (
                <TrendingUp className="w-5 h-5 text-green-600" />
              )}
              {selectedPlan && getCreditImpact(selectedPlan)?.isDowngrade && (
                <TrendingDown className="w-5 h-5 text-orange-600" />
              )}
              Confirm Plan Change
            </DialogTitle>
            <DialogDescription>
              You&apos;re about to change from <strong>{currentSubscription?.plan?.name}</strong> to{' '}
              <strong>{selectedPlan?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && currentCreditBalance && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Credit Impact</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Current plan credits:</span>
                    <span className="text-gray-900 dark:text-gray-100">{currentSubscription?.plan?.included_credits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>New plan credits:</span>
                    <span className="text-gray-900 dark:text-gray-100">{selectedPlan.included_credits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Current balance:</span>
                    <span className="text-gray-900 dark:text-gray-100">{currentCreditBalance.total_credits.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100">
                      <span>After change:</span>
                      <span className={
                        getCreditImpact(selectedPlan)?.isUpgrade ? 'text-green-600 dark:text-green-400' :
                        getCreditImpact(selectedPlan)?.isDowngrade ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'
                      }>
                        {selectedPlan.included_credits.toLocaleString()} credits
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Important</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Your credits will be reset to the new plan amount and you will lose any existing unused credits. This change takes effect immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedPlan && proceedWithSubscription(selectedPlan)}
              disabled={subscribingToPlan !== null}
            >
              {subscribingToPlan ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Change'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}