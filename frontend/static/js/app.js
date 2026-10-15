/* ==========================================
   PURAKAM CLIENT SIDE CONTROLLER (JS)
   ========================================== */

// Host of our FastAPI backend
const API_URL = window.BACKEND_API_URL || "http://127.0.0.1:8000/api";

// Real-Time Socket.IO Client Controller for Instant OTP & Job Updates
let socket = null;

function initRealtimeSocket() {
    if (typeof io === 'undefined') return;
    const wsHost = API_URL.replace('/api', '');
    
    try {
        socket = io(wsHost, {
            path: '/ws/socket.io',
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('⚡ Connected to Purakam Real-Time Socket Server (Zero Latency)');
        });

        socket.on('otp_received', (data) => {
            console.log('⚡ Instant OTP Received via Socket:', data);
            if (data && data.otp) {
                showToast(`⚡ Doorstep Verification OTP: ${data.otp}`, 'success');
                const otpDisplay = document.querySelector(`.booking-otp-value[data-booking-id="${data.booking_id}"]`);
                if (otpDisplay) {
                    otpDisplay.textContent = data.otp;
                } else {
                    setTimeout(() => window.location.reload(), 1200);
                }
            }
        });

        socket.on('job_accepted', (data) => {
            showToast('🎉 Service partner accepted your request!', 'success');
            setTimeout(() => window.location.reload(), 1000);
        });

        socket.on('new_booking_broadcast', (data) => {
            showToast(`🔔 New service request: ${data.service_category}`, 'info');
            setTimeout(() => window.location.reload(), 1500);
        });

        socket.on('booking_updated', (data) => {
            setTimeout(() => window.location.reload(), 1200);
        });

    } catch (err) {
        console.warn('Socket connection note:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initRealtimeSocket();
});

// 1. Toast Notification Helper

function showToast(message, type = "info") {
    const wrapper = document.getElementById("toast-wrapper");
    if (!wrapper) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type} fade-in`;
    
    // Choose icon using type mapping
    let iconName = "info";
    if (type === "success") iconName = "check-circle";
    if (type === "danger") iconName = "alert-circle";
    if (type === "warning") iconName = "alert-triangle";

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.6rem;">
            <i data-lucide="${iconName}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close-btn" onclick="this.parentElement.remove()">&times;</button>
    `;

    wrapper.appendChild(toast);
    
    // Refresh icons inside toast
    if (window.lucide) {
        lucide.createIcons({
            attrs: {
                class: 'lucide-icon'
            }
        });
    }

    // Auto delete after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// 2. Green Tick Confirmation Modal Popup Controller
window.showGreenTickModal = function(title, message, redirectUrl = null) {
    let modal = document.getElementById("green-tick-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "green-tick-modal";
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        `;
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background: var(--bg-surface, #1e1e24); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 16px; max-width: 440px; width: 100%; padding: 2.2rem 1.8rem; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div style="width: 72px; height: 72px; background: rgba(34, 197, 94, 0.15); border: 2px solid #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; box-shadow: 0 0 25px rgba(34, 197, 94, 0.3);">
                <i data-lucide="check-circle-2" style="width: 42px; height: 42px; color: #22c55e;"></i>
            </div>
            <h3 style="font-size: 1.4rem; font-weight: 700; color: #ffffff; margin-bottom: 0.6rem; font-family: var(--font-heading, sans-serif);">${title}</h3>
            <p style="font-size: 0.95rem; color: #a1a1aa; line-height: 1.5; margin-bottom: 1.6rem;">${message}</p>
            <div style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); padding: 0.8rem 1rem; border-radius: 10px; margin-bottom: 1.6rem; display: flex; align-items: center; gap: 0.6rem; justify-content: center;">
                <i data-lucide="radar" style="width: 18px; height: 18px; color: #22c55e;"></i>
                <span style="font-size: 0.85rem; font-weight: 600; color: #22c55e;">Live Radar Broadcasting Active (00:00 - 05:00)</span>
            </div>
            <button id="green-tick-modal-btn" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: #ffffff; font-weight: 600; border: none; padding: 0.8rem 2rem; border-radius: 10px; cursor: pointer; width: 100%; font-size: 1rem; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);">
                ${redirectUrl ? 'Go to My Bookings & Live Radar' : 'OK, Continue'}
            </button>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    modal.style.display = "flex";

    const btn = document.getElementById("green-tick-modal-btn");
    btn.onclick = () => {
        modal.style.display = "none";
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    };

    if (redirectUrl) {
        setTimeout(() => {
            if (modal.style.display !== "none") {
                window.location.href = redirectUrl;
            }
        }, 3500);
    }
};

// Helper to make authenticated requests to FastAPI backend

async function apiRequest(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    if (window.userSession && window.userSession.authToken) {
        headers["Authorization"] = `Bearer ${window.userSession.authToken}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `HTTP Error ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API Request failed for ${endpoint}:`, error);
        showToast(error.message, "danger");
        throw error;
    }
}

// 2. Booking Flow Wizard logic
document.addEventListener("DOMContentLoaded", () => {
    const bookingForm = document.getElementById("booking-wizard-form");
    if (bookingForm) {
        let currentStep = 1;
        const totalSteps = 3;
        
        const btnNext1 = document.getElementById("btn-next-1");
        const btnNext2 = document.getElementById("btn-next-2");
        const btnPrev2 = document.getElementById("btn-prev-2");
        const btnPrev3 = document.getElementById("btn-prev-3");
        const btnSubmit = document.getElementById("btn-submit-booking");

        // Step Navigation logic
        const goToStep = (step) => {
            document.querySelectorAll(".booking-step").forEach(el => el.classList.remove("active"));
            document.getElementById(`step-${step}`).classList.add("active");
            
            // Update indicators
            document.querySelectorAll(".step-indicator").forEach((el, index) => {
                const stepNum = index + 1;
                el.classList.remove("active", "completed");
                if (stepNum === step) {
                    el.classList.add("active");
                } else if (stepNum < step) {
                    el.classList.add("completed");
                }
            });
            currentStep = step;
        };

        btnNext1.addEventListener("click", () => {
            // Validate Step 1
            const date = document.getElementById("booking_date").value;
            const slot = document.getElementById("time_slot").value;
            if (!date || !slot) {
                showToast("Please pick a Date and Time Slot to proceed.", "warning");
                return;
            }
            goToStep(2);
        });

        btnNext2.addEventListener("click", () => {
            // Validate Step 2
            const address = document.getElementById("address").value;
            if (!address || address.trim().length < 10) {
                showToast("Please enter a valid detailed address (min 10 characters).", "warning");
                return;
            }

            const areaName = document.getElementById("area_name").value;
            if (!areaName) {
                showToast("Please select a service area/city to proceed.", "warning");
                return;
            }
            
            // Populate invoice breakdown in Step 3
            const categoryName = document.getElementById("category_name").value;
            const basePrice = parseFloat(document.getElementById("base_price_val").value);
            const gstAmount = basePrice * 0.18; // 18% GST standard in India
            const platformFee = 49.00; // Flat platform charge
            const totalAmount = basePrice + gstAmount + platformFee;
            
            document.getElementById("summary-category").innerText = categoryName;
            document.getElementById("summary-date").innerText = document.getElementById("booking_date").value;
            document.getElementById("summary-slot").innerText = document.getElementById("time_slot").value;
            
            document.getElementById("invoice-base").innerText = `₹${basePrice.toFixed(2)}`;
            document.getElementById("invoice-gst").innerText = `₹${gstAmount.toFixed(2)}`;
            document.getElementById("invoice-platform").innerText = `₹${platformFee.toFixed(2)}`;
            document.getElementById("invoice-total").innerText = `₹${totalAmount.toFixed(2)}`;
            
            // Save total price for submit payload
            bookingForm.dataset.totalPrice = totalAmount;

            goToStep(3);
        });

        btnPrev2.addEventListener("click", () => goToStep(1));
        btnPrev3.addEventListener("click", () => goToStep(2));

        // Toggle UPI input field
        const paymentMethods = document.getElementsByName("payment_method");
        const upiWrapper = document.getElementById("upi-input-wrapper");
        
        paymentMethods.forEach(method => {
            method.addEventListener("change", (e) => {
                if (e.target.value === "UPI") {
                    upiWrapper.style.display = "block";
                } else {
                    upiWrapper.style.display = "none";
                }
            });
        });

        // Helper to get geolocation or default mock Koregaon Park coordinates
        const getGeoCoordinates = () => {
            return new Promise((resolve) => {
                if (window.bookingLatitude && window.bookingLongitude) {
                    resolve({
                        latitude: window.bookingLatitude,
                        longitude: window.bookingLongitude
                    });
                    return;
                }
                if (!navigator.geolocation) {
                    console.log("Geolocation not supported. Using default Bandra, Mumbai coordinates.");
                    resolve({ latitude: 19.0600, longitude: 72.8258 });
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });
                    },
                    (error) => {
                        console.log("Geolocation error or permission denied. Using default Bandra, Mumbai coordinates.", error);
                        resolve({ latitude: 19.0600, longitude: 72.8258 });
                    },
                    { timeout: 5000 }
                );
            });
        };

        // Helper to upload attachments if any
        const uploadBookingAttachments = async (bookingId) => {
            const fileInput = document.getElementById("job_attachments");
            if (fileInput && fileInput.files.length > 0) {
                const formData = new FormData();
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append("files", fileInput.files[i]);
                }
                
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `<i data-lucide="loader" class="pulse"></i> Uploading attachments...`;
                if (window.lucide) lucide.createIcons();
                
                const uploadHeaders = {};
                if (window.userSession && window.userSession.authToken) {
                    uploadHeaders["Authorization"] = `Bearer ${window.userSession.authToken}`;
                }
                
                const uploadRes = await fetch(`${API_URL}/bookings/${bookingId}/upload`, {
                    method: "POST",
                    headers: uploadHeaders,
                    body: formData
                });
                
                if (!uploadRes.ok) {
                    const errData = await uploadRes.json();
                    throw new Error(errData.detail || "Attachment upload failed");
                }
            }
        };

        // Submit booking
        btnSubmit.addEventListener("click", async () => {
            const pincode = document.getElementById("pincode").value.trim();
            if (!pincode || pincode.length !== 6 || isNaN(pincode)) {
                showToast("Please enter a valid 6-digit Pincode.", "warning");
                return;
            }
            if (!pincode.startsWith("400") && !pincode.startsWith("401") && !pincode.startsWith("421")) {
                showToast("Service is only available in Mumbai, Thane, or Navi Mumbai regions matching local pincodes.", "warning");
                return;
            }

            const method = document.querySelector('input[name="payment_method"]:checked').value;
            if (method === "UPI") {
                const upiId = document.getElementById("upi_id").value;
                if (!upiId || !upiId.includes("@")) {
                    showToast("Please enter a valid UPI ID (e.g. name@paytm).", "warning");
                    return;
                }
            }

            const coords = await getGeoCoordinates();

            const payload = {
                service_category: document.getElementById("category_name").value,
                booking_date: document.getElementById("booking_date").value,
                time_slot: document.getElementById("time_slot").value,
                details: document.getElementById("details").value,
                price: parseFloat(bookingForm.dataset.totalPrice),
                address: document.getElementById("address").value,
                payment_method: method,
                latitude: coords.latitude,
                longitude: coords.longitude,
                partner_id: null,
                area_name: document.getElementById("area_name").value,
                pincode: pincode
            };

            // Set button to loading state
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<i data-lucide="loader" class="pulse"></i> Processing Booking...`;
            if (window.lucide) lucide.createIcons();

            try {
                // 1. Create booking in DB (starts as payment_status: pending)
                const booking = await apiRequest("/bookings", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                
                if (method === "UPI") {
                    // 2. Fetch Razorpay order details from backend
                    btnSubmit.innerHTML = `<i data-lucide="loader" class="pulse"></i> Initializing Payment Gateway...`;
                    if (window.lucide) lucide.createIcons();

                    const orderData = await apiRequest(`/bookings/${booking.id}/order`, {
                        method: "POST"
                    });

                    // 3. Open Razorpay Checkout widget
                    const options = {
                        key: window.RAZORPAY_KEY_ID || orderData.key_id || "rzp_test_dummy_key_id",
                        amount: orderData.amount,
                        currency: "INR",
                        name: "Servify",
                        description: `${payload.service_category} Service Booking #${booking.id}`,
                        order_id: orderData.order_id,
                        handler: async function (response) {
                            try {
                                btnSubmit.disabled = true;
                                btnSubmit.innerHTML = `<i data-lucide="loader" class="pulse"></i> Verifying Payment...`;
                                if (window.lucide) lucide.createIcons();

                                // Verify Razorpay signature on backend
                                await apiRequest(`/bookings/${booking.id}/verify-payment`, {
                                    method: "POST",
                                    body: JSON.stringify({
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_signature: response.razorpay_signature
                                    })
                                });

                                // Upload attachments if present
                                await uploadBookingAttachments(booking.id);

                                showToast("Payment verified & booking created!", "success");
                                setTimeout(() => {
                                    window.location.href = "/dashboard";
                                }, 1000);
                            } catch (err) {
                                showToast(err.message || "Payment verification failed", "danger");
                                btnSubmit.disabled = false;
                                btnSubmit.innerHTML = `<i data-lucide="check"></i> Confirm & Book Now`;
                                if (window.lucide) lucide.createIcons();
                            }
                        },
                        modal: {
                            ondismiss: function () {
                                showToast("Payment checkout cancelled.", "warning");
                                btnSubmit.disabled = false;
                                btnSubmit.innerHTML = `<i data-lucide="check"></i> Confirm & Book Now`;
                                if (window.lucide) lucide.createIcons();
                            }
                        },
                        prefill: {
                            name: window.userName || "",
                            email: window.userEmail || "",
                            contact: ""
                        },
                        theme: {
                            color: "#6366f1"
                        }
                    };

                    const rzp = new Razorpay(options);
                    rzp.open();

                } else {
                    // For COD, just upload attachments and complete
                    await uploadBookingAttachments(booking.id);
                    showGreenTickModal("Booking Confirmed!", "Your service booking request has been created and broadcast to nearby verified partners.", "/dashboard");
                }
            } catch (err) {

                showToast(err.message || "Failed to create booking", "danger");
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<i data-lucide="check"></i> Confirm & Book Now`;
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    // 3. Partner Toggle online/offline status
    const partnerOnlineToggle = document.getElementById("partner-online-toggle");
    if (partnerOnlineToggle) {
        partnerOnlineToggle.addEventListener("change", async (e) => {
            const statusLabel = document.getElementById("partner-status-text");
            const isOnline = e.target.checked;
            
            try {
                await apiRequest("/partner/profile", {
                    method: "PUT",
                    body: JSON.stringify({ availability_status: isOnline })
                });
                
                statusLabel.innerText = isOnline ? "Online" : "Offline";
                showToast(`You are now ${isOnline ? 'Online' : 'Offline'}!`, isOnline ? "success" : "info");
            } catch (err) {
                // Revert check state on failure
                e.target.checked = !isOnline;
            }
        });
    }
});

// 4. Partner job acceptance & progression
async function acceptJob(bookingId) {
    try {
        await apiRequest(`/bookings/${bookingId}/status?new_status=accepted`, {
            method: "PUT"
        });
        showGreenTickModal("Job Accepted!", `You have accepted booking #${bookingId}. You can now start travel and navigate to the doorstep.`, null);
        setTimeout(() => window.location.reload(), 2000);
    } catch (err) {

        console.error("Job acceptance error:", err);
        // Reload after a short delay so the feed is refreshed and the contested/expired job is removed
        setTimeout(() => window.location.reload(), 2000);
    }
}

async function declineJob(bookingId) {
    try {
        await apiRequest(`/bookings/${bookingId}/decline`, {
            method: "POST"
        });
        showToast("Job request declined.", "warning");
        const card = document.getElementById(`incoming-job-card-${bookingId}`);
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            card.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                card.remove();
                // Check if any other jobs are left, if not show the empty state
                const remaining = document.querySelectorAll('[id^="incoming-job-card-"]');
                if (remaining.length === 0) {
                    window.location.reload();
                }
            }, 300);
        } else {
            window.location.reload();
        }
    } catch (err) {
        console.error("Job decline error:", err);
    }
}

async function progressJob(bookingId, currentStatus) {
    let nextStatus = "";
    if (currentStatus === "accepted") nextStatus = "on_the_way";
    else if (currentStatus === "on_the_way") nextStatus = "in_progress";
    else if (currentStatus === "in_progress") nextStatus = "completed";

    if (!nextStatus) return;

    try {
        await apiRequest(`/bookings/${bookingId}/status?new_status=${nextStatus}`, {
            method: "PUT"
        });
        showToast(`Job status updated to: ${nextStatus.replace(/_/g, ' ').toUpperCase()}`, "success");
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        console.error("Job progress error:", err);
    }
}

async function verifyJobOtp(bookingId) {
    const otpInput = document.getElementById(`otp-input-${bookingId}`);
    const otp = otpInput ? otpInput.value.trim() : "";
    
    if (!otp) {
        showToast("Please enter the verification OTP.", "danger");
        return;
    }
    if (otp.length !== 6 || isNaN(otp)) {
        showToast("Please enter a valid 6-digit OTP code.", "danger");
        return;
    }
    
    try {
        await apiRequest(`/bookings/${bookingId}/status?new_status=in_progress&otp=${otp}`, {
            method: "PUT"
        });
        showToast("OTP verified successfully! Status updated to WORKING.", "success");
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        console.error("OTP verification error:", err);
        showToast(err.message || "Invalid OTP. Please try again.", "danger");
    }
}

// 5. Customer Booking Cancellation
async function cancelBooking(bookingId) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
        await apiRequest(`/bookings/${bookingId}/status?new_status=cancelled`, {
            method: "PUT"
        });
        showToast("Booking cancelled successfully", "warning");
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        console.error("Cancel error:", err);
    }
}

// 6. Customer ratings / reviews submission
let currentSelectedRating = 5;

function openReviewModal(bookingId) {
    // Create review modal overlay dynamically
    const modal = document.createElement("div");
    modal.id = "review-modal-overlay";
    modal.className = "fade-in";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(11, 15, 25, 0.85)";
    modal.style.backdropFilter = "blur(12px)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "999";

    modal.innerHTML = `
        <div class="glass-card" style="width: 90%; max-width: 450px;">
            <h3 style="margin-bottom: 1rem; font-size: 1.5rem;">Rate Service Provider</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                Your feedback helps maintain premium standards. Rate your experience:
            </p>
            
            <div class="rating-picker">
                <span class="rating-star selected" data-value="1" onclick="setRating(1)">★</span>
                <span class="rating-star selected" data-value="2" onclick="setRating(2)">★</span>
                <span class="rating-star selected" data-value="3" onclick="setRating(3)">★</span>
                <span class="rating-star selected" data-value="4" onclick="setRating(4)">★</span>
                <span class="rating-star selected" data-value="5" onclick="setRating(5)">★</span>
            </div>
            
            <div class="form-group" style="margin-top: 1rem;">
                <label>Review comments</label>
                <textarea id="review-comment" class="form-input" placeholder="Excellent work, very polite..."></textarea>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;">
                <button onclick="closeReviewModal()" class="btn-secondary">Cancel</button>
                <button onclick="submitReview(${bookingId})" class="btn-primary">Submit Review</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    currentSelectedRating = 5; // Reset rating
}

function setRating(ratingValue) {
    currentSelectedRating = ratingValue;
    const stars = document.querySelectorAll(".rating-picker .rating-star");
    stars.forEach(star => {
        const val = parseInt(star.getAttribute("data-value"));
        if (val <= ratingValue) {
            star.classList.add("selected");
        } else {
            star.classList.remove("selected");
        }
    });
}

function closeReviewModal() {
    const modal = document.getElementById("review-modal-overlay");
    if (modal) modal.remove();
}

async function submitReview(bookingId) {
    const comment = document.getElementById("review-comment").value;
    
    try {
        await apiRequest("/reviews", {
            method: "POST",
            body: JSON.stringify({
                booking_id: bookingId,
                rating: currentSelectedRating,
                comment: comment
            })
        });
        
        showToast("Thank you for your rating!", "success");
        closeReviewModal();
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        console.error("Submit review error:", err);
    }
}

// === CHAT DRAWER CONTROLLER LOGIC ===
let chatPollInterval = null;
let currentChatBookingId = null;
let chatMessagesCount = 0;

// Open Chat Drawer
async function openChatDrawer(bookingId, recipientName) {
    currentChatBookingId = bookingId;
    chatMessagesCount = 0;
    
    const backdrop = document.getElementById("chat-drawer-backdrop");
    const drawer = document.getElementById("chat-drawer");
    const container = document.getElementById("chat-messages-container");
    const headerTitle = document.querySelector(".chat-drawer-header h3");
    
    // Hide chat input for admin monitoring
    const inputArea = document.querySelector(".chat-input-area");
    if (inputArea) {
        if (window.userSession && window.userSession.userRole === "admin") {
            inputArea.style.display = "none";
        } else {
            inputArea.style.display = "flex";
        }
    }
    
    headerTitle.innerHTML = `<i data-lucide="message-square"></i> Chat: ${recipientName}`;
    if (window.lucide) {
        lucide.createIcons({
            attrs: {
                class: 'lucide-icon'
            }
        });
    }
    
    // Clear old messages and show loader
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><i data-lucide="loader" class="pulse"></i> Loading messages...</div>`;
    if (window.lucide) lucide.createIcons();
    
    // Open drawer
    backdrop.classList.add("active");
    drawer.classList.add("open");
    
    // Initial fetch
    await fetchChatMessages();
    
    // Setup interval poll
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(fetchChatMessages, 4000);
}

// Close Chat Drawer
function closeChatDrawer() {
    const backdrop = document.getElementById("chat-drawer-backdrop");
    const drawer = document.getElementById("chat-drawer");
    
    backdrop.classList.remove("active");
    drawer.classList.remove("open");
    
    if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }
    currentChatBookingId = null;
}

// Fetch messages
async function fetchChatMessages() {
    if (!currentChatBookingId) return;
    
    try {
        const messages = await apiRequest(`/bookings/${currentChatBookingId}/messages`);
        
        // Only update DOM if message count changed
        if (messages.length !== chatMessagesCount) {
            renderChatMessages(messages);
            chatMessagesCount = messages.length;
        }
    } catch (err) {
        console.error("Failed to fetch messages:", err);
    }
}

// Render messages
function renderChatMessages(messages) {
    const container = document.getElementById("chat-messages-container");
    container.innerHTML = "";
    
    if (messages.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
            <i data-lucide="message-square-dashed" style="width: 36px; height: 36px; display: block; margin: 0 auto 0.5rem auto;"></i>
            <p style="font-size: 0.85rem;">No messages yet. Send a message to start the conversation!</p>
        </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }
    
    const currentUserId = parseInt(window.userSession.userId);
    
    messages.forEach(msg => {
        const isOutgoing = msg.sender_id === currentUserId;
        const bubbleClass = isOutgoing ? "outgoing" : "incoming";
        
        // Format timestamp
        const dateObj = new Date(msg.timestamp);
        let hours = dateObj.getHours();
        let minutes = dateObj.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        const timeStr = `${hours}:${minutes} ${ampm}`;
        
        const bubble = document.createElement("div");
        bubble.className = `chat-message-bubble ${bubbleClass}`;
        bubble.innerHTML = `
            <div class="chat-message-sender">${escapeHTML(msg.sender_name)}</div>
            <div class="chat-message-text">${escapeHTML(msg.message_text)}</div>
            <div class="chat-message-time">${timeStr}</div>
        `;
        container.appendChild(bubble);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send chat message
async function sendChatMessage() {
    const input = document.getElementById("chat-message-input");
    const text = input.value.trim();
    if (!text || !currentChatBookingId) return;
    
    input.value = "";
    
    try {
        const newMsg = await apiRequest(`/bookings/${currentChatBookingId}/messages`, {
            method: "POST",
            body: JSON.stringify({ message_text: text })
        });
        
        // Refresh local fetch immediately
        await fetchChatMessages();
    } catch (err) {
        console.error("Failed to send message:", err);
    }
}

// Helper to escape HTML characters
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// === UI MOTION & MICRO-ANIMATION FALLBACKS ===

document.addEventListener("DOMContentLoaded", () => {
    // 1. Click Ripple Effect
    document.addEventListener("click", (e) => {
        const target = e.target.closest(".btn-primary, .btn-secondary, .category-card, .glass-card, .dashboard-stat-card, .booking-item-card, .partner-card, .btn-logout, .chat-send-btn, .chat-launcher-btn, .nav-link");
        if (!target) return;

        // Skip ripple if prefers-reduced-motion is enabled
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        target.classList.add("ripple-container");

        // Clear previous ripples to avoid DOM clutter
        const existingRipples = target.querySelectorAll(".click-ripple");
        existingRipples.forEach(r => r.remove());

        const ripple = document.createElement("span");
        ripple.className = "click-ripple";

        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        // Calculate coordinates relative to target element
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        target.appendChild(ripple);

        // Remove element once animation finishes
        ripple.addEventListener("animationend", () => {
            ripple.remove();
        });
    });

    // 2. Scroll Progress Fallback for unsupported browsers (Firefox)
    if (!CSS.supports("animation-timeline", "scroll()")) {
        const progressBar = document.getElementById("scroll-progress-bar");
        if (progressBar) {
            const handleScroll = () => {
                const scrollable = document.documentElement.scrollHeight - window.innerHeight;
                if (scrollable <= 0) return;
                const scrolled = window.scrollY;
                const progress = scrolled / scrollable;
                progressBar.style.transform = `scaleX(${progress})`;
            };
            
            window.addEventListener("scroll", handleScroll, { passive: true });
            // Initial call to set correct progress state
            handleScroll();
        }
    }

    // 3. Scroll Reveal Fallback for unsupported browsers
    if (!CSS.supports("(animation-timeline: view()) and (animation-range: entry)")) {
        const revealElements = document.querySelectorAll(".scroll-reveal");
        
        if (revealElements.length > 0) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("revealed");
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: "0px 0px -40px 0px" // Trigger slightly before element fully enters viewport
            });
            
            revealElements.forEach(el => observer.observe(el));
        }
    }
});

// 7. Auto-reload polling for customer dashboard when a booking is broadcasting
document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector(".badge-requested")) {
        const intervalId = setInterval(async () => {
            try {
                const bookings = await apiRequest("/bookings");
                const requestedCountInBackend = bookings.filter(b => b.status === "requested").length;
                const requestedCountInDom = document.querySelectorAll(".badge-requested").length;
                if (requestedCountInBackend !== requestedCountInDom) {
                    clearInterval(intervalId);
                    window.location.reload();
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 6000);
    }

    // Live 1-second broadcasting elapsed timer with 5-minute (300s) auto-cancel limit
    const elapsedBadges = document.querySelectorAll(".matching-time-elapsed");
    if (elapsedBadges.length > 0) {
        setInterval(() => {
            elapsedBadges.forEach(badge => {
                const startTimeStr = badge.getAttribute("data-start-time");
                if (startTimeStr) {
                    const isoStr = (startTimeStr.includes('Z') || startTimeStr.includes('+')) ? startTimeStr : `${startTimeStr}Z`;
                    const startTime = new Date(isoStr).getTime();
                    if (!isNaN(startTime)) {
                        const now = new Date().getTime();
                        let diffSec = Math.floor((now - startTime) / 1000);
                        if (diffSec < 0) diffSec = 0;

                        if (diffSec >= 300) {
                            badge.textContent = "05:00";
                            const container = badge.closest(".broadcasting-radar-container");
                            if (container && !container.classList.contains("timed-out")) {
                                container.classList.add("timed-out");
                                container.style.borderColor = "rgba(239, 68, 68, 0.3)";
                                container.style.background = "rgba(239, 68, 68, 0.04)";
                                const statusText = container.querySelector(".broadcasting-status-text");
                                if (statusText) {
                                    statusText.textContent = "Search Timed Out (05:00) - Request auto-cancelled";
                                    statusText.style.color = "#ef4444";
                                }
                                const card = container.closest(".booking-item-card");
                                const bookingIdAttr = card ? card.getAttribute("data-booking-id") : null;
                                if (bookingIdAttr && window.cancelBooking) {
                                    window.cancelBooking(bookingIdAttr);
                                }
                            }
                        } else {
                            const mins = Math.floor(diffSec / 60);
                            const secs = diffSec % 60;
                            badge.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                        }
                    }
                }
            });
        }, 1000);
    }
});


// === Real-Time Location Tracking System ===
let trackingMap = null;
let trackingIntervalId = null;
let customerMarker = null;
let partnerMarker = null;
let trackingPolyline = null;

function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

window.openTrackingModal = function(bookingId, customerLat, customerLng, partnerName) {
    document.getElementById('tracking-modal').style.display = 'flex';
    document.getElementById('tracking-partner-name').innerText = partnerName;
    document.getElementById('tracking-distance').innerText = "Locating partner...";
    
    // Clear any existing active tracking
    if (trackingIntervalId) clearInterval(trackingIntervalId);
    
    // Ensure coordinates exist, fallback to Bandra if missing
    const cLat = customerLat || 19.0600;
    const cLng = customerLng || 72.8258;
    
    setTimeout(() => {
        // Initialize Leaflet map
        if (!trackingMap) {
            trackingMap = L.map('tracking-map', {
                zoomControl: true,
                attributionControl: false
            }).setView([cLat, cLng], 14);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(trackingMap);
        } else {
            trackingMap.setView([cLat, cLng], 14);
            // Remove previous map elements
            if (customerMarker) trackingMap.removeLayer(customerMarker);
            if (partnerMarker) trackingMap.removeLayer(partnerMarker);
            if (trackingPolyline) trackingMap.removeLayer(trackingPolyline);
            customerMarker = null;
            partnerMarker = null;
            trackingPolyline = null;
        }
        
        // Define Custom HTML markers (glassmorphic style matching the app)
        const customerIcon = L.divIcon({
            className: 'custom-marker-customer',
            html: `<div style="background-color: var(--success); width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px var(--success);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
        
        const partnerIcon = L.divIcon({
            className: 'custom-marker-partner',
            html: `<div style="background-color: var(--accent); width: 20px; height: 20px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 12px var(--accent); display: flex; align-items: center; justify-content: center; font-size: 10px; color: white;">⚡</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        customerMarker = L.marker([cLat, cLng], { icon: customerIcon }).addTo(trackingMap)
            .bindPopup("Your Doorstep Location").openPopup();
            
        const pollLocation = async () => {
            try {
                const bookings = await apiRequest("/bookings");
                const booking = bookings.find(b => b.id === bookingId);
                if (!booking) return;
                
                const partner = booking.partner;
                const status = booking.status;
                
                // Update Status UI
                const statusEl = document.getElementById('tracking-status');
                statusEl.className = `status-badge badge-${status}`;
                statusEl.innerText = status.replace('_', ' ');
                
                if (partner && partner.latitude !== null && partner.longitude !== null) {
                    const pLat = partner.latitude;
                    const pLng = partner.longitude;
                    
                    if (partnerMarker) {
                        partnerMarker.setLatLng([pLat, pLng]);
                    } else {
                        partnerMarker = L.marker([pLat, pLng], { icon: partnerIcon }).addTo(trackingMap)
                            .bindPopup(`${partner.name} (Technician)`).openPopup();
                    }
                    
                    // Draw or Update Route Polyline
                    const route = [[cLat, cLng], [pLat, pLng]];
                    if (trackingPolyline) {
                        trackingPolyline.setLatLngs(route);
                    } else {
                        trackingPolyline = L.polyline(route, {
                            color: 'var(--accent)',
                            dashArray: '5, 10',
                            weight: 3
                        }).addTo(trackingMap);
                    }
                    
                    // Calculate and render distance
                    const dist = getHaversineDistance(cLat, cLng, pLat, pLng);
                    const distText = dist < 1.0 ? `${Math.round(dist * 1000)} meters` : `${dist.toFixed(2)} km`;
                    document.getElementById('tracking-distance').innerText = distText;
                    
                    // Auto bounds zoom
                    const group = new L.featureGroup([customerMarker, partnerMarker]);
                    trackingMap.fitBounds(group.getBounds().pad(0.2));
                } else {
                    document.getElementById('tracking-distance').innerText = "Locating partner...";
                    trackingMap.setView([cLat, cLng], 14);
                }
                
                // If job completed or cancelled, auto close modal and reload
                if (status === 'completed' || status === 'cancelled') {
                    closeTrackingModal();
                    window.location.reload();
                }
            } catch (err) {
                console.error("Location polling error:", err);
            }
        };
        
        pollLocation();
        trackingIntervalId = setInterval(pollLocation, 5000);
    }, 100);
};

window.closeTrackingModal = function() {
    document.getElementById('tracking-modal').style.display = 'none';
    if (trackingIntervalId) {
        clearInterval(trackingIntervalId);
        trackingIntervalId = null;
    }
};

// Mobile menu toggle logic
function initMobileMenu() {
    const menuToggle = document.getElementById("mobile-menu-toggle");
    const navLinks = document.getElementById("nav-links");
    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            navLinks.classList.toggle("active");
            if (navLinks.classList.contains("active")) {
                menuToggle.innerHTML = '<i data-lucide="x"></i>';
            } else {
                menuToggle.innerHTML = '<i data-lucide="menu"></i>';
            }
            if (window.lucide) {
                lucide.createIcons();
            }
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileMenu);
} else {
    initMobileMenu();
}

// Global Helper: fetch browser location coordinates & geocode to Indian address
async function fetchCurrentLocationAddress(buttonEl) {
    const addressInput = document.getElementById("address");
    const areaSelect = document.getElementById("area_name");
    const pincodeInput = document.getElementById("pincode");
    
    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", "danger");
        return;
    }
    
    const originalHTML = buttonEl.innerHTML;
    buttonEl.disabled = true;
    buttonEl.innerHTML = `<i data-lucide="loader" class="pulse" style="width: 12px; height: 12px; vertical-align: middle;"></i> Locating...`;
    if (window.lucide) lucide.createIcons();
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Cache globally to avoid re-triggering prompt during submission
            window.bookingLatitude = lat;
            window.bookingLongitude = lon;
            
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
                    headers: {
                        'Accept-Language': 'en',
                        'User-Agent': 'PurakamApp/1.0'
                    }
                });
                if (!response.ok) throw new Error("Reverse geocoding lookup failed.");
                
                const data = await response.json();
                const addressObj = data.address || {};
                
                // Construct readable street address
                const parts = [];
                if (addressObj.house_number || addressObj.building) parts.push(addressObj.house_number || addressObj.building);
                if (addressObj.road) parts.push(addressObj.road);
                if (addressObj.suburb || addressObj.neighbourhood) parts.push(addressObj.suburb || addressObj.neighbourhood);
                if (addressObj.city_district) parts.push(addressObj.city_district);
                if (addressObj.city || addressObj.town || addressObj.village) parts.push(addressObj.city || addressObj.town || addressObj.village);
                if (addressObj.state) parts.push(addressObj.state);
                if (addressObj.postcode) parts.push(addressObj.postcode);
                
                const formattedAddress = parts.join(", ");
                if (addressInput) {
                    addressInput.value = formattedAddress;
                }
                
                // Autofill Pincode
                if (pincodeInput && addressObj.postcode) {
                    pincodeInput.value = addressObj.postcode;
                    pincodeInput.dispatchEvent(new Event('input'));
                }
                
                // Auto-select Mumbai Region Dropdown
                if (areaSelect) {
                    const cityStr = (addressObj.city || addressObj.city_district || addressObj.suburb || "").toLowerCase();
                    const suburbStr = (addressObj.suburb || addressObj.neighbourhood || "").toLowerCase();
                    
                    if (suburbStr.includes("bandra") || suburbStr.includes("khar") || suburbStr.includes("santa cruz")) {
                        areaSelect.value = "Bandra & Western Suburbs";
                    } else if (suburbStr.includes("andheri") || suburbStr.includes("juhu") || suburbStr.includes("vile parle")) {
                        areaSelect.value = "Andheri & Western Suburbs";
                    } else if (suburbStr.includes("colaba") || suburbStr.includes("fort") || suburbStr.includes("marine lines")) {
                        areaSelect.value = "Colaba & South Mumbai";
                    } else if (suburbStr.includes("dadar") || suburbStr.includes("prabhadevi") || suburbStr.includes("parel")) {
                        areaSelect.value = "Dadar & Central Mumbai";
                    } else if (suburbStr.includes("borivali") || suburbStr.includes("malad") || suburbStr.includes("kandivali")) {
                        areaSelect.value = "Borivali & Northern Suburbs";
                    } else if (suburbStr.includes("ghatkopar") || suburbStr.includes("kurla") || suburbStr.includes("vikhroli")) {
                        areaSelect.value = "Ghatkopar & Eastern Suburbs";
                    } else if (suburbStr.includes("powai") || suburbStr.includes("chandivali")) {
                        areaSelect.value = "Powai & East Mumbai";
                    } else if (cityStr.includes("thane") || suburbStr.includes("thane")) {
                        areaSelect.value = "Thane";
                    } else if (cityStr.includes("navi mumbai") || suburbStr.includes("navi mumbai") || cityStr.includes("panvel")) {
                        areaSelect.value = "Navi Mumbai";
                    }
                }
                
                showToast("Current location retrieved successfully!", "success");
            } catch (err) {
                console.error("Reverse geocoding error:", err);
                if (addressInput) {
                    addressInput.value = `Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                }
                showToast("Could not lookup full text address. Saved coordinate backup.", "warning");
            } finally {
                buttonEl.disabled = false;
                buttonEl.innerHTML = originalHTML;
                if (window.lucide) lucide.createIcons();
            }
        },
        (error) => {
            console.error("Geolocation fetch error:", error);
            showToast("Could not access browser location. Please check settings/permissions.", "danger");
            buttonEl.disabled = false;
            buttonEl.innerHTML = originalHTML;
            if (window.lucide) lucide.createIcons();
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}


