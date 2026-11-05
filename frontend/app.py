import os
import secrets
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv
from flask import Flask, render_template, redirect, url_for, request, session, flash, jsonify
import requests

# Load variables from a .env file at the repo root, if one exists - resolved from
# this file's own location so it works the same regardless of which folder
# `python frontend/app.py` is run from. Never overrides a variable already set
# in the real environment, so this has no effect at all on Render.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = Flask(__name__)

# Set FLASK_SECRET_KEY in the environment. In production a missing key falls back to a random
# per-process key (safe, but sessions are lost on restart / differ between workers).
_flask_secret = os.environ.get("FLASK_SECRET_KEY", "").strip()
if not _flask_secret:
    if os.environ.get("RENDER") or os.environ.get("APP_ENV", "").lower() == "production":
        _flask_secret = secrets.token_hex(32)
        print("WARNING: FLASK_SECRET_KEY is not set - using a temporary random key.")
    else:
        _flask_secret = "dev-only-insecure-session-key"
app.secret_key = _flask_secret

IS_PRODUCTION = bool(os.environ.get("RENDER")) or os.environ.get("APP_ENV", "").lower() == "production"

# The demo accounts that `python -m backend.seed` creates for local development.
# They're only offered on the login page outside production: there they don't
# exist (the seed skips them), and advertising logins on a live site is wrong
# in any case.
DEMO_ACCOUNTS = [
    {"label": "Customer", "email": "user@purakam.in", "password": "password123"},
    {"label": "Electrician (Rajesh)", "email": "partner@purakam.in", "password": "password123"},
    {"label": "AC & Appliance (Amit)", "email": "acservice@purakam.in", "password": "password123"},
]

# Mock Google sign-in (no real Google check) must never be reachable in production.
ALLOW_MOCK_GOOGLE_LOGIN = os.environ.get("ALLOW_MOCK_GOOGLE_LOGIN", "").strip().lower() in ("1", "true", "yes")

def safe_next(target):
    """Only allow same-site relative redirects (blocks open redirects via ?next=)."""
    if not target:
        return None
    parsed = urlparse(target)
    if parsed.scheme or parsed.netloc or not target.startswith("/") or target.startswith("//") or "\\" in target:
        return None
    return target

def api_error(response, default):
    """Extract a readable error message from a backend error response."""
    try:
        detail = response.json().get("detail", default)
    except Exception:
        return default
    if isinstance(detail, list):
        return "; ".join(str(d.get("msg", d)) if isinstance(d, dict) else str(d) for d in detail)
    return str(detail)

def start_session(user_data):
    session["user_id"] = user_data["id"]
    session["user_name"] = user_data["name"]
    session["user_email"] = user_data["email"]
    session["user_role"] = user_data["role"]
    session["user_address"] = user_data.get("address")
    session["auth_token"] = user_data.get("access_token")

def home_for_role(role):
    if role == "partner":
        return url_for("partner_dashboard")
    if role == "admin":
        return url_for("admin_dashboard")
    return url_for("dashboard")

BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://127.0.0.1:8000/api").strip()
if BACKEND_API_URL:
    if "://" not in BACKEND_API_URL and "." not in BACKEND_API_URL and "localhost" not in BACKEND_API_URL and "127.0.0.1" not in BACKEND_API_URL:
        BACKEND_API_URL = f"https://{BACKEND_API_URL}.onrender.com"
    if not BACKEND_API_URL.startswith("http://") and not BACKEND_API_URL.startswith("https://"):
        BACKEND_API_URL = f"https://{BACKEND_API_URL}"
    if not BACKEND_API_URL.endswith("/api"):
        BACKEND_API_URL = f"{BACKEND_API_URL.rstrip('/')}/api"



# Helper to get request headers for backend
def get_auth_headers():
    token = session.get("auth_token")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}

@app.context_processor
def inject_backend_url():
    base_url = BACKEND_API_URL.rsplit("/api", 1)[0]
    return {
        "BACKEND_API_URL": BACKEND_API_URL,
        "BACKEND_BASE_URL": base_url,
        "RAZORPAY_KEY_ID": os.environ.get("RAZORPAY_KEY_ID", "rzp_test_dummy_key_id")
    }

# === Web Routes ===

@app.route("/")
def index():
    # Fetch service categories from FastAPI
    categories = []
    try:
        r = requests.get(f"{BACKEND_API_URL}/services")
        if r.status_code == 200:
            categories = r.json()
    except Exception as e:
        print(f"Backend API error: {e}")
        
    return render_template("index.html", categories=categories)

@app.route("/services")
def services():
    category = request.args.get("category", "")
    categories = []
    partners = []
    
    try:
        # Get all categories for filter dropdown
        rc = requests.get(f"{BACKEND_API_URL}/services")
        if rc.status_code == 200:
            categories = rc.json()
            
        # Get partners in the category
        rp = requests.get(f"{BACKEND_API_URL}/partners", params={"category": category} if category else {})
        if rp.status_code == 200:
            partners = rp.json()
    except Exception as e:
        print(f"Backend API error: {e}")

    return render_template("services.html", categories=categories, selected_category=category, partners=partners)

@app.route("/book/<category_name>")
def book(category_name):
    if "user_id" not in session:
        flash("Please log in to book a service.", "warning")
        return redirect(url_for("login", next=request.path))
        
    if session.get("user_role") == "partner":
        flash("Partners cannot book services. Please log in with a customer account.", "danger")
        return redirect(url_for("index"))
        
    partner_id = request.args.get("partner_id")
    partner_name = ""
    
    # Get base price for this category
    base_price = 299.0
    try:
        r = requests.get(f"{BACKEND_API_URL}/services")
        if r.status_code == 200:
            for cat in r.json():
                if cat["name"] == category_name:
                    base_price = cat["base_price"]
                    break
                    
        if partner_id:
            rp = requests.get(f"{BACKEND_API_URL}/partners", params={"category": category_name})
            if rp.status_code == 200:
                for p in rp.json():
                    if str(p["id"]) == str(partner_id):
                          partner_name = p["name"]
                          break
    except Exception as e:
        print(f"Backend API error: {e}")

    return render_template(
        "book.html", 
        category_name=category_name, 
        base_price=base_price,
        partner_id=partner_id,
        partner_name=partner_name
    )

@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login"))
    if session.get("user_role") == "partner":
        return redirect(url_for("partner_dashboard"))
        
    bookings = []
    try:
        r = requests.get(f"{BACKEND_API_URL}/bookings", headers=get_auth_headers())
        if r.status_code == 200:
            bookings = r.json()
    except Exception as e:
        print(f"Error fetching bookings: {e}")
        
    return render_template("dashboard.html", bookings=bookings)
@app.route("/partner/dashboard")
def partner_dashboard():
    if "user_id" not in session:
        return redirect(url_for("login"))
    if session.get("user_role") != "partner":
        return redirect(url_for("dashboard"))
        
    bookings = []
    incoming_jobs = []
    partner_online_status = False
    try:
        ru = requests.get(f"{BACKEND_API_URL}/auth/me", headers=get_auth_headers())
        if ru.status_code == 200:
            user_info = ru.json()
            if user_info.get("partner_profile"):
                partner_online_status = user_info["partner_profile"].get("availability_status", False)

        r = requests.get(f"{BACKEND_API_URL}/bookings", headers=get_auth_headers())
        if r.status_code == 200:
            bookings = r.json()
            
        rj = requests.get(f"{BACKEND_API_URL}/partner/incoming-bookings", headers=get_auth_headers())
        if rj.status_code == 200:
            incoming_jobs = rj.json()
    except Exception as e:
        print(f"Error fetching partner data: {e}")
        
    return render_template(
        "partner.html", 
        bookings=bookings, 
        incoming_jobs=incoming_jobs, 
        partner_online_status=partner_online_status
    )

@app.route("/update-profile", methods=["POST"])
def update_profile():
    if "user_id" not in session:
        return redirect(url_for("login"))
        
    name = request.form.get("name")
    phone = request.form.get("phone")
    address = request.form.get("address")
    
    payload = {}
    if name: payload["name"] = name
    if phone: payload["phone"] = phone
    if address: payload["address"] = address
    
    try:
        headers = get_auth_headers()
        r = requests.put(f"{BACKEND_API_URL}/users/me", json=payload, headers=headers)
        if r.status_code == 200:
            user_data = r.json()
            session["user_name"] = user_data["name"]
            session["user_address"] = user_data.get("address")
            flash("Profile details updated successfully!", "success")
        else:
            flash(r.json().get("detail", "Failed to update profile"), "danger")
    except Exception as e:
        flash(f"Error updating profile: {e}", "danger")
        
    return redirect(url_for("dashboard"))

@app.route("/admin/dashboard")

def admin_dashboard():
    if "user_id" not in session:
        return redirect(url_for("login"))
    if session.get("user_role") != "admin":
        flash("Unauthorized access. Admin role required.", "danger")
        return redirect(url_for("index"))
        
    stats = {}
    users = []
    bookings = []
    categories = []
    
    try:
        headers = get_auth_headers()
        rs = requests.get(f"{BACKEND_API_URL}/admin/stats", headers=headers)
        if rs.status_code == 200:
            stats = rs.json()
            
        ru = requests.get(f"{BACKEND_API_URL}/admin/users", headers=headers)
        if ru.status_code == 200:
            users = ru.json()
            
        rb = requests.get(f"{BACKEND_API_URL}/admin/bookings", headers=headers)
        if rb.status_code == 200:
            bookings = rb.json()
            
        rc = requests.get(f"{BACKEND_API_URL}/services")
        if rc.status_code == 200:
            categories = rc.json()
    except Exception as e:
        print(f"Error loading admin dashboard data: {e}")
        
    return render_template(
        "admin.html",
        stats=stats,
        users=users,
        bookings=bookings,
        categories=categories
    )

# === Auth Routing ===

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip()
        password = request.form.get("password") or ""
        
        try:
            r = requests.post(
                f"{BACKEND_API_URL}/auth/login",
                json={"email": email, "password": password},
                timeout=20
            )
            if r.status_code == 200:
                user_data = r.json()
                start_session(user_data)
                
                flash(f"Welcome back, {user_data['name']}!", "success")
                next_page = safe_next(request.args.get("next"))
                if next_page:
                    return redirect(next_page)
                return redirect(home_for_role(user_data["role"]))
            else:
                error_msg = api_error(r, "Login failed")
                if error_msg == "EMAIL_NOT_VERIFIED":
                    flash("Your email address is not verified yet. We sent a new OTP code to your inbox.", "warning")
                    return redirect(url_for("verify_email", email=email))
                flash(error_msg, "danger")

        except Exception as e:
            flash(f"Backend server is offline: {e}", "danger")
            
    return render_template("login.html", demo_accounts=[] if IS_PRODUCTION else DEMO_ACCOUNTS)

@app.route("/register", methods=["GET", "POST"])
def register():
    # Fetch service categories for partner signup
    categories = []
    try:
        r = requests.get(f"{BACKEND_API_URL}/services")
        if r.status_code == 200:
            categories = r.json()
    except Exception as e:
        print(f"Error loading categories: {e}")

    if request.method == "POST":
        name = request.form.get("name")
        email = request.form.get("email")
        password = request.form.get("password")
        phone = request.form.get("phone")
        address = request.form.get("address")
        role = request.form.get("role", "customer")
        
        terms_agree = request.form.get("terms_agree")
        if not terms_agree:
            flash("You must accept the Terms & Conditions to create an account.", "danger")
            return render_template("register.html", categories=categories)
            
        payload = {
            "name": name,
            "email": email,
            "password": password,
            "phone": phone,
            "address": address,
            "role": role,
            "terms_agree": True
        }

        
        # If partner, add additional profile parameters
        if role == "partner":
            payload["service_category"] = request.form.get("service_category")
            payload["hourly_rate"] = float(request.form.get("hourly_rate", 250))
            exp_val = request.form.get("experience_years", 2)
            try:
                payload["experience_years"] = int(exp_val)
            except (ValueError, TypeError):
                payload["experience_years"] = 2
            payload["bio"] = request.form.get("bio", "")
            payload["aadhar_card"] = request.form.get("aadhar_card")
            payload["pan_card"] = request.form.get("pan_card")

            
        try:
            r = requests.post(f"{BACKEND_API_URL}/auth/register", json=payload, timeout=20)
            if r.status_code == 200:
                # The account exists but is unverified: no session until the emailed OTP is confirmed.
                flash("Account created! Enter the 6-digit code we emailed you to verify your address.", "success")
                return redirect(url_for("verify_email", email=email))
            else:
                flash(api_error(r, "Registration failed"), "danger")

        except Exception as e:
            flash(f"Backend server error: {e}", "danger")
            
    return render_template("register.html", categories=categories)

@app.route("/verify-email", methods=["GET", "POST"])
def verify_email():
    email = (request.args.get("email") or request.form.get("email") or "").strip()
    
    if request.method == "POST":
        otp_code = (request.form.get("code") or "").strip()
        try:
            r = requests.post(
                f"{BACKEND_API_URL}/auth/verify-email",
                json={"email": email, "code": otp_code},
                timeout=20
            )
            if r.status_code == 200:
                user_data = r.json()
                start_session(user_data)
                flash("Email verified successfully! Welcome to Purakam.", "success")
                return redirect(home_for_role(user_data["role"]))
            else:
                flash(api_error(r, "Invalid verification code"), "danger")
        except Exception as e:
            flash(f"Backend server error: {e}", "danger")
            
    return render_template("verify_email.html", email=email)


@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip()
        try:
            requests.post(
                f"{BACKEND_API_URL}/auth/forgot-password",
                json={"email": email},
                timeout=20
            )
            # Always show the same message, whether or not the email exists, so
            # this page can't be used to discover which emails have accounts.
            flash("If an account exists for this email, a 6-digit reset code has been sent.", "success")
            return redirect(url_for("reset_password", email=email))
        except Exception as e:
            flash(f"Backend server error: {e}", "danger")

    return render_template("forgot_password.html", email=request.args.get("email", ""))


@app.route("/reset-password", methods=["GET", "POST"])
def reset_password():
    email = (request.args.get("email") or request.form.get("email") or "").strip()

    if request.method == "POST":
        code = (request.form.get("code") or "").strip()
        new_password = request.form.get("new_password") or ""
        confirm_password = request.form.get("confirm_password") or ""

        if new_password != confirm_password:
            flash("Passwords do not match.", "danger")
            return render_template("reset_password.html", email=email)

        try:
            r = requests.post(
                f"{BACKEND_API_URL}/auth/reset-password",
                json={"email": email, "code": code, "new_password": new_password},
                timeout=20
            )
            if r.status_code == 200:
                # Deliberately not logging the user in automatically here - they
                # confirm the new password actually works via a fresh login.
                flash("Password reset successfully! Please sign in with your new password.", "success")
                return redirect(url_for("login"))
            else:
                flash(api_error(r, "Invalid or expired reset code"), "danger")
        except Exception as e:
            flash(f"Backend server error: {e}", "danger")

    return render_template("reset_password.html", email=email)


GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

@app.route("/login/google")
def login_google():
    next_page = safe_next(request.args.get("next")) or ""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        if ALLOW_MOCK_GOOGLE_LOGIN:
            # Development only: redirect to mock consent page
            return redirect(url_for("login_google_mock", next=next_page))
        flash("Google sign-in is not available right now. Please use email and password.", "warning")
        return redirect(url_for("login"))
    
    import secrets
    state = secrets.token_hex(16)
    session["oauth_state"] = state
    session["oauth_next"] = next_page
    
    # Construct Google OAuth Authorization URL
    redirect_uri = url_for("login_google_callback", _external=True)
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"scope=openid%20email%20profile&"
        f"state={state}"
    )
    return redirect(google_auth_url)

@app.route("/login/google/callback")
def login_google_callback():
    state = request.args.get("state")
    code = request.args.get("code")
    
    # Verify state to prevent CSRF
    if not state or state != session.pop("oauth_state", None):
        flash("Invalid state token. Possible CSRF attack detected.", "danger")
        return redirect(url_for("login"))
        
    if not code:
        flash("Authorization code not returned from Google.", "danger")
        return redirect(url_for("login"))
        
    # Exchange code for access token
    redirect_uri = url_for("login_google_callback", _external=True)
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    try:
        token_res = requests.post(token_url, data=payload)
        if token_res.status_code != 200:
            flash(f"Failed to exchange code: {token_res.text}", "danger")
            return redirect(url_for("login"))
            
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        
        # Get user info
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        userinfo_res = requests.get(userinfo_url, headers={"Authorization": f"Bearer {access_token}"})
        if userinfo_res.status_code != 200:
            flash("Failed to retrieve user info from Google.", "danger")
            return redirect(url_for("login"))
            
        # The backend re-verifies this access token with Google; it never trusts a bare email.
        r = requests.post(
            f"{BACKEND_API_URL}/auth/google",
            json={"access_token": access_token},
            timeout=20
        )
        if r.status_code == 200:
            user_data = r.json()
            start_session(user_data)
            
            flash(f"Welcome, {user_data['name']} (signed in with Google)!", "success")
            next_page = safe_next(session.pop("oauth_next", None))
            if next_page:
                return redirect(next_page)
            return redirect(home_for_role(user_data["role"]))
        else:
            flash(api_error(r, "Google authentication failed"), "danger")
    except Exception as e:
        flash(f"Google OAuth error: {e}", "danger")
        
    return redirect(url_for("login"))

@app.route("/login/google/mock", methods=["GET", "POST"])
def login_google_mock():
    if not ALLOW_MOCK_GOOGLE_LOGIN:
        return ("Not found", 404)
    next_page = safe_next(request.args.get("next")) or ""
    if request.method == "POST":
        email = request.form.get("email")
        name = request.form.get("name")
        
        if not email or "@" not in email:
            flash("Please enter a valid mock email address.", "danger")
            return render_template("mock_google_consent.html", next=next_page)
            
        try:
            r = requests.post(
                f"{BACKEND_API_URL}/auth/google",
                json={"email": email, "name": name},
                timeout=20
            )
            if r.status_code == 200:
                user_data = r.json()
                start_session(user_data)
                
                flash(f"Welcome, {user_data['name']} (signed in with Mock Google)!", "success")
                if next_page:
                    return redirect(next_page)
                return redirect(home_for_role(user_data["role"]))
            else:
                flash(api_error(r, "Mock Google login failed"), "danger")
        except Exception as e:
            flash(f"Mock Google login error: {e}", "danger")
            
    return render_template("mock_google_consent.html", next=next_page)

@app.route("/logout")

def logout():
    session.clear()
    flash("You have been logged out successfully.", "info")
    return redirect(url_for("index"))

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)