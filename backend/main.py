from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
import os
from routes import auth, users, mentor, dashboard, interviews, profile, history, analytics, resume, feedback, ai_settings, user_preferences

app = FastAPI(title="CareerPilot AI Backend", version="1.0.0")

# Ensure static/avatars directory exists
os.makedirs("static/avatars", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS middleware
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://frontend-brown-psi-79.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://frontend-.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Compression for performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
from routes import admin
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(mentor.router, prefix="/api/mentor", tags=["AI Mentor"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(interviews.router, prefix="/api/interview", tags=["Interviews"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(resume.router, prefix="/api/resume", tags=["Resume Analyzer"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(ai_settings.router, prefix="/api/ai-settings", tags=["AI Settings"])
app.include_router(user_preferences.router, prefix="/api/user-preferences", tags=["User Preferences"])
from routes import ratings
app.include_router(ratings.router, prefix="/api/ratings", tags=["Ratings"])

from fastapi import Depends
from config.database import get_collection, init_db_indexes
from bson import ObjectId
from routes.auth import get_current_user

import cloudinary
import logging

@app.on_event("startup")
async def startup_event():
    await init_db_indexes()
    
    # Initialize Cloudinary
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    
    if cloud_name and api_key and api_secret:
        try:
            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret
            )
            logging.info("Cloudinary successfully initialized on startup.")
        except Exception as ce:
            logging.error(f"Failed to initialize Cloudinary on startup: {ce}")
    else:
        logging.warning("Cloudinary credentials missing from environment. Image uploads will be disabled.")

@app.put("/api/update-profile", tags=["Profile"])
async def update_profile_direct(request: dict, current_user: dict = Depends(get_current_user)):
    users_collection = get_collection("users")
    
    update_data = {}
    if "fullName" in request:
        update_data["name"] = request["fullName"]
    if "email" in request:
        update_data["email"] = request["email"]
        
    if update_data:
        await users_collection.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": update_data}
        )
    return {"message": "Profile updated successfully"}

@app.get("/")
async def root():
    return {"message": "Welcome to CareerPilot AI API"}
