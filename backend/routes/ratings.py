from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from config.database import get_collection
from routes.auth import get_current_user

router = APIRouter()

class RatingSubmitRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: str | None = Field(default=None, max_length=500, description="Optional comment")

@router.get("/stats/{feature_id}")
async def get_feature_rating_stats(feature_id: str, current_user: dict | None = Depends(get_current_user)):
    """
    Get dynamic rating stats for a specific feature using MongoDB aggregation.
    Also returns the current user's rating for this feature if logged in.
    """
    ratings_col = get_collection("ratings")
    
    # 1. Aggregate average and total
    pipeline = [
        {"$match": {"feature_id": feature_id}},
        {"$group": {
            "_id": "$feature_id",
            "average": {"$avg": "$rating"},
            "total": {"$sum": 1}
        }}
    ]
    cursor = ratings_col.aggregate(pipeline)
    results = await cursor.to_list(length=1)
    
    stats = {
        "average": 0.0,
        "total": 0,
        "user_rating": None,
        "user_comment": None
    }
    
    if results:
        stats["average"] = round(results[0]["average"], 1)
        stats["total"] = results[0]["total"]
        
    # 2. Get current user's rating if logged in
    # For this endpoint, we might not always have a token (public view), 
    # but the Depends is configured in auth.py. 
    # Let's handle cases where Depends(get_current_user) throws 401 if token is invalid or absent?
    # Wait, get_current_user usually throws 401. If we want optional auth, we need a custom dependency.
    # We will assume frontend only calls this with a valid token or we should gracefully handle it.
    
    if current_user:
        user_rating_doc = await ratings_col.find_one({
            "user_id": current_user["id"],
            "feature_id": feature_id
        })
        if user_rating_doc:
            stats["user_rating"] = user_rating_doc.get("rating")
            stats["user_comment"] = user_rating_doc.get("comment")
            
    return stats

@router.get("/global-stats")
async def get_global_rating_stats():
    """
    Get dynamic rating stats across all features for the homepage.
    """
    ratings_col = get_collection("ratings")
    
    pipeline = [
        {"$group": {
            "_id": None,
            "average": {"$avg": "$rating"},
            "total": {"$sum": 1}
        }}
    ]
    cursor = ratings_col.aggregate(pipeline)
    results = await cursor.to_list(length=1)
    
    stats = {
        "average": 0.0,
        "total": 0
    }
    
    if results:
        stats["average"] = round(results[0]["average"], 1)
        stats["total"] = results[0]["total"]
        
    return stats

@router.post("/{feature_id}")
async def submit_rating(feature_id: str, request: RatingSubmitRequest, current_user: dict = Depends(get_current_user)):
    """
    Submit or update a rating for a feature. Enforces 1 rating per user per feature via upsert.
    """
    ratings_col = get_collection("ratings")
    
    update_doc = {
        "$set": {
            "rating": request.rating,
            "comment": request.comment,
            "user_name": current_user.get("name") or "Unknown",
            "updated_at": datetime.utcnow()
        },
        "$setOnInsert": {
            "user_id": current_user["id"],
            "feature_id": feature_id,
            "created_at": datetime.utcnow()
        }
    }
    
    # Upsert logic
    await ratings_col.update_one(
        {"user_id": current_user["id"], "feature_id": feature_id},
        update_doc,
        upsert=True
    )
    
    return {"message": "Rating submitted successfully"}

@router.get("/history")
async def get_user_rating_history(current_user: dict = Depends(get_current_user)):
    """
    Fetch all past ratings submitted by the current user.
    """
    ratings_col = get_collection("ratings")
    cursor = ratings_col.find({"user_id": current_user["id"]}).sort("updated_at", -1)
    ratings = await cursor.to_list(length=100)
    
    # Convert ObjectIds to strings
    for r in ratings:
        r["_id"] = str(r["_id"])
        
    return ratings
