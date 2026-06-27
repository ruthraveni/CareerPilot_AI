from fastapi import APIRouter, Depends, HTTPException
from utils.auth_deps import get_current_user
from config.database import get_collection
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId

router = APIRouter()

class UserPreferencesRequest(BaseModel):
    theme: str
    font_size: str

@router.get("")
async def get_user_preferences(current_user: dict = Depends(get_current_user)):
    col = get_collection("user_preferences")
    prefs = await col.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not prefs:
        prefs = {
            "user_id": current_user["id"],
            "theme": "light",
            "font_size": "Medium"
        }
    
    return prefs

@router.post("")
async def update_user_preferences(request: UserPreferencesRequest, current_user: dict = Depends(get_current_user)):
    allowed_themes = ["light", "dark"]
    allowed_fonts = ["Small", "Medium", "Large"]
    
    if request.theme not in allowed_themes:
        raise HTTPException(status_code=400, detail="Invalid theme.")
    if request.font_size not in allowed_fonts:
        raise HTTPException(status_code=400, detail="Invalid font size.")
        
    col = get_collection("user_preferences")
    
    update_query = {
        "$set": {
            "theme": request.theme,
            "font_size": request.font_size,
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
    
    return {"status": "success", "message": "Appearance preferences saved successfully", "theme": request.theme, "font_size": request.font_size}
