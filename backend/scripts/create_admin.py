import os
import sys
import asyncio
from datetime import datetime

# Add the backend root directory to the python path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import get_collection
from utils.jwt_handler import get_password_hash

ADMIN_EMAIL = "ruthravenim2006@gmail.com"
ADMIN_PASSWORD = "AdminPassword123!" # Change this!

async def create_or_promote_admin():
    print(f"Checking for user: {ADMIN_EMAIL}...")
    
    users_col = get_collection("users")
    user = await users_col.find_one({"email": ADMIN_EMAIL})
    
    if user:
        current_role = user.get("role", "user")
        if current_role != "admin":
            print(f"User exists with role '{current_role}'. Upgrading to 'admin'...")
            await users_col.update_one(
                {"email": ADMIN_EMAIL},
                {"$set": {"role": "admin"}}
            )
            print("Successfully promoted user to admin.")
        else:
            print("User is already an admin. No changes made.")
    else:
        print("User does not exist. Creating new admin user...")
        hashed_password = get_password_hash(ADMIN_PASSWORD)
        
        new_admin = {
            "name": "System Admin",
            "email": ADMIN_EMAIL,
            "password": hashed_password,
            "role": "admin",
            "created_at": datetime.utcnow()
        }
        
        await users_col.insert_one(new_admin)
        print("Successfully created new admin user!")

if __name__ == "__main__":
    try:
        asyncio.run(create_or_promote_admin())
        print("Done.")
    except Exception as e:
        print(f"Error during admin creation: {e}")
        sys.exit(1)
