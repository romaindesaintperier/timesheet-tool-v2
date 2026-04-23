

## Plan: Lock down submissions API to admin-only

### The vulnerability
Both submission routes use only `Depends(validate_token)`, which means **any** authenticated Entra ID user can:
- `GET /api/submissions` → read every employee's timesheet, including across date ranges
- `POST /api/submissions` → create or overwrite a submission for **any** `employeeId` in the request body (it's a blind upsert keyed on `employeeId + weekEnding`)

The role system (`UserRole` table, `require_admin` dependency) already exists and is used on `employees`/`codes`/`locations` write routes — submissions just never adopted it.

### Authorization model (per your decisions)
- **Admin-only** for both read and write on submissions.
- Non-admin authenticated users get **403 Forbidden**.
- First admin: `Katy.Yu@kkr.com` (seeded into `user_roles`).
- No employee↔user email mapping needed (you opted not to scope to "your own timesheet"). This is the smallest, safest change and matches the existing admin-managed workflow.

### Backend changes

**1. `backend/app/routes/submissions.py`** — swap the dependency on both routes:
```python
# Before:  _=Depends(validate_token)
# After:   _=Depends(require_admin)
```
Applied to:
- `GET /submissions` (list, with date filters)
- `POST /submissions` (upsert)

No changes to `_to_out`, `_validate_payload`, the schema, the model, or the upsert logic.

**2. `backend/seed.py`** — append a one-time seed of the first admin so the protected routes are usable on first deploy:
```python
ADMIN_EMAILS = ["katy.yu@kkr.com"]   # lowercased to match auth.get_user_email
for email in ADMIN_EMAILS:
    if not db.query(UserRole).filter(UserRole.email == email).first():
        db.add(UserRole(email=email, role=RoleEnum.admin))
```
Idempotent — safe to re-run.

### Frontend changes

**3. `src/components/EmployeeSelect.tsx`** — this is the only non-admin caller of `fetchSubmissions()` (used to show an employee's past-week history before opening the form). Under the new rule, non-admins will get 403 here. Minimal fix:
- Wrap the `fetchSubmissions()` call in a try/catch that **silently** treats 403 as "no history available" instead of showing an error toast.
- The picker still works; the "Past submissions" section just shows the empty state.

No other frontend caller is affected for non-admins:
- `Admin.tsx` and `Reports.tsx` are already gated behind admin-only routes/UI.
- `Index.tsx`'s `?edit=<id>` flow is launched from the admin Submissions tab, so callers are admins.

### Files changed
| File | Change |
|---|---|
| `backend/app/routes/submissions.py` | `validate_token` → `require_admin` on GET and POST |
| `backend/seed.py` | Seed `katy.yu@kkr.com` as first admin |
| `src/components/EmployeeSelect.tsx` | Swallow 403 from `fetchSubmissions()`; show empty history |

### Authorization rules now enforced
- `GET /api/submissions` → **admin only** (403 otherwise)
- `POST /api/submissions` → **admin only** (403 otherwise)
- All other submission-related access patterns (no detail/history endpoints exist) are covered by the same two routes.

### Assumptions & limitations
- **Admin-only is intentional**: per your answer, normal users do not self-serve their own timesheets through this API. If that changes later, the smallest follow-up is adding an `employee_id` column to `user_roles` (or a separate `employee_user` mapping table) and a `require_admin_or_owner(employee_id)` dependency. Not implementing now.
- **Seed must be run once** on the deployed database for Katy to gain admin. Subsequent admins are added via the existing admin UI (or another seed run).
- **Frontend role gating stays as-is** — backend is now the source of truth; UI hiding remains a UX nicety, not the security boundary.
- **No schema migration required** — `UserRole` table already exists.

