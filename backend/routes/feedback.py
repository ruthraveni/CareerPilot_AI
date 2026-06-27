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
    
    feedback_data = {
        "user_id": current_user["id"],
        "message": msg,
        "section": request.section,
        "createdAt": datetime.utcnow()
    }
    
    await feedback_col.insert_one(feedback_data)
    
    return {"status": "success", "message": "Feedback submitted successfully"}
