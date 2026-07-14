"""SQLAlchemy models for user accounts, patients, and scan results."""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """Doctor / practitioner account."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    patients = db.relationship(
        "Patient", backref="doctor", lazy="dynamic", cascade="all, delete-orphan"
    )

    @property
    def is_patient(self):
        return False

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "age": self.age,
            "role": "doctor",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Patient(UserMixin, db.Model):
    """Patient record — belongs to one doctor. Can also login via portal."""
    __tablename__ = "patients"

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    medical_history = db.Column(db.Text, nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    contact_email = db.Column(db.String(255), nullable=True)
    portal_password_hash = db.Column(db.String(255), nullable=True)
    portal_enabled = db.Column(db.Boolean, default=False)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    @property
    def is_patient(self):
        return True

    def get_id(self):
        return f"p_{self.id}"

    scans = db.relationship(
        "ScanResult", backref="patient", lazy="dynamic",
        cascade="all, delete-orphan", order_by="ScanResult.created_at.desc()"
    )

    def to_dict(self, include_scan_count=True):
        d = {
            "id": self.id,
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "medicalHistory": self.medical_history,
            "contactPhone": self.contact_phone,
            "contactEmail": self.contact_email,
            "portalEnabled": self.portal_enabled,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
        if include_scan_count:
            d["scanCount"] = self.scans.count()
        return d

    def to_portal_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.contact_email,
            "full_name": self.name,
            "age": self.age,
            "role": "patient",
            "patient_id": self.id,
            "doctor_id": self.doctor_id,
        }


class ScanResult(db.Model):
    __tablename__ = "scan_results"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    file_name = db.Column(db.String(255))
    prediction = db.Column(db.String(100), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    all_probabilities = db.Column(db.JSON, nullable=True)
    heatmap_b64 = db.Column(db.Text, nullable=True)
    risk_level = db.Column(db.String(50))
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patientId": self.patient_id,
            "fileName": self.file_name,
            "prediction": self.prediction,
            "confidence": self.confidence,
            "allProbabilities": self.all_probabilities,
            "heatmap": self.heatmap_b64,
            "risk": self.risk_level,
            "date": self.created_at.isoformat() if self.created_at else None,
        }


class LifestyleGoal(db.Model):
    """Personalized lifestyle goal generated from a patient's AI report."""
    __tablename__ = "lifestyle_goals"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    target_value = db.Column(db.Float, nullable=True)
    unit = db.Column(db.String(50), nullable=True)
    frequency = db.Column(db.String(50), default="daily")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patientId": self.patient_id,
            "category": self.category,
            "title": self.title,
            "description": self.description,
            "targetValue": self.target_value,
            "unit": self.unit,
            "frequency": self.frequency,
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class DailyLog(db.Model):
    """Daily lifestyle metric log entry for a patient."""
    __tablename__ = "daily_logs"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    log_date = db.Column(db.Date, nullable=False)
    water_intake = db.Column(db.Float, nullable=True)
    sleep_hours = db.Column(db.Float, nullable=True)
    exercise_minutes = db.Column(db.Integer, nullable=True)
    mood = db.Column(db.Integer, nullable=True)
    diet_compliance = db.Column(db.Integer, nullable=True)
    symptoms = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    goals_completed = db.Column(db.JSON, nullable=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        db.UniqueConstraint("patient_id", "doctor_id", "log_date", name="uq_daily_log"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patientId": self.patient_id,
            "logDate": self.log_date.isoformat() if self.log_date else None,
            "waterIntake": self.water_intake,
            "sleepHours": self.sleep_hours,
            "exerciseMinutes": self.exercise_minutes,
            "mood": self.mood,
            "dietCompliance": self.diet_compliance,
            "symptoms": self.symptoms,
            "notes": self.notes,
            "goalsCompleted": self.goals_completed,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
