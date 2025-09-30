# Stripe Setup and Management

This document provides comprehensive guidance for setting up Stripe products and managing them using the consolidated Stripe management tool.

## Table of Contents

1. [Stripe Configuration](#stripe-configuration)
2. [Stripe Manager Tool](#stripe-manager-tool)
3. [Quick Start Guide](#quick-start-guide)
4. [Detailed Usage](#detailed-usage)
5. [Troubleshooting](#troubleshooting)

## Stripe Configuration

Before using the management tool, you need to properly configure your Stripe products with the required metadata.

### Environment Setup

Ensure your `STRIPE_SECRET_KEY` is set in your environment variables:

```bash
# In your .env file
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### 1. Subscription Plans (Recurring Prices)

For subscription plans, create **recurring prices** in Stripe with the following **product metadata**:

#### Required Metadata Fields:
- `included_credits` (string): Number of credits included with this plan
- `max_users` (string, optional): Maximum users allowed (omit for unlimited)
- `features` (JSON string): Plan features as JSON object
- `trial_period_days` (string, optional): Trial period in days

#### Example Product Metadata:
```json
{
  "included_credits": "1000",
  "max_users": "5",
  "features": "{\"api_calls\": 10000, \"storage_gb\": 10, \"support\": \"email\"}",
  "trial_period_days": "14"
}
```

#### Sample Plan Configurations:

**Starter Plan:**
```json
{
  "included_credits": "1000",
  "max_users": "5", 
  "features": "{\"api_access\": true, \"basic_support\": true, \"storage_gb\": 10}",
  "trial_period_days": "14"
}
```

**Pro Plan:**
```json
{
  "included_credits": "5000",
  "max_users": "25",
  "features": "{\"api_access\": true, \"priority_support\": true, \"storage_gb\": 100, \"analytics\": true}",
  "trial_period_days": "14"
}
```

**Enterprise Plan:**
```json
{
  "included_credits": "10000", 
  "max_users": "100",
  "features": "{\"api_access\": true, \"dedicated_support\": true, \"storage_gb\": 1000, \"analytics\": true, \"custom_integrations\": true}",
  "trial_period_days": "30"
}
```

### 2. Credit Products (One-time Prices)

For credit products, create **one-time prices** in Stripe with the following **product metadata**:

#### Required Metadata Fields:
- `credit_amount` (string): Number of credits this product provides

#### Example Product Metadata:
```json
{
  "credit_amount": "1000"
}
```

### Setting Up Products in Stripe Dashboard

#### For Subscription Plans:

1. Go to **Products** → **Add product**
2. Fill in product name and description
3. Create a **recurring** price (monthly/yearly)
4. In the **Product** section, add the metadata fields above
5. Make sure the product is **Active**

#### For Credit Products:

1. Go to **Products** → **Add product**
2. Fill in product name and description  
3. Create a **one-time** price
4. In the **Product** section, add the `credit_amount` metadata
5. Make sure the product is **Active**

## Stripe Manager Tool

The `stripe_manager.py` script consolidates all Stripe-related functionality into a single, easy-to-use command-line tool.

### Features

The script provides the following commands:
- **`diagnostic`** - Inspect Stripe account and show recommendations
- **`cleanup`** - Deactivate old "All Credit Packages" products  
- **`setup-credits`** - Create individual credit products with proper metadata
- **`seed`** - Seed database with Stripe data using intelligent detection
- **`show-metadata`** - Display metadata setup instructions

### Benefits

✅ **Single Script**: One tool for all Stripe operations  
✅ **Consistent Interface**: Unified command-line experience  
✅ **Intelligent Detection**: Automatically detects subscription plans and credit products  
✅ **Pagination Support**: Handles large Stripe accounts with automatic pagination  
✅ **Smart Defaults**: Provides sensible fallbacks when metadata is missing  
✅ **Dry Run Support**: Preview changes before applying them  
✅ **Enhanced Error Handling**: Better error reporting and recovery  
✅ **Easy Maintenance**: Single file to update and maintain  

## Quick Start Guide

### 1. Inspect Your Current Stripe Setup
```bash
cd backend
python scripts/stripe_manager.py diagnostic
```

This will show you all your current Stripe products and their metadata, plus recommendations.

### 2. Set Up Credit Products (if needed)
```bash
# Preview what would be created
python scripts/stripe_manager.py setup-credits --dry-run

# Create the credit products
python scripts/stripe_manager.py setup-credits
```

### 3. Clean Up Old Products (if needed)
```bash
# Preview what would be cleaned up
python scripts/stripe_manager.py cleanup --dry-run

# Perform the cleanup
python scripts/stripe_manager.py cleanup
```

### 4. Seed Your Database
```bash
# Preview what would be seeded (recommended first)
python scripts/stripe_manager.py seed --dry-run

# Seed the database with intelligent detection
python scripts/stripe_manager.py seed
```

## Detailed Usage

### View All Available Commands
```bash
python scripts/stripe_manager.py --help
```

### Inspect Your Stripe Account
```bash
python scripts/stripe_manager.py diagnostic
```

This command provides a comprehensive inspection of your Stripe account, showing:
- All active products and their metadata
- All active prices and their types
- Analysis of which products can be categorized
- Recommendations for improving your setup

### Clean Up Old Products
```bash
# Preview what would be cleaned up (safe)
python scripts/stripe_manager.py cleanup --dry-run

# Actually perform the cleanup
python scripts/stripe_manager.py cleanup
```

This command specifically targets old "All Credit Packages" products for deactivation.

### Set Up Credit Products
```bash
# Preview what would be created
python scripts/stripe_manager.py setup-credits --dry-run

# Create the credit products
python scripts/stripe_manager.py setup-credits
```

This creates standardized credit products:
- 100 Credits Pack ($15.00)
- 1000 Credits Pack ($25.00)
- 2500 Credits Pack ($50.00)
- 5000 Credits Pack ($90.00)

### Seed Database with Stripe Data
```bash
# Preview what would be seeded (recommended first)
python scripts/stripe_manager.py seed --dry-run

# Seed the database with intelligent detection
python scripts/stripe_manager.py seed

# Seed with detailed output showing analysis of each product
python scripts/stripe_manager.py seed --verbose --dry-run
python scripts/stripe_manager.py seed --verbose
```

The seed command:
- Uses pagination to fetch all Stripe products
- Intelligently detects subscription plans and credit products
- Provides smart defaults when metadata is missing
- Reports uncategorized items for manual review

### Show Metadata Setup Instructions
```bash
python scripts/stripe_manager.py show-metadata
```

This displays detailed instructions for manually adding metadata to your Stripe products.

## Intelligent Detection Features

The tool includes smart detection capabilities:

### For Subscription Plans:
- **Smart Defaults**: Plans without metadata get 1000 included credits by default
- **Flexible Naming**: Automatically appends billing interval to plan names
- **Metadata Parsing**: Safely parses JSON features with fallbacks

### For Credit Products:
- **Metadata Detection**: Prefers explicit `credit_amount` metadata
- **Name-based Inference**: Extracts credit amounts from product names like "100 Credits Pack"
- **Price-based Inference**: Infers credits from common pricing patterns:
  - $15.00 → 100 credits
  - $25.00 → 1000 credits
  - $50.00 → 2500 credits
  - $90.00 → 5000 credits

## Troubleshooting

### "No data found in Stripe" error:
- Check that `STRIPE_SECRET_KEY` is set correctly
- Ensure products are marked as **Active** in Stripe
- Verify metadata fields are set on products (not prices)
- For credit products, ensure they have `credit_amount` metadata

### Missing fields in database:
- Check that product metadata follows the exact field names above
- Ensure JSON in `features` field is valid JSON
- Verify numeric fields contain valid integers

### "Required database tables are missing":
- Run the billing migration: `alembic upgrade head`
- Ensure your database connection is properly configured

### Products not being categorized:
- Use the `diagnostic` command to inspect your Stripe setup
- Add proper metadata to your Stripe products
- Check that products are marked as **Active**
- Use `--verbose` flag with seed command to see detailed analysis

## Migration from Old Scripts

If you were using the old individual scripts, here's the mapping:

| Old Script | New Command |
|------------|-------------|
| `python scripts/stripe_diagnostic.py` | `python scripts/stripe_manager.py diagnostic` |
| `python scripts/cleanup_old_stripe_products.py --dry-run` | `python scripts/stripe_manager.py cleanup --dry-run` |
| `python scripts/setup_stripe_credit_products.py --setup-credits --dry-run` | `python scripts/stripe_manager.py setup-credits --dry-run` |
| `python scripts/seed_billing_data.py --dry-run` | `python scripts/stripe_manager.py seed --dry-run` |
| `python scripts/seed_billing_data_enhanced.py --dry-run` | `python scripts/stripe_manager.py seed --dry-run --verbose` |

## Best Practices

1. **Always use dry-run first**: Preview changes before applying them
2. **Use the diagnostic command**: Understand your current setup before making changes
3. **Add proper metadata**: This ensures the best detection and categorization
4. **Keep products active**: Inactive products won't be processed
5. **Use consistent naming**: Makes automatic detection more reliable
6. **Regular syncing**: Re-run the seed command when you update Stripe products