from fastapi import APIRouter, Depends, HTTPException, Body
from utils.auth_deps import get_current_user
from config.database import get_collection
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId

router = APIRouter()

class FeedbackRequest(BaseModel):
    message: str
    section: str = "settings"

@router.post("/")
async def submit_feedback(request: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    msg = request.message.strip()
    if not msg or len(msg) < 5:
        raise HTTPException(status_code=400, detail="Feedback message must be at least 5 characters long.")
        
    feedback_col = get_collection("feedbacks")
    users_col = get_collection("users")
    
    user_doc = await users_col.find_one({"_id": ObjectId(current_user["id"])})
    user_name = user_doc.get("name") or user_doc.get("fullName", "Unknown") if user_doc else "Unknown"
    user_email = user_doc.get("email", "Unknown") if user_doc else "Unknown"
    
    feedback_data = {
        "user_id": current_user["id"],
        "user_name": user_name,
        "user_email": user_email,
        "message": msg,
        "section": request.section,
        "createdAt": datetime.utcnow()
    }
    
    await feedback_col.insert_one(feedback_data)
    
    return {"status": "success", "message": "Feedback submitted successfully"}
