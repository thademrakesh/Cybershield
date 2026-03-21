from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "user"
    profile_image: Optional[str] = None

class UserCreate(UserBase):
    password: str
    disabled: bool = False

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    profile_image: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str
    purpose: str = "registration"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class UserInDB(UserBase):
    hashed_password: str
    created_at: datetime
