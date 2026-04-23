from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Union
from ..database import get_db
from ..models import Employee, gen_uuid
from ..schemas import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeOutPublic
from ..auth import get_user_email, is_admin, require_admin

router = APIRouter(tags=["Employees"])


def _to_admin(e: Employee) -> EmployeeOut:
    return EmployeeOut(id=e.id, name=e.name, rate=e.rate, homeState=e.home_state, active=e.active)


def _to_public(e: Employee) -> EmployeeOutPublic:
    return EmployeeOutPublic(id=e.id, name=e.name, homeState=e.home_state, active=e.active)


# Read: any authenticated user (needed for the timesheet form employee picker).
# Pay `rate` is admin-only — non-admin callers receive EmployeeOutPublic without it.
@router.get("/employees", response_model=list[Union[EmployeeOut, EmployeeOutPublic]])
def list_employees(
    db: Session = Depends(get_db),
    email: str = Depends(get_user_email),
):
    emps = db.query(Employee).all()
    if is_admin(email, db):
        return [_to_admin(e) for e in emps]
    return [_to_public(e) for e in emps]


# Write: admin only.
@router.post("/employees", response_model=EmployeeOut)
def create_employee(body: EmployeeCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    emp = Employee(id=gen_uuid(), name=body.name, rate=body.rate, home_state=body.homeState, active=body.active)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _to_admin(emp)


# Write: admin only.
@router.put("/employees/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: str, body: EmployeeUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    # Map incoming camelCase fields to the ORM column names.
    field_map = {"name": "name", "rate": "rate", "homeState": "home_state", "active": "active"}
    for field, value in body.model_dump(exclude_unset=True).items():
        if field in field_map:
            setattr(emp, field_map[field], value)
    db.commit()
    db.refresh(emp)
    return _to_admin(emp)
