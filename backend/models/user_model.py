from datetime import datetime

def user_helper(user) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "password": user.get("password"),
        "role": user.get("role", "user"),
        "created_at": user.get("created_at")
    }
