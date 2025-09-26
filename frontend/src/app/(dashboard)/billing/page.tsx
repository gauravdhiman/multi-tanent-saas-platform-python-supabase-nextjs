'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Zap, 
  Calendar, 
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { useBillingSummary } from '@/hooks/use-billing-summary';
import { PlanSelection } from '@/components/billing/plan-selection';
import { CreditPurchase } from '@/components/billing/credit-purchase';
import { SubscriptionManagement } from '@/components/billing/subscription-management';
import { OrganizationSelector } from '@/components/organizations/organization-selector';
import { toast } from 'sonner';

export default function BillingPage() {
  const { loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const { 
    data: billingSummary,
    isLoading: loading,
    error: queryError,
    refetch,
    isRefetching
  } = useBillingSummary();

  const [userSelectedTab, setUserSelectedTab] = useState<string | null>(null);

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Unknown error') : null;

  const hasActiveSubscription = billingSummary?.subscription && 
    ['active', 'trial'].includes(billingSummary.subscription.status);

  const activeTab = userSelectedTab ?? (hasActiveSubscription ? 'overview' : 'plans');

  const handleTabChange = (value: string) => {
    setUserSelectedTab(value);
  };

  const refresh = async () => {
    await refetch();
    toast.success('Billing data refreshed');
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading || orgLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading billing information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Billing & Subscriptions</h1>
            <p className="text-muted-foreground">
              Manage your subscription, credits, and billing information
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={refresh}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
        
        {/* Organization Selector */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Organization:</span>
          <OrganizationSelector />
        </div>
      </div>

      {/* Overview Cards */}
      {billingSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Plan */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {billingSummary.subscription?.plan?.name || 'No Plan'}
              </div>
              <p className="text-xs text-muted-foreground">
                {billingSummary.subscription?.status && (
                  <Badge className="capitalize">
                    {billingSummary.subscription.status}
                  </Badge>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Credit Balance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {billingSummary.credit_balance?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Available credits
              </p>
            </CardContent>
          </Card>

          {/* Next Billing */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {billingSummary.next_billing_date 
                  ? formatDate(billingSummary.next_billing_date)
                  : 'N/A'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {billingSummary.amount_due 
                  ? formatCurrency(billingSummary.amount_due)
                  : 'No amount due'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          {hasActiveSubscription && (
            <TabsTrigger value="manage">Manage</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {hasActiveSubscription ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Overview</CardTitle>
                  <CardDescription>
                    Current subscription details and usage information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {billingSummary?.subscription && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold">Plan Details</h4>
                          <p>Plan: {billingSummary.subscription.plan?.name}</p>
                          <p>Status: {billingSummary.subscription.status}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold">Usage This Period</h4>
                          <p>Credits Used: {billingSummary.current_period_usage?.toLocaleString() || '0'}</p>
                          <p>Credits Remaining: {billingSummary.credit_balance?.toLocaleString() || '0'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Billing</CardTitle>
                <CardDescription>
                  Choose a plan to get started with your subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have an active subscription yet. Browse our plans to get started.
                </p>
                <Button onClick={() => handleTabChange('plans')}>
                  View Plans
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          {currentOrganization && (
            <PlanSelection 
              organizationId={currentOrganization.id}
              currentSubscription={billingSummary?.subscription}
              onPlanSelected={() => refetch()}
            />
          )}
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-6">
          {currentOrganization && (
            <CreditPurchase 
              organizationId={currentOrganization.id}
              onCreditsPurchased={() => refetch()}
            />
          )}
        </TabsContent>

        {/* Manage Tab */}
        {hasActiveSubscription && (
          <TabsContent value="manage" className="space-y-6">
            {billingSummary?.subscription && currentOrganization && (
              <SubscriptionManagement 
                organizationId={currentOrganization.id}
                subscription={billingSummary.subscription}
                onSubscriptionUpdated={() => refetch()}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}