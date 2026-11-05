import os
import hashlib
import hmac
import secrets
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, text, inspect, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# Load variables from a .env file at the repo root, if one exists. This is
# resolved from this file's own location, so it works the same way no matter
# which folder a command (uvicorn, backend.seed, backend.create_admin, ...)
# is actually run from. It NEVER overrides a variable that's already set in
# the real environment (override=False, the default), so on Render - where
# variables are set via the dashboard, not a .env file - this has no effect
# at all. This is purely a local-development convenience.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./purakam.db")

# Render/Heroku postgres URLs might start with "postgres://", but SQLAlchemy requires "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Password hashing -------------------------------------------------------
# New hashes are stored as "pbkdf2_sha256$<iterations>$<salt>$<digest>" with a
# random per-user salt. Legacy hashes (single global salt, bare hex digest) are
# still accepted by verify_password() and are upgraded transparently on login.
PBKDF2_ITERATIONS = 200_000
_HASH_PREFIX = "pbkdf2_sha256"
_LEGACY_SALT = b"purakam_secret_salt_for_indian_audience"

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS
    ).hex()
    return f"{_HASH_PREFIX}${PBKDF2_ITERATIONS}${salt}${digest}"

def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    if stored_hash.startswith(_HASH_PREFIX + "$"):
        try:
            _, iterations, salt, digest = stored_hash.split("$")
            computed = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iterations)
            ).hex()
        except (ValueError, TypeError):
            return False
        return hmac.compare_digest(computed, digest)
    # Legacy format
    legacy = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), _LEGACY_SALT, 100000).hex()
    return hmac.compare_digest(legacy, stored_hash)

def password_needs_rehash(stored_hash: str) -> bool:
    return not (stored_hash or "").startswith(_HASH_PREFIX + "$")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="customer")  # "customer" or "partner"
    phone = Column(String, nullable=False)
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=True)  # Default True for existing users, False for new registrations
    verification_code = Column(String, nullable=True)
    verification_code_expires_at = Column(DateTime, nullable=True)
    reset_code = Column(String, nullable=True)
    reset_code_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


    # Relationships
    partner_profile = relationship("PartnerProfile", back_populates="user", uselist=False)
    bookings_as_customer = relationship("Booking", foreign_keys="[Booking.customer_id]", back_populates="customer")
    bookings_as_partner = relationship("Booking", foreign_keys="[Booking.partner_id]", back_populates="partner")

class PartnerProfile(Base):
    __tablename__ = "partner_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    service_category = Column(String, nullable=False)  # e.g., "Electrician", "Plumber"
    hourly_rate = Column(Float, nullable=False)  # in INR (₹)
    rating = Column(Float, default=5.0)
    availability_status = Column(Boolean, default=False)  # True = Active/Online, False = Offline
    bio = Column(Text, nullable=True)
    completed_jobs = Column(Integer, default=0)
    experience_years = Column(Integer, default=2)
    aadhar_card = Column(String, nullable=True)
    pan_card = Column(String, nullable=True)


    # Relationship
    user = relationship("User", back_populates="partner_profile")

class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g., "Electrician"
    icon_key = Column(String, nullable=False)  # For UI mapping
    description = Column(String, nullable=False)
    base_price = Column(Float, default=299.0)  # in INR (₹)

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    partner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Assigned partner
    service_category = Column(String, nullable=False)
    booking_date = Column(String, nullable=False)  # YYYY-MM-DD
    time_slot = Column(String, nullable=False)  # e.g., "10:00 AM - 12:00 PM"
    details = Column(Text, nullable=True)
    price = Column(Float, nullable=False)  # Final price (₹)
    status = Column(String, default="requested")  # "requested", "accepted", "on_the_way", "in_progress", "completed", "cancelled"
    address = Column(String, nullable=False)
    payment_method = Column(String, default="UPI")  # "UPI", "COD", "Card"
    payment_status = Column(String, default="pending")  # "pending", "completed"
    attachment_path = Column(String, nullable=True)     # Path to user uploaded photo/video
    otp = Column(String, nullable=True)                 # OTP code for work start verification
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    area_name = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], back_populates="bookings_as_customer")
    partner = relationship("User", foreign_keys=[partner_id], back_populates="bookings_as_partner")
    review = relationship("Review", back_populates="booking", uselist=False)
    messages = relationship("ChatMessage", back_populates="booking", cascade="all, delete-orphan")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    rating = Column(Integer, nullable=False)  # 1 to 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    booking = relationship("Booking", back_populates="review")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="messages")
    sender = relationship("User")

class PartnerDeclinedBooking(Base):
    __tablename__ = "partner_declined_bookings"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _add_column_if_missing(conn, inspector, table, column, ddl_type):
    """Add a column only if it isn't already there. Works on both SQLite and
    Postgres (neither of which agree on "ADD COLUMN IF NOT EXISTS" syntax)."""
    existing = {c["name"] for c in inspector.get_columns(table)}
    if column not in existing:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type};"))

def init_db():
    """Create any missing tables/columns. Additive only: never drops or alters
    existing data, so it is safe to call on every startup."""
    Base.metadata.create_all(bind=engine)
    try:
        with engine.begin() as conn:
            inspector = inspect(engine)
            if inspector.has_table("users"):
                _add_column_if_missing(conn, inspector, "users", "is_verified", "BOOLEAN DEFAULT TRUE")
                _add_column_if_missing(conn, inspector, "users", "verification_code", "VARCHAR")
                _add_column_if_missing(conn, inspector, "users", "verification_code_expires_at", "TIMESTAMP")
                _add_column_if_missing(conn, inspector, "users", "reset_code", "VARCHAR")
                _add_column_if_missing(conn, inspector, "users", "reset_code_expires_at", "TIMESTAMP")
            if inspector.has_table("partner_profiles"):
                _add_column_if_missing(conn, inspector, "partner_profiles", "experience_years", "INTEGER DEFAULT 2")
    except Exception as e:
        print(f"Auto-migration note: {e}")

init_db()