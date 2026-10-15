import requests
import time
from datetime import datetime, timedelta
from backend.database import SessionLocal, Booking

API_URL = "http://127.0.0.1:8000/api"

def run_tests():
    print("=== STARTING INTEGRATION TESTS ===")
    
    # 0. Test Mumbai address restriction and Aadhaar/PAN validations
    print("\n0. Testing address and document registration restrictions...")
    # Pune address registration attempt
    pune_register_payload = {
        "name": "Pune User",
        "email": "pune_user@purakam.in",
        "password": "password123",
        "phone": "+919900000000",
        "address": "123, Deccan Gymkhana, Pune, MH",
        "role": "customer"
    }
    r = requests.post(f"{API_URL}/auth/register", json=pune_register_payload)
    assert r.status_code == 400, f"Expected 400 for Pune address, got {r.status_code}: {r.text}"
    assert "restricted to Mumbai" in r.text, f"Expected restriction message, got: {r.text}"
    print("Address restriction check passed (Pune address successfully blocked).")

    # Missing Aadhaar/PAN partner registration attempt
    missing_docs_payload = {
        "name": "No Docs Partner",
        "email": "nodocs@purakam.in",
        "password": "password123",
        "phone": "+919900000003",
        "address": "Bandra, Mumbai, MH",
        "role": "partner",
        "service_category": "Electrician",
        "hourly_rate": 300.0,
        "bio": "Certified test electrician."
    }
    r = requests.post(f"{API_URL}/auth/register", json=missing_docs_payload)
    assert r.status_code == 400, f"Expected 400 for missing docs, got {r.status_code}"
    assert "Aadhar card number and PAN card number are required" in r.text
    print("Document presence check passed (Partner without docs successfully blocked).")

    # Invalid Aadhaar partner registration attempt
    invalid_aadhar_payload = {
        "name": "Bad Aadhaar Partner",
        "email": "badaadhar@purakam.in",
        "password": "password123",
        "phone": "+919900000004",
        "address": "Bandra, Mumbai, MH",
        "role": "partner",
        "service_category": "Electrician",
        "hourly_rate": 300.0,
        "bio": "Certified test electrician.",
        "aadhar_card": "12345", # Less than 12 digits
        "pan_card": "PANTST1234"
    }
    r = requests.post(f"{API_URL}/auth/register", json=invalid_aadhar_payload)
    assert r.status_code == 400, f"Expected 400 for invalid Aadhaar, got {r.status_code}"
    assert "Aadhar card must be a 12-digit numeric code" in r.text
    print("Aadhaar validation check passed (Partner with invalid Aadhaar successfully blocked).")

    # 1. Register test customer
    print("\n1. Registering test customer...")
    cust_payload = {
        "name": "Test Customer",
        "email": "test_customer@purakam.in",
        "password": "password123",
        "phone": "+919900000001",
        "address": "123, User Colony, Bandra West, Mumbai, MH",
        "role": "customer"
    }
    r = requests.post(f"{API_URL}/auth/register", json=cust_payload)
    if r.status_code == 200:
        print("Customer registered successfully!")
    elif r.status_code == 400 and "already registered" in r.text:
        print("Customer already registered. Proceeding.")
    else:
        print(f"Failed to register customer: {r.text}")
        return

    # 2. Register test partner
    print("\n2. Registering test partner (Electrician)...")
    part_payload = {
        "name": "Test Electrician",
        "email": "test_partner@purakam.in",
        "password": "password123",
        "phone": "+919900000002",
        "address": "456, Bandra Reclamation, Mumbai, MH",
        "role": "partner",
        "service_category": "Electrician",
        "hourly_rate": 300.0,
        "bio": "Certified test electrician.",
        "aadhar_card": "999900001111",
        "pan_card": "PANTST1234"
    }
    r = requests.post(f"{API_URL}/auth/register", json=part_payload)
    if r.status_code == 200:
        print("Partner registered successfully!")
    elif r.status_code == 400 and "already registered" in r.text:
        print("Partner already registered. Proceeding.")
    else:
        print(f"Failed to register partner: {r.text}")
        return

    # 3. Login Customer, Partner, Vijay Shinde, and Rajesh Kumar to get real JWT tokens
    print("\n3. Logging in users to fetch sessions...")
    # Customer login
    r = requests.post(f"{API_URL}/auth/login", json={"email": "test_customer@purakam.in", "password": "password123"})
    assert r.status_code == 200, "Customer login failed"
    cust_token = r.json()["access_token"]
    cust_id = r.json()["id"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print(f"Customer JWT Token fetched successfully.")

    # Partner login
    r = requests.post(f"{API_URL}/auth/login", json={"email": "test_partner@purakam.in", "password": "password123"})
    assert r.status_code == 200, "Partner login failed"
    part_token = r.json()["access_token"]
    part_id = r.json()["id"]
    part_headers = {"Authorization": f"Bearer {part_token}"}
    print(f"Partner JWT Token fetched successfully.")

    # Vijay Shinde login
    r = requests.post(f"{API_URL}/auth/login", json={"email": "vijay@purakam.in", "password": "partner123"})
    assert r.status_code == 200, "Vijay Shinde login failed"
    vijay_token = r.json()["access_token"]
    vijay_id = r.json()["id"]
    vijay_headers = {"Authorization": f"Bearer {vijay_token}"}

    # Rajesh Kumar login
    r = requests.post(f"{API_URL}/auth/login", json={"email": "rajesh@purakam.in", "password": "partner123"})
    assert r.status_code == 200, "Rajesh Kumar login failed"
    rajesh_token = r.json()["access_token"]
    rajesh_id = r.json()["id"]
    rajesh_headers = {"Authorization": f"Bearer {rajesh_token}"}

    # Amit Sharma login (AC & Appliance Repair)
    r = requests.post(f"{API_URL}/auth/login", json={"email": "amit@purakam.in", "password": "partner123"})
    assert r.status_code == 200, "Amit Sharma login failed"
    amit_token = r.json()["access_token"]
    amit_headers = {"Authorization": f"Bearer {amit_token}"}

    # 4. Turn Partner Online
    print("\n4. Toggling partner status to ONLINE...")
    r = requests.put(f"{API_URL}/partner/profile", json={"availability_status": True}, headers=part_headers)
    assert r.status_code == 200, "Failed to toggle partner status"
    assert r.json()["availability_status"] is True
    print("Partner status updated to: ONLINE")

    # 5. Place booking as customer with Mumbai coordinates (Geographic Proximity Test)
    # Test invalid pincode booking attempt
    print("Testing invalid pincode booking validation...")
    invalid_pincode_payload = {
        "service_category": "Electrician",
        "booking_date": "2026-06-01",
        "time_slot": "10:00 AM - 12:00 PM",
        "details": "Install living room lights.",
        "price": 349.0,
        "address": "Sea Breeze Apts, Bandra West, Mumbai, MH",
        "payment_method": "UPI",
        "latitude": 19.0600,
        "longitude": 72.8258,
        "area_name": "Bandra & Western Suburbs",
        "pincode": "500001" # Pune/Hyderabad pincode
    }
    r = requests.post(f"{API_URL}/bookings", json=invalid_pincode_payload, headers=cust_headers)
    assert r.status_code == 400, f"Expected 400 for invalid pincode, got {r.status_code}"
    assert "local pincodes" in r.text, f"Expected validation error, got: {r.text}"
    print("Invalid pincode validation check passed.")

    # Booking at Bandra, Mumbai should match Vijay Shinde and Test Electrician (both Mumbai-based).
    print("\n5. Placing booking with Mumbai coordinates (Bandra)...")
    booking_payload_pune = {
        "service_category": "Electrician",
        "booking_date": "2026-06-01",
        "time_slot": "10:00 AM - 12:00 PM",
        "details": "Install living room lights.",
        "price": 349.0,
        "address": "Sea Breeze Apts, Bandra West, Mumbai, MH",
        "payment_method": "UPI",
        "latitude": 19.0600,
        "longitude": 72.8258,
        "area_name": "Bandra & Western Suburbs",
        "pincode": "400050"
    }
    r = requests.post(f"{API_URL}/bookings", json=booking_payload_pune, headers=cust_headers)
    assert r.status_code == 200, f"Failed to place Pune booking: {r.text}"
    booking_data = r.json()
    pune_booking_id = booking_data["id"]
    assert booking_data["status"] == "requested", f"Expected status 'requested', got {booking_data['status']}"
    assert booking_data["partner_id"] is None, "Expected partner_id to be None initially"
    pune_booking_otp = booking_data["otp"]
    assert len(pune_booking_otp) == 6, f"Expected 6-digit OTP, got {pune_booking_otp}"
    print(f"Pune Booking created (ID: #SRV{pune_booking_id}) with OTP: {pune_booking_otp}. Status: requested")

    # Verify Razorpay order creation for this booking
    print("Testing Razorpay order creation...")
    r = requests.post(f"{API_URL}/bookings/{pune_booking_id}/order", headers=cust_headers)
    assert r.status_code == 200, f"Expected 200 for order creation, got {r.status_code}: {r.text}"
    order_data = r.json()
    assert "order_id" in order_data, "Expected order_id in response"
    assert "amount" in order_data, "Expected amount in response"
    assert order_data["amount"] == 34900, f"Expected 34900 paise, got {order_data['amount']}"
    mock_order_id = order_data["order_id"]
    print("Razorpay order creation check passed.")

    # Verify Razorpay payment verification
    print("Testing Razorpay payment verification...")
    verify_payload = {
        "razorpay_payment_id": "pay_mock_123456",
        "razorpay_order_id": mock_order_id,
        "razorpay_signature": "sig_mock_123456"
    }
    r = requests.post(f"{API_URL}/bookings/{pune_booking_id}/verify-payment", json=verify_payload, headers=cust_headers)
    assert r.status_code == 200, f"Expected 200 for payment verification, got {r.status_code}: {r.text}"
    verify_data = r.json()
    assert verify_data["status"] == "success"
    
    # Confirm booking in DB has updated payment status
    r = requests.get(f"{API_URL}/bookings", headers=cust_headers)
    assert r.status_code == 200
    my_bookings = r.json()
    srv1_booking = next(b for b in my_bookings if b["id"] == pune_booking_id)
    assert srv1_booking["payment_status"] == "completed", "Expected payment_status to be completed after verification"
    assert srv1_booking["razorpay_order_id"] == mock_order_id
    assert srv1_booking["razorpay_payment_id"] == "pay_mock_123456"
    assert srv1_booking["razorpay_signature"] == "sig_mock_123456"
    print("Razorpay payment verification check passed.")

    # 6. Verify Category-Based Broadcasting (No Proximity Limits)
    print("\n6. Verifying category-based broadcasting...")
    # Vijay Shinde (Electrician) should see it
    r = requests.get(f"{API_URL}/partner/incoming-bookings", headers=vijay_headers)
    assert r.status_code == 200
    vijay_incoming = r.json()
    assert any(b["id"] == pune_booking_id for b in vijay_incoming), "Vijay Shinde (Electrician) should see the booking"
    print("Vijay Shinde can see the Pune booking (Success).")

    # Rajesh Kumar (Electrician, far) should ALSO see it (no proximity limits)
    r = requests.get(f"{API_URL}/partner/incoming-bookings", headers=rajesh_headers)
    assert r.status_code == 200
    rajesh_incoming = r.json()
    assert any(b["id"] == pune_booking_id for b in rajesh_incoming), "Rajesh Kumar (Electrician) should see the booking"
    print("Rajesh Kumar can also see the Pune booking (Success - no proximity limits).")

    # Amit Sharma (AC & Appliance Repair) should NOT see it (different category)
    r = requests.get(f"{API_URL}/partner/incoming-bookings", headers=amit_headers)
    assert r.status_code == 200
    amit_incoming = r.json()
    assert not any(b["id"] == pune_booking_id for b in amit_incoming), "Amit Sharma (AC & Appliance Repair) should NOT see the Electrician booking"
    print("Amit Sharma cannot see the Electrician booking (Success - category filtering works).")

    # 7. Test Decline Endpoint
    print("\n7. Testing job decline endpoint...")
    # Vijay declines Pune booking
    r = requests.post(f"{API_URL}/bookings/{pune_booking_id}/decline", headers=vijay_headers)
    assert r.status_code == 200, f"Failed to decline booking: {r.text}"
    print("Vijay Shinde successfully declined the job.")

    # Verify booking is removed from Vijay's incoming feed
    r = requests.get(f"{API_URL}/partner/incoming-bookings", headers=vijay_headers)
    assert r.status_code == 200
    vijay_incoming_after = r.json()
    assert not any(b["id"] == pune_booking_id for b in vijay_incoming_after), "Declined booking should not appear in partner feed anymore"
    print("Verified: Declined job disappeared from Vijay Shinde's incoming feed.")

    # 8. Test Accept Endpoint
    print("\n8. Testing job accept endpoint...")
    # Test Electrician accepts the job
    r = requests.put(f"{API_URL}/bookings/{pune_booking_id}/status?new_status=accepted", headers=part_headers)
    assert r.status_code == 200, f"Failed to accept job: {r.text}"
    accepted_booking = r.json()
    assert accepted_booking["status"] == "accepted"
    assert accepted_booking["partner_id"] == part_id
    print("Test Electrician successfully accepted the job.")

    # 9. Concurrency Conflict Test
    print("\n9. Testing job accept concurrency conflict...")
    # Vijay Shinde tries to accept the booking that has already been accepted
    r = requests.put(f"{API_URL}/bookings/{pune_booking_id}/status?new_status=accepted", headers=vijay_headers)
    assert r.status_code == 409, f"Expected HTTP 409 Conflict, got {r.status_code}"
    assert "already been accepted" in r.json()["detail"]
    print("Concurrency conflict verification passed (HTTP 409 Conflict returned).")

    # 10. Test Chat Messaging System
    print("\n10. Testing Chat Messaging system...")
    # Customer sends message to Test Electrician
    chat_payload_cust = {"message_text": "Hi, please bring an extra extension board."}
    r = requests.post(f"{API_URL}/bookings/{pune_booking_id}/messages", json=chat_payload_cust, headers=cust_headers)
    assert r.status_code == 200, f"Customer chat send failed: {r.text}"
    print("Customer: Hi, please bring an extra extension board.")
    
    # Partner reads messages
    r = requests.get(f"{API_URL}/bookings/{pune_booking_id}/messages", headers=part_headers)
    assert r.status_code == 200, f"Partner chat read failed: {r.text}"
    messages = r.json()
    assert len(messages) == 1
    assert messages[0]["message_text"] == "Hi, please bring an extra extension board."
    
    # Partner replies
    chat_payload_part = {"message_text": "Sure, I will carry one with me."}
    r = requests.post(f"{API_URL}/bookings/{pune_booking_id}/messages", json=chat_payload_part, headers=part_headers)
    assert r.status_code == 200, f"Partner chat send failed: {r.text}"
    print("Partner (Test Electrician): Sure, I will carry one with me.")
    
    # Customer fetches updated chat history
    r = requests.get(f"{API_URL}/bookings/{pune_booking_id}/messages", headers=cust_headers)
    assert r.status_code == 200, f"Customer chat history load failed: {r.text}"
    messages = r.json()
    assert len(messages) == 2
    print("Chat system verified: history loaded correctly.")

    # 11. Upload mock image file
    print("\n11. Customer uploading mock picture attachment to Pune booking...")
    mock_file = {"file": ("test_image.jpg", b"fake-binary-image-data-contents", "image/jpeg")}
    r = requests.post(f"{API_URL}/bookings/{pune_booking_id}/upload", files=mock_file, headers=cust_headers)
    assert r.status_code == 200, f"Failed to upload attachment: {r.text}"
    print(f"Attachment uploaded successfully! Filename: {r.json()['filename']}")

    # 12. Simulating Pune booking state progression and OTP validation
    print("\n12. Simulating Pune booking state progression with OTP verification...")
    # Progress from accepted -> on_the_way
    r = requests.put(f"{API_URL}/bookings/{pune_booking_id}/status?new_status=on_the_way", headers=part_headers)
    assert r.status_code == 200, f"Failed to progress to 'on_the_way': {r.text}"
    print(f"Status updated: {r.json()['status']}")

    # Try to progress to in_progress without OTP (should fail)
    print("Attempting to start work (in_progress) without OTP...")
    r = requests.put(f"{API_URL}/bookings/{pune_booking_id}/status?new_status=in_progress", headers=part_headers)
    assert r.status_code == 400, f"Expected status 400, got {r.status_code}"
    print("Expected failure achieved: OTP is required.")

    # Try to progress to in_progress with incorrect OTP (should fail)
    print("Attempting to start work (in_progress) with incorrect OTP...")
    r = requests.put(f"{API_URL}/bookings/{pune_booking_id}/status?new_status=in_progress&otp=000000", headers=part_headers)
    assert r.status_code == 400, f"Expected status 400, got {r.status_code}"
    print("Expected failure achieved: Invalid OTP.")

    # Progress to in_progress with correct OTP (should succeed)
    print("Attempting to start work (in_progress) with correct OTP...")
    r = requests.put(f"{API_URL}/bookings/{pune_booking_id}/status?new_status=in_progress&otp={pune_booking_otp}", headers=part_headers)
    assert r.status_code == 200, f"Failed to progress to 'in_progress' with correct OTP: {r.text}"
    print(f"Status updated: {r.json()['status']}")

    # Verify that the partner cannot see the OTP in booking response list
    print("Verifying that partner cannot see OTP in bookings list...")
    r = requests.get(f"{API_URL}/bookings", headers=part_headers)
    assert r.status_code == 200
    partner_bookings = r.json()
    for b in partner_bookings:
        if b["id"] == pune_booking_id:
            assert b.get("otp") is None, f"Security vulnerability: Partner was able to see the OTP in bookings list! ({b.get('otp')})"
            break
    print("Security check passed: Partner cannot see the OTP in the bookings list.")

    # Complete the booking
    r = requests.put(f"{API_URL}/bookings/{pune_booking_id}/status?new_status=completed", headers=part_headers)
    assert r.status_code == 200, f"Failed to progress to 'completed': {r.text}"
    print(f"Status updated: {r.json()['status']}")

    # 13. Customer submits review
    print("\n13. Customer submitting review for completed Pune booking...")
    review_payload = {
        "booking_id": pune_booking_id,
        "rating": 5,
        "comment": "Outstanding service! Highly recommended."
    }
    r = requests.post(f"{API_URL}/reviews", json=review_payload, headers=cust_headers)
    assert r.status_code == 200, f"Failed to submit review: {r.text}"
    print(f"Review submitted successfully! Rating: {r.json()['rating']} Stars")

    # 14. Admin Console Operations Verification
    print("\n14. Verifying Admin Console backend operations...")
    # Admin login
    r = requests.post(f"{API_URL}/auth/login", json={"email": "admin@purakam.in", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("Admin logged in successfully.")

    # Audit chat history as Admin
    r = requests.get(f"{API_URL}/bookings/{pune_booking_id}/messages", headers=admin_headers)
    assert r.status_code == 200, f"Admin failed to read chat messages: {r.text}"
    messages = r.json()
    assert len(messages) == 2, f"Expected 2 messages, got {len(messages)}"
    print("Admin successfully monitored/read the booking chat messages.")

    # Get admin stats
    r = requests.get(f"{API_URL}/admin/stats", headers=admin_headers)
    assert r.status_code == 200, f"Failed to fetch admin stats: {r.text}"
    stats_data = r.json()
    assert stats_data["total_bookings"] >= 1
    assert stats_data["total_revenue"] >= 349.0
    print(f"Admin stats verified. Total Bookings: {stats_data['total_bookings']}, Revenue: {stats_data['total_revenue']}")

    # 15. Testing Auto-Expiration Timeout Helper
    print("\n15. Testing auto-expiration timeout (requested booking older than 10 mins)...")
    # Place a requested booking
    booking_payload_expire = {
        "service_category": "Electrician",
        "booking_date": "2026-06-03",
        "time_slot": "12:00 PM - 02:00 PM",
        "details": "Checking expiration.",
        "price": 199.0,
        "address": "Testing Expiration Address, Bandra, Mumbai, MH",
        "payment_method": "COD",
        "latitude": 19.0600,
        "longitude": 72.8258,
        "area_name": "Bandra & Western Suburbs",
        "pincode": "400050"
    }
    r = requests.post(f"{API_URL}/bookings", json=booking_payload_expire, headers=cust_headers)
    assert r.status_code == 200, f"Failed to place booking: {r.text}"
    expire_booking_id = r.json()["id"]
    print(f"Created temporary booking ID: #SRV{expire_booking_id}")

    # Manually modify created_at to 11 minutes ago in DB using sqlalchemy directly
    db = SessionLocal()
    try:
        b_record = db.query(Booking).filter(Booking.id == expire_booking_id).first()
        assert b_record is not None
        b_record.created_at = datetime.utcnow() - timedelta(minutes=11)
        db.commit()
        print("Booking timestamp manually shifted to 11 minutes ago in DB.")
    finally:
        db.close()

    # Trigger endpoint (like GET /api/bookings as customer) to run checkout logic
    r = requests.get(f"{API_URL}/bookings", headers=cust_headers)
    assert r.status_code == 200
    
    # Check that status changed to "cancelled"
    db = SessionLocal()
    try:
        b_record = db.query(Booking).filter(Booking.id == expire_booking_id).first()
        assert b_record.status == "cancelled", f"Expected status 'cancelled', got {b_record.status}"
        print("Verified: Booking automatically transitioned to 'cancelled' state.")
    finally:
        db.close()

    # 16. Testing Real-Time Location Tracking API
    print("\n16. Testing Real-Time Location Tracking API endpoints...")
    # Partner updates location coordinates
    loc_payload = {
        "latitude": 19.0620,
        "longitude": 72.8280
    }
    r = requests.put(f"{API_URL}/partner/location", json=loc_payload, headers=part_headers)
    assert r.status_code == 200, f"Failed to update partner location: {r.text}"
    print("Partner coordinates successfully updated in backend.")

    # Customer fetches bookings list to check partner location coordinates
    r = requests.get(f"{API_URL}/bookings", headers=cust_headers)
    assert r.status_code == 200
    cust_bookings = r.json()
    pune_booking = next((b for b in cust_bookings if b["id"] == pune_booking_id), None)
    assert pune_booking is not None
    assert pune_booking["partner"] is not None
    assert pune_booking["partner"]["latitude"] == 19.0620
    assert pune_booking["partner"]["longitude"] == 72.8280
    print("Verification passed: Customer successfully tracked partner's live coordinates!")

    # Security Verification: Customer cannot access admin routes
    print("\nSecurity: Verifying customer role cannot access admin routes...")
    r = requests.get(f"{API_URL}/admin/stats", headers=cust_headers)
    assert r.status_code == 403, f"Security Breach! Customer was able to query admin stats: {r.status_code}"
    print("Security block verified (HTTP 403 Forbidden returned for customers).")

    print("\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
