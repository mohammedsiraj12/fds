from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import ALLOWED_ORIGINS
from routers import (
    auth, patients, doctors, messages, health, files, 
    enhanced_consultations, prescriptions, profiles, 
    notifications, advanced_appointments, medical_history, admin, reviews, search, password_reset, video_conference
)

app = FastAPI(title="Doctor Consultation API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(enhanced_consultations.router)
app.include_router(advanced_appointments.router)
app.include_router(prescriptions.router)
app.include_router(profiles.router)
app.include_router(notifications.router)
app.include_router(medical_history.router)
app.include_router(admin.router)
app.include_router(reviews.router)
app.include_router(search.router)
app.include_router(password_reset.router)
app.include_router(messages.router)
app.include_router(health.router)
app.include_router(files.router)
app.include_router(video_conference.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
