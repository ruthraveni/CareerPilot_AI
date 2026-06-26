from config.database import get_collection
from models.user_model import user_helper
from schemas.user_schema import UserCreate, UserLogin
from utils.jwt_handler import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from fastapi import HTTPException
from datetime import datetime, timedelta

async def create_user_service(user: UserCreate):
    user_collection = get_collection("users")
    
    # Check if user already exists
    existing_user = await user_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user.password)
    new_user = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "role": "user",
        "created_at": datetime.utcnow()
    }
    
    result = await user_collection.insert_one(new_user)
    created_user = await user_collection.find_one({"_id": result.inserted_id})
    return user_helper(created_user)

async def login_user_service(user: UserLogin):
    user_collection = get_collection("users")
    
    # Find user by email
    db_user = await user_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found with this email.")
        
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user["email"], "id": str(db_user["_id"]), "role": db_user.get("role", "user")}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user_helper(db_user)
    }
