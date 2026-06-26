from fastapi import APIRouter, Depends
from config.database import get_collection
from utils.auth_deps import get_admin_user
from models.user_model import user_helper
from bson import ObjectId

router = APIRouter(dependencies=[Depends(get_admin_user)])

@router.get("/users")
async def get_all_users():
    users_col = get_collection("users")
    cursor = users_col.find({}).sort("created_at", -1)
    users = []
    async for user in cursor:
        users.append(user_helper(user))
    return users

@router.get("/stats")
async def get_stats():
    users_col = get_collection("users")
    
    total_users = await users_col.count_documents({})
    
    # Calculate total mentor chats and get a sample of recent ones
    total_chats = 0
    recent_logs = []
    
    cursor = users_col.find({"mentor_chats": {"$exists": True, "$ne": []}})
    async for user in cursor:
        chats = user.get("mentor_chats", [])
        total_chats += len(chats) // 2  # Each interaction has 1 user msg and 1 ai msg
        
        # Get the last 2 interactions if available
        if chats:
            user_info = {"name": user.get("name"), "email": user.get("email")}
            recent_logs.extend([{"user": user_info, "chat": c} for c in chats[-4:]])
            
    # Sort recent logs by timestamp descending
    recent_logs.sort(key=lambda x: x["chat"].get("timestamp", ""), reverse=True)
    
    return {
        "total_users": total_users,
        "total_chats": total_chats,
        "recent_logs": recent_logs[:20] # Return top 20 recent logs
    }
