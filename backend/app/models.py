import uuid
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Enum as PgEnum
from sqlalchemy.orm import relationship
from .database import Base
import enum

class CategoryEnum(str, enum.Enum):
    due_diligence = "due_diligence"
    portfolio_engagements = "portfolio_engagements"
    functional_coes = "functional_coes"
    other = "other"

class RoleEnum(str, enum.Enum):
    admin = "admin"
    user = "user"

class SubmissionStatusEnum(str, enum.Enum):
    submitted = "submitted"
    draft = "draft"

def gen_uuid():
    return str(uuid.uuid4())

class Employee(Base):
    __tablename__ = "employees"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    rate = Column(Float, nullable=False)
    home_state = Column(String, nullable=False)
    active = Column(Boolean, default=True)

class CodeEntry(Base):
    __tablename__ = "codes"
    id = Column(String, primary_key=True, default=gen_uuid)
    label = Column(String, nullable=False)
    code = Column(String, nullable=False)
    category = Column(PgEnum(CategoryEnum, name="category_enum", create_type=True), nullable=False)
    active = Column(Boolean, default=True)

class Location(Base):
    __tablename__ = "locations"
    name = Column(String, primary_key=True)

class UserRole(Base):
    __tablename__ = "user_roles"
    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False)
    role = Column(PgEnum(RoleEnum, name="role_enum", create_type=True), default=RoleEnum.user)

class WeeklySubmission(Base):
    __tablename__ = "weekly_submissions"
    id = Column(String, primary_key=True, default=gen_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    week_ending = Column(String, nullable=False)
    submitted_at = Column(String, nullable=False)
    status = Column(PgEnum(SubmissionStatusEnum, name="status_enum", create_type=True), nullable=False)
    # One location per workday — shared across all rows in the submission
    loc_monday = Column(String, nullable=True)
    loc_tuesday = Column(String, nullable=True)
    loc_wednesday = Column(String, nullable=True)
    loc_thursday = Column(String, nullable=True)
    loc_friday = Column(String, nullable=True)
    rows = relationship("SubmissionRow", back_populates="submission", cascade="all, delete-orphan")

class SubmissionRow(Base):
    __tablename__ = "submission_rows"
    id = Column(String, primary_key=True, default=gen_uuid)
    submission_id = Column(String, ForeignKey("weekly_submissions.id", ondelete="CASCADE"), nullable=False)
    category = Column(PgEnum(CategoryEnum, name="category_enum", create_type=False), nullable=False)
    code_id = Column(String, nullable=False)
    # Daily hours (Mon–Fri)
    monday = Column(Float, nullable=False, default=0)
    tuesday = Column(Float, nullable=False, default=0)
    wednesday = Column(Float, nullable=False, default=0)
    thursday = Column(Float, nullable=False, default=0)
    friday = Column(Float, nullable=False, default=0)
    submission = relationship("WeeklySubmission", back_populates="rows")
