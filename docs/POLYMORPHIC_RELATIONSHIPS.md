# Enhanced Polymorphic Relationships in Credit Transactions

## Overview

The `credit_transactions` table uses a polymorphic foreign key pattern with `source` and `source_id` fields. This document explains the enhanced implementation that provides clear mapping, validation, and debugging capabilities.

## The Problem

Originally, the polymorphic relationship had these issues:
- Unclear mapping between `source` values and referenced tables
- No validation to ensure `source_id` references the correct table
- Potential for data integrity issues
- Difficult debugging when relationships are broken

## The Solution: Hybrid Approach

We implemented a hybrid approach that combines semantic enum values with explicit table mapping:

### 1. Enhanced TransactionSource Enum

```python
class TransactionSource(str, Enum):
    """Credit transaction source enumeration.
    
    Maps to the following tables via source_id:
    - SUBSCRIPTION -> organization_subscriptions
    - PURCHASE -> credit_products  
    - EVENT_CONSUMPTION -> credit_events
    - EXPIRY -> None (no source_id needed)
    - REFUND -> billing_history
    - ADMIN_ADJUSTMENT -> None (no source_id needed)
    """
    SUBSCRIPTION = "subscription"
    PURCHASE = "purchase"
    EVENT_CONSUMPTION = "event_consumption"
    EXPIRY = "expiry"
    REFUND = "refund"
    ADMIN_ADJUSTMENT = "admin_adjustment"
```

### 2. TransactionSourceMapping Utility Class

The `TransactionSourceMapping` class provides:

- **Table mapping**: `get_source_table(source)` returns the table name
- **Validation**: `validate_source_relationship(source, source_id)` checks validity
- **Requirements checking**: `requires_source_id(source)` indicates if source_id is needed
- **Error messages**: `get_validation_error(source, source_id)` provides clear error descriptions

### 3. Automatic Validation

The `CreditTransactionCreate` model now automatically validates source/source_id relationships:

```python
# This will succeed
valid_transaction = CreditTransactionCreate(
    organization_id=org_id,
    transaction_type=TransactionType.EARNED,
    amount=1000,
    source=TransactionSource.SUBSCRIPTION,
    source_id=subscription_id  # Required for SUBSCRIPTION
)

# This will raise a ValidationError
invalid_transaction = CreditTransactionCreate(
    organization_id=org_id,
    transaction_type=TransactionType.EARNED,
    amount=1000,
    source=TransactionSource.SUBSCRIPTION,
    source_id=None  # Missing required source_id
)
```

## Source-to-Table Mapping

| Source | Table | source_id Required | Description |
|--------|-------|-------------------|-------------|
| `subscription` | `organization_subscriptions` | ✅ Yes | Credits from subscription plans |
| `purchase` | `credit_products` | ✅ Yes | Credits purchased separately |
| `event_consumption` | `credit_events` | ✅ Yes | Credits consumed by events |
| `refund` | `billing_history` | ✅ Yes | Credits refunded from billing |
| `expiry` | None | ❌ No | Credits expired naturally |
| `admin_adjustment` | None | ❌ No | Manual admin adjustments |

## Usage Examples

### Creating Subscription Credits

```python
# When a subscription is created or renewed
transaction = CreditTransactionCreate(
    organization_id=organization_id,
    transaction_type=TransactionType.EARNED,
    amount=5000,
    source=TransactionSource.SUBSCRIPTION,
    source_id=subscription_id,  # References organization_subscriptions.id
    expires_at=subscription_end_date,
    description="Monthly subscription credits"
)
```

### Creating Purchase Credits

```python
# When credits are purchased
transaction = CreditTransactionCreate(
    organization_id=organization_id,
    transaction_type=TransactionType.PURCHASED,
    amount=1000,
    source=TransactionSource.PURCHASE,
    source_id=credit_product_id,  # References credit_products.id
    stripe_payment_intent_id="pi_1234567890",
    description="Credit pack purchase"
)
```

### Creating Consumption Records

```python
# When credits are consumed
transaction = CreditTransactionCreate(
    organization_id=organization_id,
    transaction_type=TransactionType.CONSUMED,
    amount=-25,
    source=TransactionSource.EVENT_CONSUMPTION,
    source_id=credit_event_id,  # References credit_events.id
    credit_event_id=credit_event_id,
    description="API call consumption"
)
```

### Creating Expiry Records

```python
# When credits expire (no source_id needed)
transaction = CreditTransactionCreate(
    organization_id=organization_id,
    transaction_type=TransactionType.EXPIRED,
    amount=-100,
    source=TransactionSource.EXPIRY,
    # source_id is None (not required)
    description="Subscription credits expired"
)
```

## Enhanced Billing Service Features

### 1. Validation Methods

```python
# Validate all transactions for an organization
report = await billing_service.validate_transaction_references(organization_id)

# Get detailed information about a specific transaction
details = await billing_service.get_transaction_source_details(transaction_id)
```

### 2. Improved Logging

The service now logs polymorphic relationships for debugging:

```
DEBUG: Creating credit transaction: source=subscription, source_id=abc-123, references_table=organization_subscriptions
INFO: Added 5000 credits to organization xyz-789 (source: subscription)
```

### 3. Enhanced Transaction Creation

All transaction creation methods now use the validated models and provide clear error messages.

## Benefits

1. **Clear Documentation**: The enum itself documents which tables are referenced
2. **Automatic Validation**: Invalid relationships are caught at creation time
3. **Better Debugging**: Validation methods help identify data integrity issues
4. **Semantic Meaning**: Business-friendly enum values are preserved
5. **Future-Proof**: Easy to add new transaction sources with proper mapping
6. **Type Safety**: Pydantic models provide compile-time type checking

## Migration Notes

No database changes are required. This is purely an application-level enhancement that:
- Maintains backward compatibility with existing data
- Provides validation for new transactions
- Adds debugging capabilities for existing data

## Testing

Run the test script to see the functionality in action:

```bash
cd backend
python tmp_rovodev_test_polymorphic.py
```

This demonstrates:
- Source-to-table mapping
- Validation of valid/invalid combinations
- Transaction creation with automatic validation
- Usage examples for all transaction types

## Future Enhancements

Potential future improvements:
- Database-level constraints using check constraints or triggers
- Automated cleanup of orphaned references
- Migration tools for fixing existing invalid data
- API endpoints for validation reporting