#!/usr/bin/env python3
"""
Seed script to initialize notification events in the database.
Run this script after running the Alembic migrations.
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from src.notifications.service import notification_service
from src.notifications.models import NotificationEventCreate, NotificationCategory
from src.notifications.templates import TEMPLATE_REGISTRY


async def seed_notification_events():
    """Seed notification events from the template registry."""
    
    print("Starting notification events seeding...")
    
    # Map template event keys to categories
    event_categories = {
        "user.signup": NotificationCategory.AUTH,
        "user.password_reset": NotificationCategory.AUTH,
        "user.email_verification": NotificationCategory.AUTH,
        "subscription.created": NotificationCategory.BILLING,
        "subscription.cancelled": NotificationCategory.BILLING,
        "credits.low_balance": NotificationCategory.BILLING,
        "credits.purchased": NotificationCategory.BILLING,
        "organization.invitation": NotificationCategory.ORGANIZATION,
        "billing.payment_failed": NotificationCategory.BILLING,
    }
    
    seeded_count = 0
    
    for event_key, template_data in TEMPLATE_REGISTRY.items():
        try:
            # Check if event already exists
            existing_event = await notification_service.get_notification_event_by_key(event_key)
            
            if existing_event:
                print(f"✓ Event already exists: {event_key}")
                continue
            
            # Create the notification event
            category = event_categories.get(event_key, NotificationCategory.CUSTOM)
            
            event_create = NotificationEventCreate(
                name=template_data["name"],
                description=f"Notification event for {template_data['name']}",
                event_key=event_key,
                category=category,
                is_enabled=True,
                default_template_id=None,  # Using built-in templates
                metadata={
                    "built_in_template": True,
                    "variables": template_data.get("variables", [])
                }
            )
            
            await notification_service.create_notification_event(event_create)
            print(f"✓ Created event: {event_key} - {template_data['name']}")
            seeded_count += 1
            
        except Exception as e:
            print(f"✗ Error creating event {event_key}: {e}")
    
    print(f"\n✅ Seeding completed! Created {seeded_count} new notification events.")
    print(f"Total events in registry: {len(TEMPLATE_REGISTRY)}")


async def list_notification_events():
    """List all notification events."""
    print("\n📋 Current Notification Events:")
    print("-" * 80)
    
    events = await notification_service.list_notification_events()
    
    if not events:
        print("No notification events found.")
        return
    
    for event in events:
        status = "✓ Enabled" if event.is_enabled else "✗ Disabled"
        print(f"{status} | {event.event_key:30s} | {event.category:15s} | {event.name}")
    
    print("-" * 80)
    print(f"Total: {len(events)} events")


async def main():
    """Main function."""
    print("=" * 80)
    print("Notification Events Seeder")
    print("=" * 80)
    print()
    
    # Seed events
    await seed_notification_events()
    
    # List all events
    await list_notification_events()
    
    print()
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
