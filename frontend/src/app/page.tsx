'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { billingService } from '@/services/billing-service';
import type { SubscriptionPlan } from '@/types/billing';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pricingPlans, setPricingPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  
  // Calculate average savings percentage across all plan tiers
  const calculateAverageSavings = () => {
    if (pricingPlans.length === 0) return 0; // fallback to 0%
    
    const monthlyPlans = pricingPlans.filter(p => p.interval === 'monthly');
    const annualPlans = pricingPlans.filter(p => p.interval === 'annual');
    
    let totalSavings = 0;
    let savingsCount = 0;
    
    for (const monthlyPlan of monthlyPlans) {
      // Find the corresponding annual plan (same name)
      const annualPlan = annualPlans.find(ap => 
        ap.name === monthlyPlan.name && 
        ap.currency === monthlyPlan.currency
      );
      
      if (annualPlan) {
        const monthlyTotal = monthlyPlan.price_amount * 12;
        const annualTotal = annualPlan.price_amount;
        const savings = monthlyTotal - annualTotal;
        const savingsPercentage = (savings / monthlyTotal) * 100;
        
        totalSavings += savingsPercentage;
        savingsCount++;
      }
    }
    
    return savingsCount > 0 ? Math.round(totalSavings / savingsCount) : 20;
  };

  // Fetch pricing plans on component mount
  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        const plans = await billingService.getSubscriptionPlans();
        setPricingPlans(plans);
      } catch (error) {
        console.error('Error fetching pricing plans:', error);
        // Use mock data if API call fails
        setPricingPlans([
          {
            id: '1',
            name: 'Starter',
            description: 'Perfect for small teams getting started',
            price_amount: 2900,
            currency: 'USD',
            interval: 'monthly',
            interval_count: 1,
            included_credits: 1000,
            max_users: 5,
            features: {
              ai_features: ['Basic AI Processing', 'Limited API Access'],
              support: 'Email Support',
              storage: '10GB'
            },
            is_active: true,
            stripe_price_id: 'price_starter',
            stripe_product_id: 'prod_starter',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            trial_period_days: 14
          },
          {
            id: '4',
            name: 'Starter',
            description: 'Perfect for small teams getting started (Annual)',
            price_amount: 27900, // 2325 per month when annual
            currency: 'USD',
            interval: 'annual',
            interval_count: 1,
            included_credits: 1000,
            max_users: 5,
            features: {
              ai_features: ['Basic AI Processing', 'Limited API Access'],
              support: 'Email Support',
              storage: '10GB'
            },
            is_active: true,
            stripe_price_id: 'price_starter_annual',
            stripe_product_id: 'prod_starter',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            trial_period_days: 14
          },
          {
            id: '2',
            name: 'Professional',
            description: 'For growing businesses with more complex needs',
            price_amount: 7900,
            currency: 'USD',
            interval: 'monthly',
            interval_count: 1,
            included_credits: 5000,
            max_users: null,
            features: {
              ai_features: ['Advanced AI Processing', 'Priority API Access', 'Custom AI Models'],
              support: 'Priority Email & Chat Support',
              storage: '100GB'
            },
            is_active: true,
            stripe_price_id: 'price_professional',
            stripe_product_id: 'prod_professional',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            trial_period_days: 14
          },
          {
            id: '5',
            name: 'Professional',
            description: 'For growing businesses with more complex needs (Annual)',
            price_amount: 75900, // 6325 per month when annual
            currency: 'USD',
            interval: 'annual',
            interval_count: 1,
            included_credits: 5000,
            max_users: null,
            features: {
              ai_features: ['Advanced AI Processing', 'Priority API Access', 'Custom AI Models'],
              support: 'Priority Email & Chat Support',
              storage: '100GB'
            },
            is_active: true,
            stripe_price_id: 'price_professional_annual',
            stripe_product_id: 'prod_professional',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            trial_period_days: 14
          },
          {
            id: '3',
            name: 'Enterprise',
            description: 'For large organizations with custom requirements',
            price_amount: 19900,
            currency: 'USD',
            interval: 'monthly',
            interval_count: 1,
            included_credits: 20000,
            max_users: null,
            features: {
              ai_features: ['Unlimited AI Processing', 'Custom AI Models', 'Dedicated API Access', 'White Label'],
              support: '24/7 Dedicated Support',
              storage: 'Unlimited'
            },
            is_active: true,
            stripe_price_id: 'price_enterprise',
            stripe_product_id: 'prod_enterprise',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            trial_period_days: 14
          },
          {
            id: '6',
            name: 'Enterprise',
            description: 'For large organizations with custom requirements (Annual)',
            price_amount: 190900, // 15908 per month when annual
            currency: 'USD',
            interval: 'annual',
            interval_count: 1,
            included_credits: 20000,
            max_users: null,
            features: {
              ai_features: ['Unlimited AI Processing', 'Custom AI Models', 'Dedicated API Access', 'White Label'],
              support: '24/7 Dedicated Support',
              storage: 'Unlimited'
            },
            is_active: true,
            stripe_price_id: 'price_enterprise_annual',
            stripe_product_id: 'prod_enterprise',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            trial_period_days: 14
          }
        ]);
      } finally {
        setIsLoadingPricing(false);
      }
    };

    fetchPricingPlans();
  }, []);

  // Show loading state while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-800">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 w-10 h-10 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
            <h1 className="text-2xl font-bold text-white">NeuraSaaS</h1>
          </div>
          <div className="flex space-x-4">
            {user ? (
              <Button 
                variant="ghost" 
                onClick={() => router.push('/dashboard')}
                className="text-white hover:bg-white/20 cursor-pointer"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => router.push('/auth/signin')}
                  className="text-white hover:bg-white/20 cursor-pointer"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => router.push('/auth/signup')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white cursor-pointer"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Transform Your Business with <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">AI-Powered</span> Solutions
          </h1>
          <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
            Our cutting-edge AI platform helps businesses automate processes, gain insights, and drive innovation with advanced machine learning capabilities.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            {user ? (
              <Button 
                size="lg" 
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all cursor-pointer shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  onClick={() => router.push('/auth/signup')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all cursor-pointer shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Get Started - Free Trial
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => router.push('/auth/signin')}
                  className="border-white text-white bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full text-lg font-medium transition-all cursor-pointer shadow-lg"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>

          {/* Features Section */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-white mb-4">Powerful AI Features</h2>
            <p className="text-gray-300 mb-12 max-w-2xl mx-auto">
              Our platform provides state-of-the-art artificial intelligence capabilities to help your business thrive in the digital age.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 w-16 h-16 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">AI Automation</h3>
                <p className="text-gray-300">
                  Automate repetitive tasks and processes with intelligent algorithms that learn and adapt over time.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Predictive Analytics</h3>
                <p className="text-gray-300">
                  Make data-driven decisions with advanced analytics that predict trends and customer behaviors.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 w-16 h-16 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Real-time Processing</h3>
                <p className="text-gray-300">
                  Process and analyze data in real-time for instant insights and immediate responses to market changes.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <div className="bg-gradient-to-r from-green-500 to-teal-500 w-16 h-16 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Secure Infrastructure</h3>
                <p className="text-gray-300">
                  Enterprise-grade security with encrypted data processing and compliance with privacy regulations.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <div className="bg-gradient-to-r from-red-500 to-pink-500 w-16 h-16 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Custom AI Models</h3>
                <p className="text-gray-300">
                  Build and deploy custom AI models tailored specifically to your business requirements.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 w-16 h-16 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">24/7 Support</h3>
                <p className="text-gray-300">
                  Access our expert team around the clock to help you maximize your AI investment.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mt-20 py-16">
            <h2 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Choose the plan that works best for your business. All plans include our core AI capabilities.
            </p>
            
            {/* Billing Interval Toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex p-1 bg-white/10 rounded-xl border border-white/20">
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                    billingInterval === 'monthly'
                      ? 'bg-cyan-600 text-white'
                      : 'text-gray-200 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('annual')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                    billingInterval === 'annual'
                      ? 'bg-cyan-600 text-white'
                      : 'text-gray-200 hover:text-white'
                  }`}
                >
                  Annual <span className="text-cyan-300 ml-1">
                    (Save {calculateAverageSavings()}%)
                  </span>
                </button>
              </div>
            </div>
            
            {isLoadingPricing ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {pricingPlans
                  .filter(plan => plan.interval === billingInterval)
                  .sort((a, b) => a.price_amount - b.price_amount) // Sort from lowest to highest price
                  .map((plan, index) => (
                    <div 
                      key={plan.id} 
                      className={`bg-white/10 backdrop-blur-sm rounded-2xl border ${
                        index === 1 ? 'border-cyan-400 ring-2 ring-cyan-400/30 transform -translate-y-2' : 'border-white/20'
                      } p-8 transition-all hover:scale-[1.02] relative overflow-hidden flex flex-col h-full`}
                    >
                      {index === 1 && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                          MOST POPULAR
                        </div>
                      )}
                      
                      <div className="flex-grow">
                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name.split(':')[0]}</h3>
                        <p className="text-gray-300 mb-6">{plan.description}</p>
                        
                        <div className="mb-6">
                          <span className="text-4xl font-bold text-white">${plan.price_amount / 100}</span>
                        </div>
                        
                        {plan.trial_period_days && plan.trial_period_days > 0 && (
                          <div className="text-sm text-cyan-300 mb-6">
                            {plan.trial_period_days}-day free trial
                          </div>
                        )}
                        
                        <ul className="space-y-3 mb-8">
                          <li className="flex items-center text-gray-200">
                            <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {plan.included_credits} AI Credits
                          </li>
                          <li className="flex items-center text-gray-200">
                            <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {plan.max_users ? `${plan.max_users} Users` : 'Unlimited Users'}
                          </li>
                          
                          {plan.features && (plan.features as { ai_features?: string[] }).ai_features?.map((feature, idx) => (
                            <li key={idx} className="flex items-center text-gray-200">
                              <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                          
                          {plan.features && (plan.features as { support?: string }).support && (
                            <li className="flex items-center text-gray-200">
                              <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {(plan.features as { support?: string }).support}
                            </li>
                          )}
                        </ul>
                      </div>
                      
                      <Button 
                        className={`w-full ${
                          index === 1 
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white' 
                            : 'bg-white/20 hover:bg-white/30 text-white'
                        }`}
                        onClick={() => {
                          if (user) {
                            router.push('/dashboard');
                          } else {
                            router.push('/auth/signup');
                          }
                        }}
                      >
                        {user ? 'Upgrade Plan' : 'Get Started'}
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="mt-20 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to transform your business?</h2>
            <p className="text-gray-200 mb-6 max-w-2xl mx-auto">
              Join thousands of forward-thinking companies using our AI platform to drive innovation and growth.
            </p>
            {user ? (
              <Button 
                size="lg" 
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all cursor-pointer shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Continue to Dashboard
              </Button>
            ) : (
              <Button 
                size="lg" 
                onClick={() => router.push('/auth/signup')}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all cursor-pointer shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Free Trial
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/10 backdrop-blur-md mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-300">
            <p>© {new Date().getFullYear()} NeuraSaaS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}