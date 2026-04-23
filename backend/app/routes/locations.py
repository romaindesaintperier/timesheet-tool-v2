from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Location
from ..schemas import LocationCreate
from ..auth import validate_token, require_admin

router = APIRouter(tags=["Locations"])

# Read: any authenticated user (needed for the daily-locations selector in the form).
@router.get("/locations", response_model=list[str])
def list_locations(db: Session = Depends(get_db), _=Depends(validate_token)):
    return [loc.name for loc in db.query(Location).all()]

# Write: admin only.
@router.post("/locations")
def create_location(body: LocationCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    existing = db.query(Location).filter(Location.name == body.location).first()
    if existing:
        raise HTTPException(status_code=409, detail="Location already exists")
    db.add(Location(name=body.location))
    db.commit()
    return {"location": body.location}

# Write: admin only.
@router.delete("/locations/{loc}")
def delete_location(loc: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    location = db.query(Location).filter(Location.name == loc).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(location)
    db.commit()
    return {"ok": True}
