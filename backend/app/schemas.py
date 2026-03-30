from pydantic import BaseModel
from typing import Optional
from .models import CategoryEnum, RoleEnum, SubmissionStatusEnum

# ── Employees ──
class EmployeeCreate(BaseModel):
    name: str
    rate: float
    homeState: str
    active: bool = True

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    rate: Optional[float] = None
    homeState: Optional[str] = None
    active: Optional[bool] = None

class EmployeeOut(BaseModel):
    id: str
    name: str
    rate: float
    homeState: str
    active: bool
    class Config:
        from_attributes = True

# ── Codes ──
class CodeCreate(BaseModel):
    label: str
    code: str
    category: CategoryEnum
    active: bool = True

class CodeUpdate(BaseModel):
    label: Optional[str] = None
    code: Optional[str] = None
    category: Optional[CategoryEnum] = None
    active: Optional[bool] = None

class CodeOut(BaseModel):
    id: str
    label: str
    code: str
    category: CategoryEnum
    active: bool
    class Config:
        from_attributes = True

# ── Locations ──
class LocationCreate(BaseModel):
    location: str

# ── Submissions ──
class SubmissionRowSchema(BaseModel):
    id: str
    category: CategoryEnum
    codeId: str
    hours: float
    location: str

class SubmissionCreate(BaseModel):
    id: str
    employeeId: str
    weekEnding: str
    rows: list[SubmissionRowSchema]
    submittedAt: str
    status: SubmissionStatusEnum

class SubmissionOut(BaseModel):
    id: str
    employeeId: str
    weekEnding: str
    rows: list[SubmissionRowSchema]
    submittedAt: str
    status: SubmissionStatusEnum
    class Config:
        from_attributes = True

# ── Role ──
class RoleOut(BaseModel):
    role: RoleEnum
