from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleUserLogin(BaseModel):
    # Production: send the Google OAuth access token; the backend verifies it with Google.
    access_token: Optional[str] = None
    # Development only (requires ALLOW_MOCK_GOOGLE_LOGIN=true on the backend).
    email: Optional[EmailStr] = None
    name: Optional[str] = None


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str = Field(..., min_length=10, max_length=15)
    address: Optional[str] = None
    role: Literal["customer", "partner"] = "customer"
    terms_agree: bool = True

    
    # Partner specific fields if role == "partner"
    service_category: Optional[str] = None
    hourly_rate: Optional[float] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    aadhar_card: Optional[str] = None
    pan_card: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    phone: Optional[str] = Field(None, min_length=10, max_length=15)
    address: Optional[str] = None

class PartnerProfileUpdate(BaseModel):

    service_category: Optional[str] = None
    hourly_rate: Optional[float] = None
    experience_years: Optional[int] = None
    availability_status: Optional[bool] = None
    bio: Optional[str] = None

class PartnerProfileResponse(BaseModel):
    id: int
    user_id: int
    service_category: str
    hourly_rate: float
    rating: float
    availability_status: bool
    bio: Optional[str] = None
    completed_jobs: int
    experience_years: Optional[int] = 2
    aadhar_card: Optional[str] = None
    pan_card: Optional[str] = None


    class Config:
        from_attributes = True

class PartnerLocationUpdate(BaseModel):
    latitude: float
    longitude: float

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    role: str
    is_verified: bool = True
    created_at: datetime
    partner_profile: Optional[PartnerProfileResponse] = None
    access_token: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class ServiceCategoryResponse(BaseModel):
    id: int
    name: str
    icon_key: str
    description: str
    base_price: float

    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    service_category: str
    booking_date: str  # YYYY-MM-DD
    time_slot: str
    details: Optional[str] = None
    price: float
    address: str
    payment_method: str = "UPI"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    partner_id: Optional[int] = None
    area_name: Optional[str] = None
    pincode: str

class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    booking_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BookingResponse(BaseModel):
    id: int
    customer_id: int
    partner_id: Optional[int] = None
    service_category: str
    booking_date: str
    time_slot: str
    details: Optional[str] = None
    price: float
    status: str
    address: str
    payment_method: str
    payment_status: str
    attachment_path: Optional[str] = None
    otp: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_name: Optional[str] = None
    pincode: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    accepted_at: Optional[datetime] = None
    created_at: datetime
    
    # Optionally embed customer and partner user details
    customer: Optional[UserResponse] = None
    partner: Optional[UserResponse] = None
    review: Optional[ReviewResponse] = None

    class Config:
        from_attributes = True

class RazorpayVerification(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

class ChatMessageCreate(BaseModel):
    message_text: str = Field(..., min_length=1, max_length=1000)

class ChatMessageResponse(BaseModel):
    id: int
    booking_id: int
    sender_id: int
    message_text: str
    timestamp: datetime
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True

class CategoryCount(BaseModel):
    name: str
    count: int

class AdminStatsResponse(BaseModel):
    total_bookings: int
    total_customers: int
    total_partners_online: int
    total_partners_offline: int
    total_revenue: float
    category_breakdown: List[CategoryCount]
    total_requested_bookings: Optional[int] = 0
    total_assigned_bookings: Optional[int] = 0
    total_cancelled_bookings: Optional[int] = 0
    average_assignment_time_seconds: Optional[float] = 0.0

class ServiceCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    icon_key: str = Field(..., min_length=1)
    description: str = Field(..., min_length=5)
    base_price: float = Field(..., ge=0.0)

class ServiceCategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon_key: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
