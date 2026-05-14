from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routes import auth, admin, faculty, student, timetable, users, courses, rooms, academic, notifications
from app.database import connect_db, close_db
from fastapi.staticfiles import StaticFiles
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    # Database connected
    yield
    # Shutdown
    await close_db()

app = FastAPI(
    title="Smart Timetable API",
    version="1.0.0",
    lifespan=lifespan
)

# Static files mount removed (Avatars now in DB)
# app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS Configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(faculty.router, prefix="/faculty", tags=["Faculty"])
app.include_router(student.router, prefix="/student", tags=["Student"])
app.include_router(timetable.router, prefix="/timetable", tags=["Timetable"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(courses.router, prefix="/courses", tags=["Courses"])
app.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
app.include_router(academic.router, prefix="/academic", tags=["Academic"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

@app.get("/")
def root():
    return {"message": "Smart Timetable API", "status": "running"}
