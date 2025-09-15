'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <Card>
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Payment Cancelled</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your payment was cancelled. No charges have been made to your account.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Need help?</h4>
                <p className="text-sm text-blue-700">
                  If you encountered any issues during checkout or have questions about our plans, 
                  we&apos;re here to help.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/billing">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Billing
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>

              <Button variant="ghost" asChild className="w-full">
                <Link href="/support" className="flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Contact Support
                </Link>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                You can try again anytime or choose a different plan that better fits your needs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}