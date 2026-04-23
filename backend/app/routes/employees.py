from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Employee, gen_uuid
from ..schemas import EmployeeCreate, EmployeeUpdate, EmployeeOut
from ..auth import validate_token, require_admin

router = APIRouter(tags=["Employees"])

# Read: any authenticated user (needed for the timesheet form employee picker).
@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db), _=Depends(validate_token)):
    emps = db.query(Employee).all()
    return [EmployeeOut(id=e.id, name=e.name, rate=e.rate, homeState=e.home_state, active=e.active) for e in emps]

# Write: admin only.
@router.post("/employees", response_model=EmployeeOut)
def create_employee(body: EmployeeCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    emp = Employee(id=gen_uuid(), name=body.name, rate=body.rate, home_state=body.homeState, active=body.active)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return EmployeeOut(id=emp.id, name=emp.name, rate=emp.rate, homeState=emp.home_state, active=emp.active)

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
    return EmployeeOut(id=emp.id, name=emp.name, rate=emp.rate, homeState=emp.home_state, active=emp.active)
