#!/usr/bin/env python3
"""
Consolidated Stripe Management Script

This script combines functionality from multiple Stripe-related scripts into
a single, easy-to-use tool with intelligent detection capabilities.

For detailed documentation, see: docs/STRIPE_SETUP_AND_MANAGEMENT.md

Usage:
    python scripts/stripe_manager.py --help
    python scripts/stripe_manager.py diagnostic
    python scripts/stripe_manager.py cleanup --dry-run
    python scripts/stripe_manager.py setup-credits --dry-run
    python scripts/stripe_manager.py seed --dry-run
    python scripts/stripe_manager.py seed --verbose
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Any, List, Dict

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import stripe
from config.settings import settings
from config.supabase import supabase_config

# Initialize Stripe
if not settings.stripe_secret_key:
    print("❌ STRIPE_SECRET_KEY not found in environment variables")
    sys.exit(1)

stripe.api_key = settings.stripe_secret_key


class StripeManager:
    """Consolidated Stripe management functionality."""
    
    def __init__(self):
        self.stripe = stripe
    
    def diagnostic(self):
        """Comprehensive inspection of Stripe account."""
        print("🔍 STRIPE ACCOUNT DIAGNOSTIC")
        print("=" * 50)
        
        # 1. Fetch ALL products
        print("\n📦 ALL PRODUCTS:")
        print("-" * 30)
        
        try:
            products = self.stripe.Product.list(limit=100, active=True)
            print(f"Found {len(products.data)} active products:")
            
            for i, product in enumerate(products.data, 1):
                print(f"\n{i}. Product: {product.name}")
                print(f"   ID: {product.id}")
                print(f"   Type: {product.type if hasattr(product, 'type') else 'N/A'}")
                print(f"   Active: {product.active}")
                print(f"   Description: {product.description or 'No description'}")
                if product.metadata:
                    print(f"   Metadata: {dict(product.metadata)}")
                else:
                    print(f"   Metadata: None")
                    
        except Exception as e:
            print(f"❌ Error fetching products: {e}")
            return
        
        # 2. Fetch ALL prices
        print(f"\n💰 ALL PRICES:")
        print("-" * 30)
        
        try:
            prices = self.stripe.Price.list(limit=100, active=True, expand=['data.product'])
            print(f"Found {len(prices.data)} active prices:")
            
            recurring_count = 0
            one_time_count = 0
            
            for i, price in enumerate(prices.data, 1):
                print(f"\n{i}. Price: {price.id}")
                print(f"   Product: {price.product.name}")
                print(f"   Amount: ${price.unit_amount/100:.2f} {price.currency.upper()}")
                print(f"   Type: {price.type}")
                
                if price.type == 'recurring':
                    recurring_count += 1
                    print(f"   Billing: {price.recurring.interval}")
                    if price.recurring.interval_count > 1:
                        print(f"   Interval Count: {price.recurring.interval_count}")
                else:
                    one_time_count += 1
                    
                # Check product metadata for special fields
                product_metadata = price.product.metadata or {}
                if product_metadata:
                    print(f"   Product Metadata: {dict(product_metadata)}")
                    
                    # Check for subscription-related metadata
                    if any(key in product_metadata for key in ['included_credits', 'max_users', 'features']):
                        print(f"   ✅ Has subscription metadata")
                    
                    # Check for credit-related metadata
                    if 'credit_amount' in product_metadata:
                        print(f"   ✅ Has credit metadata (credit_amount: {product_metadata['credit_amount']})")
                else:
                    print(f"   ⚠️  No metadata")
            
            print(f"\nSUMMARY:")
            print(f"- Recurring prices (subscriptions): {recurring_count}")
            print(f"- One-time prices: {one_time_count}")
            
        except Exception as e:
            print(f"❌ Error fetching prices: {e}")
            return
        
        # 3. Recommendations
        self._show_recommendations()
    
    def _show_recommendations(self):
        """Show setup recommendations."""
        print(f"\n💡 STRIPE SETUP RECOMMENDATIONS:")
        print("=" * 50)
        
        print("""
🎯 FOR SUBSCRIPTION PLANS:
- Create Products for each plan tier (Starter, Pro, Enterprise)
- Create Prices for each billing interval (monthly, yearly)
- Add metadata to Products:
  * included_credits: "1000" (number of credits included)
  * max_users: "5" (maximum users allowed)
  * features: '{"api_access": true, "priority_support": false}'
  * trial_period_days: "14" (optional free trial)

💳 FOR CREDIT PRODUCTS (Pay-as-you-go):
- Create Products for credit bundles (100 Credits, 500 Credits, etc.)
- Create ONE-TIME Prices for each bundle
- Add metadata to Products:
  * credit_amount: "100" (number of credits this purchase gives)

📝 Example Product Metadata for "Pro Plan":
{
  "included_credits": "5000",
  "max_users": "25", 
  "features": "{\\"api_access\\": true, \\"priority_support\\": true, \\"analytics\\": true}",
  "trial_period_days": "14"
}
        """)
    
    def cleanup_old_products(self, dry_run=False):
        """Deactivate old 'All Credit Packages' products."""
        print("🧹 Cleaning up old 'All Credit Packages' products...")
        
        if dry_run:
            print("🔍 DRY RUN MODE - No changes will be made to Stripe")
        
        try:
            # Fetch all products (including the one that might be hidden)
            products = self.stripe.Product.list(limit=100, active=True)
            
            # Also check for the specific product by fetching all prices and finding unique products
            all_prices = self.stripe.Price.list(limit=100, active=True, expand=['data.product'])
            product_names = {}
            for price in all_prices.data:
                if price.product.name not in product_names:
                    product_names[price.product.name] = price.product
            
            old_products = []
            # Check both sources for "All Credit Packages"
            for product in products.data:
                if product.name == "All Credit Packages":
                    old_products.append(product)
            
            # Also check from price-derived products
            if "All Credit Packages" in product_names and product_names["All Credit Packages"] not in old_products:
                old_products.append(product_names["All Credit Packages"])
            
            if not old_products:
                print("✅ No old 'All Credit Packages' products found")
                return
            
            print(f"Found {len(old_products)} old 'All Credit Packages' products")
            
            for i, product in enumerate(old_products, 1):
                print(f"\n{i}. Product: {product.name} ({product.id})")
                
                # Get prices for this product
                prices = self.stripe.Price.list(product=product.id, active=True)
                print(f"   Has {len(prices.data)} active prices:")
                
                for price in prices.data:
                    print(f"     - ${price.unit_amount/100:.2f} ({price.id})")
                    
                    if not dry_run:
                        # Deactivate price
                        self.stripe.Price.modify(price.id, active=False)
                        print(f"       ✅ Deactivated price")
                    else:
                        print(f"       [DRY RUN] Would deactivate price")
                
                if not dry_run:
                    # Deactivate product
                    self.stripe.Product.modify(product.id, active=False)
                    print(f"   ✅ Deactivated product")
                else:
                    print(f"   [DRY RUN] Would deactivate product")
            
            if dry_run:
                print(f"\n🔍 DRY RUN COMPLETED")
                print(f"Would deactivate {len(old_products)} products and their prices")
            else:
                print(f"\n✅ CLEANUP COMPLETED")
                print(f"Deactivated {len(old_products)} old products")
            
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
    
    def setup_credit_products(self, dry_run=False):
        """Create proper individual credit products in Stripe."""
        credit_packs = [
            {
                "name": "100 Credits Pack",
                "description": "100 credits for small usage",
                "credit_amount": 100,
                "price_usd": 15.00
            },
            {
                "name": "1000 Credits Pack", 
                "description": "1000 credits for regular usage",
                "credit_amount": 1000,
                "price_usd": 25.00
            },
            {
                "name": "2500 Credits Pack",
                "description": "2500 credits for heavy usage",
                "credit_amount": 2500,
                "price_usd": 50.00
            },
            {
                "name": "5000 Credits Pack",
                "description": "5000 credits for enterprise usage", 
                "credit_amount": 5000,
                "price_usd": 90.00
            }
        ]
        
        if dry_run:
            print("🔍 DRY RUN MODE - No changes will be made to Stripe")
        
        print("🏗️  Creating individual credit products in Stripe...")
        print("=" * 50)
        
        for pack in credit_packs:
            try:
                print(f"\n📦 {'[DRY RUN] Would create' if dry_run else 'Creating'}: {pack['name']}")
                
                if dry_run:
                    print(f"   📋 Product details:")
                    print(f"      - Name: {pack['name']}")
                    print(f"      - Description: {pack['description']}")
                    print(f"      - Price: ${pack['price_usd']:.2f}")
                    print(f"      - Metadata: credit_amount = {pack['credit_amount']}")
                    continue
                
                # Create product
                product = self.stripe.Product.create(
                    name=pack['name'],
                    description=pack['description'],
                    type='service',
                    metadata={
                        'credit_amount': str(pack['credit_amount'])
                    }
                )
                
                print(f"   ✅ Product created: {product.id}")
                
                # Create price
                price = self.stripe.Price.create(
                    product=product.id,
                    unit_amount=int(pack['price_usd'] * 100),  # Convert to cents
                    currency='usd',
                    metadata={
                        'credit_amount': str(pack['credit_amount'])
                    }
                )
                
                print(f"   ✅ Price created: {price.id} (${pack['price_usd']:.2f})")
                print(f"   📊 Metadata: credit_amount = {pack['credit_amount']}")
                
            except stripe.error.StripeError as e:
                if 'already exists' in str(e):
                    print(f"   ⚠️  Product '{pack['name']}' already exists, skipping...")
                else:
                    print(f"   ❌ Error creating {pack['name']}: {e}")
            except Exception as e:
                print(f"   ❌ Unexpected error with {pack['name']}: {e}")
        
        print(f"\n✅ Credit products setup completed!")
        print(f"\n💡 Next steps:")
        print(f"1. Go to your Stripe Dashboard to verify the products")
        print(f"2. Deactivate or delete the old 'All Credit Packages' products")
        print(f"3. Run the seed command: python scripts/stripe_manager.py seed")
    
    def fetch_all_stripe_prices(self):
        """Fetch ALL prices from Stripe with pagination."""
        print("🔍 Fetching all prices from Stripe (with pagination)...")
        
        all_prices = []
        starting_after = None
        
        try:
            while True:
                # Fetch prices in batches of 100
                params = {
                    'limit': 100,
                    'active': True,
                    'expand': ['data.product']
                }
                if starting_after:
                    params['starting_after'] = starting_after
                    
                prices = self.stripe.Price.list(**params)
                all_prices.extend(prices.data)
                
                if not prices.has_more:
                    break
                    
                starting_after = prices.data[-1].id
                print(f"  Fetched {len(prices.data)} prices, continuing...")
            
            print(f"✓ Found {len(all_prices)} total prices in Stripe")
            return all_prices
            
        except stripe.error.StripeError as e:
            print(f"❌ Stripe API error: {e}")
            return []
        except Exception as e:
            print(f"❌ Error fetching prices: {e}")
            return []
    
    def analyze_stripe_data(self, prices, verbose=False):
        """Analyze Stripe data and categorize products with intelligent detection."""
        print("🔍 Analyzing Stripe data with intelligent detection...")
        
        subscription_plans = []
        credit_products = []
        uncategorized = []
        
        for price in prices:
            if not price.product.active:
                continue
                
            product = price.product
            metadata = product.metadata or {}
            
            if verbose:
                print(f"\nAnalyzing: {product.name} ({price.type})")
                print(f"  Price: ${price.unit_amount/100:.2f} {price.currency.upper()}")
                if price.type == 'recurring':
                    print(f"  Billing: {price.recurring.interval}")
                print(f"  Metadata: {dict(metadata) if metadata else 'None'}")
            
            if price.type == 'recurring':
                # This is a subscription plan
                plan_data = {
                    'name': f"{product.name} ({price.recurring.interval.title()})",
                    'description': product.description or '',
                    'stripe_price_id': price.id,
                    'stripe_product_id': product.id,
                    'price_amount': price.unit_amount,
                    'currency': price.currency.upper(),
                    'interval': price.recurring.interval,
                    'interval_count': price.recurring.interval_count,
                    # Intelligent defaults - prefer metadata, fallback to sensible defaults
                    'included_credits': int(metadata.get('included_credits', 1000)),
                    'max_users': int(metadata.get('max_users')) if metadata.get('max_users') else None,
                    'features': json.loads(metadata.get('features', '{}')) if metadata.get('features') else {},
                    'trial_period_days': int(metadata.get('trial_period_days', 0)) if metadata.get('trial_period_days') else None,
                }
                subscription_plans.append(plan_data)
                if verbose:
                    print(f"  ✅ Categorized as: Subscription Plan")
                
            elif price.type == 'one_time':
                # This could be a credit product
                if 'credit_amount' in metadata:
                    # Has credit metadata - definitely a credit product
                    product_data = {
                        'name': product.name,
                        'description': product.description or '',
                        'stripe_price_id': price.id,
                        'stripe_product_id': product.id,
                        'credit_amount': int(metadata['credit_amount']),
                        'price_amount': price.unit_amount,
                        'currency': price.currency.upper(),
                    }
                    credit_products.append(product_data)
                    if verbose:
                        print(f"  ✅ Categorized as: Credit Product")
                else:
                    # Try to infer credit product from name and pricing patterns
                    credit_amount = self._extract_credits_from_name(product.name, price.unit_amount)
                    if credit_amount:
                        product_data = {
                            'name': product.name,
                            'description': product.description or f"{credit_amount} credits for ${price.unit_amount/100:.2f}",
                            'stripe_price_id': price.id,
                            'stripe_product_id': product.id,
                            'credit_amount': credit_amount,
                            'price_amount': price.unit_amount,
                            'currency': price.currency.upper(),
                        }
                        credit_products.append(product_data)
                        if verbose:
                            print(f"  ✅ Categorized as: Credit Product (inferred {credit_amount} credits)")
                    else:
                        uncategorized.append({
                            'name': product.name,
                            'price_id': price.id,
                            'type': price.type,
                            'reason': 'One-time price with no credit_amount metadata and name doesn\'t contain credit info'
                        })
                        if verbose:
                            print(f"  ⚠️  Uncategorized: Cannot determine credit amount")
            else:
                uncategorized.append({
                    'name': product.name,
                    'price_id': price.id,
                    'type': price.type,
                    'reason': f'Unknown price type: {price.type}'
                })
                if verbose:
                    print(f"  ⚠️  Uncategorized: Unknown price type")
        
        print(f"\n📊 ANALYSIS RESULTS:")
        print(f"- Subscription plans: {len(subscription_plans)}")
        print(f"- Credit products: {len(credit_products)}")
        print(f"- Uncategorized: {len(uncategorized)}")
        
        if uncategorized and verbose:
            print(f"\n⚠️  UNCATEGORIZED ITEMS:")
            for item in uncategorized:
                print(f"  - {item['name']}: {item['reason']}")
        
        return subscription_plans, credit_products
    
    def _extract_credits_from_name(self, name: str, price_amount: int) -> int:
        """Try to extract credit amount from product name or infer from price."""
        name_lower = name.lower()
        
        # Look for numbers in the name
        import re
        numbers = re.findall(r'\d+', name)
        
        if numbers and ('credit' in name_lower or 'credits' in name_lower):
            # Use the largest number found (likely the credit amount)
            return int(max(numbers, key=int))
        
        # If no clear credit amount in name, try to infer from common pricing
        price_dollars = price_amount / 100
        if price_dollars == 15:
            return 100  # $15 for 100 credits
        elif price_dollars == 25:
            return 1000  # $25 for 1000 credits  
        elif price_dollars == 50:
            return 2500  # $50 for 2500 credits
        elif price_dollars == 90:
            return 5000  # $90 for 5000 credits
        
        return 0  # Cannot determine
    
    def seed_subscription_plans(self, plans_data: List[Dict[str, Any]], dry_run: bool = False):
        """Seed subscription plans with enhanced error handling."""
        if not plans_data:
            print("⚠️ No subscription plans to seed")
            return
        
        print(f"🌱 Seeding {len(plans_data)} subscription plans...")
        
        if dry_run:
            print("🔍 DRY RUN - Would seed the following subscription plans:")
            for plan in plans_data:
                print(f"  - {plan['name']}: ${plan['price_amount']/100:.2f}/{plan['interval']} ({plan['included_credits']} credits)")
            return
        
        success_count = 0
        for plan in plans_data:
            try:
                # Check if plan already exists
                existing = supabase_config.client.table("subscription_plans").select("id").eq(
                    "stripe_price_id", plan['stripe_price_id']
                ).execute()
                
                plan_data = {
                    'name': plan['name'],
                    'description': plan['description'],
                    'stripe_price_id': plan['stripe_price_id'],
                    'stripe_product_id': plan['stripe_product_id'],
                    'price_amount': plan['price_amount'],
                    'currency': plan['currency'],
                    'interval': plan['interval'],
                    'interval_count': plan['interval_count'],
                    'included_credits': plan['included_credits'],
                    'max_users': plan['max_users'],
                    'features': plan['features'],
                    'trial_period_days': plan['trial_period_days'],
                }
                
                if existing.data:
                    # Update existing plan
                    supabase_config.client.table("subscription_plans").update(plan_data).eq(
                        "stripe_price_id", plan['stripe_price_id']
                    ).execute()
                    print(f"  ✅ Updated: {plan['name']}")
                else:
                    # Insert new plan
                    supabase_config.client.table("subscription_plans").insert(plan_data).execute()
                    print(f"  ✅ Created: {plan['name']}")
                
                success_count += 1
                
            except Exception as e:
                print(f"  ❌ Error with {plan['name']}: {e}")
        
        print(f"✓ Subscription plans seeded: {success_count}/{len(plans_data)} successful")
    
    def seed_credit_products(self, products_data: List[Dict[str, Any]], dry_run: bool = False):
        """Seed credit products with enhanced error handling."""
        if not products_data:
            print("⚠️ No credit products to seed")
            return
        
        print(f"🌱 Seeding {len(products_data)} credit products...")
        
        if dry_run:
            print("🔍 DRY RUN - Would seed the following credit products:")
            for product in products_data:
                print(f"  - {product['name']}: {product['credit_amount']} credits for ${product['price_amount']/100:.2f}")
            return
        
        success_count = 0
        for product in products_data:
            try:
                # Check if product already exists
                existing = supabase_config.client.table("credit_products").select("id").eq(
                    "stripe_price_id", product['stripe_price_id']
                ).execute()
                
                if existing.data:
                    # Update existing product
                    supabase_config.client.table("credit_products").update(product).eq(
                        "stripe_price_id", product['stripe_price_id']
                    ).execute()
                    print(f"  ✅ Updated: {product['name']}")
                else:
                    # Insert new product
                    supabase_config.client.table("credit_products").insert(product).execute()
                    print(f"  ✅ Created: {product['name']}")
                
                success_count += 1
                
            except Exception as e:
                print(f"  ❌ Error with {product['name']}: {e}")
        
        print(f"✓ Credit products seeded: {success_count}/{len(products_data)} successful")
    
    def seed_credit_events(self, dry_run: bool = False):
        """Seed default credit events."""
        credit_events = [
            {'name': 'api_call_basic', 'description': 'Basic API call', 'credit_cost': 1, 'category': 'api_call'},
            {'name': 'api_call_premium', 'description': 'Premium API call with advanced features', 'credit_cost': 5, 'category': 'api_call'},
            {'name': 'storage_gb_month', 'description': 'Storage per GB per month', 'credit_cost': 10, 'category': 'storage'},
            {'name': 'compute_hour', 'description': 'Compute processing per hour', 'credit_cost': 100, 'category': 'compute'},
            {'name': 'ai_inference', 'description': 'AI model inference call', 'credit_cost': 25, 'category': 'ai'},
            {'name': 'data_export', 'description': 'Data export operation', 'credit_cost': 50, 'category': 'data'},
            {'name': 'webhook_delivery', 'description': 'Webhook delivery attempt', 'credit_cost': 2, 'category': 'api_call'},
        ]
        
        print(f"🌱 Seeding {len(credit_events)} credit events...")
        
        if dry_run:
            print("🔍 DRY RUN - Would seed the following credit events:")
            for event in credit_events:
                print(f"  - {event['name']}: {event['credit_cost']} credits ({event['category']})")
            return
        
        success_count = 0
        for event in credit_events:
            try:
                # Check if event already exists
                existing = supabase_config.client.table("credit_events").select("id").eq(
                    "name", event['name']
                ).execute()
                
                if existing.data:
                    # Update existing event
                    supabase_config.client.table("credit_events").update(event).eq(
                        "name", event['name']
                    ).execute()
                    print(f"  ✅ Updated: {event['name']}")
                else:
                    # Insert new event
                    supabase_config.client.table("credit_events").insert(event).execute()
                    print(f"  ✅ Created: {event['name']}")
                
                success_count += 1
                
            except Exception as e:
                print(f"  ❌ Error with {event['name']}: {e}")
        
        print(f"✓ Credit events seeded: {success_count}/{len(credit_events)} successful")
    
    def check_tables_exist(self):
        """Check if required tables exist."""
        required_tables = ['subscription_plans', 'credit_events', 'credit_products']
        
        for table in required_tables:
            try:
                supabase_config.client.table(table).select("id").limit(1).execute()
            except Exception as e:
                print(f"❌ Table '{table}' appears to be missing: {e}")
                return False
        
        return True
    
    def seed_database(self, dry_run=False, verbose=False):
        """Seed database with Stripe data using intelligent detection."""
        if dry_run:
            print("🔍 DRY RUN MODE - No data will be written to database")
        
        print("🌱 Starting intelligent billing data seeding...")
        print("=" * 60)
        
        # Always use the enhanced method with pagination and intelligent detection
        all_prices = self.fetch_all_stripe_prices()
        if not all_prices:
            print("❌ No prices found in Stripe")
            return False
            
        subscription_plans, credit_products = self.analyze_stripe_data(all_prices, verbose=verbose)
        
        if not subscription_plans and not credit_products:
            print("❌ No valid subscription plans or credit products found")
            print("💡 Consider adding metadata to your Stripe products or check the diagnostic output")
            return False
        
        try:
            if not dry_run:
                if not self.check_tables_exist():
                    print("❌ Required database tables are missing")
                    return False
            
            print(f"\n🌱 SEEDING DATA:")
            print("=" * 30)
            
            # Seed all data
            self.seed_subscription_plans(subscription_plans, dry_run)
            self.seed_credit_events(dry_run)
            self.seed_credit_products(credit_products, dry_run)
            
            if dry_run:
                print(f"\n🔍 DRY RUN COMPLETED")
                print(f"Found {len(subscription_plans)} subscription plans and {len(credit_products)} credit products")
            else:
                print(f"\n🎉 SEEDING COMPLETED!")
                print(f"✅ {len(subscription_plans)} subscription plans")
                print(f"✅ {len(credit_products)} credit products")
                print(f"✅ 7 credit events")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during seeding: {e}")
            return False


def create_parser():
    """Create argument parser for CLI interface."""
    parser = argparse.ArgumentParser(
        description="Consolidated Stripe Management Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/stripe_manager.py diagnostic
  python scripts/stripe_manager.py cleanup --dry-run
  python scripts/stripe_manager.py setup-credits --dry-run
  python scripts/stripe_manager.py seed --dry-run
  python scripts/stripe_manager.py seed --verbose
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Diagnostic command
    diagnostic_parser = subparsers.add_parser(
        'diagnostic', 
        help='Inspect Stripe account and show recommendations'
    )
    
    # Cleanup command
    cleanup_parser = subparsers.add_parser(
        'cleanup', 
        help='Deactivate old "All Credit Packages" products'
    )
    cleanup_parser.add_argument(
        '--dry-run', 
        action='store_true', 
        help='Preview what would be cleaned up without making changes'
    )
    
    # Setup credits command
    setup_parser = subparsers.add_parser(
        'setup-credits', 
        help='Create individual credit products with proper metadata'
    )
    setup_parser.add_argument(
        '--dry-run', 
        action='store_true', 
        help='Preview what would be created without making changes'
    )
    
    # Seed command
    seed_parser = subparsers.add_parser(
        'seed', 
        help='Seed database with Stripe data using intelligent detection'
    )
    seed_parser.add_argument(
        '--dry-run', 
        action='store_true', 
        help='Preview what would be seeded without writing to database'
    )
    seed_parser.add_argument(
        '--verbose', 
        action='store_true', 
        help='Show detailed analysis of each Stripe product during processing'
    )
    
    # Show metadata instructions command
    metadata_parser = subparsers.add_parser(
        'show-metadata', 
        help='Show instructions for adding metadata to subscription products'
    )
    
    return parser


def show_metadata_instructions():
    """Show instructions for adding metadata to existing subscription products."""
    print(f"\n📝 SUBSCRIPTION PLAN METADATA SETUP:")
    print("=" * 50)
    print(f"""
To optimize your existing subscription plans, add this metadata to each product in Stripe Dashboard:

🎯 Starter Plan:
{{
  "included_credits": "1000",
  "max_users": "5", 
  "features": "{{'api_access': true, 'basic_support': true, 'storage_gb': 10}}",
  "trial_period_days": "14"
}}

🚀 Pro Plan:
{{
  "included_credits": "5000",
  "max_users": "25",
  "features": "{{'api_access': true, 'priority_support': true, 'storage_gb': 100, 'analytics': true}}",
  "trial_period_days": "14"
}}

🏢 Enterprise Plan:
{{
  "included_credits": "10000", 
  "max_users": "100",
  "features": "{{'api_access': true, 'dedicated_support': true, 'storage_gb': 1000, 'analytics': true, 'custom_integrations': true}}",
  "trial_period_days": "30"
}}

📍 How to add metadata:
1. Go to Stripe Dashboard → Products
2. Click on each product (Starter Plan, Pro Plan, Enterprise Plan)
3. Scroll down to "Metadata" section
4. Add the key-value pairs shown above
5. Save the product
""")


def main():
    """Main CLI entry point."""
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize Stripe manager
    manager = StripeManager()
    
    print("🔧 STRIPE MANAGER")
    print("=" * 40)
    
    try:
        if args.command == 'diagnostic':
            manager.diagnostic()
            
        elif args.command == 'cleanup':
            manager.cleanup_old_products(dry_run=args.dry_run)
            
        elif args.command == 'setup-credits':
            manager.setup_credit_products(dry_run=args.dry_run)
            
        elif args.command == 'seed':
            success = manager.seed_database(dry_run=args.dry_run, verbose=args.verbose)
            if not success:
                sys.exit(1)
                
        elif args.command == 'show-metadata':
            show_metadata_instructions()
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()