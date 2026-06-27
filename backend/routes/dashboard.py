from fastapi import APIRouter, Depends
from utils.auth_deps import get_current_user
from config.database import get_collection

router = APIRouter()

@router.get("")
async def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    interviews_col = get_collection("interviews")
    feedback_col = get_collection("interview_feedback")
    progress_col = get_collection("progress")
    
    # 1. Total interviews attended
    total_interviews = await interviews_col.count_documents(
        {"user_id": current_user["id"], "status": "completed"}
    )
    
    # 2. Average score
    cursor = progress_col.find({"user_id": current_user["id"]})
    scores = []
    async for p in cursor:
        scores.append(p["score"])
        
    avg_score = round(sum(scores) / len(scores)) if scores else 0
    
    # 3. Placement readiness
    readiness = "Needs Prep"
    if avg_score >= 75:
        readiness = "Ready"
    elif avg_score >= 50:
        readiness = "Improving"
        
    # 4. Confidence Score (from mock evaluations)
    # For now, default to 75% or average of communication scores if available
    cursor_feedback = feedback_col.find() # In next phases we filter by user's interviews
    feedback_scores = []
    async for f in cursor_feedback:
        feedback_scores.append(f.get("communication_score", 70))
    avg_confidence = round(sum(feedback_scores) / len(feedback_scores)) if feedback_scores else 75
    
    # 5. Weak areas
    # Default list if database is new, but can be updated dynamically
    weak_areas = [
        {"title": "Technical Knowledge", "score": "64%", "color": "bg-red-500", "desc": "Focus on System Design & DB concepts"},
        {"title": "Communication Skills", "score": "72%", "color": "bg-amber-500", "desc": "Work on structuring answers clearly"},
        {"title": "Speaking Speed", "score": "78%", "color": "bg-yellow-500", "desc": "Slow down slightly; pace is currently fast"}
    ]
    
    # 6. Progress timeline points
    # Fallback placeholder timeline if progress is empty
    timeline = []
    cursor_progress = progress_col.find({"user_id": current_user["id"]}).sort("created_at", 1)
    async for p in cursor_progress:
        timeline.append({
            "date": p["created_at"].strftime("%b %d"),
            "score": p["score"]
        })
        
    if not timeline:
        timeline = [
            {"date": "Day 1", "score": 50},
            {"date": "Day 5", "score": 62},
            {"date": "Day 10", "score": 75},
            {"date": "Day 15", "score": 82}
        ]
        
    return {
        "stats": {
            "totalInterviews": total_interviews,
            "avgScore": f"{avg_score}%",
            "placementReadiness": readiness,
            "confidenceScore": f"{avg_confidence}%"
        },
        "weakAreas": weak_areas,
        "timeline": timeline
    }
