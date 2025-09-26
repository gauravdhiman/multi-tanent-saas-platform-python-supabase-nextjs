'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Coins, Star } from 'lucide-react';
import { CreditProduct } from '@/types/billing';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { getStripe } from '@/lib/stripe';
import { useCreditProducts } from '@/hooks/use-credit-products';
import { billingService } from '@/services/billing-service';

interface CreditPurchaseProps {
  organizationId: string;
  onCreditsPurchased?: (product: CreditProduct) => void;
}

export function CreditPurchase({ organizationId, onCreditsPurchased }: CreditPurchaseProps) {
  const [purchasingProduct, setPurchasingProduct] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: products, isLoading: loading, error } = useCreditProducts();

  if (error) {
    toast.error(error.message);
  }

  const handlePurchase = async (product: CreditProduct) => {
    if (!user) {
      toast.error('Please sign in to purchase credits');
      return;
    }

    setPurchasingProduct(product.id);

    try {
      // Create Stripe checkout session
      const { session_id } = await billingService.createCreditsCheckout(product.id, organizationId);
      
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
      
      onCreditsPurchased?.(product);
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast.error('Failed to start checkout process');
      setPurchasingProduct(null);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    const price = (amount / 100).toFixed(2);
    return `${currency}${price}`;
  };

  const calculateValuePerCredit = (creditAmount: number, priceAmount: number) => {
    return (priceAmount / 100 / creditAmount).toFixed(4);
  };

  const getBestValueProduct = () => {
    if (!products || products.length === 0) return null;
    
    // Find product with lowest cost per credit
    return products.reduce((best, current) => {
      const bestValue = parseFloat(calculateValuePerCredit(best.credit_amount, best.price_amount));
      const currentValue = parseFloat(calculateValuePerCredit(current.credit_amount, current.price_amount));
      return currentValue < bestValue ? current : best;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading credit packages...</span>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No credit packages available</p>
      </div>
    );
  }

  const bestValueProduct = getBestValueProduct();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold">Purchase Additional Credits</h3>
        <p className="text-muted-foreground">
          Top up your account with extra credits for additional usage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card 
            key={product.id}
            className={`relative ${bestValueProduct?.id === product.id ? 'border-primary shadow-lg' : ''}`}
          >
            {bestValueProduct?.id === product.id && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge variant="default" className="bg-primary">
                  <Star className="w-3 h-3 mr-1" />
                  Best Value
                </Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription className="text-xs">
                {product.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center space-y-3">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">
                  {product.credit_amount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">credits</div>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {formatPrice(product.price_amount, product.currency)}
                </div>
                <div className="text-xs text-muted-foreground">
                  ${calculateValuePerCredit(product.credit_amount, product.price_amount)} per credit
                </div>
              </div>

              {/* Show savings for larger packages */}
              {product.credit_amount >= 5000 && (
                <Badge variant="secondary" className="text-xs">
                  {product.credit_amount >= 25000 ? 'Save 20%' : 
                   product.credit_amount >= 10000 ? 'Save 15%' : 'Save 10%'}
                </Badge>
              )}
            </CardContent>

            <CardFooter>
              <Button
                onClick={() => handlePurchase(product)}
                disabled={purchasingProduct === product.id}
                className="w-full"
                size="sm"
              >
                {purchasingProduct === product.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Purchase ${product.credit_amount.toLocaleString()}`
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-center space-y-2">
          <h4 className="font-semibold">💡 Credit Usage Tips</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Credits never expire once purchased</p>
            <p>• Larger packages offer better value per credit</p>
            <p>• Credits are consumed based on your usage patterns</p>
            <p>• You can track usage in your billing dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
}