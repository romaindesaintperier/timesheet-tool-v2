from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models import WeeklySubmission, SubmissionRow
from ..schemas import (
    SubmissionCreate,
    SubmissionOut,
    SubmissionRowSchema,
    DailyLocationsSchema,
)
from ..auth import require_admin

router = APIRouter(tags=["Submissions"])

DAYS = ("monday", "tuesday", "wednesday", "thursday", "friday")


def _to_out(sub: WeeklySubmission) -> SubmissionOut:
    return SubmissionOut(
        id=sub.id,
        employeeId=sub.employee_id,
        weekEnding=sub.week_ending,
        submittedAt=sub.submitted_at,
        status=sub.status,
        dailyLocations=DailyLocationsSchema(
            monday=sub.loc_monday or "",
            tuesday=sub.loc_tuesday or "",
            wednesday=sub.loc_wednesday or "",
            thursday=sub.loc_thursday or "",
            friday=sub.loc_friday or "",
        ),
        rows=[
            SubmissionRowSchema(
                id=r.id,
                category=r.category,
                codeId=r.code_id,
                monday=r.monday or 0,
                tuesday=r.tuesday or 0,
                wednesday=r.wednesday or 0,
                thursday=r.thursday or 0,
                friday=r.friday or 0,
            )
            for r in sub.rows
        ],
    )


def _validate_payload(body: SubmissionCreate) -> None:
    """For each day with any hours > 0, require a non-empty location."""
    for day in DAYS:
        day_total = sum(getattr(r, day, 0) or 0 for r in body.rows)
        loc = getattr(body.dailyLocations, day, "") or ""
        if day_total > 0 and not loc.strip():
            raise HTTPException(
                status_code=422,
                detail=f"Location required for {day} (hours recorded that day).",
            )


@router.get("/submissions", response_model=list[SubmissionOut])
def list_submissions(
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = db.query(WeeklySubmission)
    if dateFrom:
        q = q.filter(WeeklySubmission.week_ending >= dateFrom)
    if dateTo:
        q = q.filter(WeeklySubmission.week_ending <= dateTo)
    return [_to_out(s) for s in q.all()]


@router.post("/submissions", response_model=SubmissionOut)
def upsert_submission(body: SubmissionCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    _validate_payload(body)
    dl = body.dailyLocations

    existing = (
        db.query(WeeklySubmission)
        .filter(WeeklySubmission.employee_id == body.employeeId, WeeklySubmission.week_ending == body.weekEnding)
        .first()
    )
    if existing:
        db.query(SubmissionRow).filter(SubmissionRow.submission_id == existing.id).delete()
        existing.submitted_at = body.submittedAt
        existing.status = body.status
        existing.loc_monday = dl.monday or None
        existing.loc_tuesday = dl.tuesday or None
        existing.loc_wednesday = dl.wednesday or None
        existing.loc_thursday = dl.thursday or None
        existing.loc_friday = dl.friday or None
        for r in body.rows:
            db.add(SubmissionRow(
                id=r.id, submission_id=existing.id, category=r.category,
                code_id=r.codeId,
                monday=r.monday or 0, tuesday=r.tuesday or 0,
                wednesday=r.wednesday or 0, thursday=r.thursday or 0,
                friday=r.friday or 0,
            ))
        db.commit()
        db.refresh(existing)
        return _to_out(existing)
    else:
        sub = WeeklySubmission(
            id=body.id, employee_id=body.employeeId, week_ending=body.weekEnding,
            submitted_at=body.submittedAt, status=body.status,
            loc_monday=dl.monday or None,
            loc_tuesday=dl.tuesday or None,
            loc_wednesday=dl.wednesday or None,
            loc_thursday=dl.thursday or None,
            loc_friday=dl.friday or None,
        )
        db.add(sub)
        db.flush()
        for r in body.rows:
            db.add(SubmissionRow(
                id=r.id, submission_id=sub.id, category=r.category,
                code_id=r.codeId,
                monday=r.monday or 0, tuesday=r.tuesday or 0,
                wednesday=r.wednesday or 0, thursday=r.thursday or 0,
                friday=r.friday or 0,
            ))
        db.commit()
        db.refresh(sub)
        return _to_out(sub)
