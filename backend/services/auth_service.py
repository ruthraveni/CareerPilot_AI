from config.database import get_collection
from models.user_model import user_helper
from schemas.user_schema import UserCreate, UserLogin
from utils.jwt_handler import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from fastapi import HTTPException
from datetime import datetime, timedelta
import logging

async def create_user_service(user: UserCreate):
    user_collection = get_collection("users")
    
    email_normalized = user.email.strip().lower()
    
    # Check if user already exists
    existing_user = await user_collection.find_one({"email": email_normalized})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user.password)
    new_user = {
        "name": user.name,
        "email": email_normalized,
        "password": hashed_password,
        "role": "user",
        "created_at": datetime.utcnow()
    }
    
    result = await user_collection.insert_one(new_user)
    created_user = await user_collection.find_one({"_id": result.inserted_id})
    return user_helper(created_user)

async def login_user_service(user: UserLogin):
    user_collection = get_collection("users")
    
    email_normalized = user.email.strip().lower()
    logging.info(f"Login attempt for email: {email_normalized}")
    
    # Find user by email
    db_user = await user_collection.find_one({"email": email_normalized})
    if not db_user:
        logging.warning(f"Login failed: User {email_normalized} not found in DB")
        raise HTTPException(status_code=404, detail="User not found with this email.")
    
    logging.info(f"User {email_normalized} found. Verifying password...")
    if not verify_password(user.password, db_user["password"]):
        logging.warning(f"Login failed: Incorrect password for {email_normalized}")
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
        
    logging.info(f"Login successful for {email_normalized}")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user["email"], "id": str(db_user["_id"]), "role": db_user.get("role", "user")}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user_helper(db_user)
    }
