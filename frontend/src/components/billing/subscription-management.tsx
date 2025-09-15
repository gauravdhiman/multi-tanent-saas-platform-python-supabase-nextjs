'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  CreditCard, 
  Users, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  ExternalLink,
  Settings,
  Loader2
} from 'lucide-react';
import { billingService } from '@/services/billing-service';
import { OrganizationSubscriptionWithPlan } from '@/types/billing';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SubscriptionManagementProps {
  organizationId: string;
  subscription: OrganizationSubscriptionWithPlan;
  onSubscriptionUpdated?: () => void;
}

export function SubscriptionManagement({ 
  organizationId, 
  subscription, 
  onSubscriptionUpdated 
}: SubscriptionManagementProps) {
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [reactivatingSubscription, setReactivatingSubscription] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.')) {
      return;
    }

    setCancelingSubscription(true);

    try {
      await billingService.cancelSubscription(organizationId);
      toast.success('Subscription will be cancelled at the end of your billing period');
      onSubscriptionUpdated?.();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelingSubscription(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setReactivatingSubscription(true);

    try {
      await billingService.reactivateSubscription(organizationId);
      toast.success('Subscription reactivated successfully');
      onSubscriptionUpdated?.();
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      toast.error('Failed to reactivate subscription');
    } finally {
      setReactivatingSubscription(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    setOpeningPortal(true);

    try {
      const { portal_url } = await billingService.createCustomerPortal(organizationId, window.location.href);
      window.open(portal_url, '_blank');
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setOpeningPortal(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'trial':
        return <Zap className="w-4 h-4" />;
      case 'past_due':
      case 'cancelled':
      case 'expired':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const isTrialActive = subscription.status === 'trial' && subscription.trial_end && new Date(subscription.trial_end) > new Date();
  const isSubscriptionCancelled = subscription.cancel_at_period_end;
  const isSubscriptionActive = ['active', 'trial'].includes(subscription.status);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Subscription
                <Badge className={`${getStatusColor(subscription.status)} flex items-center gap-1`}>
                  {getStatusIcon(subscription.status)}
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </Badge>
              </CardTitle>
              <CardDescription>
                Manage your subscription plan and billing settings
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleOpenCustomerPortal}
              disabled={openingPortal}
            >
              {openingPortal ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              Manage Billing
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Plan Details */}
          {subscription.plan && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Plan</div>
                <div className="font-semibold">{subscription.plan.name}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Price</div>
                <div className="font-semibold">
                  ${(subscription.plan.price_amount / 100).toFixed(2)}/{subscription.plan.interval}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Credits Included
                </div>
                <div className="font-semibold">
                  {subscription.plan.included_credits.toLocaleString()}
                </div>
              </div>
              
              {subscription.plan.max_users && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Max Users
                  </div>
                  <div className="font-semibold">{subscription.plan.max_users}</div>
                </div>
              )}
            </div>
          )}

          {/* Billing Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscription.current_period_start && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Current Period Start
                </div>
                <div className="font-semibold">
                  {formatDate(subscription.current_period_start)}
                </div>
              </div>
            )}
            
            {subscription.current_period_end && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {isSubscriptionCancelled ? 'Cancellation Date' : 'Next Billing Date'}
                </div>
                <div className="font-semibold">
                  {formatDate(subscription.current_period_end)}
                </div>
              </div>
            )}
          </div>

          {/* Trial Information */}
          {isTrialActive && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                You&apos;re currently in your free trial period. 
                Your trial ends on {formatDate(subscription.trial_end)} and you&apos;ll be charged for your subscription.
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation Warning */}
          {isSubscriptionCancelled && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Your subscription is scheduled to be cancelled on {formatDate(subscription.current_period_end)}.
                You can reactivate it anytime before then.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {isSubscriptionActive && !isSubscriptionCancelled && (
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={cancelingSubscription}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {cancelingSubscription ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mr-2" />
                )}
                Cancel Subscription
              </Button>
            )}

            {isSubscriptionCancelled && (
              <Button
                onClick={handleReactivateSubscription}
                disabled={reactivatingSubscription}
                className="bg-green-600 hover:bg-green-700"
              >
                {reactivatingSubscription ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Reactivate Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment & Billing
          </CardTitle>
          <CardDescription>
            Manage your payment methods and view billing history
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use the &quot;Manage Billing&quot; button above to:
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Update payment methods</li>
              <li>• Download invoices</li>
              <li>• View billing history</li>
              <li>• Update billing address</li>
              <li>• Change subscription plan</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}