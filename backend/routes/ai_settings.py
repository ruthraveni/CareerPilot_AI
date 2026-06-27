from fastapi import APIRouter, Depends, HTTPException
from utils.auth_deps import get_current_user
from config.database import get_collection
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class AISettingRequest(BaseModel):
    field: str
    value: str

ALLOWED_RECRUITER_LEVELS = ["Entry", "Medium (Associate)", "Senior", "Lead"]
ALLOWED_LANGUAGES = ["English", "Tamil", "Hindi", "Mixed (English + Tamil)"]
ALLOWED_FIELDS = ["preferred_recruiter_level", "interview_language", "primary_target_role", "primary_target_company"]

@router.get("/")
async def get_ai_settings(current_user: dict = Depends(get_current_user)):
    col = get_collection("ai_settings")
    settings = await col.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not settings:
        settings = {
            "user_id": current_user["id"],
            "preferred_recruiter_level": "Medium (Associate)",
            "interview_language": "English",
            "primary_target_role": "Software Engineer",
            "primary_target_company": "Google"
        }
    
    return settings

@router.post("/")
async def update_ai_setting(request: AISettingRequest, current_user: dict = Depends(get_current_user)):
    if request.field not in ALLOWED_FIELDS:
        raise HTTPException(status_code=400, detail=f"Invalid field. Allowed fields: {', '.join(ALLOWED_FIELDS)}")
        
    val = request.value.strip()
    
    if request.field == "preferred_recruiter_level" and val not in ALLOWED_RECRUITER_LEVELS:
        raise HTTPException(status_code=400, detail=f"Invalid recruiter level. Allowed: {', '.join(ALLOWED_RECRUITER_LEVELS)}")
        
    if request.field == "interview_language" and val not in ALLOWED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Invalid language. Allowed: {', '.join(ALLOWED_LANGUAGES)}")
        
    if not val:
        raise HTTPException(status_code=400, detail="Value cannot be empty.")
        
    col = get_collection("ai_settings")
    
    update_query = {
        "$set": {
            request.field: val,
            "updatedAt": datetime.utcnow()
        },
        "$setOnInsert": {
            "user_id": current_user["id"]
        }
    }
    
    await col.update_one(
        {"user_id": current_user["id"]},
        update_query,
        upsert=True
    )
    
    return {"status": "success", "message": f"{request.field} updated successfully", "field": request.field, "value": val}
