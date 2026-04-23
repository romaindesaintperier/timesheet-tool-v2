"""
Seed script — run once to populate the database with initial data.
Usage: python seed.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models import Employee, CodeEntry, Location, UserRole, RoleEnum, gen_uuid

# Create all tables (if not using alembic)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Seed employees
EMPLOYEES = [
    ("1", "Nicholas Zeitlin", 11.3, "NY"),
    ("2", "Anne Arlinghaus", 11.3, "NY"),
    ("3", "Jyo Sinha", 11.3, "NY"),
    ("4", "Patricia Ludwig", 11.3, "NY"),
    ("5", "Karen Hollinger", 11.3, "NY"),
    ("6", "Javier Justiniano", 10.2, "NY"),
    ("7", "Ana Bakhshyan", 10.2, "NY"),
    ("8", "Sam Jones", 10.2, "NY"),
    ("9", "Graham Thomas", 10.2, "NY"),
    ("10", "Amar Ghai", 10.2, "NY"),
    ("11", "Paul Dhaliwal", 10.2, "NY"),
    ("12", "Maria Ramberger", 10.2, "NY"),
    ("13", "Nnamdi Maduagwu", 10.2, "NY"),
    ("14", "Claudia Benshimol", 10.2, "NY"),
    ("15", "Rafael Rivera", 10.2, "NY"),
    ("16", "Tyler Yoon", 10.2, "CA"),
    ("17", "Vivek Menon", 10.2, "CA"),
    ("18", "Sharon Zicherman", 10.2, "CA"),
    ("19", "Katy Yu", 9.0, "CA"),
    ("20", "Joy Lim", 9.0, "CA"),
    ("21", "Romain De Saint Perier", 9.0, "CA"),
    ("22", "Thomas Chen", 9.0, "CA"),
    ("23", "Judy Kim", 9.0, "CA"),
    ("24", "Colin Johnson", 9.0, "CA"),
    ("25", "Jay Shah", 9.0, "CA"),
    ("26", "Andrew Hennion", 9.0, "CA"),
    ("27", "Andrew Lindquist", 9.0, "CA"),
    ("28", "Alex Harada", 9.0, "CA"),
    ("29", "Ajaykumar Kutty", 9.0, "CA"),
    ("30", "Petie Burgdoerfer", 9.0, "CA"),
    ("31", "Ari Frankel", 9.0, "CA"),
    ("32", "Rana Ipeker", 9.0, "CA"),
    ("33", "Nicole Miles", 9.0, "CA"),
    ("34", "Daye Kim", 9.0, "CA"),
    ("35", "Pablo Illuzzi", 9.0, "CA"),
    ("36", "Rebecca Gould", 9.0, "CA"),
    ("37", "Andrew Abrams", 9.0, "CA"),
    ("38", "Lizzy Sura", 6.6, "CA"),
    ("39", "Bernhard Gapp", 6.6, "CA"),
    ("40", "Abigail Rhodes", 6.6, "CA"),
    ("41", "Aislin Roth", 6.6, "CA"),
    ("42", "Ryleigh Navert", 6.6, "CA"),
    ("43", "Eric Tay", 6.6, "CA"),
    ("44", "Henry Bristol", 6.6, "CA"),
    ("45", "Christopher Currey", 6.6, "CA"),
    ("46", "Clemens Hoffmann", 6.6, "CA"),
    ("47", "Victoria Yuan", 6.6, "CA"),
    ("48", "Chapel Puckett", 6.6, "CA"),
    ("49", "Ike Njoroge", 6.6, "CA"),
    ("50", "Julian Ashworth", 6.6, "CA"),
    ("51", "Liam Walsh", 6.6, "CA"),
    ("52", "Valeria Zuniga Morales", 6.6, "CA"),
    ("53", "Will Roth", 6.6, "CA"),
]

for eid, name, rate, state in EMPLOYEES:
    if not db.query(Employee).filter(Employee.id == eid).first():
        db.add(Employee(id=eid, name=name, rate=rate, home_state=state, active=True))

# Seed codes
CODES = [
    ("c1", "Project Alpha – Due Diligence", "1234", "due_diligence"),
    ("c2", "Project Beta – Portfolio", "9876", "portfolio_engagements"),
    ("c3", "Project Gamma – CoE Procurement", "3849", "functional_coes"),
    ("c4", "PTO", "PTO", "other"),
    ("c5", "Sick Time", "SICK", "other"),
    ("c6", "Admin", "ADMIN", "other"),
    ("c7", "Training", "TRAIN", "other"),
]

for cid, label, code, cat in CODES:
    if not db.query(CodeEntry).filter(CodeEntry.id == cid).first():
        db.add(CodeEntry(id=cid, label=label, code=code, category=cat, active=True))

# Seed locations
for loc in ["NY", "TX", "CA"]:
    if not db.query(Location).filter(Location.name == loc).first():
        db.add(Location(name=loc))

# Seed initial admin(s) — emails are stored lowercased to match auth.get_user_email
ADMIN_EMAILS = ["katy.yu@kkr.com"]
for email in ADMIN_EMAILS:
    if not db.query(UserRole).filter(UserRole.email == email).first():
        db.add(UserRole(email=email, role=RoleEnum.admin))

db.commit()
db.close()
print("✅ Database seeded successfully!")
