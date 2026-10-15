"""Create or update an administrator account.

Self-registration as "admin" is no longer possible, so admins are created here.

Usage (from the repository root):
    python -m backend.create_admin                       # prompts for the details
    ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' python -m backend.create_admin

On Render, run it from the backend service's Shell tab (DATABASE_URL is already set there).
"""
import os
import sys
from getpass import getpass

from backend.database import SessionLocal, User, hash_password


def main():
    email = (os.environ.get("ADMIN_EMAIL") or input("Admin email: ")).strip().lower()
    name = os.environ.get("ADMIN_NAME") or "Administrator"
    password = os.environ.get("ADMIN_PASSWORD") or getpass("Admin password (min 10 chars): ")

    if "@" not in email:
        sys.exit("Invalid email address.")
    if len(password) < 10:
        sys.exit("Password must be at least 10 characters.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.role = "admin"
            user.password_hash = hash_password(password)
            user.is_verified = True
            user.verification_code = None
            user.verification_code_expires_at = None
            action = "Updated existing user and promoted to admin"
        else:
            db.add(User(
                name=name,
                email=email,
                password_hash=hash_password(password),
                phone="0000000000",
                role="admin",
                address="Purakam HQ, Mumbai",
                is_verified=True,
            ))
            action = "Created new admin"
        db.commit()
        print(f"{action}: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
