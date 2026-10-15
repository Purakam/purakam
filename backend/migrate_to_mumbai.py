from sqlalchemy import inspect, text
from backend.database import SessionLocal, User, Booking, engine

def run_migration():
    print("=== STARTING DATABASE LOCATION MIGRATION TO MUMBAI ===")
    db = SessionLocal()
    try:
        # Migrate Users
        users = db.query(User).all()
        updated_users = 0
        for u in users:
            address = (u.address or "").lower()
            if not any(city in address for city in ["mumbai", "thane", "navi mumbai"]):
                old_address = u.address
                # Update to Mumbai defaults
                if u.role == "partner":
                    u.address = "Andheri West, Mumbai, MH - 400053"
                    u.latitude = 19.1197
                    u.longitude = 72.8468
                else:
                    u.address = "Bandra West, Mumbai, MH - 400050"
                    u.latitude = 19.0600
                    u.longitude = 72.8258
                print(f"Migrated User ID #{u.id} ({u.name}, Role: {u.role}): '{old_address}' -> '{u.address}'")
                updated_users += 1
        
        # Migrate Bookings
        bookings = db.query(Booking).all()
        updated_bookings = 0
        for b in bookings:
            address = (b.address or "").lower()
            if not any(city in address for city in ["mumbai", "thane", "navi mumbai"]):
                old_address = b.address
                b.address = "Bandra West, Mumbai, MH - 400050"
                b.area_name = "Bandra & Western Suburbs"
                b.latitude = 19.0600
                b.longitude = 72.8258
                print(f"Migrated Booking ID #{b.id}: '{old_address}' -> '{b.address}'")
                updated_bookings += 1
                
        if updated_users > 0 or updated_bookings > 0:
            db.commit()
            print(f"Migration completed successfully! Updated {updated_users} users and {updated_bookings} bookings.")
        else:
            print("No non-Mumbai database records found. Database is already clean!")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
