from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import UserRole, RoleEnum
from ..schemas import RoleOut
from ..auth import get_user_email

router = APIRouter(tags=["Users"])

@router.get("/users/me/role", response_model=RoleOut)
def get_my_role(email: str = Depends(get_user_email), db: Session = Depends(get_db)):
    """
    Returns the role for the authenticated user.
    If no role is assigned, defaults to 'user'.
    """
    user_role = db.query(UserRole).filter(UserRole.email == email).first()
    if user_role:
        return RoleOut(role=user_role.role)
    return RoleOut(role=RoleEnum.user)
