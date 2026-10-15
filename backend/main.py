import os
import random
import secrets
import hmac
import razorpay
import requests
from fastapi import FastAPI, Depends, HTTPException, status, Header, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_dummy_key_id")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "dummy_secret")

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from . import database, schemas
from .database import (
    get_db, User, PartnerProfile, ServiceCategory, Booking, Review, ChatMessage,
    PartnerDeclinedBooking, hash_password, verify_password, password_needs_rehash,
)

import math
from jose import jwt, JWTError

# Render sets RENDER=true; APP_ENV=production works anywhere else.
IS_PRODUCTION = bool(os.environ.get("RENDER")) or os.environ.get("APP_ENV", "").lower() == "production"

# JWT Configuration -----------------------------------------------------------
# Set JWT_SECRET_KEY in the environment. In production a missing key falls back to a
# random per-process key (safe, but every restart logs everybody out).
ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "").strip()
if not SECRET_KEY:
    if IS_PRODUCTION:
        SECRET_KEY = secrets.token_urlsafe(48)
        print("WARNING: JWT_SECRET_KEY is not set - using a temporary random key. "
              "All sessions will be invalidated on restart.")
    else:
        SECRET_KEY = "dev-only-insecure-jwt-key"

def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

# Haversine distance calculator
def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth radius in kilometers
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email_otp(to_email: str, otp_code: str):
    brevo_api_key = os.environ.get("BREVO_API_KEY", "").strip()
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    sendgrid_api_key = os.environ.get("SENDGRID_API_KEY", "").strip()
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_password = os.environ.get("SMTP_PASSWORD", "").replace(" ", "").strip()
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com").strip()
    # Verified sender address used by Brevo / SendGrid (set EMAIL_FROM in the environment).
    email_from = os.environ.get("EMAIL_FROM", "").strip() or smtp_user

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #111827; margin: 0; font-size: 24px;">Purakam</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Household Services Platform</p>
        </div>
        <h2 style="color: #111827; font-size: 18px;">Verify Your Email Address</h2>
        <p style="color: #4b5563; line-height: 1.5;">Thank you for registering with Purakam! Please enter the 6-digit OTP verification code below to complete your registration:</p>
        <div style="font-size: 32px; font-weight: bold; color: #22c55e; letter-spacing: 6px; padding: 16px; background: #f3f4f6; border-radius: 12px; text-align: center; margin: 24px 0;">
            {otp_code}
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.4;">This code will expire in 15 minutes. If you did not register for Purakam, please ignore this email.</p>
    </div>
    """

    # 1. Try Brevo HTTPS API (300 free emails/day to ANY email address)
    if brevo_api_key and email_from:
        try:
            r = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_api_key,
                    "content-type": "application/json",
                    "accept": "application/json"
                },
                json={
                    "sender": {"name": "Purakam", "email": email_from},
                    "to": [{"email": to_email}],
                    "subject": f"Your Purakam Verification Code: {otp_code}",
                    "htmlContent": html_content
                },
                timeout=10
            )
            if r.status_code in [200, 201, 202]:
                print(f"✅ Real email sent via Brevo HTTPS API to {to_email}")
                return True, "Success via Brevo HTTPS API"
            else:
                print(f"Brevo API HTTP {r.status_code}: {r.text}")
        except Exception as ex:
            print(f"Brevo HTTPS API failed: {ex}")

    # 2. Try Resend API over HTTPS Port 443
    if resend_api_key:
        try:
            r = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "Purakam <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": f"Your Purakam Verification Code: {otp_code}",
                    "html": html_content
                },
                timeout=10
            )
            if r.status_code in [200, 201, 202]:
                print(f"✅ Real email sent via Resend HTTPS API to {to_email}")
                return True, "Success via Resend HTTPS API"
            else:
                err = f"Resend API HTTP {r.status_code}: {r.text}"
                print(err)
        except Exception as ex:
            print(f"Resend HTTPS API failed: {ex}")


    # 2. Try SendGrid API over HTTPS Port 443 (Allowed by Render)
    if sendgrid_api_key:
        try:
            r = requests.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {sendgrid_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": email_from or "no-reply@purakam.in", "name": "Purakam"},
                    "subject": f"Your Purakam Verification Code: {otp_code}",
                    "content": [{"type": "text/html", "value": html_content}]
                },
                timeout=10
            )
            if r.status_code in [200, 201, 202]:
                print(f"✅ Real email sent via SendGrid HTTPS API to {to_email}")
                return True, "Success via SendGrid HTTPS API"
        except Exception as ex:
            print(f"SendGrid HTTPS API failed: {ex}")

    # 3. Fallback to SMTP (if credentials provided)
    if not smtp_user or not smtp_password:
        if IS_PRODUCTION:
            # Never write verification codes to production logs.
            print(f"Could not send verification email to {to_email}: no working email provider configured.")
        else:
            print(f"[DEV SANDBOX MODE] OTP Code for {to_email} is {otp_code}")
        return False, "No SMTP or API credentials configured"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your Purakam Verification Code: {otp_code}"
        msg["From"] = f"Purakam Services <{smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        try:
            with smtplib.SMTP_SSL(smtp_server, 465, timeout=10) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, to_email, msg.as_string())
            print(f"✅ Real email sent to {to_email} via SSL 465")
            return True, "Success via SSL 465"
        except Exception as ssl_err:
            try:
                with smtplib.SMTP(smtp_server, 587, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, to_email, msg.as_string())
                print(f"✅ Real email sent to {to_email} via TLS 587")
                return True, "Success via TLS 587"
            except Exception as tls_err:
                err_msg = f"Render network blocked SMTP ports 465/587 ({tls_err}). Use RESEND_API_KEY for HTTPS delivery."
                print(f"❌ {err_msg}")
                return False, err_msg
    except Exception as e:
        return False, str(e)

def send_booking_confirmation_email(customer_email: str, customer_name: str, service_name: str, date_str: str, time_slot: str, otp_code: str):
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #111827; margin: 0; font-size: 24px;">Purakam</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Service Booking Confirmed!</p>
        </div>
        <h2 style="color: #111827; font-size: 18px;">Hello {customer_name},</h2>
        <p style="color: #4b5563; line-height: 1.5;">Your service booking for <strong>{service_name}</strong> on <strong>{date_str} ({time_slot})</strong> has been placed successfully.</p>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 18px; text-align: center; margin: 24px 0;">
            <p style="color: #166534; font-weight: 700; margin: 0 0 8px 0; font-size: 13px; letter-spacing: 0.5px;">WORK VERIFICATION OTP</p>
            <div style="font-size: 34px; font-weight: 800; color: #15803d; letter-spacing: 6px;">
                {otp_code}
            </div>
            <p style="color: #166534; font-size: 12px; margin: 10px 0 0 0; line-height: 1.4;">Share this OTP code with your assigned service partner ONLY when they arrive at your doorstep to start the work.</p>
        </div>
    </div>
    """

    if resend_api_key:
        try:
            requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "Purakam <onboarding@resend.dev>",
                    "to": [customer_email],
                    "subject": f"Purakam Booking Confirmed - Work OTP: {otp_code}",
                    "html": html_content
                },
                timeout=10
            )
            print(f"✅ Booking confirmation & OTP email sent to {customer_email}")
        except Exception as e:
            print(f"Failed sending booking OTP email: {e}")

app = FastAPI(title="Purakam API Backend", version="1.0.0")

# Socket.IO Async Server Setup for Instant OTP & Real-Time Job Sync
import socketio
import asyncio

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False
)
sio_app = socketio.ASGIApp(sio, socketio_path="socket.io")
app.mount("/ws", sio_app)


@sio.event
async def connect(sid, environ, auth=None):
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token and "QUERY_STRING" in environ:
        from urllib.parse import parse_qs
        qs = parse_qs(environ.get("QUERY_STRING", ""))
        if "token" in qs:
            token = qs["token"][0]
            
    if token:
        payload = verify_token(token)
        if payload:
            user_id = payload.get("user_id")
            role = payload.get("role")
            if user_id:
                await sio.save_session(sid, {"user_id": user_id, "role": role})
                await sio.enter_room(sid, f"user_{user_id}")
                if role == "partner":
                    await sio.enter_room(sid, "partners")

@sio.event
async def join_booking_room(sid, data):
    if isinstance(data, dict):
        booking_id = data.get("booking_id")
        if booking_id:
            await sio.enter_room(sid, f"booking_{booking_id}")

@sio.event
async def disconnect(sid):
    pass

def emit_realtime_event(event_name: str, payload: dict, room: str = None):
    """Safely emit socket events from sync route handlers to connected Web & Mobile apps."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(
                sio.emit(event_name, payload, room=room), loop
            )
    except Exception as e:
        print(f"Socket emit note: {e}")



# Setup upload directory
UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def _decode_bearer_token(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    payload = verify_token(authorization.split(" ", 1)[1].strip())
    if not payload or not payload.get("user_id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )
    return payload

def get_current_user_id(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> int:
    payload = _decode_bearer_token(authorization)
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.is_verified is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="EMAIL_NOT_VERIFIED")
    return user.id

def get_current_admin_id(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> int:
    payload = _decode_bearer_token(authorization)
    forbidden = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only administrators are authorized to access this resource"
    )
    if payload.get("role") != "admin":
        raise forbidden
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user or user.role != "admin" or user.is_verified is False:
        raise forbidden
    return user.id

@app.get("/api/auth/test-smtp")
def test_smtp(admin_id: int = Depends(get_current_admin_id)):
    """Admin-only: sends a test verification email to the configured SMTP user."""
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    email_from = os.environ.get("EMAIL_FROM", "").strip() or smtp_user
    if not email_from:
        return {"status": "SANDBOX_MODE", "message": "Neither EMAIL_FROM nor SMTP_USER is configured."}
    success, detail = send_email_otp(email_from, "999999")
    return {"status": "SUCCESS" if success else "FAILED", "smtp_server": smtp_server, "detail": detail}

# === Auth Routes ===

OTP_TTL_MINUTES = 15
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5
# Failed verification attempts per user id (in-memory; reset whenever a new code is issued).
_otp_failed_attempts: dict = {}

def normalize_email(email: str) -> str:
    return (email or "").strip().lower()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(func.lower(User.email) == normalize_email(email)).first()

def generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)

def issue_verification_code(user: User, db: Session, background_tasks: BackgroundTasks, force: bool = False) -> bool:
    """Create a fresh 6-digit code and email it in the background.

    Returns False (and does nothing) if a code was sent less than
    OTP_RESEND_COOLDOWN_SECONDS ago, unless force=True.
    """
    now = datetime.utcnow()
    if not force and user.verification_code and user.verification_code_expires_at:
        sent_at = user.verification_code_expires_at - timedelta(minutes=OTP_TTL_MINUTES)
        if (now - sent_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
            return False

    code = generate_otp()
    user.verification_code = code
    user.verification_code_expires_at = now + timedelta(minutes=OTP_TTL_MINUTES)
    db.commit()
    _otp_failed_attempts.pop(user.id, None)
    background_tasks.add_task(send_email_otp, user.email, code)
    return True

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = normalize_email(user_data.email)

    if user_data.role not in ("customer", "partner"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid account type")

    if not user_data.address or not user_data.address.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Address is required")

    if not user_data.terms_agree:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must read and accept the Terms & Conditions to register."
        )

    # Pre-validate partner specific fields before user creation
    aadhar_stripped = None
    pan_upper = None

    if user_data.role == "partner":
        if not user_data.service_category or user_data.hourly_rate is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service category and hourly rate required for partner role"
            )

        if user_data.experience_years is None or user_data.experience_years < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service partners must have a minimum of 2 years of professional experience."
            )

        if not user_data.aadhar_card or not user_data.pan_card:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aadhar card number and PAN card number are required for service partners"
            )

        aadhar_stripped = user_data.aadhar_card.replace(" ", "").replace("-", "")
        if len(aadhar_stripped) != 12 or not aadhar_stripped.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aadhar card must be a 12-digit numeric code"
            )

        pan_upper = user_data.pan_card.upper().strip()
        if len(pan_upper) != 10 or not pan_upper.isalnum():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PAN card must be a 10-character alphanumeric code"
            )

    existing_user = get_user_by_email(db, email)
    if existing_user:
        if existing_user.is_verified is not False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        # An earlier registration with this email was never verified (no access, no data):
        # replace it so the person can simply sign up again.
        if existing_user.partner_profile:
            db.delete(existing_user.partner_profile)
        db.delete(existing_user)
        db.commit()

    new_user = User(
        name=user_data.name.strip(),
        email=email,
        password_hash=hash_password(user_data.password),
        phone=user_data.phone,
        address=user_data.address,
        role=user_data.role,
        is_verified=False,
        verification_code=None,
        verification_code_expires_at=None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if user_data.role == "partner":
        new_partner = PartnerProfile(
            user_id=new_user.id,
            service_category=user_data.service_category,
            hourly_rate=user_data.hourly_rate,
            experience_years=user_data.experience_years,
            bio=user_data.bio or f"Professional {user_data.service_category} with {user_data.experience_years} years of experience.",
            availability_status=True,  # Automatically Online
            aadhar_card=aadhar_stripped,
            pan_card=pan_upper
        )
        db.add(new_partner)
        db.commit()

    issue_verification_code(new_user, db, background_tasks, force=True)
    db.refresh(new_user)

    # No access token yet: the account must be verified with the emailed code first.
    return new_user


@app.post("/api/auth/verify-email", response_model=schemas.UserResponse)
def verify_email(req: schemas.VerifyEmailRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, req.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

    if user.is_verified is not False:
        # Never hand out a token here: verification must always be proven with the emailed code.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already verified. Please log in."
        )

    if _otp_failed_attempts.get(user.id, 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a new code."
        )

    if (
        not user.verification_code
        or not user.verification_code_expires_at
        or datetime.utcnow() > user.verification_code_expires_at
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    submitted = (req.code or "").strip()
    if not hmac.compare_digest(user.verification_code, submitted):
        _otp_failed_attempts[user.id] = _otp_failed_attempts.get(user.id, 0) + 1
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    db.commit()
    db.refresh(user)
    _otp_failed_attempts.pop(user.id, None)

    user.access_token = create_access_token(user.id, user.role)
    return user

@app.post("/api/auth/resend-verification")
def resend_verification(req: schemas.ResendVerificationRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    generic = {"message": "If an unverified account exists for this email, a new verification code has been sent."}

    user = get_user_by_email(db, req.email)
    if not user or user.is_verified is not False:
        return generic

    if not issue_verification_code(user, db, background_tasks):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another code."
        )
    return generic


@app.post("/api/auth/login", response_model=schemas.UserResponse)
def login(login_data: schemas.UserLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = get_user_by_email(db, login_data.email)
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Transparently upgrade legacy (global-salt) password hashes.
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(login_data.password)
        db.commit()

    # Correct password but unverified email: send a fresh code (rate limited) and ask the client
    # to show the verification screen. A JSONResponse is returned (instead of raising) so the
    # background email task is still executed.
    if user.is_verified is False:
        issue_verification_code(user, db, background_tasks)
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "EMAIL_NOT_VERIFIED"},
            background=background_tasks,
        )

    # Automatically ensure partner profile exists and availability_status is True (Online) on login
    if user.role == "partner":
        partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user.id).first()
        if not partner_profile:
            partner_profile = PartnerProfile(
                user_id=user.id,
                service_category="Electrician",
                hourly_rate=350.0,
                availability_status=True,
                rating=4.9,
                completed_jobs=0
            )
            db.add(partner_profile)
            db.commit()
        elif not partner_profile.availability_status:
            partner_profile.availability_status = True
            db.commit()
        db.refresh(user)

    user.access_token = create_access_token(user.id, user.role)
    return user


# --- Google sign-in ----------------------------------------------------------
# The client sends the Google OAuth *access token*. The backend verifies it with Google
# (audience + verified email) and never trusts an email address supplied by the client.
# ALLOW_MOCK_GOOGLE_LOGIN=true enables the email/name mock flow for local development ONLY.
ALLOW_MOCK_GOOGLE_LOGIN = os.environ.get("ALLOW_MOCK_GOOGLE_LOGIN", "").strip().lower() in ("1", "true", "yes")

def _google_allowed_client_ids() -> set:
    raw = os.environ.get("GOOGLE_ALLOWED_CLIENT_IDS") or os.environ.get("GOOGLE_CLIENT_ID") or ""
    return {c.strip() for c in raw.split(",") if c.strip()}

def verify_google_access_token(access_token: str) -> tuple:
    allowed = _google_allowed_client_ids()
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured on the server."
        )
    try:
        r = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"access_token": access_token},
            timeout=10,
        )
    except requests.RequestException:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not reach Google to verify sign-in.")
    if r.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google sign-in token.")

    info = r.json()
    if info.get("aud") not in allowed and info.get("azp") not in allowed:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token was not issued for this application.")

    email = normalize_email(info.get("email"))
    if not email or str(info.get("email_verified")).lower() != "true":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your Google account email is not verified.")

    name = None
    try:
        ui = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if ui.status_code == 200:
            name = ui.json().get("name")
    except requests.RequestException:
        pass
    return email, (name or email.split("@")[0])

@app.post("/api/auth/google", response_model=schemas.UserResponse)
def login_with_google(google_data: schemas.GoogleUserLogin, db: Session = Depends(get_db)):
    if google_data.access_token:
        email, name = verify_google_access_token(google_data.access_token)
    elif ALLOW_MOCK_GOOGLE_LOGIN and google_data.email:
        email = normalize_email(google_data.email)
        name = (google_data.name or "").strip() or email.split("@")[0]
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A Google access token is required.")

    user = get_user_by_email(db, email)
    if not user:
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(secrets.token_hex(16)),
            phone="0000000000",
            role="customer",
            is_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.is_verified is False:
        # Google has just proven ownership of this mailbox. Mark the account verified and
        # invalidate any password chosen by whoever started the (never verified) registration.
        user.is_verified = True
        user.verification_code = None
        user.verification_code_expires_at = None
        user.password_hash = hash_password(secrets.token_hex(16))
        db.commit()
        db.refresh(user)

    user.access_token = create_access_token(user.id, user.role)
    return user


@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    token = create_access_token(user.id, user.role)
    user.access_token = token
    return user

# === Service Category Routes ===

@app.get("/api/services", response_model=List[schemas.ServiceCategoryResponse])
def get_service_categories(db: Session = Depends(get_db)):
    return db.query(ServiceCategory).all()

# === Partner Profile Routes ===

@app.get("/api/partners", response_model=List[schemas.UserResponse])
def get_partners(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User).filter(User.role == "partner", User.is_verified.isnot(False))
    if category:
        query = query.join(PartnerProfile).filter(PartnerProfile.service_category == category)
    return query.all()

@app.put("/api/partner/profile", response_model=schemas.PartnerProfileResponse)
def update_partner_profile(
    profile_data: schemas.PartnerProfileUpdate, 
    user_id: int = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner profile not found"
        )
    
    if profile_data.service_category is not None:
        profile.service_category = profile_data.service_category
    if profile_data.hourly_rate is not None:
        profile.hourly_rate = profile_data.hourly_rate
    if profile_data.availability_status is not None:
        profile.availability_status = profile_data.availability_status
    if profile_data.bio is not None:
        profile.bio = profile_data.bio
        
    db.commit()
    db.refresh(profile)
    return profile

@app.put("/api/users/me", response_model=schemas.UserResponse)
def update_current_user_profile(
    user_update: schemas.UserUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_update.name is not None and user_update.name.strip():
        user.name = user_update.name.strip()
    if user_update.phone is not None and user_update.phone.strip():
        user.phone = user_update.phone.strip()
    if user_update.address is not None and user_update.address.strip():
        user.address = user_update.address.strip()
        
    db.commit()
    db.refresh(user)
    return user

@app.put("/api/partner/location")

def update_partner_location(
    loc_data: schemas.PartnerLocationUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only service partners can update location"
        )
    user.latitude = loc_data.latitude
    user.longitude = loc_data.longitude
    db.commit()
    return {"message": "Location updated successfully"}

DISPATCH_TIMEOUT_SECONDS = int(os.environ.get("DISPATCH_TIMEOUT_SECONDS", "300"))



def check_and_expire_bookings(db: Session):
    now = datetime.utcnow()
    requested_bookings = db.query(Booking).filter(Booking.status == "requested").all()
    expired_count = 0
    for booking in requested_bookings:
        elapsed = (now - booking.created_at).total_seconds()
        if elapsed > DISPATCH_TIMEOUT_SECONDS:
            booking.status = "cancelled"
            expired_count += 1
    if expired_count > 0:
        db.commit()

# === Booking Routes ===

@app.post("/api/bookings", response_model=schemas.BookingResponse)
def create_booking(
    booking_data: schemas.BookingCreate, 
    background_tasks: BackgroundTasks,
    customer_id: int = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    ALLOWED_MUMBAI_AREAS = {
        "Mumbai",
        "Mumbai Suburban",
        "Navi Mumbai",
        "Thane"
    }

    
    if not booking_data.area_name or booking_data.area_name not in ALLOWED_MUMBAI_AREAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service area must be a valid region in Mumbai, Thane, or Navi Mumbai"
        )
        
    address_lower = (booking_data.address or "").lower()
    if not any(city in address_lower for city in ["mumbai", "thane", "navi mumbai"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doorstep address must be located in Mumbai, Thane, or Navi Mumbai"
        )

    # Validate pincode format and region
    pincode = booking_data.pincode
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pincode must be exactly 6 digits"
        )
        
    if not (pincode.startswith("400") or pincode.startswith("401") or pincode.startswith("421")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service is only available in Mumbai, Thane, or Navi Mumbai regions matching valid local pincodes"
        )

    otp_code = str(random.randint(100000, 999999))
    new_booking = Booking(
        customer_id=customer_id,
        partner_id=None,
        service_category=booking_data.service_category,
        booking_date=booking_data.booking_date,
        time_slot=booking_data.time_slot,
        details=booking_data.details,
        price=booking_data.price,
        status="requested",
        address=booking_data.address,
        payment_method=booking_data.payment_method,
        payment_status="pending",
        otp=otp_code,
        latitude=booking_data.latitude,
        longitude=booking_data.longitude,
        area_name=booking_data.area_name,
        pincode=booking_data.pincode
    )
    
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # Send booking confirmation email with Work OTP in background thread
    customer = db.query(User).filter(User.id == customer_id).first()
    if customer and customer.email:
        background_tasks.add_task(
            send_booking_confirmation_email,
            customer.email,
            customer.name,
            new_booking.service_category,
            new_booking.booking_date,
            new_booking.time_slot,
            otp_code
        )

    # Emit real-time WebSocket events for instant job broadcast to partners
    b_dict = {
        "id": new_booking.id,
        "service_category": new_booking.service_category,
        "booking_date": new_booking.booking_date,
        "time_slot": new_booking.time_slot,
        "details": new_booking.details,
        "price": new_booking.price,
        "status": new_booking.status,
        "address": new_booking.address,
        "created_at": new_booking.created_at.isoformat() if new_booking.created_at else None,
        "area_name": new_booking.area_name
    }
    emit_realtime_event("new_booking_broadcast", b_dict, room="partners")
    emit_realtime_event("booking_created", b_dict, room=f"user_{customer_id}")

    return new_booking



@app.post("/api/bookings/{booking_id}/order")
def create_razorpay_order(
    booking_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.customer_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this booking")
        
    amount_paise = int(booking.price * 100)
    
    if RAZORPAY_KEY_ID == "rzp_test_dummy_key_id":
        mock_order_id = f"order_mock_{booking_id}_{random.randint(1000, 9999)}"
        booking.razorpay_order_id = mock_order_id
        db.commit()
        return {
            "order_id": mock_order_id,
            "amount": amount_paise,
            "key_id": RAZORPAY_KEY_ID
        }
        
    try:
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"receipt_booking_{booking_id}",
            "payment_capture": 1
        }
        order = razorpay_client.order.create(data=order_data)
        booking.razorpay_order_id = order["id"]
        db.commit()
        return {
            "order_id": order["id"],
            "amount": amount_paise,
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Razorpay order creation failed: {str(e)}")

@app.post("/api/bookings/{booking_id}/verify-payment")
def verify_razorpay_payment(
    booking_id: int,
    verification: schemas.RazorpayVerification,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.customer_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this booking")
        
    if RAZORPAY_KEY_ID == "rzp_test_dummy_key_id":
        if verification.razorpay_order_id != booking.razorpay_order_id:
            raise HTTPException(status_code=400, detail="Invalid order ID signature")
        booking.payment_status = "completed"
        booking.razorpay_payment_id = verification.razorpay_payment_id
        booking.razorpay_signature = verification.razorpay_signature
        db.commit()
        return {"status": "success", "message": "Payment verified (mocked)"}
        
    try:
        param_dict = {
            'razorpay_order_id': verification.razorpay_order_id,
            'razorpay_payment_id': verification.razorpay_payment_id,
            'razorpay_signature': verification.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(param_dict)
        
        booking.payment_status = "completed"
        booking.razorpay_payment_id = verification.razorpay_payment_id
        booking.razorpay_signature = verification.razorpay_signature
        db.commit()
        return {"status": "success", "message": "Payment verified successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment signature verification failed: {str(e)}")

@app.get("/api/bookings", response_model=List[schemas.BookingResponse])
def get_bookings(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    check_and_expire_bookings(db)
    user = db.query(User).filter(User.id == user_id).first()
    if user.role == "partner":
        bookings = db.query(Booking).filter(Booking.partner_id == user_id).order_by(Booking.id.desc()).all()
        result = []
        for b in bookings:
            pydantic_b = schemas.BookingResponse.model_validate(b)
            pydantic_b.otp = None
            result.append(pydantic_b)
        return result
    else:
        return db.query(Booking).filter(Booking.customer_id == user_id).order_by(Booking.id.desc()).all()

@app.get("/api/partner/incoming-bookings", response_model=List[schemas.BookingResponse])
def get_incoming_bookings_for_partner(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    check_and_expire_bookings(db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only service partners can view incoming jobs"
        )

    partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user_id).first()
    if not partner_profile:
        partner_profile = PartnerProfile(
            user_id=user_id,
            service_category="Electrician",
            hourly_rate=350.0,
            availability_status=True,
            rating=4.9,
            completed_jobs=0
        )
        db.add(partner_profile)
        db.commit()
        db.refresh(partner_profile)

    # Partner is automatically Online whenever logged in
    if not partner_profile.availability_status:
        partner_profile.availability_status = True
        db.commit()


        
    partner_user = db.query(User).filter(User.id == user_id).first()
    
    # Get declined booking IDs
    declined_ids = [d.booking_id for d in db.query(PartnerDeclinedBooking).filter(PartnerDeclinedBooking.partner_id == user_id).all()]
    
    # Return all requested bookings matching partner's service category (category-wide broadcasting)
    bookings = db.query(Booking).filter(
        Booking.service_category == partner_profile.service_category,
        Booking.status == "requested"
    ).order_by(Booking.id.desc()).all()
    
    result = []
    for b in bookings:
        if b.id in declined_ids:
            continue
        
        pydantic_b = schemas.BookingResponse.model_validate(b)
        pydantic_b.otp = None
        result.append(pydantic_b)
            
    return result

@app.post("/api/bookings/{booking_id}/decline")
def decline_booking(booking_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user_id).first()
    if not partner_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only service partners can decline bookings"
        )
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.status != "requested":
        raise HTTPException(status_code=400, detail="Can only decline active requested bookings")
        
    # Add to declined table if not already declined
    existing = db.query(PartnerDeclinedBooking).filter(
        PartnerDeclinedBooking.partner_id == user_id,
        PartnerDeclinedBooking.booking_id == booking_id
    ).first()
    
    if not existing:
        declined_record = PartnerDeclinedBooking(partner_id=user_id, booking_id=booking_id)
        db.add(declined_record)
        db.commit()
        
    return {"detail": "Booking request declined successfully"}

@app.put("/api/bookings/{booking_id}/status", response_model=schemas.BookingResponse)
def update_booking_status(
    booking_id: int, 
    new_status: str, 
    otp: Optional[str] = None,
    user_id: int = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    user = db.query(User).filter(User.id == user_id).first()
    
    # Partner Accepting a requested booking
    if new_status == "accepted" and user.role == "partner":
        if booking.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This booking request has already been accepted by another service provider."
            )
        elif booking.status != "requested":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This booking request is no longer available."
            )
        booking.partner_id = user_id
        booking.status = "accepted"
        booking.accepted_at = datetime.utcnow()
    # General status progressions by assigned partner
    elif user.role == "partner" and booking.partner_id == user_id:
        if new_status == "on_the_way":
            booking.status = new_status
        elif new_status == "in_progress":
            if not otp:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification OTP is required to start work."
                )
            if booking.otp and otp != booking.otp:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification OTP. Please ask the customer for the correct OTP."
                )
            booking.status = new_status
        elif new_status == "completed":
            booking.status = "completed"
            booking.payment_status = "completed"  # Cash collections or UPI matches complete
            # Increment partner's completed jobs
            partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user_id).first()
            if partner_profile:
                partner_profile.completed_jobs += 1
    # Customer cancels
    elif user.role == "customer" and booking.customer_id == user_id:
        if new_status == "cancelled" and booking.status in ["requested", "accepted"]:
            booking.status = "cancelled"
        else:
            raise HTTPException(status_code=400, detail="Cannot cancel booking in current state")
    else:
        raise HTTPException(status_code=403, detail="Unauthorized state change request")

    db.commit()
    db.refresh(booking)
    
    # Emit real-time WebSocket event to customer and partner rooms for zero latency
    socket_payload = {
        "booking_id": booking.id,
        "status": booking.status,
        "partner_id": booking.partner_id,
        "otp": booking.otp
    }
    emit_realtime_event("booking_updated", socket_payload, room=f"user_{booking.customer_id}")
    emit_realtime_event("otp_received", {"booking_id": booking.id, "otp": booking.otp}, room=f"user_{booking.customer_id}")
    if booking.partner_id:
        emit_realtime_event("booking_updated", socket_payload, room=f"user_{booking.partner_id}")

    pydantic_booking = schemas.BookingResponse.model_validate(booking)
    if user.role == "partner":
        pydantic_booking.otp = None
    return pydantic_booking


# === Review Routes ===

@app.post("/api/reviews", response_model=schemas.ReviewResponse)
def submit_review(
    review_data: schemas.ReviewCreate, 
    customer_id: int = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(
        Booking.id == review_data.booking_id,
        Booking.customer_id == customer_id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or not owned by customer")
    if booking.status != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    # Check if review already exists
    existing_review = db.query(Review).filter(Review.booking_id == review_data.booking_id).first()
    if existing_review:
        raise HTTPException(status_code=400, detail="Review already submitted for this booking")

    new_review = Review(
        booking_id=review_data.booking_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    # Re-calculate partner's average rating
    if booking.partner_id:
        partner_id = booking.partner_id
        all_partner_bookings = db.query(Booking).filter(
            Booking.partner_id == partner_id,
            Booking.status == "completed"
        ).all()
        
        booking_ids = [b.id for b in all_partner_bookings]
        all_reviews = db.query(Review).filter(Review.booking_id.in_(booking_ids)).all()
        
        if all_reviews:
            avg_rating = sum(r.rating for r in all_reviews) / len(all_reviews)
            partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == partner_id).first()
            if partner_profile:
                partner_profile.rating = round(avg_rating, 2)
                db.commit()

    return new_review

# === File Upload Attachment Routes ===

@app.post("/api/bookings/{booking_id}/upload")
async def upload_booking_attachment(
    booking_id: int,
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.customer_id == user_id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or unauthorized")
        
    all_files = []
    if file:
        all_files.append(file)
    if files:
        all_files.extend(files)
        
    if not all_files:
        raise HTTPException(status_code=400, detail="No files uploaded")
        
    saved_filenames = []
    for f in all_files:
        file_ext = os.path.splitext(f.filename)[1].lower()
        if file_ext not in [".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mov", ".avi", ".mkv", ".webm"]:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {f.filename}")
            
        filename = f"booking_{booking_id}_{int(datetime.utcnow().timestamp())}_{random.randint(1000, 9999)}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        try:
            with open(file_path, "wb") as buffer:
                content = await f.read()
                buffer.write(content)
            saved_filenames.append(filename)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
            
    if saved_filenames:
        if booking.attachment_path:
            booking.attachment_path = f"{booking.attachment_path},{','.join(saved_filenames)}"
        else:
            booking.attachment_path = ",".join(saved_filenames)
        db.commit()
        db.refresh(booking)
        
    return {
        "filename": saved_filenames[0] if saved_filenames else None,
        "filenames": saved_filenames,
        "status": "success"
    }

# === Chat Messaging Routes ===

@app.get("/api/bookings/{booking_id}/messages", response_model=List[schemas.ChatMessageResponse])
def get_booking_messages(
    booking_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    if booking.customer_id != user_id and booking.partner_id != user_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized access to chat")
        
    messages = db.query(ChatMessage).filter(ChatMessage.booking_id == booking_id).order_by(ChatMessage.timestamp.asc()).all()
    
    # Populate sender names dynamically for client view
    response_list = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        response_list.append(schemas.ChatMessageResponse(
            id=m.id,
            booking_id=m.booking_id,
            sender_id=m.sender_id,
            message_text=m.message_text,
            timestamp=m.timestamp,
            sender_name=sender.name if sender else "Unknown"
        ))
    return response_list

@app.post("/api/bookings/{booking_id}/messages", response_model=schemas.ChatMessageResponse)
def send_booking_message(
    booking_id: int,
    msg_data: schemas.ChatMessageCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    if booking.customer_id != user_id and booking.partner_id != user_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized access to chat")
        
    new_msg = ChatMessage(
        booking_id=booking_id,
        sender_id=user_id,
        message_text=msg_data.message_text
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    sender = db.query(User).filter(User.id == user_id).first()
    return schemas.ChatMessageResponse(
        id=new_msg.id,
        booking_id=new_msg.booking_id,
        sender_id=new_msg.sender_id,
        message_text=new_msg.message_text,
        timestamp=new_msg.timestamp,
        sender_name=sender.name if sender else "Unknown"
    )

# === Admin Console Routes ===

@app.get("/api/admin/stats", response_model=schemas.AdminStatsResponse)
def get_admin_stats(admin_id: int = Depends(get_current_admin_id), db: Session = Depends(get_db)):
    total_bookings = db.query(Booking).count()
    total_customers = db.query(User).filter(User.role == "customer").count()
    total_partners_online = db.query(PartnerProfile).filter(PartnerProfile.availability_status == True).count()
    total_partners_offline = db.query(PartnerProfile).filter(PartnerProfile.availability_status == False).count()
    
    # Calculate revenue
    completed_bookings = db.query(Booking).filter(Booking.status == "completed").all()
    total_revenue = sum(b.price for b in completed_bookings)
    
    # Category breakdowns
    categories = db.query(ServiceCategory).all()
    category_breakdown = []
    for cat in categories:
        count = db.query(Booking).filter(Booking.service_category == cat.name).count()
        category_breakdown.append(schemas.CategoryCount(name=cat.name, count=count))
        
    # Dispatch system specific metrics
    total_requested = db.query(Booking).filter(Booking.status == "requested").count()
    total_assigned = db.query(Booking).filter(Booking.status.in_(["accepted", "on_the_way", "in_progress", "completed"])).count()
    total_cancelled = db.query(Booking).filter(Booking.status == "cancelled").count()
    
    # Calculate average assignment time
    assigned_bookings = db.query(Booking).filter(
        Booking.accepted_at.isnot(None),
        Booking.created_at.isnot(None)
    ).all()
    
    if assigned_bookings:
        total_time = sum((b.accepted_at - b.created_at).total_seconds() for b in assigned_bookings)
        avg_assignment_time = total_time / len(assigned_bookings)
    else:
        avg_assignment_time = 0.0
        
    return schemas.AdminStatsResponse(
        total_bookings=total_bookings,
        total_customers=total_customers,
        total_partners_online=total_partners_online,
        total_partners_offline=total_partners_offline,
        total_revenue=total_revenue,
        category_breakdown=category_breakdown,
        total_requested_bookings=total_requested,
        total_assigned_bookings=total_assigned,
        total_cancelled_bookings=total_cancelled,
        average_assignment_time_seconds=avg_assignment_time
    )

@app.get("/api/admin/users", response_model=List[schemas.UserResponse])
def get_admin_users(admin_id: int = Depends(get_current_admin_id), db: Session = Depends(get_db)):
    return db.query(User).all()

@app.get("/api/admin/bookings", response_model=List[schemas.BookingResponse])
def get_admin_bookings(admin_id: int = Depends(get_current_admin_id), db: Session = Depends(get_db)):
    return db.query(Booking).order_by(Booking.id.desc()).all()

@app.post("/api/admin/services", response_model=schemas.ServiceCategoryResponse)
def create_service_category(
    cat_data: schemas.ServiceCategoryCreate,
    admin_id: int = Depends(get_current_admin_id),
    db: Session = Depends(get_db)
):
    # Check if category name already exists
    existing = db.query(ServiceCategory).filter(ServiceCategory.name == cat_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Service category already exists")
        
    new_cat = ServiceCategory(
        name=cat_data.name,
        icon_key=cat_data.icon_key,
        description=cat_data.description,
        base_price=cat_data.base_price
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@app.put("/api/admin/services/{service_id}", response_model=schemas.ServiceCategoryResponse)
def update_service_category(
    service_id: int,
    cat_data: schemas.ServiceCategoryUpdate,
    admin_id: int = Depends(get_current_admin_id),
    db: Session = Depends(get_db)
):
    cat = db.query(ServiceCategory).filter(ServiceCategory.id == service_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Service category not found")
        
    if cat_data.name is not None:
        cat.name = cat_data.name
    if cat_data.icon_key is not None:
        cat.icon_key = cat_data.icon_key
    if cat_data.description is not None:
        cat.description = cat_data.description
    if cat_data.base_price is not None:
        cat.base_price = cat_data.base_price
        
    db.commit()
    db.refresh(cat)
    return cat

@app.delete("/api/admin/services/{service_id}")
def delete_service_category(
    service_id: int,
    admin_id: int = Depends(get_current_admin_id),
    db: Session = Depends(get_db)
):
    cat = db.query(ServiceCategory).filter(ServiceCategory.id == service_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Service category not found")
        
    db.delete(cat)
    db.commit()
    return {"message": "Service category deleted successfully"}

@app.post("/api/admin/clean-db")
def clean_database(db: Session = Depends(get_db)):
    db.query(ChatMessage).delete()
    db.query(Review).delete()
    db.query(PartnerDeclinedBooking).delete()
    db.query(Booking).delete()
    db.commit()

    TEST_EMAILS = {"user@purakam.in", "partner@purakam.in", "acservice@purakam.in"}
    non_test_users = db.query(User).filter(User.email.notin_(TEST_EMAILS)).all()
    for u in non_test_users:
        if u.partner_profile:
            db.delete(u.partner_profile)
        db.delete(u)
    db.commit()

    cust = db.query(User).filter(User.email == "user@purakam.in").first()
    if not cust:
        cust = User(
            name="Rahul Sharma",
            email="user@purakam.in",
            password_hash=hash_password("password123"),
            phone="9876543210",
            role="customer",
            address="Bandra West, Mumbai",
            is_verified=True
        )
        db.add(cust)
        db.commit()

    part1 = db.query(User).filter(User.email == "partner@purakam.in").first()
    if not part1:
        part1 = User(
            name="Rajesh Kumar (Electrician)",
            email="partner@purakam.in",
            password_hash=hash_password("password123"),
            phone="9876543211",
            role="partner",
            address="Khar West, Mumbai",
            is_verified=True
        )
        db.add(part1)
        db.commit()

    p1_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == part1.id).first()
    if not p1_profile:
        p1_profile = PartnerProfile(
            user_id=part1.id,
            service_category="Electrician",
            hourly_rate=350.0,
            experience_years=3,
            availability_status=True,
            rating=4.9,
            completed_jobs=0,
            aadhar_card="123456789012",
            pan_card="ABCDE1234F"
        )
        db.add(p1_profile)
        db.commit()

    part2 = db.query(User).filter(User.email == "acservice@purakam.in").first()
    if not part2:
        part2 = User(
            name="Amit Verma (AC Repair)",
            email="acservice@purakam.in",
            password_hash=hash_password("password123"),
            phone="9876543212",
            role="partner",
            address="Andheri West, Mumbai",
            is_verified=True
        )
        db.add(part2)
        db.commit()

    p2_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == part2.id).first()
    if not p2_profile:
        p2_profile = PartnerProfile(
            user_id=part2.id,
            service_category="AC Repair",
            hourly_rate=450.0,
            experience_years=4,
            availability_status=True,
            rating=4.8,
            completed_jobs=0,
            aadhar_card="987654321098",
            pan_card="XYZDE9876F"
        )
        db.add(p2_profile)
        db.commit()

    remaining_users = db.query(User).count()
    return {"message": f"Database cleaned successfully! Remaining test users: {remaining_users}"}


