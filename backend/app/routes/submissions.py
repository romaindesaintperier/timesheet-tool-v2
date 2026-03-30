from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models import WeeklySubmission, SubmissionRow, gen_uuid
from ..schemas import SubmissionCreate, SubmissionOut, SubmissionRowSchema
from ..auth import validate_token

router = APIRouter(tags=["Submissions"])

def _to_out(sub: WeeklySubmission) -> SubmissionOut:
    return SubmissionOut(
        id=sub.id,
        employeeId=sub.employee_id,
        weekEnding=sub.week_ending,
        submittedAt=sub.submitted_at,
        status=sub.status,
        rows=[
            SubmissionRowSchema(id=r.id, category=r.category, codeId=r.code_id, hours=r.hours, location=r.location)
            for r in sub.rows
        ],
    )

@router.get("/submissions", response_model=list[SubmissionOut])
def list_submissions(
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(validate_token),
):
    q = db.query(WeeklySubmission)
    if dateFrom:
        q = q.filter(WeeklySubmission.week_ending >= dateFrom)
    if dateTo:
        q = q.filter(WeeklySubmission.week_ending <= dateTo)
    return [_to_out(s) for s in q.all()]

@router.post("/submissions", response_model=SubmissionOut)
def upsert_submission(body: SubmissionCreate, db: Session = Depends(get_db), _=Depends(validate_token)):
    existing = (
        db.query(WeeklySubmission)
        .filter(WeeklySubmission.employee_id == body.employeeId, WeeklySubmission.week_ending == body.weekEnding)
        .first()
    )
    if existing:
        db.query(SubmissionRow).filter(SubmissionRow.submission_id == existing.id).delete()
        existing.submitted_at = body.submittedAt
        existing.status = body.status
        for r in body.rows:
            db.add(SubmissionRow(
                id=r.id, submission_id=existing.id, category=r.category,
                code_id=r.codeId, hours=r.hours, location=r.location,
            ))
        db.commit()
        db.refresh(existing)
        return _to_out(existing)
    else:
        sub = WeeklySubmission(
            id=body.id, employee_id=body.employeeId, week_ending=body.weekEnding,
            submitted_at=body.submittedAt, status=body.status,
        )
        db.add(sub)
        db.flush()
        for r in body.rows:
            db.add(SubmissionRow(
                id=r.id, submission_id=sub.id, category=r.category,
                code_id=r.codeId, hours=r.hours, location=r.location,
            ))
        db.commit()
        db.refresh(sub)
        return _to_out(sub)
