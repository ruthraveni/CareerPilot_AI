from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from utils.auth_deps import get_current_user
from config.database import get_collection
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
import os
import time
import re

router = APIRouter()

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    careerGoal: Optional[str] = None
    collegeName: Optional[str] = None
    department: Optional[str] = None
    yearOfStudy: Optional[str] = None
    targetRole: Optional[str] = None
    dreamCompany: Optional[str] = None
    preferredDomain: Optional[str] = None
    
    # Skills
    languages: Optional[List[str]] = None
    frameworks: Optional[List[str]] = None
    databases: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    softSkills: Optional[List[str]] = None
    
    # Achievements
    certifications: Optional[List[str]] = None
    leetcodeSolved: Optional[int] = None
    hackathonsAttended: Optional[int] = None

@router.get("")
async def get_profile(current_user: dict = Depends(get_current_user)):
    users_collection = get_collection("users")
    user = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Return user details, fallback to "No data available" if empty
    return {
        "name": user.get("name") or current_user.get("name") or "No data available",
        "email": user.get("email") or current_user.get("email") or "No data available",
        "careerGoal": user.get("careerGoal") or "No data available",
        "collegeName": user.get("collegeName") or "No data available",
        "department": user.get("department") or "No data available",
        "yearOfStudy": user.get("yearOfStudy") or "No data available",
        "targetRole": user.get("targetRole") or "No data available",
        "dreamCompany": user.get("dreamCompany") or "No data available",
        "preferredDomain": user.get("preferredDomain") or "No data available",
        
        "languages": user.get("languages") if user.get("languages") is not None else [],
        "frameworks": user.get("frameworks") if user.get("frameworks") is not None else [],
        "databases": user.get("databases") if user.get("databases") is not None else [],
        "tools": user.get("tools") if user.get("tools") is not None else [],
        "softSkills": user.get("softSkills") if user.get("softSkills") is not None else [],
        
        "certifications": user.get("certifications") if user.get("certifications") is not None else [],
        "leetcodeSolved": user.get("leetcodeSolved") if user.get("leetcodeSolved") is not None else 0,
        "hackathonsAttended": user.get("hackathonsAttended") if user.get("hackathonsAttended") is not None else 0,
        "avatarUrl": f"http://localhost:8000/{user.get('profile_image')}" if user.get("profile_image") else None
    }

@router.put("")
async def update_profile(request: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    users_collection = get_collection("users")
    
    # Build dynamic update dict
    update_data = {}
    data = request.dict(exclude_unset=True)
    
    if "name" in data:
        name = data["name"]
        if name is not None:
            name = name.strip()
            if len(name) < 3:
                raise HTTPException(status_code=400, detail="Name must be at least 3 characters")
            update_data["name"] = name
            
    if "email" in data:
        email = data["email"]
        if email is not None:
            email = email.strip().lower()
            email_regex = r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"
            if not re.match(email_regex, email):
                raise HTTPException(status_code=400, detail="Invalid email format")
            # Check if email is already in use by another user
            existing = await users_collection.find_one({"email": email, "_id": {"$ne": ObjectId(current_user["id"])}})
            if existing:
                raise HTTPException(status_code=400, detail="Email is already registered by another account")
            update_data["email"] = email
            
    # Add other fields
    for field in [
        "careerGoal", "collegeName", "department", "yearOfStudy", 
        "targetRole", "dreamCompany", "preferredDomain",
        "languages", "frameworks", "databases", "tools", "softSkills",
        "certifications", "leetcodeSolved", "hackathonsAttended"
    ]:
        if field in data and data[field] is not None:
            update_data[field] = data[field]
            
    if not update_data:
        return {"message": "No updates provided"}
        
    await users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": update_data}
    )
    return {"message": "Profile updated successfully"}

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    users_collection = get_collection("users")
    user = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Validate format
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower().replace(".", "")
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP images are allowed")
        
    # Validate size (max 5 MB)
    contents = await file.read()
    size = len(contents)
    if size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 5 MB limit")
        
    # Remove old image file if exists
    old_image = user.get("profile_image")
    if old_image and os.path.exists(old_image):
        try:
            os.remove(old_image)
        except Exception:
            pass
            
    # Save the new file to static/avatars/
    unique_filename = f"{current_user['id']}_{int(time.time())}.{ext}"
    file_path = f"static/avatars/{unique_filename}"
    
    os.makedirs("static/avatars", exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(contents)
        
    # Update path in DB
    await users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"profile_image": file_path}}
    )
    
    return {
        "message": "Profile image uploaded successfully",
        "avatarUrl": f"http://localhost:8000/{file_path}"
    }

@router.delete("/image")
async def delete_image(current_user: dict = Depends(get_current_user)):
    users_collection = get_collection("users")
    user = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Delete image file from disk
    old_image = user.get("profile_image")
    if old_image and os.path.exists(old_image):
        try:
            os.remove(old_image)
        except Exception:
            pass
            
    # Set to null in DB
    await users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"profile_image": None}}
    )
    
    return {"message": "Profile image removed successfully"}
