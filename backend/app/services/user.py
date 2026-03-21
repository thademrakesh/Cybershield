from app.database import db
from app.schemas.user import UserCreate, UserInDB
from app.utils.security import get_password_hash
from datetime import datetime
from bson import ObjectId

async def create_user(user: UserCreate):
    user_dict = user.dict()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["created_at"] = datetime.utcnow()
    
    new_user = await db.users.insert_one(user_dict)
    created_user = await db.users.find_one({"_id": new_user.inserted_id})
    return created_user

async def get_user_by_username(username: str):
    return await db.users.find_one({"username": username})

async def get_user_by_email(email: str):
    return await db.users.find_one({"email": email})

async def update_user_password(email: str, new_password_hash: str):
    await db.users.update_one({"email": email}, {"$set": {"hashed_password": new_password_hash}})
