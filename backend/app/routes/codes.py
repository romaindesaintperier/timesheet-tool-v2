from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import CodeEntry, gen_uuid
from ..schemas import CodeCreate, CodeUpdate, CodeOut
from ..auth import validate_token, require_admin

router = APIRouter(tags=["Codes"])

# Read: any authenticated user (needed for the timesheet form code dropdowns).
@router.get("/codes", response_model=list[CodeOut])
def list_codes(db: Session = Depends(get_db), _=Depends(validate_token)):
    return db.query(CodeEntry).all()

# Write: admin only.
@router.post("/codes", response_model=CodeOut)
def create_code(body: CodeCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    code = CodeEntry(id=gen_uuid(), label=body.label, code=body.code, category=body.category, active=body.active)
    db.add(code)
    db.commit()
    db.refresh(code)
    return code

# Write: admin only.
@router.put("/codes/{code_id}", response_model=CodeOut)
def update_code(code_id: str, body: CodeUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    code = db.query(CodeEntry).filter(CodeEntry.id == code_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(code, field, value)
    db.commit()
    db.refresh(code)
    return code
