"""Database setup.

This script is SAFE TO RUN ON EVERY STARTUP (which is exactly what
render.yaml does): it only ever creates things that are missing. It never
deletes or overwrites a user, booking, chat message or review that already
exists.

What it does, every time:
  1. Creates tables / adds any missing columns (via database.init_db()).
  2. Makes sure the standard service categories exist (adds missing ones,
     leaves existing ones untouched).

What it does ONLY outside production (or when SEED_DEMO_ACCOUNTS=true):
  3. Creates the 3 demo accounts (user@purakam.in / partner@purakam.in /
     acservice@purakam.in, all password "password123") if they don't already
     exist. If they already exist, they are left exactly as they are -
     re-running this script will not reset a password you changed, or data
     you created under those accounts.

Demo accounts are skipped in production by default because their password is
public (it's in this file). Set SEED_DEMO_ACCOUNTS=true to force-create them
anyway (e.g. for a staging environment).
"""
import os

from backend.database import SessionLocal, User, PartnerProfile, ServiceCategory, hash_password

IS_PRODUCTION = bool(os.environ.get("RENDER")) or os.environ.get("APP_ENV", "").lower() == "production"
SEED_DEMO_ACCOUNTS = os.environ.get("SEED_DEMO_ACCOUNTS", "").strip().lower() in ("1", "true", "yes")
CREATE_DEMO_ACCOUNTS = SEED_DEMO_ACCOUNTS or not IS_PRODUCTION

SERVICE_CATEGORIES = [
    {"name": "Electrician", "icon_key": "zap", "description": "General electrical work, fan installations, light fittings.", "base_price": 199.0},
    {"name": "Switchboard & Wiring", "icon_key": "plug", "description": "Switchboard repairs, socket replacement, short circuit fixes.", "base_price": 249.0},
    {"name": "AC & Appliance Repair", "icon_key": "wind", "description": "AC servicing, refrigerator geyser faults, diagnostics.", "base_price": 399.0},
    {"name": "Inverter & Battery", "icon_key": "activity", "description": "Home inverter setups, backup battery diagnostics.", "base_price": 499.0},
    {"name": "Geyser & Water Heater", "icon_key": "droplet", "description": "Geyser element replacement, thermostat repairs.", "base_price": 299.0},
]

DEMO_ACCOUNTS = [
    {
        "email": "user@purakam.in", "name": "Rahul Sharma (Customer)",
        "phone": "+919876543210", "address": "Bandra West, Mumbai",
        "latitude": 19.0600, "longitude": 72.8258, "role": "customer",
    },
    {
        "email": "partner@purakam.in", "name": "Rajesh Kumar (Electrician)",
        "phone": "+919876543211", "address": "Khar West, Mumbai",
        "latitude": 19.0700, "longitude": 72.8358, "role": "partner",
        "profile": {
            "service_category": "Electrician", "hourly_rate": 350.0, "experience_years": 3,
            "availability_status": True, "rating": 4.9, "completed_jobs": 12,
            "aadhar_card": "123456789012", "pan_card": "ABCDE1234F",
        },
    },
    {
        "email": "acservice@purakam.in", "name": "Amit Verma (AC Repair)",
        "phone": "+919876543212", "address": "Andheri West, Mumbai",
        "latitude": 19.1197, "longitude": 72.8468, "role": "partner",
        "profile": {
            "service_category": "AC & Appliance Repair", "hourly_rate": 450.0, "experience_years": 4,
            "availability_status": True, "rating": 4.8, "completed_jobs": 24,
            "aadhar_card": "987654321098", "pan_card": "XYZDE9876F",
        },
    },
]


def seed_db():
    print("Setting up database tables & schema...")
    # Table/column creation already ran at import time (backend.database.init_db()),
    # but calling again here is harmless - it's additive-only.
    from backend import database
    database.init_db()

    db = SessionLocal()
    try:
        # 1. Service categories - create any that are missing, touch nothing else.
        added = 0
        for cat_data in SERVICE_CATEGORIES:
            if not db.query(ServiceCategory).filter(ServiceCategory.name == cat_data["name"]).first():
                db.add(ServiceCategory(**cat_data))
                added += 1
        db.commit()
        print(f"Service categories: {added} added, {len(SERVICE_CATEGORIES) - added} already present.")

        # 2. Demo accounts - create-if-missing only, never overwritten on re-run.
        if CREATE_DEMO_ACCOUNTS:
            created = 0
            for acc in DEMO_ACCOUNTS:
                user = db.query(User).filter(User.email == acc["email"]).first()
                if user:
                    continue
                user = User(
                    name=acc["name"], email=acc["email"],
                    password_hash=hash_password("password123"),
                    phone=acc["phone"], address=acc["address"],
                    latitude=acc["latitude"], longitude=acc["longitude"],
                    role=acc["role"], is_verified=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                if "profile" in acc:
                    db.add(PartnerProfile(user_id=user.id, **acc["profile"]))
                    db.commit()
                created += 1
            print(f"Demo accounts: {created} created, {len(DEMO_ACCOUNTS) - created} already present.")
        else:
            print("Demo accounts: skipped (production). Set SEED_DEMO_ACCOUNTS=true to force.")

        print("Database setup complete. No existing data was modified or deleted.")
    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()