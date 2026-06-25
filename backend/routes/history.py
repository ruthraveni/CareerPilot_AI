from fastapi import APIRouter, Depends
from utils.auth_deps import get_current_user
from config.database import get_collection

router = APIRouter()

@router.get("")
async def get_history(current_user: dict = Depends(get_current_user)):
    interviews_col = get_collection("interviews")
    cursor = interviews_col.find(
        {"user_id": current_user["id"], "status": "completed"}
    ).sort("created_at", -1)
    
    history = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        history.append(doc)
        
    return history
