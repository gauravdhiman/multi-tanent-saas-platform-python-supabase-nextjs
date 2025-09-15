'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Loader2, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { billingService } from '@/services/billing-service';
import { OrganizationSubscriptionWithPlan, CreditBalance } from '@/types/billing';

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<OrganizationSubscriptionWithPlan | null>(null);
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null);
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);

  // Get organization ID from URL params or use a default for now
  // In a real app, this would come from the user's organization context
  const organizationId = searchParams?.get('organization_id') || 'default-org-id';
  const sessionId = searchParams?.get('session_id');

  useEffect(() => {
    const loadBillingInfo = async () => {
      try {
        // Load subscription and credit information
        const [subscriptionData, creditData] = await Promise.all([
          billingService.getOrganizationSubscription(organizationId),
          billingService.getCreditBalance(organizationId)
        ]);

        setSubscription(subscriptionData);
        setCreditBalance(creditData);

        // Check if this is a plan change by looking at session metadata or other indicators
        // For now, we'll assume it's a plan change if we have a subscription and session ID
        if (subscriptionData && sessionId) {
          setShowPlanChangeModal(true);
        }
      } catch (error) {
        console.error('Failed to load billing information:', error);
      } finally {
        // Brief delay to show the success animation
        setTimeout(() => {
          setLoading(false);
        }, 1500);
      }
    };

    if (organizationId && organizationId !== 'default-org-id') {
      loadBillingInfo();
    } else {
      // If no organization ID, just show the basic success message
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    }
  }, [organizationId, sessionId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Card>
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              </div>
              <CardTitle>Processing your payment...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment and set up your subscription.
              </p>
            </CardContent>
          </Card>
        </div>
  
        {/* Plan Change Information Modal */}
        <Dialog open={showPlanChangeModal} onOpenChange={setShowPlanChangeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Plan Change Summary
              </DialogTitle>
              <DialogDescription>
                Here&apos;s what changed with your subscription:
              </DialogDescription>
            </DialogHeader>
  
            {subscription && creditBalance && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-100 mb-3">Subscription Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Current Plan:</span>
                      <span className="font-medium text-blue-900 dark:text-blue-100">{subscription.plan?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Status:</span>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                    </div>
                    {subscription.current_period_end && (
                      <div className="flex justify-between">
                        <span className="text-blue-700 dark:text-blue-300">Next Billing:</span>
                        <span className="text-blue-900 dark:text-blue-100">
                          {billingService.formatDate(subscription.current_period_end)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
  
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 dark:text-green-100 mb-3">Credit Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Total Credits:</span>
                      <span className="font-medium text-green-900 dark:text-green-100">
                        {billingService.formatCredits(creditBalance.total_credits)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Subscription Credits:</span>
                      <span className="text-green-900 dark:text-green-100">
                        {billingService.formatCredits(creditBalance.subscription_credits)}
                      </span>
                    </div>
                  </div>
                </div>
  
                {subscription.cancel_at_period_end && (
                  <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-orange-800 dark:text-orange-100 mb-1">Important Notice</h4>
                        <p className="text-sm text-orange-700 dark:text-orange-200">
                          If you downgraded your plan, the changes will take effect at the end of your current billing period.
                          You&apos;ll continue to have access to your current plan features until then.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
  
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">What&apos;s Next</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Your billing dashboard has been updated</li>
                    <li>• Credits are ready to use for your services</li>
                    <li>• You&apos;ll receive a confirmation email shortly</li>
                    <li>• Access to new features is now available</li>
                  </ul>
                </div>
              </div>
            )}
  
            <DialogFooter>
              <Button onClick={() => setShowPlanChangeModal(false)}>
                Got it, thanks!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <Card>
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Payment Successful!</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Thank you for your purchase! Your payment has been processed successfully.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2 text-left">What happens next?</h4>
                <ul className="text-sm text-green-700 space-y-1 text-left">
                  <li>• Your subscription is now active</li>
                  <li>• Credits have been reset as per your subscription plan</li>
                  <li>• You&apos;ll receive a confirmation email shortly</li>
                  <li>• Access features of your subscription plan is now enabled</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/billing">
                  View Billing Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}