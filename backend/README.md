# Capstone Timesheet API — FastAPI Backend

## Quick Start

### 1. Prerequisites
- Python 3.11+
- PostgreSQL 15+

### 2. Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL connection string and Azure AD credentials
```

### 4. Create Database & Run Migrations

```bash
# Create the database
createdb capstone_timesheet

# Generate initial migration
alembic revision --autogenerate -m "initial"

# Apply migration
alembic upgrade head
```

### 5. Seed Data

```bash
python seed.py
```

### 6. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

### 7. Connect the Frontend

Set this env var when running the frontend:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/employees` | List all employees |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/:id` | Update employee |
| GET | `/api/codes` | List all codes |
| POST | `/api/codes` | Create code |
| PUT | `/api/codes/:id` | Update code |
| GET | `/api/locations` | List locations |
| POST | `/api/locations` | Add location |
| DELETE | `/api/locations/:loc` | Remove location |
| GET | `/api/submissions` | List submissions (optional `dateFrom`, `dateTo` query params) |
| POST | `/api/submissions` | Create/update submission (upsert by employee+week) |
| GET | `/api/users/me/role` | Get current user's role |

All endpoints require `Authorization: Bearer <token>` header (Microsoft Entra ID JWT).

## Admin Roles

Insert admin users directly into the `user_roles` table:

```sql
INSERT INTO user_roles (id, email, role)
VALUES (gen_random_uuid(), 'admin@yourcompany.com', 'admin');
```

## Architecture

```
backend/
├── app/
│   ├── main.py          # FastAPI app, CORS, route mounting
│   ├── config.py        # Environment settings (Pydantic)
│   ├── database.py      # SQLAlchemy engine & session
│   ├── models.py        # ORM models (Employee, CodeEntry, etc.)
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── auth.py          # Entra ID JWT validation
│   └── routes/
│       ├── employees.py
│       ├── codes.py
│       ├── locations.py
│       ├── submissions.py
│       └── users.py
├── alembic/             # Database migrations
├── seed.py              # Initial data seeder
├── requirements.txt
└── .env.example
```
