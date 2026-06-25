from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from schemas.user_schema import UserCreate, UserLogin, UserResponse
from services.auth_service import create_user_service, login_user_service
from utils.jwt_handler import decode_access_token
from config.database import get_collection
from models.user_model import user_helper

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload.get("sub")
    if not email:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    users_collection = get_collection("users")
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user_helper(user)

from fastapi import Request, Response

@router.options("/register")
async def register_options():
    return Response(status_code=200)

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    return await create_user_service(user)

@router.post("/login")
async def login(user: UserLogin):
    return await login_user_service(user)
