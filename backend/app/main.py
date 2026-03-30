from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .routes import employees, codes, locations, submissions, users

settings = get_settings()

app = FastAPI(title="Capstone Timesheet API", version="1.0.0")

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(employees.router, prefix="/api")
app.include_router(codes.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}
