'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Loader2, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { billingService } from '@/services/billing-service';
import { useBillingInfo } from '@/hooks/use-billing-info';

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams?.get('organization_id');
  const orgId = searchParams?.get('org_id') || organizationId;
  const sessionId = searchParams?.get('session_id');

  // Ensure organizationId is a string, or skip the query.
  const { data, isLoading, error } = useBillingInfo(organizationId || '');
  const { subscription, creditBalance } = data || {};
  
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);

  useEffect(() => {
    // A brief delay to show the success animation before showing the modal
    if (subscription && sessionId) {
      const timer = setTimeout(() => {
        setShowPlanChangeModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
 }, [subscription, sessionId]);

  if (isLoading) {
    return (
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
              Please wait while we confirm your payment and update your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center">
        <Card>
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle>An error occurred</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              There was an issue fetching your updated billing information.
            </p>
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-md">
              {error.message}
            </p>
            <Button asChild className="w-full">
              <Link href={`/billing?org_id=${orgId}`}>
                Go to Billing
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
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
                  <li>• Your subscription is now active or updated.</li>
                  <li>• Credits have been added to your account.</li>
                  <li>• You will receive a confirmation email shortly.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href={`/billing?org_id=${orgId}`}>
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

      {/* Plan Change Information Modal */}
      <Dialog open={showPlanChangeModal} onOpenChange={setShowPlanChangeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Subscription Update Summary
            </DialogTitle>
            <DialogDescription>
              Here&apos;s what changed with your subscription:
            </DialogDescription>
          </DialogHeader>

          {subscription && creditBalance && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 dark:text-blue-100 mb-3">Subscription Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-30">Current Plan:</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">{subscription.plan?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-70 dark:text-blue-300">Status:</span>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                      {subscription.status}
                    </Badge>
                  </div>
                  {subscription.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Next Billing:</span>
                      <span className="text-blue-90 dark:text-blue-100">
                        {billingService.formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 dark:text-green-10 mb-3">Credit Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-70 dark:text-green-300">Total Credits:</span>
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
                <div className="bg-orange-50 dark:bg-orange-950 border-orange-20 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-800 dark:text-orange-10 mb-1">Important Notice</h4>
                      <p className="text-sm text-orange-700 dark:text-orange-200">
                        If you downgraded, changes will apply at the end of the current billing period.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowPlanChangeModal(false)}>
              Got it, thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="container mx-auto px-4 py-16">
        <BillingSuccessContent />
      </div>
    </Suspense>
  );
}
