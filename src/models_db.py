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

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "age": self.age,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Patient(db.Model):
    """Patient record — belongs to one doctor."""
    __tablename__ = "patients"

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    medical_history = db.Column(db.Text, nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    contact_email = db.Column(db.String(255), nullable=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

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
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
        if include_scan_count:
            d["scanCount"] = self.scans.count()
        return d


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
