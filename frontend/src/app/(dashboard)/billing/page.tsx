'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  Users,
  Zap
} from 'lucide-react';

export default function BillingPage() {
  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Billing</h1>
              <p className="text-muted-foreground">Manage your subscription and billing information</p>
            </div>
          </div>

          <Button className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Download Invoice</span>
          </Button>
        </div>
      </div>

      {/* Current Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Plan</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Professional Plan</h3>
                <p className="text-muted-foreground">Perfect for growing teams</p>
              </div>
              
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-foreground">$49</span>
                <span className="text-muted-foreground">per month</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Users</span>
                  <span className="text-sm font-medium text-foreground">24 / 50</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '48%' }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Storage</span>
                  <span className="text-sm font-medium text-foreground">12.5 GB / 100 GB</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '12.5%' }}></div>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button className="w-full">Upgrade Plan</Button>
                <Button variant="outline" className="w-full">Change Plan</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Next Billing Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="text-lg font-semibold">March 15, 2024</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">$49.00</div>
              <p className="text-sm text-gray-600">
                Your next payment will be processed automatically
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div className="text-2xl font-bold">$49.00</div>
            </div>
            <p className="text-xs text-gray-500">Current billing period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div className="text-2xl font-bold">24</div>
            </div>
            <p className="text-xs text-gray-500">48% of plan limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">API Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <div className="text-2xl font-bold">15.2K</div>
            </div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div className="text-2xl font-bold">+12%</div>
            </div>
            <p className="text-xs text-gray-500">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Your recent billing statements and invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Invoice</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3 text-sm text-gray-900">Feb 15, 2024</td>
                  <td className="px-4 py-3 text-sm text-gray-900">Professional Plan - Monthly</td>
                  <td className="px-4 py-3 text-sm text-gray-900">$49.00</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-green-100 text-green-800">Paid</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="px-4 py-3 text-sm text-gray-900">Jan 15, 2024</td>
                  <td className="px-4 py-3 text-sm text-gray-900">Professional Plan - Monthly</td>
                  <td className="px-4 py-3 text-sm text-gray-900">$49.00</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-green-100 text-green-800">Paid</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="px-4 py-3 text-sm text-gray-900">Dec 15, 2023</td>
                  <td className="px-4 py-3 text-sm text-gray-900">Professional Plan - Monthly</td>
                  <td className="px-4 py-3 text-sm text-gray-900">$49.00</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-green-100 text-green-800">Paid</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}