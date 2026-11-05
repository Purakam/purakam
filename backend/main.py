import os
import random
import secrets
import hmac
import json
import hashlib
import razorpay
import requests
from fastapi import FastAPI, Depends, HTTPException, status, Header, File, UploadFile, BackgroundTasks, Request
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
    get_db, SessionLocal, User, PartnerProfile, ServiceCategory, Booking, Review, ChatMessage,
    PartnerDeclinedBooking, hash_password, verify_password, password_needs_rehash,
)

import math
from jose import jwt, JWTError
from .ratelimit import RateLimiter

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
#
# IMPORTANT: Socket.IO is combined with the FastAPI app at the very bottom of
# this file (search for "fastapi_app = app"), not mounted with app.mount()
# here. python-socketio's own path matching inspects the raw ASGI `path`,
# which newer versions of Starlette no longer rewrite on app.mount() (they use
# `root_path` instead) - so mounting it the old way made EVERY WebSocket
# connection, including legitimate ones from our own frontend, get
# misrouted into python-engineio's 404 handler, which replies with an
# invalid (non-WebSocket) ASGI message and crashes the server. Wrapping
# FastAPI inside Socket.IO's ASGI app instead avoids the mismatch entirely:
# see the bottom of this file for exactly how `app` gets reassigned.
#


@sio.event
async def connect(sid, environ, auth=None):
    # A valid access token is required to connect at all: nothing in this app
    # has a legitimate reason for an anonymous realtime connection, and
    # requiring auth here (rather than only when joining a room) means a
    # socket can never exist in a state where it's connected but unverified.
    # Returning False from a Socket.IO connect handler rejects the connection.
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token and "QUERY_STRING" in environ:
        from urllib.parse import parse_qs
        qs = parse_qs(environ.get("QUERY_STRING", ""))
        if "token" in qs:
            token = qs["token"][0]

    if not token:
        return False

    payload = verify_token(token)
    if not payload or not payload.get("user_id"):
        return False

    user_id = payload["user_id"]
    role = payload.get("role")

    # Confirm the user still exists and the token's role claim hasn't gone
    # stale (e.g. an admin demoted after the token was issued).
    category = None
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.is_verified is False:
            return False
        role = user.role
        if role == "partner":
            profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user_id).first()
            category = profile.service_category if profile else None
    finally:
        db.close()

    await _capture_event_loop()  # also captured at startup; this is a safety net
    await sio.save_session(sid, {"user_id": user_id, "role": role})
    await sio.enter_room(sid, f"user_{user_id}")
    if category:
        await sio.enter_room(sid, partner_room(category))

@sio.event
async def join_booking_room(sid, data):
    # connect() now rejects any unauthenticated socket, so a session always
    # exists here - but check defensively rather than assume.
    session = await sio.get_session(sid)
    if not session or not session.get("user_id"):
        return {"ok": False, "error": "Not authenticated"}

    if not isinstance(data, dict) or not data.get("booking_id"):
        return {"ok": False, "error": "booking_id is required"}

    try:
        booking_id = int(data["booking_id"])
    except (TypeError, ValueError):
        return {"ok": False, "error": "Invalid booking_id"}

    user_id = session["user_id"]
    role = session.get("role")

    db = SessionLocal()
    try:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            return {"ok": False, "error": "Booking not found"}
        # Only the booking's own customer or assigned partner may listen to
        # its room (chat, live tracking, status updates); admins can too, for
        # support/oversight. Anyone else - including a partner who merely
        # declined or never saw this booking - is refused, which is exactly
        # the gap that let any connected client listen to any booking by
        # guessing its (sequential, easily-enumerable) id.
        if booking.customer_id != user_id and booking.partner_id != user_id and role != "admin":
            return {"ok": False, "error": "Not authorized for this booking"}
    finally:
        db.close()

    await sio.enter_room(sid, f"booking_{booking_id}")
    return {"ok": True}

@sio.event
async def disconnect(sid):
    pass

# The event loop the Socket.IO server runs on, captured at startup (see the
# on_startup hook where `app` is assembled at the bottom of this file). Route
# handlers here are plain `def` functions, which FastAPI runs in worker
# threads that have no event loop of their own - so they can't just call
# asyncio.get_event_loop() and emit. Hand each emit over to the server's real
# loop instead, which is the thread-safe way to do it.
_main_loop = None

async def _capture_event_loop():
    global _main_loop
    _main_loop = asyncio.get_running_loop()

def _log_emit_failure(future):
    if future.cancelled():
        return
    try:
        future.result()
    except Exception as e:
        print(f"Socket emit failed: {e}")

def emit_realtime_event(event_name: str, payload: dict, room: str = None):
    """Emit a socket event from a sync route handler to connected web & mobile apps."""
    loop = _main_loop
    if loop is None or loop.is_closed():
        # Server hasn't started its loop yet, so no socket can be connected.
        return
    try:
        future = asyncio.run_coroutine_threadsafe(sio.emit(event_name, payload, room=room), loop)
        future.add_done_callback(_log_emit_failure)
    except Exception as e:
        print(f"Socket emit note: {e}")

def partner_room(category: str) -> str:
    """Room for partners of one service category, so a new job is only
    announced to partners who could actually take it. (Membership is set when
    a partner connects, so a category change applies on their next connection.)"""
    return f"partners:{(category or '').strip().lower()}"

def notify_booking_changed(booking):
    """Tell both people on a booking that it changed. Only the customer's copy
    carries the work OTP - the partner must get it from the customer, so it must
    never reach the partner's socket."""
    base = {
        "booking_id": booking.id,
        "status": booking.status,
        "partner_id": booking.partner_id,
        "payment_status": booking.payment_status,
    }
    emit_realtime_event("booking_updated", {**base, "otp": booking.otp}, room=f"user_{booking.customer_id}")
    if booking.partner_id:
        emit_realtime_event("booking_updated", base, room=f"user_{booking.partner_id}")



# Setup upload directory
UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Upload limits. A request is rejected up front if it declares a body larger
# than MAX_UPLOAD_REQUEST_BYTES, and each file is also counted as it is read,
# so neither a lying client nor a missing Content-Length can push the server
# into holding or storing something huge.
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 50 * 1024 * 1024
MAX_FILES_PER_REQUEST = 8
MAX_ATTACHMENTS_PER_BOOKING = 15
MAX_UPLOAD_REQUEST_BYTES = 120 * 1024 * 1024

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

def detect_media_extensions(header: bytes):
    """What a file really is, judged by its first bytes rather than its name.
    Returns the set of extensions that legitimately hold that format, or None
    if it isn't an allowed image/video at all."""
    if header.startswith(b"\xff\xd8\xff"):
        return {".jpg", ".jpeg"}
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return {".png"}
    if header.startswith((b"GIF87a", b"GIF89a")):
        return {".gif"}
    if header[4:8] in (b"ftyp", b"moov", b"mdat", b"wide", b"free", b"skip"):
        return {".mp4", ".mov"}
    if header.startswith(b"RIFF") and header[8:12] == b"AVI ":
        return {".avi"}
    if header.startswith(b"\x1a\x45\xdf\xa3"):
        return {".mkv", ".webm"}
    return None

@app.middleware("http")
async def security_headers_and_upload_cap(request: Request, call_next):
    # Turn away an oversized upload before its body is read at all.
    if request.method == "POST" and request.url.path.startswith("/api/bookings/") and request.url.path.endswith("/upload"):
        declared = request.headers.get("content-length")
        if declared and declared.isdigit() and int(declared) > MAX_UPLOAD_REQUEST_BYTES:
            return JSONResponse(status_code=413, content={"detail": "Upload is too large."})
    response = await call_next(request)
    # Browsers must trust the declared type of what we serve (notably uploads),
    # never guess it from the content.
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

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

# --- Brute-force protection ------------------------------------------------
# Limits are keyed on the ACCOUNT (the email), not on the caller's IP address:
# the web app reaches this API through its own Flask server, so every web user
# arrives from the same address, and a forwarded client IP can be faked by the
# caller - an IP-based limit here would either lock everyone out together or be
# trivial to dodge. Per-account limits behave the same for web and mobile and
# can't be spoofed.
rate_limiter = RateLimiter()
LOGIN_MAX_FAILURES = 8
LOGIN_WINDOW_SECONDS = 15 * 60
REGISTER_MAX_PER_EMAIL = 5          # sign-up attempts per email per hour
REGISTER_WINDOW_SECONDS = 60 * 60
CODE_ISSUE_MAX = 5                  # emailed codes per email per hour, per purpose
CODE_ISSUE_WINDOW_SECONDS = 60 * 60

# Checked against when the email doesn't exist, so "no such account" costs the
# same time as "wrong password" and response timing can't reveal which emails
# are registered.
_DUMMY_PASSWORD_HASH = hash_password("not-a-real-password")

def too_many_requests(wait_seconds: int, message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=message,
        headers={"Retry-After": str(wait_seconds)},
    )

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
    # Hourly cap on emailed codes: without it, requesting a fresh code (which
    # resets the guess counter) in a loop would give unlimited guesses over time.
    if not force and rate_limiter.consume(f"code:verify:{normalize_email(user.email)}", CODE_ISSUE_MAX, CODE_ISSUE_WINDOW_SECONDS):
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

    wait = rate_limiter.consume(f"register:{email}", REGISTER_MAX_PER_EMAIL, REGISTER_WINDOW_SECONDS)
    if wait:
        raise too_many_requests(wait, "Too many sign-up attempts for this email. Please try again later.")

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

    # Same answer whether or not a new code actually went out (it doesn't if one
    # was sent under a minute ago or the hourly cap is reached). A different
    # reply here would reveal which emails have a pending sign-up.
    issue_verification_code(user, db, background_tasks)
    return generic


# --- Forgot password -----------------------------------------------------
# Separate from the email-verification OTP above (different columns, different
# in-memory attempt counter) so that requesting a password reset can never
# interfere with a pending registration's verification code, or vice versa.
RESET_TTL_MINUTES = 15
RESET_RESEND_COOLDOWN_SECONDS = 60
RESET_MAX_ATTEMPTS = 5
_reset_failed_attempts: dict = {}

def issue_reset_code(user: User, db: Session, background_tasks: BackgroundTasks, force: bool = False) -> bool:
    """Create a fresh 6-digit password-reset code and email it in the background.

    Returns False (and does nothing) if a code was sent less than
    RESET_RESEND_COOLDOWN_SECONDS ago, unless force=True.
    """
    now = datetime.utcnow()
    if not force and user.reset_code and user.reset_code_expires_at:
        sent_at = user.reset_code_expires_at - timedelta(minutes=RESET_TTL_MINUTES)
        if (now - sent_at).total_seconds() < RESET_RESEND_COOLDOWN_SECONDS:
            return False
    if not force and rate_limiter.consume(f"code:reset:{normalize_email(user.email)}", CODE_ISSUE_MAX, CODE_ISSUE_WINDOW_SECONDS):
        return False

    code = generate_otp()
    user.reset_code = code
    user.reset_code_expires_at = now + timedelta(minutes=RESET_TTL_MINUTES)
    db.commit()
    _reset_failed_attempts.pop(user.id, None)
    background_tasks.add_task(send_email_otp, user.email, code)
    return True

@app.post("/api/auth/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Always the same response, whether or not the email is registered, so this
    # endpoint can't be used to discover which emails have accounts.
    generic = {"message": "If an account exists for this email, a password reset code has been sent."}

    user = get_user_by_email(db, req.email)
    # An unverified account has no usable password to "forget" yet (it should
    # finish email verification via /api/auth/resend-verification instead), so
    # it's treated the same as a non-existent email here.
    if not user or user.is_verified is not True:
        return generic

    # As above: identical reply whether or not a new code went out, so a
    # "please wait" can't be used to tell real accounts from unknown emails.
    issue_reset_code(user, db, background_tasks)
    return generic

@app.post("/api/auth/reset-password", response_model=schemas.UserResponse)
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, req.email)
    if not user or user.is_verified is not True:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code")

    if _reset_failed_attempts.get(user.id, 0) >= RESET_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a new code."
        )

    if (
        not user.reset_code
        or not user.reset_code_expires_at
        or datetime.utcnow() > user.reset_code_expires_at
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new code."
        )

    submitted = (req.code or "").strip()
    if not hmac.compare_digest(user.reset_code, submitted):
        _reset_failed_attempts[user.id] = _reset_failed_attempts.get(user.id, 0) + 1
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset code")

    # Code proven correct: set the new password and consume the code so it
    # can't be reused, but do NOT log the user in automatically - they should
    # confirm their new password actually works via a fresh login.
    user.password_hash = hash_password(req.new_password)
    user.reset_code = None
    user.reset_code_expires_at = None
    db.commit()
    db.refresh(user)
    _reset_failed_attempts.pop(user.id, None)
    # They've just proven they own the mailbox, so don't leave them locked out
    # of logging in with the password they just chose.
    rate_limiter.reset(f"login:{normalize_email(user.email)}")
    return user


@app.post("/api/auth/login", response_model=schemas.UserResponse)
def login(login_data: schemas.UserLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    login_key = f"login:{normalize_email(login_data.email)}"

    # Too many recent failures for this account: refuse outright, even for the
    # right password, so a guesser gets no signal while locked out.
    wait = rate_limiter.retry_after(login_key, LOGIN_MAX_FAILURES, LOGIN_WINDOW_SECONDS)
    if wait:
        minutes = max(1, -(-wait // 60))
        raise too_many_requests(
            wait,
            f"Too many failed login attempts. Please try again in {minutes} minute{'s' if minutes != 1 else ''}, or reset your password."
        )

    user = get_user_by_email(db, login_data.email)
    password_ok = verify_password(login_data.password, user.password_hash if user else _DUMMY_PASSWORD_HASH)
    if not user or not password_ok:
        rate_limiter.hit(login_key, LOGIN_WINDOW_SECONDS)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    rate_limiter.reset(login_key)

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

@app.get("/api/partners", response_model=List[schemas.PartnerListingResponse])
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

    # The price is computed here, server-side, and the client-submitted
    # `booking_data.price` is never read or trusted - a browser or app could
    # otherwise set it to anything. This mirrors exactly the formula the web
    # and mobile apps already use for their own on-screen estimate (base
    # price + 18% GST + a flat Rs49 platform fee), so the amount actually
    # charged matches what the person was shown; it just can no longer be
    # tampered with in transit.
    category = db.query(ServiceCategory).filter(ServiceCategory.name == booking_data.service_category).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service category"
        )
    PLATFORM_FEE = 49.0
    GST_RATE = 0.18
    computed_price = round(category.base_price + (category.base_price * GST_RATE) + PLATFORM_FEE, 2)

    otp_code = str(random.randint(100000, 999999))
    new_booking = Booking(
        customer_id=customer_id,
        partner_id=None,
        service_category=booking_data.service_category,
        booking_date=booking_data.booking_date,
        time_slot=booking_data.time_slot,
        details=booking_data.details,
        price=computed_price,
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
    emit_realtime_event("new_booking_broadcast", b_dict, room=partner_room(new_booking.service_category))
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

    # The mock path only exists for local development, where real Razorpay
    # keys usually aren't configured yet. In production (IS_PRODUCTION) it's
    # never reachable regardless of what RAZORPAY_KEY_ID happens to be set
    # to, so a misconfigured deployment fails loudly on a real order-creation
    # error instead of silently handing out fake "paid" bookings.
    if not IS_PRODUCTION and RAZORPAY_KEY_ID == "rzp_test_dummy_key_id":
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
        
    # Same production gate as order creation above: this bypass - which does
    # NOT cryptographically verify anything, only that the order id matches -
    # can never run outside local development. In production, every payment
    # is confirmed with a real HMAC-SHA256 signature check below, so a client
    # cannot mark its own booking "paid" by sending made-up values.
    if not IS_PRODUCTION and RAZORPAY_KEY_ID == "rzp_test_dummy_key_id":
        if verification.razorpay_order_id != booking.razorpay_order_id:
            raise HTTPException(status_code=400, detail="Invalid order ID signature")
        booking.payment_status = "completed"
        booking.razorpay_payment_id = verification.razorpay_payment_id
        booking.razorpay_signature = verification.razorpay_signature
        db.commit()
        notify_booking_changed(booking)
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
        notify_booking_changed(booking)
        return {"status": "success", "message": "Payment verified successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment signature verification failed: {str(e)}")


RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()

@app.post("/api/payments/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Server-to-server payment confirmation, called directly by Razorpay
    (never by the customer's browser or app), configured in the Razorpay
    dashboard under Settings -> Webhooks.

    This is the authoritative way a payment gets marked complete: unlike
    /verify-payment above, it doesn't depend on the customer's device
    successfully making one more request after paying (they might close the
    tab, lose signal, or the app might crash) - Razorpay's own servers call
    this directly once a payment is actually captured, so a completed
    payment is recorded even if the client-side confirmation never arrives.

    There's no JWT here (Razorpay's servers aren't a logged-in user); the
    HMAC-SHA256 signature below, computed over the exact raw request body
    using a secret only this server and Razorpay's dashboard know, is what
    authenticates the request instead.
    """
    if not RAZORPAY_WEBHOOK_SECRET:
        # Refuse rather than silently skip verification: an unconfigured
        # webhook secret must never be treated as "anything goes".
        raise HTTPException(status_code=503, detail="Webhook not configured")

    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    expected = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
    if not signature or not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event = payload.get("event")
    if event not in ("payment.captured", "order.paid"):
        # Razorpay sends many event types; anything we don't act on is
        # acknowledged (200) so Razorpay doesn't keep retrying it, but
        # otherwise ignored.
        return {"status": "ignored", "event": event}

    try:
        entity = payload["payload"]["payment"]["entity"]
        razorpay_order_id = entity["order_id"]
        razorpay_payment_id = entity["id"]
    except (KeyError, TypeError):
        raise HTTPException(status_code=400, detail="Unexpected webhook payload shape")

    booking = db.query(Booking).filter(Booking.razorpay_order_id == razorpay_order_id).first()
    if not booking:
        # Nothing on our side to update - acknowledge anyway so Razorpay
        # doesn't retry indefinitely for an order it created that we somehow
        # don't recognize.
        return {"status": "no_matching_booking"}

    if booking.payment_status != "completed":
        booking.payment_status = "completed"
        booking.razorpay_payment_id = razorpay_payment_id
        db.commit()
        notify_booking_changed(booking)

    return {"status": "ok"}


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

# new status -> the only current statuses it may be reached from
PARTNER_STATUS_TRANSITIONS = {
    "on_the_way": {"accepted"},
    "in_progress": {"accepted", "on_the_way"},
    "completed": {"in_progress"},
}

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
    
    previous_status = booking.status

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
    # General status progressions by assigned partner. A job can only move
    # forward one step at a time along accepted -> on_the_way -> in_progress
    # -> completed (both the web and mobile apps already work this way), so
    # a partner can't skip the customer's OTP by jumping straight to
    # "completed", or re-complete a finished job to inflate their job count.
    elif user.role == "partner" and booking.partner_id == user_id:
        allowed_from = PARTNER_STATUS_TRANSITIONS.get(new_status)
        if allowed_from is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status."
            )
        if booking.status not in allowed_from:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A booking that is '{booking.status}' cannot be moved to '{new_status}'."
            )

        if new_status == "on_the_way":
            booking.status = new_status
        elif new_status == "in_progress":
            if not otp:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification OTP is required to start work."
                )
            if booking.otp and not hmac.compare_digest(str(otp), str(booking.otp)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification OTP. Please ask the customer for the correct OTP."
                )
            booking.status = new_status
        elif new_status == "completed":
            if booking.payment_method == "UPI":
                # Online payments are confirmed by Razorpay (verify-payment or
                # the webhook), never by the partner. Completing a job must not
                # be a way to mark an unpaid online booking as paid.
                if booking.payment_status != "completed":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The customer's online payment has not been received yet."
                    )
            else:
                # Cash on delivery: the partner collecting the cash is the payment.
                booking.payment_status = "completed"
            booking.status = "completed"
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
    
    # Push the change to everyone it concerns, instantly.
    notify_booking_changed(booking)
    if new_status == "accepted":
        # The OTP only becomes relevant to the customer once someone is on the way.
        emit_realtime_event("job_accepted", {"booking_id": booking.id, "partner_id": booking.partner_id}, room=f"user_{booking.customer_id}")
        emit_realtime_event("otp_received", {"booking_id": booking.id, "otp": booking.otp}, room=f"user_{booking.customer_id}")
    if previous_status == "requested" and booking.status in ("accepted", "cancelled"):
        # Other partners in this category are still looking at it as an open job.
        emit_realtime_event("booking_unavailable", {"booking_id": booking.id}, room=partner_room(booking.service_category))

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
    if len(all_files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"You can upload at most {MAX_FILES_PER_REQUEST} files at a time.")

    existing = [x for x in (booking.attachment_path or "").split(",") if x]
    if len(existing) + len(all_files) > MAX_ATTACHMENTS_PER_BOOKING:
        raise HTTPException(status_code=400, detail=f"A booking can have at most {MAX_ATTACHMENTS_PER_BOOKING} attachments.")

    saved_filenames = []
    saved_paths = []

    def discard_saved():
        # All-or-nothing: if any file in the batch is refused, none are kept.
        for path in saved_paths:
            try:
                os.remove(path)
            except OSError:
                pass

    for f in all_files:
        original_name = f.filename or ""
        file_ext = os.path.splitext(original_name)[1].lower()
        if file_ext not in IMAGE_EXTENSIONS | VIDEO_EXTENSIONS:
            discard_saved()
            raise HTTPException(status_code=400, detail=f"Unsupported format: {original_name or 'unnamed file'}")

        max_bytes = MAX_IMAGE_BYTES if file_ext in IMAGE_EXTENSIONS else MAX_VIDEO_BYTES

        # Unguessable name: /uploads is served without a login, so the name
        # itself is what keeps one customer's photos from being found by
        # someone else (the old name was just booking id + timestamp).
        filename = f"booking_{booking_id}_{secrets.token_urlsafe(18)}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        written = 0
        header = b""
        try:
            with open(file_path, "wb") as buffer:
                saved_paths.append(file_path)
                while True:
                    chunk = await f.read(1024 * 1024)
                    if not chunk:
                        break
                    if len(header) < 16:
                        header = (header + chunk)[:16]
                    written += len(chunk)
                    if written > max_bytes:
                        break
                    buffer.write(chunk)
        except Exception as e:
            discard_saved()
            raise HTTPException(status_code=500, detail="Failed to save file")

        if written > max_bytes:
            discard_saved()
            raise HTTPException(status_code=413, detail=f"{original_name} is too large (max {max_bytes // (1024 * 1024)} MB).")

        allowed_for_content = detect_media_extensions(header)
        if not allowed_for_content or file_ext not in allowed_for_content:
            discard_saved()
            raise HTTPException(status_code=400, detail=f"{original_name} is not a valid image or video file.")

        saved_filenames.append(filename)

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
def clean_database(admin_id: int = Depends(get_current_admin_id), db: Session = Depends(get_db)):
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
            service_category="AC & Appliance Repair",
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


# === Combine Socket.IO with the FastAPI app ===========================
# All routes above are registered on the FastAPI `app` object as usual. Here,
# at the end of the module (after every route exists), `app` is reassigned to
# a Socket.IO ASGI app that wraps the FastAPI app as its fallback. uvicorn
# (via `uvicorn backend.main:app`) ends up serving this combined object.
#
# Why not app.mount("/ws", ...)? python-socketio inspects the raw ASGI `path`
# to decide whether a request belongs to it. Older Starlette versions rewrote
# `scope['path']` to strip a mount's prefix; current Starlette no longer does
# this (it uses `root_path` instead), so with app.mount() EVERY WebSocket
# connection - including a correct one from our own frontend - failed
# python-socketio's path check and fell into its 404 handler, which replies
# with an HTTP-type ASGI message during a WebSocket connection. Real ASGI
# servers correctly treat that as a protocol violation and crash, flooding
# the server log. Wrapping FastAPI as Socket.IO's `other_asgi_app` instead
# means Socket.IO sees the true, unmodified request path directly (no mount
# involved) and routes correctly; anything that isn't a Socket.IO request is
# forwarded to FastAPI unchanged, including WebSocket requests to any other
# path, which FastAPI/Starlette already close correctly on their own.
fastapi_app = app
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="ws/socket.io", on_startup=_capture_event_loop)