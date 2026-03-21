from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from app.schemas.user import UserCreate, UserResponse, UserLogin, OTPVerify, ForgotPasswordRequest, ResetPassword, UserUpdate
from app.schemas.token import Token
from app.services.user import create_user, get_user_by_username, get_user_by_email, update_user_password
from app.utils.security import verify_password, create_access_token, get_password_hash
from app.config import settings
from app.utils.deps import get_current_user
from app.services.audit import log_audit_event
from app.services.notifications import generate_otp, send_otp_email, verify_otp
from app.database import db
import shutil
import os
import uuid

router = APIRouter()

# Ensure profile images directory exists
PROFILE_IMAGES_DIR = os.path.join("static", "profile_images")
os.makedirs(PROFILE_IMAGES_DIR, exist_ok=True)

@router.post("/register")
async def register(user: UserCreate):
    db_user = await get_user_by_username(user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_email = await get_user_by_email(user.email)
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate and send OTP
    otp = await generate_otp(user.email, purpose="registration")
    await send_otp_email(user.email, otp, purpose="registration")
    
    # Store temporary user data in a collection (not the main users collection yet)
    user_data = user.dict()
    await db.temp_users.update_one(
        {"email": user.email},
        {"$set": user_data},
        upsert=True
    )
    
    return {"message": "OTP sent to email for verification"}

@router.post("/verify-registration", response_model=UserResponse)
async def verify_registration(verify_data: OTPVerify):
    is_valid = await verify_otp(verify_data.email, verify_data.otp, purpose="registration")
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    temp_user = await db.temp_users.find_one({"email": verify_data.email})
    if not temp_user:
        raise HTTPException(status_code=400, detail="Registration data not found")
    
    # Create the actual user
    user_create = UserCreate(**temp_user)
    created_user = await create_user(user_create)
    
    # Clean up temp data
    await db.temp_users.delete_one({"email": verify_data.email})
    
    created_user["id"] = str(created_user["_id"])
    return created_user

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await get_user_by_email(request.email)
    if not user:
        # Don't reveal if user exists for security
        return {"message": "If an account exists with this email, an OTP has been sent."}
    
    otp = await generate_otp(request.email, purpose="forgot_password")
    await send_otp_email(request.email, otp, purpose="password reset")
    
    return {"message": "If an account exists with this email, an OTP has been sent."}

@router.post("/reset-password")
async def reset_password(request: ResetPassword):
    is_valid = await verify_otp(request.email, request.otp, purpose="forgot_password")
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    user = await get_user_by_email(request.email)
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
    
    new_password_hash = get_password_hash(request.new_password)
    await update_user_password(request.email, new_password_hash)
    
    return {"message": "Password reset successful"}

@router.put("/profile", response_model=UserResponse)
async def update_profile(user_update: UserUpdate, current_user = Depends(get_current_user)):
    update_data = user_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided to update")
    
    # If email is being changed, check if it's already taken
    if "email" in update_data and update_data["email"] != current_user["email"]:
        existing_user = await get_user_by_email(update_data["email"])
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    # If username is being changed, check if it's already taken
    if "username" in update_data and update_data["username"] != current_user["username"]:
        existing_user = await get_user_by_username(update_data["username"])
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already in use")

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    updated_user["id"] = str(updated_user["_id"])
    return updated_user

@router.post("/profile/image")
async def upload_profile_image(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(PROFILE_IMAGES_DIR, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Store relative path in database
    image_url = f"/static/profile_images/{unique_filename}"
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"profile_image": image_url}}
    )
    
    return {"profile_image": image_url}

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user_by_username(form_data.username)
    if not user:
        user = await get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        await log_audit_event(
            action="Login Attempt",
            resource="User Authentication",
            details=f"Failed login attempt for user: {form_data.username}",
            user=form_data.username,
            status="failed",
            severity="medium"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.get("disabled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You were inactive please contact admin to active your account",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    await log_audit_event(
        action="Login Attempt",
        resource="User Authentication",
        details="Successful login",
        user=user["username"],
        status="success",
        severity="info"
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_user)):
    return current_user
