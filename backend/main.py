from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from routes import auth, users, mentor, dashboard, interviews, profile, history, analytics, resume

app = FastAPI(title="CareerPilot AI Backend", version="1.0.0")

# Ensure static/avatars directory exists
os.makedirs("static/avatars", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(mentor.router, prefix="/api/mentor", tags=["AI Mentor"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(interviews.router, prefix="/api/interview", tags=["Interviews"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(resume.router, prefix="/api/resume", tags=["Resume Analyzer"])

from fastapi import Depends
from config.database import get_collection
from bson import ObjectId
from routes.auth import get_current_user

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
