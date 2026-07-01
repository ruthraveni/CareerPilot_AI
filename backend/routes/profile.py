from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from utils.auth_deps import get_current_user
from config.database import get_collection
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
import os
import time
import re
import logging

logger = logging.getLogger(__name__)

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
    avatarUrl: Optional[str] = None
    profile_image: Optional[str] = None
    projects: Optional[List[str]] = None

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
        "avatarUrl": user.get("avatarUrl") or (f"http://localhost:8000/{user.get('profile_image')}" if user.get("profile_image") else None),
        "projects": user.get("projects") if user.get("projects") is not None else []
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
        "certifications", "leetcodeSolved", "hackathonsAttended",
        "avatarUrl", "profile_image", "projects"
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

import cloudinary
import cloudinary.uploader

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    logger.info("request received: Profile image upload for user_id=%s, file=%s", current_user.get("id"), file.filename)
    try:
        users_collection = get_collection("users")
        user = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
        if not user:
            logger.error("User not found: %s", current_user["id"])
            raise HTTPException(status_code=404, detail="User not found")
            
        # Validate format
        filename = file.filename or ""
        ext = os.path.splitext(filename)[1].lower().replace(".", "")
        if ext not in ["jpg", "jpeg", "png", "webp"]:
            logger.error("Invalid file format: %s", ext)
            raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP images are allowed")
            
        # Validate size (max 5 MB)
        contents = await file.read()
        size = len(contents)
        if size > 5 * 1024 * 1024:
            logger.error("File size too large: %s bytes", size)
            raise HTTPException(status_code=400, detail="Image size exceeds 5 MB limit")
            
        # Verify Cloudinary environment variables
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        api_key = os.getenv("CLOUDINARY_API_KEY")
        api_secret = os.getenv("CLOUDINARY_API_SECRET")
        if not cloud_name or not api_key or not api_secret:
            logger.error("Cloudinary credentials are not configured on the server. CLOUDINARY_CLOUD_NAME: %s, CLOUDINARY_API_KEY: %s, CLOUDINARY_API_SECRET: %s", bool(cloud_name), bool(api_key), bool(api_secret))
            raise HTTPException(status_code=400, detail="Cloudinary credentials are not configured on the server.")
            
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret
        )
        
        # Cloudinary upload
        logger.info("Cloudinary upload: Uploading image to Cloudinary for user_id=%s", current_user["id"])
        try:
            result = cloudinary.uploader.upload(
                contents,
                folder="careerpilot/avatars",
                public_id=f"user_{current_user['id']}_{int(time.time())}",
                overwrite=True,
                resource_type="image"
            )
            secure_url = result.get("secure_url")
            if not secure_url:
                raise Exception("Secure URL not returned by Cloudinary")
            logger.info("Cloudinary upload: Successfully uploaded to Cloudinary. URL: %s", secure_url)
        except Exception as ce:
            logger.exception("Cloudinary upload failed")
            raise HTTPException(status_code=400, detail=f"Cloudinary upload failed: {str(ce)}")
            
        # Delete old image from Cloudinary if it exists
        old_image = user.get("avatarUrl")
        if old_image and "res.cloudinary.com" in old_image:
            try:
                # Extract public_id from url
                parts = old_image.split("/")
                if "careerpilot" in parts:
                    idx = parts.index("careerpilot")
                    public_id = "/".join(parts[idx:]).split(".")[0]
                    logger.info("Deleting old Cloudinary image: %s", public_id)
                    cloudinary.uploader.destroy(public_id)
            except Exception as e:
                logger.warning(f"Failed to delete old Cloudinary image: {e}")
                
        # MongoDB update
        logger.info("MongoDB update: Updating avatarUrl in MongoDB for user_id=%s to secure_url=%s", current_user["id"], secure_url)
        await users_collection.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": {"avatarUrl": secure_url}}
        )
        logger.info("MongoDB update: Successfully updated MongoDB avatarUrl for user_id=%s", current_user["id"])
        
        # Double check MongoDB store
        updated_user = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
        logger.info("MongoDB update verify: Verified MongoDB user avatarUrl: %s", updated_user.get("avatarUrl"))
        
        # response
        logger.info("response: Profile image upload finished successfully for user_id=%s", current_user["id"])
        return {
            "message": "Profile image uploaded successfully",
            "avatarUrl": secure_url
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Unhandled error in upload-image")
        raise HTTPException(status_code=400, detail=f"An unexpected error occurred during upload: {str(e)}")

@router.delete("/image")
async def delete_image(current_user: dict = Depends(get_current_user)):
    users_collection = get_collection("users")
    user = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
    
    if user and user.get("avatarUrl"):
        old_image = user.get("avatarUrl")
        
        # Delete from Cloudinary if applicable
        if "res.cloudinary.com" in old_image:
            cloudinary.config(
                cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
                api_key=os.getenv("CLOUDINARY_API_KEY", ""),
                api_secret=os.getenv("CLOUDINARY_API_SECRET", "")
            )
            try:
                parts = old_image.split("/")
                if "careerpilot" in parts:
                    idx = parts.index("careerpilot")
                    public_id = "/".join(parts[idx:]).split(".")[0]
                    cloudinary.uploader.destroy(public_id)
            except Exception as e:
                logger.warning(f"Failed to delete Cloudinary image: {e}")
                
        await users_collection.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$unset": {"avatarUrl": "", "profile_image": ""}}
        )
        
    return {"message": "Profile image deleted successfully"}
