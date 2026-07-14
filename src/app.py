import os

# Load .env before anything else so all os.environ.get() calls pick it up
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed; rely on shell environment

os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")

import io
import json as json_module
import time
import numpy as np
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import Flask, request, jsonify, send_from_directory
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from PIL import Image

import tf_keras
from tf_keras.layers import BatchNormalization, Flatten

try:
    from src.models_db import db, User, Patient, ScanResult, LifestyleGoal, DailyLog
    from src.gradcam import generate_heatmap
    from src.ai_chains import (
        generate_goals_with_langchain,
        compare_patients_with_langchain,
        generate_tracker_feedback,
        generate_report_with_langgraph,
    )
except ImportError:
    from models_db import db, User, Patient, ScanResult, LifestyleGoal, DailyLog
    from gradcam import generate_heatmap
    from ai_chains import (
        generate_goals_with_langchain,
        compare_patients_with_langchain,
        generate_tracker_feedback,
        generate_report_with_langgraph,
    )


# ── Keras 2 compatibility patches ─────────────────────────────────────────

class FixedBatchNormalization(BatchNormalization):
    def __init__(self, *args, **kwargs):
        if "axis" in kwargs and isinstance(kwargs["axis"], (list, tuple)):
            kwargs["axis"] = kwargs["axis"][0]
        super().__init__(*args, **kwargs)

    @classmethod
    def from_config(cls, config):
        if "axis" in config and isinstance(config["axis"], (list, tuple)):
            config["axis"] = config["axis"][0]
        return super().from_config(config)


class FixedFlatten(Flatten):
    def call(self, inputs, *args, **kwargs):
        if isinstance(inputs, list):
            inputs = inputs[0]
        kwargs.pop("training", None)
        return super().call(inputs)


CUSTOM_OBJECTS = {
    "BatchNormalization": FixedBatchNormalization,
    "Flatten": FixedFlatten,
}

# ── Paths ──────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "Brain_tumor_inception_model.h5")
FRONTEND_DIST = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

DOCTOR_EMAIL = "aniketpurohit851@gmail.com"
SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")

# ── Flask app ──────────────────────────────────────────────────────────────

app = Flask(__name__, static_folder=None)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///" + os.path.join(os.path.dirname(BASE_DIR), "neuroscan.db")
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
bcrypt = Bcrypt(app)

login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    user_id = str(user_id)
    if user_id.startswith("p_"):
        pid = int(user_id[2:])
        return Patient.query.filter_by(id=pid, portal_enabled=True).first()
    return db.session.get(User, int(user_id))


@login_manager.unauthorized_handler
def unauthorized_callback():
    return jsonify({"error": "Authentication required"}), 401


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "*")
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


# ── Create tables ──────────────────────────────────────────────────────────

with app.app_context():
    db.create_all()

# ── Load ML model ─────────────────────────────────────────────────────────

model = None
model_load_error = None

print("Loading model...")
start_time = time.time()
if os.path.exists(MODEL_PATH):
    try:
        model = tf_keras.models.load_model(
            MODEL_PATH,
            compile=False,
            custom_objects=CUSTOM_OBJECTS,
            safe_mode=False,
        )
        print(f"Model loaded in {time.time() - start_time:.2f}s.")
    except Exception as e:
        model_load_error = str(e)
        print(f"Model load failed: {model_load_error}")
else:
    model_load_error = f"Model file not found at {MODEL_PATH}"
    print(f"WARNING: {model_load_error}")

CLASS_MAP = {
    0: "Glioma Tumor",
    1: "Meningioma Tumor",
    2: "No Tumor",
    3: "Pituitary Tumor",
}

RISK_MAP = {
    "Glioma Tumor": "High",
    "Meningioma Tumor": "Medium",
    "Pituitary Tumor": "Medium",
    "No Tumor": "Low",
}


def preprocess_image(img_stream):
    img = Image.open(img_stream)
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = img.resize((224, 224))
    img_array = np.array(img).astype("float32")
    img_array /= 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array


# ── Auth Routes ────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST", "OPTIONS"])
def register():
    if request.method == "OPTIONS":
        return "", 204
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    age = data.get("age")

    if not email or not password or not full_name:
        return jsonify({"error": "Email, password, and full name are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(email=email, password_hash=pw_hash, full_name=full_name, age=age)
    db.session.add(user)
    db.session.commit()
    login_user(user, remember=True)
    return jsonify({"user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return "", 204
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    login_user(user, remember=True)
    return jsonify({"user": user.to_dict()})


@app.route("/api/auth/logout", methods=["POST", "OPTIONS"])
def logout():
    if request.method == "OPTIONS":
        return "", 204
    logout_user()
    return jsonify({"ok": True})


@app.route("/api/auth/me")
def me():
    if current_user.is_authenticated:
        if current_user.is_patient:
            return jsonify({"user": current_user.to_portal_dict()})
        return jsonify({"user": current_user.to_dict()})
    return jsonify({"user": None}), 401


# ── Patient Portal Auth ───────────────────────────────────────────────────

@app.route("/api/auth/patient/login", methods=["POST", "OPTIONS"])
def patient_login():
    if request.method == "OPTIONS":
        return "", 204
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    patient = Patient.query.filter_by(contact_email=email, portal_enabled=True).first()
    if not patient or not patient.portal_password_hash:
        return jsonify({"error": "Invalid email or password."}), 401
    if not bcrypt.check_password_hash(patient.portal_password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    login_user(patient, remember=True)
    return jsonify({"user": patient.to_portal_dict()})


@app.route("/api/patients/<int:pid>/portal/enable", methods=["POST", "OPTIONS"])
@login_required
def enable_patient_portal(pid):
    """Doctor enables portal access for a patient with a password."""
    if request.method == "OPTIONS":
        return "", 204
    if current_user.is_patient:
        return jsonify({"error": "Not authorized"}), 403

    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    if not patient.contact_email:
        return jsonify({"error": "Patient must have an email address to enable portal."}), 400

    data = request.json or {}
    password = data.get("password", "")
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    patient.portal_password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    patient.portal_enabled = True
    db.session.commit()
    return jsonify({"ok": True, "message": f"Portal enabled for {patient.name}"})


# ── Patient Routes (doctor-isolated) ──────────────────────────────────────

@app.route("/api/patients", methods=["GET"])
@login_required
def list_patients():
    patients = (
        Patient.query
        .filter_by(doctor_id=current_user.id)
        .order_by(Patient.created_at.desc())
        .all()
    )
    return jsonify({"patients": [p.to_dict() for p in patients]})


@app.route("/api/patients", methods=["POST", "OPTIONS"])
@login_required
def create_patient():
    if request.method == "OPTIONS":
        return "", 204
    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Patient name is required."}), 400

    patient = Patient(
        doctor_id=current_user.id,
        name=name,
        age=data.get("age"),
        gender=data.get("gender", "").strip() or None,
        medical_history=data.get("medical_history", "").strip() or None,
        contact_phone=data.get("contact_phone", "").strip() or None,
        contact_email=data.get("contact_email", "").strip() or None,
    )
    
    password = data.get("password", "")
    if password and patient.contact_email:
        if len(password) >= 6:
            patient.portal_password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
            patient.portal_enabled = True

    db.session.add(patient)
    db.session.commit()
    return jsonify({"patient": patient.to_dict()}), 201


@app.route("/api/patients/<int:pid>", methods=["GET"])
@login_required
def get_patient(pid):
    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    return jsonify({"patient": patient.to_dict()})


@app.route("/api/patients/<int:pid>", methods=["PUT", "OPTIONS"])
@login_required
def update_patient(pid):
    if request.method == "OPTIONS":
        return "", 204
    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    data = request.json or {}
    if "name" in data:
        patient.name = data["name"].strip()
    if "age" in data:
        patient.age = data["age"]
    if "gender" in data:
        patient.gender = data["gender"].strip() or None
    if "medical_history" in data:
        patient.medical_history = data["medical_history"].strip() or None
    if "contact_phone" in data:
        patient.contact_phone = data["contact_phone"].strip() or None
    if "contact_email" in data:
        patient.contact_email = data["contact_email"].strip() or None
    db.session.commit()
    return jsonify({"patient": patient.to_dict()})


@app.route("/api/patients/<int:pid>", methods=["DELETE", "OPTIONS"])
@login_required
def delete_patient(pid):
    if request.method == "OPTIONS":
        return "", 204
    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    db.session.delete(patient)
    db.session.commit()
    return jsonify({"ok": True})


@app.route("/api/patients/<int:pid>/scans", methods=["GET"])
@login_required
def patient_scans(pid):
    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    scans = patient.scans.all()
    return jsonify({
        "patient": patient.to_dict(include_scan_count=False),
        "scans": [s.to_dict() for s in scans],
    })


# ── API Routes ─────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})


@app.route("/api/predict", methods=["POST", "OPTIONS"])
@login_required
def predict():
    if request.method == "OPTIONS":
        return "", 204

    if model is None:
        detail = model_load_error or "Unknown model load error"
        return jsonify({"error": f"Model is not loaded: {detail}"}), 500

    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    image_file = request.files["image"]
    if image_file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    patient_id = request.form.get("patient_id")
    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400

    patient = Patient.query.filter_by(id=int(patient_id), doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    try:
        print(f"Prediction request: {image_file.filename} for patient {patient.name}")
        img_bytes = image_file.read()
        processed_img = preprocess_image(io.BytesIO(img_bytes))
        predictions = model.predict(processed_img, verbose=0)

        class_idx = int(np.argmax(predictions))
        confidence = float(predictions[0][class_idx]) * 100
        result = CLASS_MAP.get(class_idx, "Unknown")
        risk = RISK_MAP.get(result, "Unknown")
        all_probs = {
            CLASS_MAP[i]: round(float(predictions[0][i]) * 100, 2) for i in range(4)
        }

        heatmap_b64 = None
        if result != "No Tumor":
            try:
                heatmap_b64 = generate_heatmap(model, processed_img, class_idx)
            except Exception as hm_err:
                print(f"Heatmap generation failed (non-fatal): {hm_err}")

        scan = ScanResult(
            patient_id=patient.id,
            doctor_id=current_user.id,
            file_name=image_file.filename,
            prediction=result,
            confidence=round(confidence, 2),
            all_probabilities=all_probs,
            heatmap_b64=heatmap_b64,
            risk_level=risk,
        )
        db.session.add(scan)
        db.session.commit()

        print(f"Result: {result} ({confidence:.2f}%)")
        return jsonify({
            "id": scan.id,
            "prediction": result,
            "prediction_prob": round(confidence, 2),
            "all_probabilities": all_probs,
            "heatmap": heatmap_b64,
            "risk": risk,
        })
    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/scans")
@login_required
def list_scans():
    scans = (
        ScanResult.query
        .filter_by(doctor_id=current_user.id)
        .order_by(ScanResult.created_at.desc())
        .limit(200)
        .all()
    )
    return jsonify({"scans": [s.to_dict() for s in scans]})


@app.route("/api/scans/<int:scan_id>", methods=["DELETE", "OPTIONS"])
@login_required
def delete_scan(scan_id):
    if request.method == "OPTIONS":
        return "", 204
    scan = ScanResult.query.filter_by(id=scan_id, doctor_id=current_user.id).first()
    if not scan:
        return jsonify({"error": "Scan not found"}), 404
    db.session.delete(scan)
    db.session.commit()
    return jsonify({"ok": True})


@app.route("/api/dashboard")
@login_required
def dashboard_stats():
    """Aggregate stats for the current doctor."""
    total_patients = Patient.query.filter_by(doctor_id=current_user.id).count()
    all_scans = ScanResult.query.filter_by(doctor_id=current_user.id)
    total_scans = all_scans.count()
    tumors = all_scans.filter(ScanResult.prediction != "No Tumor").count()
    clear = total_scans - tumors

    from sqlalchemy import func
    avg_conf = db.session.query(func.avg(ScanResult.confidence)).filter(
        ScanResult.doctor_id == current_user.id
    ).scalar() or 0

    recent = (
        all_scans
        .order_by(ScanResult.created_at.desc())
        .limit(5)
        .all()
    )

    return jsonify({
        "totalPatients": total_patients,
        "totalScans": total_scans,
        "tumorsDetected": tumors,
        "clearScans": clear,
        "avgConfidence": round(float(avg_conf), 1),
        "recentScans": [s.to_dict() for s in recent],
    })


@app.route("/api/send-report", methods=["POST", "OPTIONS"])
@login_required
def send_report():
    if request.method == "OPTIONS":
        return "", 204

    data = request.json
    prediction = data.get("prediction")
    confidence = data.get("confidence")

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        return jsonify({"error": "Email configuration is missing on the server."}), 500

    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_EMAIL
        msg["To"] = DOCTOR_EMAIL
        msg["Subject"] = f"URGENT: Automated MRI Scan Report - {prediction}"

        body = f"""\
Dear Doctor,

An automated MRI scan analysis has been completed.

Doctor: {current_user.full_name}
Diagnostic Result: {prediction}
AI Confidence Level: {confidence}%

Please review the patient's scan in the system immediately.

Regards,
Brain Tumor Detection System"""
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()

        return jsonify({"success": "Report sent successfully."})
    except Exception as e:
        print(f"Email Error: {e}")
        return jsonify({"error": f"Failed to send email: {str(e)}"}), 500


# ── Static report templates (used when AI is unavailable) ─────────────────

_STATIC = {
    "Glioma Tumor": {
        "overall_risk": "High",
        "treatment_urgency": "Urgent (within 1 week)",
        "prognosis": (
            "Glioma prognosis depends significantly on tumour grade, molecular markers "
            "(IDH mutation, MGMT methylation), and extent of surgical resection. "
            "Low-grade gliomas may have a median survival of several years with treatment, "
            "while high-grade gliomas (GBM) require aggressive multimodal therapy. "
            "Early specialist referral and molecular profiling are critical to optimise outcomes."
        ),
        "recommended_specialists": [
            "Neuro-Oncologist", "Neurosurgeon", "Radiation Oncologist", "Neuropsychologist",
        ],
        "caregiver_guidance": (
            "Caregivers should monitor the patient for sudden changes in behaviour, speech, "
            "or seizure activity and seek emergency care immediately if these occur. "
            "Maintain a calm routine, assist with medication adherence, and attend all "
            "specialist appointments together. Psychological support for both patient and "
            "family is strongly encouraged."
        ),
        "emergency_warning_signs": [
            "Sudden onset of severe headache unlike any experienced before",
            "New or prolonged seizure activity",
            "Sudden weakness, numbness, or paralysis of face, arm, or leg",
            "Rapid loss of speech or difficulty understanding language",
            "Sudden vision loss or double vision",
            "Loss of consciousness or confusion",
        ],
    },
    "Meningioma Tumor": {
        "overall_risk": "Medium",
        "treatment_urgency": "Semi-urgent (within 1 month)",
        "prognosis": (
            "Most meningiomas are WHO Grade I (benign) and carry an excellent prognosis "
            "with appropriate treatment. Surgical resection is curative in the majority of "
            "cases. Atypical (Grade II) and anaplastic (Grade III) variants require "
            "adjuvant radiation and carry a higher recurrence risk. Regular MRI surveillance "
            "is essential regardless of treatment approach."
        ),
        "recommended_specialists": [
            "Neurosurgeon", "Neuro-Oncologist", "Ophthalmologist (if near optic pathways)",
        ],
        "caregiver_guidance": (
            "For patients under observation (watchful waiting), caregivers should help "
            "document any new or worsening symptoms such as headaches, vision changes, or "
            "weakness. Accompany the patient to all scheduled MRI follow-ups and maintain "
            "a written symptom log to share with the treating physician."
        ),
        "emergency_warning_signs": [
            "Sudden worsening of headache or new severe headache",
            "Sudden vision loss or field defect",
            "Rapid onset of limb weakness or facial drooping",
            "New seizure activity",
            "Sudden hearing loss",
        ],
    },
    "Pituitary Tumor": {
        "overall_risk": "Medium",
        "treatment_urgency": "Semi-urgent (within 1 month)",
        "prognosis": (
            "The majority of pituitary adenomas are benign and respond well to medical "
            "therapy or surgical resection. Prolactinomas typically respond excellently "
            "to dopamine agonists. Post-treatment hormonal replacement may be lifelong "
            "for some patients. Regular endocrine and imaging follow-up is necessary to "
            "monitor for recurrence and hormonal status."
        ),
        "recommended_specialists": [
            "Endocrinologist", "Neurosurgeon (trans-sphenoidal specialist)", "Ophthalmologist",
        ],
        "caregiver_guidance": (
            "Caregivers should help the patient track hormonal symptoms such as mood "
            "changes, fatigue, weight fluctuations, and visual disturbances. Ensure "
            "medication compliance for hormone replacement or medical therapy. Assist "
            "with regular blood tests and accompany the patient to endocrinology and "
            "neurosurgery appointments."
        ),
        "emergency_warning_signs": [
            "Sudden severe headache (pituitary apoplexy — a medical emergency)",
            "Sudden vision loss or double vision",
            "Severe vomiting with altered consciousness",
            "Rapidly worsening visual field loss",
            "Signs of adrenal crisis: extreme weakness, low BP, confusion",
        ],
    },
    "No Tumor": {
        "overall_risk": "Low",
        "treatment_urgency": "Routine",
        "prognosis": (
            "No tumour was identified on MRI analysis, which is a reassuring finding. "
            "The patient should continue routine health monitoring. If original presenting "
            "symptoms persist despite a clear scan, clinical correlation with a neurologist "
            "is recommended to investigate alternative causes."
        ),
        "recommended_specialists": [
            "Neurologist (if symptoms persist)", "Primary Care Physician",
        ],
        "caregiver_guidance": (
            "Reassure the patient while acknowledging that a clear scan does not always "
            "explain all symptoms. Encourage the patient to maintain a healthy lifestyle, "
            "attend routine check-ups, and report any new or worsening neurological "
            "symptoms to their doctor promptly."
        ),
        "emergency_warning_signs": [
            "Sudden, severe headache unlike any before",
            "New onset seizures",
            "Sudden weakness, speech difficulty, or vision changes",
            "Loss of consciousness",
        ],
    },
}

_DIET = {
    "Glioma Tumor": {
        "overview": "An anti-inflammatory, antioxidant-rich diet supports brain health and complements treatment. Prioritise whole foods, omega-3 fatty acids, and colourful plant-based foods.",
        "recommended": [
            {"category": "Omega-3 Rich Foods", "items": ["Wild salmon", "Sardines", "Mackerel", "Flaxseeds", "Chia seeds"], "benefit": "Reduce neuroinflammation and support brain membrane integrity"},
            {"category": "Antioxidant-Rich Foods", "items": ["Blueberries", "Spinach", "Broccoli", "Kale", "Dark chocolate 70%+"], "benefit": "Combat oxidative stress linked to tumour progression"},
            {"category": "Lean Proteins", "items": ["Chicken breast", "Turkey", "Lentils", "Tofu", "Eggs"], "benefit": "Essential for tissue repair and immune function during treatment"},
            {"category": "Healthy Fats", "items": ["Avocados", "Extra virgin olive oil", "Walnuts", "Almonds"], "benefit": "Provide sustained energy and support cell repair"},
            {"category": "Whole Grains", "items": ["Quinoa", "Brown rice", "Oats", "Whole wheat bread"], "benefit": "Stable energy without glucose spikes that can fuel tumour cell metabolism"},
        ],
        "avoid": [
            {"category": "Processed & Fried Foods", "items": ["Fast food", "Chips", "Packaged snacks", "Deep-fried items"], "reason": "High in trans fats that promote systemic inflammation"},
            {"category": "Sugary Foods & Drinks", "items": ["Sodas", "Candy", "Pastries", "White bread"], "reason": "Excess sugar may accelerate tumour cell metabolism"},
            {"category": "Alcohol & Stimulants", "items": ["Alcohol (all types)", "Excessive caffeine"], "reason": "Interferes with treatment medications and impairs immune function"},
        ],
        "supplements": [
            {"name": "Vitamin D3", "dose": "1000–2000 IU/day", "note": "May support immune function — confirm with oncologist"},
            {"name": "Omega-3 Fish Oil", "dose": "1–2 g EPA+DHA/day", "note": "Consult oncologist before use during chemotherapy"},
            {"name": "Curcumin with Piperine", "dose": "As prescribed", "note": "Anti-inflammatory — inform your oncologist before use"},
        ],
        "hydration": "Drink 8–10 glasses (2–2.5 L) of water daily. Herbal teas (green tea, chamomile) are beneficial. Avoid sugary drinks and alcohol entirely.",
        "meal_timing": "Eat 5–6 small balanced meals daily. Avoid heavy meals within 3 hours of sleep. Maintain consistent meal times to regulate energy.",
    },
    "Meningioma Tumor": {
        "overview": "A Mediterranean-style anti-inflammatory diet is recommended. Focus on reducing hormonal stimulation and supporting brain vascular health.",
        "recommended": [
            {"category": "Anti-Inflammatory Foods", "items": ["Olive oil", "Turmeric", "Ginger", "Fatty fish", "Berries"], "benefit": "Reduce inflammation around the tumour site"},
            {"category": "Cruciferous Vegetables", "items": ["Broccoli", "Cauliflower", "Brussels sprouts", "Cabbage"], "benefit": "Contain sulforaphane which may inhibit tumour cell growth"},
            {"category": "Calcium-Rich Foods", "items": ["Low-fat dairy", "Fortified plant milk", "Leafy greens", "Almonds"], "benefit": "Support bone health, especially important if on steroids"},
            {"category": "Lean Proteins", "items": ["Chicken", "Fish", "Legumes", "Eggs", "Greek yogurt"], "benefit": "Support tissue repair and maintain muscle mass"},
            {"category": "Fiber-Rich Foods", "items": ["Oats", "Whole grain bread", "Beans", "Flaxseeds"], "benefit": "Support gut health and reduce systemic inflammation"},
        ],
        "avoid": [
            {"category": "Hormone-Disrupting Foods", "items": ["Excess soy products", "Non-organic dairy", "Conventional meat with hormones"], "reason": "Some meningiomas have hormone receptors that may be stimulated"},
            {"category": "High-Sodium Processed Foods", "items": ["Canned soups", "Processed meats", "Fast food", "Salty snacks"], "reason": "High sodium worsens water retention and brain oedema"},
            {"category": "Alcohol & Tobacco", "items": ["All alcoholic beverages", "Tobacco products"], "reason": "Linked to increased recurrence risk and impaired healing"},
        ],
        "supplements": [
            {"name": "Vitamin D3", "dose": "1000–2000 IU/day", "note": "Especially important if sun exposure is limited"},
            {"name": "Calcium", "dose": "500–1000 mg/day", "note": "Critical if prescribed corticosteroids — consult doctor"},
            {"name": "Omega-3 Fish Oil", "dose": "1 g/day", "note": "May reduce peritumoral oedema — discuss with neurosurgeon"},
        ],
        "hydration": "Drink 8 glasses (2 L) of water daily. Limit caffeine to 1 cup of coffee per day.",
        "meal_timing": "Eat 4–5 balanced meals at consistent times. If on corticosteroids, eat regularly to manage blood sugar and weight.",
    },
    "Pituitary Tumor": {
        "overview": "Diet must address the hormonal consequences of the tumour. Focus on stabilising blood sugar, supporting adrenal and thyroid function, and maintaining bone density.",
        "recommended": [
            {"category": "Blood Sugar Stabilising Foods", "items": ["Oats", "Sweet potatoes", "Brown rice", "Legumes", "Non-starchy vegetables"], "benefit": "Prevents insulin spikes that worsen cortisol dysregulation"},
            {"category": "Bone-Strengthening Foods", "items": ["Low-fat milk", "Fortified plant milk", "Broccoli", "Almonds", "Sardines with bones"], "benefit": "Critical for preventing osteoporosis from hormonal imbalances"},
            {"category": "Lean Proteins", "items": ["Fish", "Chicken", "Eggs", "Lentils", "Tofu"], "benefit": "Support muscle preservation when growth hormone is dysregulated"},
            {"category": "Iodine & Selenium Sources", "items": ["Seafood", "Brazil nuts", "Sunflower seeds", "Eggs"], "benefit": "Support thyroid function which may be affected by pituitary changes"},
            {"category": "Colourful Vegetables", "items": ["Bell peppers", "Spinach", "Tomatoes", "Carrots", "Beets"], "benefit": "Provide vitamins for overall hormonal balance"},
        ],
        "avoid": [
            {"category": "High-Sugar & Refined Carbs", "items": ["White bread", "Sugary cereals", "Soft drinks", "Cakes", "Candy"], "reason": "Worsen insulin resistance and cortisol abnormalities"},
            {"category": "High-Sodium Foods", "items": ["Processed meats", "Canned foods", "Fast food", "Excess soy sauce"], "reason": "Increases hypertension risk linked to cortisol excess"},
            {"category": "Alcohol & Stimulants", "items": ["Alcohol", "Excessive caffeine", "Energy drinks"], "reason": "Disrupts hormonal signalling and medication efficacy"},
        ],
        "supplements": [
            {"name": "Calcium + Vitamin D3", "dose": "500 mg Ca + 1000 IU D3/day", "note": "Essential for bone protection — confirm with endocrinologist"},
            {"name": "Vitamin B Complex", "dose": "Daily", "note": "Supports nervous system and energy metabolism"},
            {"name": "Magnesium Glycinate", "dose": "200–400 mg/day", "note": "Supports sleep, muscle function, and stress response"},
        ],
        "hydration": "Drink 8–10 glasses of water daily. If diabetes insipidus is present, follow doctor's specific fluid guidance carefully.",
        "meal_timing": "Eat 3 main meals and 2 small snacks at consistent times. Never skip breakfast — blood sugar stability is critical. Eat within 1 hour of waking.",
    },
    "No Tumor": {
        "overview": "Maintain a brain-healthy diet to support long-term neurological wellness. The Mediterranean diet pattern is strongly recommended.",
        "recommended": [
            {"category": "Brain-Boosting Foods", "items": ["Blueberries", "Dark leafy greens", "Wild salmon", "Walnuts", "Avocados"], "benefit": "Protect neurons and reduce long-term neurological risk"},
            {"category": "Colourful Vegetables", "items": ["Broccoli", "Bell peppers", "Sweet potatoes", "Beets", "Carrots"], "benefit": "Vitamins and antioxidants that maintain brain vascular health"},
            {"category": "Lean Proteins", "items": ["Fish", "Legumes", "Eggs", "Poultry", "Greek yogurt"], "benefit": "Amino acids for neurotransmitter production"},
            {"category": "Healthy Fats", "items": ["Olive oil", "Almonds", "Flaxseeds", "Chia seeds"], "benefit": "Omega-3 fats essential for brain membrane health"},
            {"category": "Neuroprotective Beverages", "items": ["Green tea", "Herbal teas", "Plain water", "Coconut water"], "benefit": "Green tea polyphenols have neuroprotective properties"},
        ],
        "avoid": [
            {"category": "Processed & Ultra-Processed Foods", "items": ["Fast food", "Chips", "Processed meats", "Packaged snacks"], "reason": "Associated with neuroinflammation and cognitive decline"},
            {"category": "Excess Sugar", "items": ["Sugary drinks", "Candy", "Pastries", "Sweetened cereals"], "reason": "High sugar diet linked to impaired brain function"},
            {"category": "Excessive Alcohol", "items": ["Heavy alcohol consumption", "Binge drinking"], "reason": "Directly toxic to neurons and increases long-term risk"},
        ],
        "supplements": [
            {"name": "Vitamin D3", "dose": "1000 IU/day", "note": "General brain health — check blood levels annually"},
            {"name": "Omega-3 Fish Oil", "dose": "1 g/day", "note": "If dietary fish intake is low — discuss with doctor"},
        ],
        "hydration": "Drink 8 glasses (2 L) of water daily. Include 1–2 cups of green tea for neuroprotection.",
        "meal_timing": "Follow regular meal times with 3 main meals and optional healthy snacks. Avoid late-night eating.",
    },
}

_LIFESTYLE = {
    "Glioma Tumor": {
        "exercise": [
            {"activity": "Gentle walking", "frequency": "20–30 minutes daily", "note": "Even short walks improve circulation and mood"},
            {"activity": "Light yoga or stretching", "frequency": "3–4 times per week", "note": "Avoid inversions; consult physiotherapist"},
            {"activity": "Swimming (low-impact)", "frequency": "2–3 times per week", "note": "Excellent cardiovascular benefit without joint strain"},
        ],
        "sleep": ["Aim for 7–9 hours of quality sleep every night", "Keep a consistent sleep and wake schedule", "Avoid screens for at least 1 hour before bedtime", "Use blackout curtains and maintain a cool, dark bedroom"],
        "stress_management": ["10–15 minutes of guided meditation daily", "Deep breathing exercises (4-7-8 technique)", "Journaling to express emotions and track symptoms", "Consider cognitive behavioural therapy (CBT)"],
        "avoid": ["All tobacco products and second-hand smoke", "Alcohol during and after treatment", "Extreme heat (saunas, hot tubs)", "High-contact sports or activities with head injury risk"],
        "mental_health": ["Join a brain tumour support group (in-person or online)", "Speak with a psycho-oncologist for emotional support", "Maintain regular social connections with family and friends"],
        "self_monitoring": ["Keep a daily symptom diary: headaches, vision, mood, energy", "Record any seizure activity with date, duration, and type", "Track weight weekly and report significant changes to doctor", "Report any new or worsening neurological symptoms immediately"],
    },
    "Meningioma Tumor": {
        "exercise": [
            {"activity": "Brisk walking", "frequency": "30 minutes, 5 days per week", "note": "Excellent baseline activity for all fitness levels"},
            {"activity": "Swimming or water aerobics", "frequency": "2–3 times per week", "note": "Low impact, supports cardiovascular health"},
            {"activity": "Gentle yoga", "frequency": "2–3 times per week", "note": "Improves flexibility and reduces stress hormones"},
        ],
        "sleep": ["Maintain 7–8 hours of sleep nightly", "Sleep with head slightly elevated if experiencing headaches", "Create a relaxing pre-sleep routine", "Avoid napping more than 30 minutes during the day"],
        "stress_management": ["Mindfulness meditation for 10–20 minutes daily", "Progressive muscle relaxation before sleep", "Engage in hobbies that provide mental relaxation"],
        "avoid": ["Smoking and second-hand smoke", "Exogenous hormones (discuss contraceptives with doctor)", "Head trauma — avoid contact sports", "Excessive alcohol"],
        "mental_health": ["Connect with a meningioma support community", "Counselling for anxiety related to diagnosis", "Engage family members in understanding the condition"],
        "self_monitoring": ["Track headache frequency, severity, and location", "Monitor vision changes: blurring, double vision, field loss", "Record any balance or coordination changes", "Note limb weakness or cognitive changes for next appointment"],
    },
    "Pituitary Tumor": {
        "exercise": [
            {"activity": "Moderate aerobic exercise (walking, cycling)", "frequency": "30 minutes, 5 days per week", "note": "Helps regulate cortisol and blood sugar"},
            {"activity": "Weight-bearing exercises", "frequency": "2–3 times per week", "note": "Critical for bone density when hormones are impaired"},
            {"activity": "Pilates or core strengthening", "frequency": "2 times per week", "note": "Improves posture and strength affected by growth hormone changes"},
        ],
        "sleep": ["7–8 hours is critical — growth hormone is released during deep sleep", "Consistent bed and wake times to synchronise hormonal cycles", "Treat any sleep apnoea promptly", "Avoid screens 1 hour before sleep to preserve melatonin"],
        "stress_management": ["Cortisol management is essential — practice relaxation morning and evening", "Yoga nidra is particularly beneficial for hormonal regulation", "Biofeedback therapy for stress-induced hormonal dysregulation"],
        "avoid": ["Smoking (worsens cardiovascular risk with hormonal changes)", "Excessive physical exertion if growth hormone levels are abnormal", "Skipping prescribed hormone replacement medications", "Alcohol (disrupts hormonal balance and medication metabolism)"],
        "mental_health": ["Hormonal changes can cause depression and anxiety — seek psychological support proactively", "Connect with a pituitary tumour patient community", "Inform family about mood-related symptoms for appropriate support"],
        "self_monitoring": ["Track and record blood pressure readings weekly", "Monitor weight and waist circumference monthly", "Keep a visual symptom log: any changes in peripheral vision", "Note energy levels, mood, libido, and menstrual regularity for endocrinology appointments"],
    },
    "No Tumor": {
        "exercise": [
            {"activity": "Aerobic exercise (running, cycling, swimming)", "frequency": "150 minutes/week total", "note": "Strongest evidence for long-term brain health"},
            {"activity": "Strength/resistance training", "frequency": "2 times per week", "note": "Improves brain blood flow and BDNF levels"},
            {"activity": "Mind-body exercise (yoga, tai chi)", "frequency": "1–2 times per week", "note": "Reduces cortisol and supports mental clarity"},
        ],
        "sleep": ["Aim for 7–8 hours of quality sleep nightly", "Consistent sleep schedule 7 days a week", "Address any snoring or sleep apnoea with your doctor", "Avoid alcohol before sleep — it severely disrupts sleep architecture"],
        "stress_management": ["Mindfulness or meditation for 10–20 minutes daily", "Engage in creative activities for mental relaxation", "Maintain work-life balance and take regular breaks from screens"],
        "avoid": ["Tobacco in all forms", "Heavy or binge alcohol consumption", "Prolonged sedentary behaviour — break up sitting every 45–60 minutes", "Chronic sleep deprivation"],
        "mental_health": ["Maintain strong social connections", "Mentally stimulating activities: reading, puzzles, learning new skills", "Seek support if experiencing anxiety about the scan results"],
        "self_monitoring": ["Note any new persistent headaches, vision changes, or balance issues", "Schedule annual general health check-ups", "Return for re-imaging if original symptoms worsen"],
    },
}


def _build_static_report(patient, scans, dominant_diagnosis, avg_confidence):
    """Build a comprehensive report with randomised variations to simulate AI output."""
    import random
    from datetime import datetime

    base = _STATIC.get(dominant_diagnosis, _STATIC["No Tumor"])
    diet = dict(_DIET.get(dominant_diagnosis, _DIET["No Tumor"]))
    lifestyle = dict(_LIFESTYLE.get(dominant_diagnosis, _LIFESTYLE["No Tumor"]))

    tumor_scans = [s for s in scans if s.prediction != "No Tumor"]
    clear_count = len(scans) - len(tumor_scans)
    n = len(scans)
    name = patient.name
    age_str = f", age {patient.age}" if patient.age else ""
    gender_str = f" ({patient.gender})" if patient.gender else ""
    date_str = datetime.now().strftime("%B %d, %Y")
    history_str = f" with a documented history of {patient.medical_history}" if patient.medical_history else ""
    conf_str = f"{avg_confidence}%"

    # ── Multiple overview variants per diagnosis ──────────────────────────
    overview_variants = {
        "Glioma Tumor": [
            (
                f"Based on comprehensive AI analysis of {n} MRI scan(s), the neural network identified "
                f"imaging patterns strongly consistent with Glioma in patient {name}{age_str}{gender_str}. "
                f"The model achieved an average diagnostic confidence of {conf_str} across all submitted images. "
                f"Out of {n} scan(s), {len(tumor_scans)} demonstrated pathological findings{history_str}. "
                "Given the aggressive nature of gliomas, urgent multidisciplinary evaluation is recommended "
                "to determine tumour grade and develop an appropriate treatment strategy."
            ),
            (
                f"AI-powered analysis of {n} brain MRI scan(s) for {name}{age_str} has identified features "
                f"consistent with glioma-type neoplasia with {conf_str} average confidence. "
                f"The deep learning model flagged abnormal signal patterns in {len(tumor_scans)} of {n} scan(s), "
                "suggesting glial-origin pathology requiring immediate clinical attention. "
                f"Considering the patient's profile{history_str}, prompt referral to a neuro-oncology team "
                "is essential for histological confirmation and treatment planning."
            ),
            (
                f"Diagnostic evaluation completed on {date_str} for {name}{gender_str}. "
                f"The NeuroScan AI system processed {n} MRI image(s) through the InceptionV3 deep learning architecture "
                f"and detected glioma-consistent abnormalities with an aggregate confidence score of {conf_str}. "
                f"{len(tumor_scans)} scan(s) exhibited characteristics of glial cell tumour pathology. "
                "Immediate specialist consultation is strongly advised given the clinical significance of these findings."
            ),
        ],
        "Meningioma Tumor": [
            (
                f"AI analysis of {n} MRI scan(s) for {name}{age_str}{gender_str} reveals imaging features "
                f"consistent with meningioma with a mean confidence of {conf_str}. "
                f"The neural network identified {len(tumor_scans)} scan(s) with meningeal-origin characteristics{history_str}. "
                "Meningiomas represent the most common primary intracranial tumours, and the majority are benign (WHO Grade I). "
                "Neurosurgical evaluation is recommended to assess location, size, and determine optimal management."
            ),
            (
                f"Comprehensive deep learning analysis completed for {name}{age_str} on {date_str}. "
                f"Across {n} submitted MRI scan(s), the AI model detected patterns consistent with meningioma "
                f"in {len(tumor_scans)} image(s), achieving {conf_str} average diagnostic confidence. "
                "The findings suggest a dural-based lesion requiring further characterisation with contrast-enhanced imaging. "
                f"Given the patient's clinical context{history_str}, specialist referral for growth assessment is advised."
            ),
            (
                f"The NeuroScan AI system has completed analysis of {n} brain MRI scan(s) for {name}{gender_str}. "
                f"Results indicate a high probability ({conf_str}) of meningioma across {len(tumor_scans)} scan(s). "
                "Imaging patterns are consistent with extra-axial meningeal pathology, likely benign in nature. "
                "However, definitive characterisation requires gadolinium-enhanced MRI and neurosurgical consultation "
                "to evaluate proximity to critical structures and determine whether intervention is warranted."
            ),
        ],
        "Pituitary Tumor": [
            (
                f"AI-driven analysis of {n} MRI scan(s) for {name}{age_str}{gender_str} has identified "
                f"features consistent with pituitary adenoma with {conf_str} average confidence. "
                f"The deep learning model flagged pituitary region abnormalities in {len(tumor_scans)} scan(s){history_str}. "
                "Pituitary adenomas are predominantly benign and highly treatable. "
                "Comprehensive endocrine evaluation and formal visual field assessment are the recommended immediate steps."
            ),
            (
                f"Diagnostic AI evaluation performed on {date_str} for {name}{age_str}. "
                f"Analysis of {n} MRI scan(s) through the NeuroScan neural network detected features "
                f"consistent with a sellar/pituitary region mass in {len(tumor_scans)} image(s) ({conf_str} confidence). "
                "The findings warrant hormonal profiling to determine functional status and imaging follow-up "
                "to characterise lesion dimensions relative to the optic chiasm."
            ),
            (
                f"Following comprehensive AI analysis of {n} brain MRI scan(s), {name}{gender_str}{age_str} "
                f"shows radiological evidence of pituitary pathology with {conf_str} model confidence. "
                f"{len(tumor_scans)} scan(s) demonstrated imaging characteristics of pituitary adenoma{history_str}. "
                "Endocrinological assessment is critical to identify any hormone hypersecretion, "
                "and ophthalmological evaluation should assess for visual field compromise."
            ),
        ],
        "No Tumor": [
            (
                f"AI analysis of {n} MRI scan(s) for {name}{age_str}{gender_str} found no evidence of "
                f"intracranial neoplasm. The model reported a {conf_str} average confidence across all images. "
                f"All {n} scan(s) were classified as normal brain tissue without pathological findings. "
                "This is a reassuring result. If presenting symptoms persist, clinical correlation with "
                "a neurologist is recommended to explore alternative diagnoses."
            ),
            (
                f"Comprehensive deep learning evaluation completed on {date_str} for {name}{age_str}. "
                f"The NeuroScan AI system analysed {n} brain MRI image(s) and found no abnormalities "
                f"consistent with brain tumour pathology (confidence: {conf_str}). "
                "Brain parenchyma, ventricular system, and meningeal structures appear within normal limits. "
                "Routine health monitoring and follow-up imaging only if new neurological symptoms develop."
            ),
            (
                f"AI-powered diagnostic screening for {name}{gender_str}{age_str} across {n} MRI scan(s) "
                f"returned no findings suggestive of intracranial mass lesion ({conf_str} confidence). "
                "The neural network did not identify signal abnormalities, mass effect, or contrast-enhancing lesions. "
                "This represents a favourable outcome. Patients should maintain brain-healthy lifestyle habits "
                "and report any new neurological symptoms to their physician promptly."
            ),
        ],
    }

    # ── Multiple interpretation variants ──────────────────────────────────
    interpretation_variants = {
        "Glioma Tumor": [
            (
                "The convolutional neural network identified irregular signal intensity patterns and potential "
                "mass effect consistent with intra-axial glial cell pathology. The spatial distribution and "
                f"enhancement characteristics across {len(tumor_scans)} positive scan(s) suggest the need for "
                "advanced MRI sequences including perfusion imaging and MR spectroscopy. Molecular markers "
                "(IDH mutation, 1p/19q co-deletion, MGMT methylation) must be assessed through tissue sampling "
                "to accurately grade the tumour and guide therapeutic decisions."
            ),
            (
                f"Deep learning analysis with {conf_str} confidence has identified features consistent with "
                "glial neoplasia. The AI model's attention mapping highlights regions of abnormal signal that "
                "correlate with typical glioma presentation patterns. Differential diagnosis includes high-grade "
                "glioma (GBM), anaplastic astrocytoma, and oligodendroglioma — histological and molecular "
                "characterisation is essential. The imaging features observed warrant urgent neurosurgical assessment."
            ),
            (
                "Pattern recognition analysis reveals parenchymal abnormalities characteristic of glioma pathology. "
                f"The AI system processed {n} scan(s) through 42 convolutional layers and identified consistent "
                "features including heterogeneous signal, possible necrotic components, and perilesional oedema. "
                "These findings necessitate contrast-enhanced MRI for definitive characterisation, followed by "
                "stereotactic biopsy or surgical resection for histopathological confirmation and molecular profiling."
            ),
        ],
        "Meningioma Tumor": [
            (
                "The neural network identified an extra-axial lesion with imaging features typical of meningeal "
                "origin including a broad dural base and homogeneous enhancement pattern. The AI model's spatial "
                "analysis suggests the mass is arising from the meninges rather than brain parenchyma. "
                "Further characterisation with dedicated sequences will help assess size, vascularity, "
                "and relationship to adjacent neurovascular structures for surgical planning."
            ),
            (
                f"AI analysis across {len(tumor_scans)} scan(s) detected extra-axial features consistent with "
                "meningioma. The model identified dural-based morphology with associated mass effect. "
                "The location relative to eloquent cortex, major venous sinuses, and cranial nerves will "
                "determine surgical approach feasibility. Most meningiomas are WHO Grade I (benign), "
                "though atypical imaging characteristics should be evaluated histologically."
            ),
            (
                "Computer-aided detection has identified features consistent with a meningeal tumour. "
                "The deep learning architecture highlighted regions of dural thickening and a well-circumscribed "
                f"extra-axial mass across {len(tumor_scans)} image(s). The convexity location and imaging profile "
                "favour a WHO Grade I meningioma. MR angiography is recommended to map vascular supply, "
                "and formal assessment of growth rate through comparison with prior imaging is essential."
            ),
        ],
        "Pituitary Tumor": [
            (
                f"The AI system detected a sellar region mass in {len(tumor_scans)} scan(s) with features "
                "consistent with pituitary adenoma. Differential considerations include micro-adenoma vs. "
                "macro-adenoma classification, which significantly impacts management approach. "
                "A complete hormonal panel including prolactin, GH, IGF-1, ACTH, cortisol, TSH, and "
                "gonadotropins is critical to determine functional status before treatment decisions are made."
            ),
            (
                "Deep learning analysis identified features consistent with a pituitary region mass. "
                "The neural network's attention mapping localises the abnormality to the sella turcica. "
                f"With {conf_str} confidence across {n} scan(s), the findings warrant immediate endocrine "
                "workup. Visual field assessment is mandatory given the proximity to the optic chiasm. "
                "Dedicated pituitary MRI with thin cuts through the sella will better characterise the lesion."
            ),
            (
                "The AI model has identified imaging features in the pituitary region that are consistent "
                "with an adenoma. Size determination (micro <10mm vs. macro ≥10mm) through dedicated thin-cut "
                "MRI is critical as it affects both treatment urgency and approach selection. "
                "Functional adenomas may present with hormone excess syndromes (Cushing's, acromegaly, "
                "hyperprolactinaemia) which must be identified through comprehensive endocrine testing."
            ),
        ],
        "No Tumor": [
            (
                f"The deep learning model processed {n} MRI scan(s) through the full classification pipeline "
                "and assigned the highest probability to the 'No Tumor' class in all images. "
                "No regions of concern, abnormal enhancement, or mass effect were identified by the AI system. "
                "Normal anatomical variants, if present, should be documented for future comparison. "
                "Clinical correlation remains important if neurological symptoms are persistent."
            ),
            (
                "Comprehensive AI screening across all submitted brain MRI images found no evidence of "
                "neoplastic pathology. The neural network evaluated signal intensity, morphological features, "
                f"and enhancement patterns across {n} scan(s) with {conf_str} confidence in the normal classification. "
                "Brain structures including white matter, grey matter, ventricles, and meninges appear unremarkable. "
                "No further oncological investigation is indicated at this time."
            ),
            (
                f"Following analysis of {n} MRI image(s), the NeuroScan AI system classifies all scans as "
                "showing no evidence of intracranial tumour. The convolutional neural network evaluated "
                "multiple imaging features and found patterns consistent with normal brain morphology. "
                "This is a reassuring finding that should be shared with the treating physician. "
                "Routine follow-up is appropriate unless new clinical concerns arise."
            ),
        ],
    }

    # ── Pick random variants ──────────────────────────────────────────────
    exec_summary = random.choice(overview_variants.get(dominant_diagnosis, overview_variants["No Tumor"]))
    interpretation = random.choice(interpretation_variants.get(dominant_diagnosis, interpretation_variants["No Tumor"]))

    # ── Randomise prognosis phrasing ──────────────────────────────────────
    prognosis_variants = {
        "Glioma Tumor": [
            base["prognosis"],
            (
                f"For patient {name}{age_str}, prognosis depends on tumour grade and molecular profile. "
                "Low-grade gliomas (WHO Grade II) generally carry a more favourable prognosis with median survival "
                "of 5–15 years with appropriate treatment. High-grade gliomas require aggressive multimodal therapy "
                "and benefit from early molecular characterisation to identify targeted treatment options."
            ),
            (
                "Glioma outcomes are highly variable and depend on histological grade, molecular markers, "
                f"and extent of resection. Given the AI confidence of {conf_str}, further tissue characterisation "
                "is essential before providing a definitive prognostic assessment. Modern treatment advances "
                "including immunotherapy and tumour-treating fields are improving outcomes for selected patients."
            ),
        ],
        "Meningioma Tumor": [
            base["prognosis"],
            (
                f"For {name}{age_str}, the outlook for meningioma is generally favourable. Approximately 80% of "
                "meningiomas are WHO Grade I (benign) and carry excellent long-term outcomes after complete surgical "
                "resection. Even when observation is chosen, many meningiomas remain stable for years. "
                "Regular imaging surveillance is the cornerstone of safe management."
            ),
            (
                "Meningiomas have an overall favourable prognosis compared to other intracranial tumours. "
                "Complete surgical excision is curative in the majority of Grade I cases. For tumours where "
                "complete removal carries unacceptable risk, stereotactic radiosurgery offers excellent local "
                "control rates exceeding 90% at 10 years."
            ),
        ],
        "Pituitary Tumor": [
            base["prognosis"],
            (
                f"The prognosis for pituitary adenoma in {name}{age_str} is generally excellent. "
                "Most pituitary tumours are benign and respond well to either medical therapy or surgical "
                "intervention. Prolactinomas typically achieve normalisation of prolactin levels with dopamine "
                "agonist therapy alone. Trans-sphenoidal surgery carries a high cure rate for non-functioning "
                "and GH-secreting adenomas."
            ),
            (
                "Pituitary adenomas carry one of the best prognoses among brain tumours. With modern "
                "trans-sphenoidal surgical techniques, remission rates exceed 80% for micro-adenomas. "
                f"Given the {conf_str} AI confidence level, formal diagnosis and size characterisation "
                "will allow the endocrine team to provide specific outcome predictions for this patient."
            ),
        ],
        "No Tumor": [
            base["prognosis"],
            (
                f"The AI system found no evidence of brain tumour in {name}'s MRI scan(s), which is a "
                "positive finding. The prognosis is excellent from an oncological standpoint. If the patient "
                "is experiencing symptoms, alternative neurological causes should be explored through "
                "clinical examination and, if indicated, additional diagnostic testing."
            ),
            (
                f"Clear scan results with {conf_str} confidence provide reassurance that no tumour pathology "
                "is present. Long-term neurological prognosis is not a concern from a neoplastic perspective. "
                "Maintaining a brain-healthy lifestyle and attending routine check-ups will support "
                "continued neurological wellbeing."
            ),
        ],
    }
    prognosis = random.choice(prognosis_variants.get(dominant_diagnosis, prognosis_variants["No Tumor"]))

    # ── Randomise follow-up schedule slightly ─────────────────────────────
    follow_up_map = {
        "Glioma Tumor": [
            {"timeframe": "Within 48 hours", "action": random.choice([
                "Emergency referral to a Neuro-Oncologist or Neurosurgeon",
                "Urgent neurosurgery consultation and contrast-enhanced MRI",
                "Priority referral to neuro-oncology multidisciplinary team",
            ]), "priority": "Critical"},
            {"timeframe": "1 week", "action": random.choice([
                "Contrast-enhanced MRI, full blood panel, and molecular tumour profiling",
                "Advanced MRI sequences (perfusion, spectroscopy) and pre-surgical workup",
                "Complete staging workup including blood markers and detailed neuroimaging",
            ]), "priority": "High"},
            {"timeframe": "1 month", "action": random.choice([
                "Multidisciplinary tumour board review; initiate treatment plan",
                "Treatment initiation: surgery, radiation, and/or chemotherapy as determined by team",
                "Begin therapeutic intervention per multidisciplinary team consensus",
            ]), "priority": "High"},
            {"timeframe": "3 months", "action": random.choice([
                "Post-treatment MRI and neurological assessment",
                "First follow-up MRI to evaluate treatment response",
                "Neurological reassessment and imaging to monitor progress",
            ]), "priority": "Routine"},
        ],
        "Meningioma Tumor": [
            {"timeframe": "Within 1 week", "action": random.choice([
                "Neurosurgical consultation to review scan and discuss treatment options",
                "Specialist referral for imaging review and management planning",
                "Neurosurgery appointment to characterise lesion and evaluate options",
            ]), "priority": "High"},
            {"timeframe": "1 month", "action": random.choice([
                "Comprehensive neurological examination and ophthalmology review",
                "Full neurological assessment and visual pathway evaluation",
                "Detailed clinical examination with focus on cranial nerve function",
            ]), "priority": "Medium"},
            {"timeframe": "3 months", "action": random.choice([
                "Follow-up MRI to assess growth rate if observation chosen",
                "Repeat imaging to establish growth velocity baseline",
                "Surveillance MRI to compare with initial scan dimensions",
            ]), "priority": "Medium"},
            {"timeframe": "Annually", "action": "Annual MRI surveillance and neurological review", "priority": "Routine"},
        ],
        "Pituitary Tumor": [
            {"timeframe": "Within 1 week", "action": random.choice([
                "Full hormonal panel (prolactin, GH, ACTH, TSH, LH, FSH, cortisol) and visual field testing",
                "Comprehensive endocrine workup and formal perimetry assessment",
                "Complete pituitary hormone profile and ophthalmological visual fields",
            ]), "priority": "High"},
            {"timeframe": "2 weeks", "action": random.choice([
                "Endocrinology consultation; dedicated pituitary MRI with thin cuts",
                "Specialist endocrine review and high-resolution sellar imaging",
                "Endocrinologist assessment and dedicated 1mm-slice pituitary protocol MRI",
            ]), "priority": "High"},
            {"timeframe": "1 month", "action": random.choice([
                "Neurosurgical consultation and discussion of medical vs. surgical options",
                "Treatment planning: medical therapy vs. trans-sphenoidal surgery evaluation",
                "Multidisciplinary review to determine optimal intervention approach",
            ]), "priority": "Medium"},
            {"timeframe": "3–6 months", "action": "Repeat hormonal panel and MRI to assess response to treatment", "priority": "Routine"},
        ],
        "No Tumor": [
            {"timeframe": "1 week", "action": random.choice([
                "Review results with primary care physician and correlate with symptoms",
                "Share findings with treating doctor for clinical context evaluation",
                "Discuss clear results with GP and review any ongoing symptoms",
            ]), "priority": "Medium"},
            {"timeframe": "1 month", "action": random.choice([
                "Neurological examination if symptoms persist",
                "Follow-up clinical assessment if presenting complaints continue",
                "Physician review to explore alternative causes if symptoms remain",
            ]), "priority": "Routine"},
            {"timeframe": "6 months", "action": "Repeat MRI only if new or worsening symptoms develop", "priority": "Routine"},
            {"timeframe": "Annually", "action": "Routine general health check-up", "priority": "Routine"},
        ],
    }

    # ── Shuffle list items for variety ────────────────────────────────────
    diet_copy = dict(diet)
    if "recommended" in diet_copy:
        items = list(diet_copy["recommended"])
        random.shuffle(items)
        diet_copy["recommended"] = items
    if "supplements" in diet_copy:
        items = list(diet_copy["supplements"])
        random.shuffle(items)
        diet_copy["supplements"] = items

    lifestyle_copy = dict(lifestyle)
    for key in ["sleep", "stress_management", "avoid", "mental_health", "self_monitoring"]:
        if key in lifestyle_copy and isinstance(lifestyle_copy[key], list):
            items = list(lifestyle_copy[key])
            random.shuffle(items)
            lifestyle_copy[key] = items

    # ── Randomise caregiver guidance ──────────────────────────────────────
    caregiver_variants = {
        "Glioma Tumor": [
            base["caregiver_guidance"],
            (
                f"Family and caregivers of {name} should be vigilant for sudden neurological changes "
                "including seizures, speech difficulties, or personality shifts. Establish a clear emergency "
                "plan and keep emergency contacts accessible. Attend all medical appointments together "
                "and maintain open communication with the treating team. Caregiver self-care and support "
                "groups are strongly recommended."
            ),
        ],
        "Meningioma Tumor": [
            base["caregiver_guidance"],
            (
                f"Caregivers supporting {name} should help maintain a detailed symptom journal, "
                "noting headaches, visual changes, or balance issues. Most meningiomas are manageable "
                "with appropriate monitoring. Help the patient maintain their normal routine while "
                "ensuring compliance with follow-up imaging schedules."
            ),
        ],
        "Pituitary Tumor": [
            base["caregiver_guidance"],
            (
                f"Family members of {name} should be aware that hormonal changes can affect mood, "
                "energy levels, and physical appearance. These are treatable medical symptoms, not "
                "personality defects. Provide emotional support, help track medication schedules, "
                "and attend endocrinology appointments to stay informed about treatment progress."
            ),
        ],
        "No Tumor": [
            base["caregiver_guidance"],
            (
                f"Reassure {name} that clear scan results are genuinely good news. If the patient "
                "experiences anxiety about their health, validate those feelings while encouraging "
                "continued engagement with normal activities. Help maintain a brain-healthy lifestyle "
                "together through shared exercise, nutritious meals, and stress-reducing activities."
            ),
        ],
    }
    caregiver = random.choice(caregiver_variants.get(dominant_diagnosis, caregiver_variants["No Tumor"]))

    return {
        "executive_summary": exec_summary,
        "clinical_interpretation": interpretation,
        "consolidated_diagnosis": dominant_diagnosis,
        "overall_risk": base["overall_risk"],
        "treatment_urgency": base["treatment_urgency"],
        "prognosis": prognosis,
        "recommended_specialists": base["recommended_specialists"],
        "follow_up_schedule": follow_up_map.get(dominant_diagnosis, follow_up_map["No Tumor"]),
        "diet_chart": diet_copy,
        "lifestyle_changes": lifestyle_copy,
        "emergency_warning_signs": base["emergency_warning_signs"],
        "caregiver_guidance": caregiver,
    }


# ── AI Consolidated Report ─────────────────────────────────────────────────

@app.route("/api/patients/<int:pid>/ai-report", methods=["POST", "OPTIONS"])
@login_required
def generate_ai_report(pid):
    if request.method == "OPTIONS":
        return "", 204

    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    scans = (
        ScanResult.query
        .filter_by(patient_id=pid, doctor_id=current_user.id)
        .order_by(ScanResult.created_at.asc())
        .all()
    )
    if not scans:
        return jsonify({"error": "No scans found for this patient"}), 400

    # Compute common stats used by both AI and static paths
    tumor_scans = [s for s in scans if s.prediction != "No Tumor"]
    if tumor_scans:
        predictions = [s.prediction for s in tumor_scans]
        dominant_diagnosis = max(set(predictions), key=predictions.count)
    else:
        dominant_diagnosis = "No Tumor"

    avg_confidence = round(sum(s.confidence for s in scans) / len(scans), 1)

    # ── Try LangGraph multi-agent report generation ───────────────────────
    if MISTRAL_API_KEY:
        scan_data = [
            {
                "date": s.created_at.strftime("%Y-%m-%d") if s.created_at else "Unknown",
                "prediction": s.prediction,
                "confidence": round(s.confidence, 1),
                "risk": s.risk_level,
            }
            for s in scans
        ]

        langgraph_report = generate_report_with_langgraph(
            {
                "name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "diagnosis": dominant_diagnosis,
                "medical_history": patient.medical_history or "None",
                "avg_confidence": avg_confidence,
            },
            scan_data,
        )

        if langgraph_report:
            # Merge LangGraph output into the static report structure
            report = _build_static_report(patient, scans, dominant_diagnosis, avg_confidence)
            for k, v in langgraph_report.items():
                if v:
                    report[k] = v
            print(f"[LangGraph] Multi-agent report generated for patient {pid}")
            return jsonify({"ai_available": True, "data": report})

        # Fallback: direct Mistral call via LangChain
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=MISTRAL_API_KEY,
                base_url="https://api.mistral.ai/v1",
            )
            prompt = (
                f"You are a senior neuro-oncologist. Patient: {patient.name}, "
                f"age {patient.age or 'unknown'}, gender {patient.gender or 'unknown'}. "
                f"Medical history: {patient.medical_history or 'none'}. "
                f"MRI results ({len(scans)} scans): {json_module.dumps(scan_data)}. "
                f"Primary diagnosis: {dominant_diagnosis}. "
                "Return ONLY valid JSON with keys: executive_summary, clinical_interpretation, prognosis. "
                "Each value is a 2-3 sentence string. No other keys, no markdown."
            )
            resp = client.chat.completions.create(
                model="mistral-small-latest",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            ai_extra = json_module.loads(resp.choices[0].message.content.strip())
            report = _build_static_report(patient, scans, dominant_diagnosis, avg_confidence)
            report.update({k: v for k, v in ai_extra.items() if v and isinstance(v, str)})
            print(f"[Mistral fallback] Report enrichment OK for patient {pid}")
            return jsonify({"ai_available": True, "data": report})
        except Exception as e:
            print(f"[AI] Report generation error (falling back to static): {e}")

    # ── Static report — always works, no API needed ────────────────────────
    report = _build_static_report(patient, scans, dominant_diagnosis, avg_confidence)
    return jsonify({"ai_available": True, "data": report})


# ── Lifestyle Goal Generation Helper ─────────────────────────────────────────

def _generate_goals_from_diagnosis(patient_id, doctor_id, diagnosis):
    """Create LifestyleGoal entries from the diet/lifestyle templates."""
    goals = []
    diet = _DIET.get(diagnosis, _DIET["No Tumor"])
    lifestyle = _LIFESTYLE.get(diagnosis, _LIFESTYLE["No Tumor"])

    goals.append(LifestyleGoal(
        patient_id=patient_id, doctor_id=doctor_id,
        category="hydration", title="Daily Water Intake",
        description=diet.get("hydration", "Drink 8 glasses of water daily."),
        target_value=8.0, unit="glasses", frequency="daily",
    ))

    goals.append(LifestyleGoal(
        patient_id=patient_id, doctor_id=doctor_id,
        category="sleep", title="Quality Sleep",
        description=lifestyle["sleep"][0] if lifestyle.get("sleep") else "Aim for 7-8 hours of sleep",
        target_value=8.0, unit="hours", frequency="daily",
    ))

    for ex in lifestyle.get("exercise", [])[:2]:
        goals.append(LifestyleGoal(
            patient_id=patient_id, doctor_id=doctor_id,
            category="exercise", title=ex["activity"],
            description=f"{ex['frequency']}. {ex.get('note', '')}",
            target_value=30.0, unit="minutes", frequency="daily",
        ))

    goals.append(LifestyleGoal(
        patient_id=patient_id, doctor_id=doctor_id,
        category="diet", title="Diet Adherence",
        description=diet.get("overview", "Follow recommended dietary guidelines."),
        target_value=4.0, unit="score (1-5)", frequency="daily",
    ))

    if lifestyle.get("stress_management"):
        goals.append(LifestyleGoal(
            patient_id=patient_id, doctor_id=doctor_id,
            category="stress", title="Stress Management Practice",
            description=lifestyle["stress_management"][0],
            target_value=1.0, unit="session", frequency="daily",
        ))

    if lifestyle.get("self_monitoring"):
        goals.append(LifestyleGoal(
            patient_id=patient_id, doctor_id=doctor_id,
            category="monitoring", title="Daily Symptom Tracking",
            description=lifestyle["self_monitoring"][0],
            target_value=1.0, unit="entry", frequency="daily",
        ))

    return goals


# ── Lifestyle Tracker Routes ─────────────────────────────────────────────────

@app.route("/api/patients/<int:pid>/goals/generate", methods=["POST", "OPTIONS"])
@login_required
def generate_goals(pid):
    if request.method == "OPTIONS":
        return "", 204

    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    data = request.json or {}
    force = data.get("force", False)

    existing = LifestyleGoal.query.filter_by(patient_id=pid, doctor_id=current_user.id).all()
    if existing and not force:
        return jsonify({"goals": [g.to_dict() for g in existing]})

    if force and existing:
        for g in existing:
            db.session.delete(g)
        db.session.commit()

    latest_scan = (
        ScanResult.query
        .filter_by(patient_id=pid, doctor_id=current_user.id)
        .order_by(ScanResult.created_at.desc())
        .first()
    )
    diagnosis = latest_scan.prediction if latest_scan else "No Tumor"
    risk = latest_scan.risk_level if latest_scan else "Low"

    # Try LangChain for personalized goals
    ai_goals = generate_goals_with_langchain({
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "diagnosis": diagnosis,
        "medical_history": patient.medical_history or "None",
        "risk_level": risk,
    })

    if ai_goals:
        new_goals = []
        for g in ai_goals:
            goal = LifestyleGoal(
                patient_id=pid, doctor_id=current_user.id,
                category=g.get("category", "monitoring"),
                title=g.get("title", "Goal")[:255],
                description=g.get("description", ""),
                target_value=g.get("target_value"),
                unit=g.get("unit", ""),
                frequency=g.get("frequency", "daily"),
            )
            db.session.add(goal)
            new_goals.append(goal)
        db.session.commit()
        print(f"[LangChain] Generated {len(new_goals)} goals for patient {pid}")
    else:
        # Fallback to template-based goals
        new_goals = _generate_goals_from_diagnosis(pid, current_user.id, diagnosis)
        for g in new_goals:
            db.session.add(g)
        db.session.commit()
        print(f"[Fallback] Generated {len(new_goals)} template goals for patient {pid}")

    return jsonify({"goals": [g.to_dict() for g in new_goals]}), 201


@app.route("/api/patients/<int:pid>/goals", methods=["GET"])
@login_required
def list_goals(pid):
    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    goals = (
        LifestyleGoal.query
        .filter_by(patient_id=pid, doctor_id=current_user.id)
        .order_by(LifestyleGoal.is_active.desc(), LifestyleGoal.created_at.desc())
        .all()
    )
    return jsonify({"goals": [g.to_dict() for g in goals]})


@app.route("/api/patients/<int:pid>/goals/<int:gid>", methods=["PUT", "OPTIONS"])
@login_required
def update_goal(pid, gid):
    if request.method == "OPTIONS":
        return "", 204

    goal = LifestyleGoal.query.filter_by(
        id=gid, patient_id=pid, doctor_id=current_user.id
    ).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    data = request.json or {}
    if "is_active" in data:
        goal.is_active = bool(data["is_active"])
    if "title" in data:
        goal.title = data["title"].strip()
    if "target_value" in data:
        goal.target_value = data["target_value"]

    db.session.commit()
    return jsonify({"goal": goal.to_dict()})


@app.route("/api/patients/<int:pid>/daily-log", methods=["POST", "OPTIONS"])
@login_required
def upsert_daily_log(pid):
    if request.method == "OPTIONS":
        return "", 204

    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    data = request.json or {}
    from datetime import date as date_type
    log_date_str = data.get("log_date")
    if log_date_str:
        log_date = date_type.fromisoformat(log_date_str)
    else:
        log_date = date_type.today()

    existing = DailyLog.query.filter_by(
        patient_id=pid, doctor_id=current_user.id, log_date=log_date
    ).first()

    if existing:
        log = existing
    else:
        log = DailyLog(patient_id=pid, doctor_id=current_user.id, log_date=log_date)
        db.session.add(log)

    if "water_intake" in data:
        log.water_intake = data["water_intake"]
    if "sleep_hours" in data:
        log.sleep_hours = data["sleep_hours"]
    if "exercise_minutes" in data:
        log.exercise_minutes = data["exercise_minutes"]
    if "mood" in data:
        log.mood = data["mood"]
    if "diet_compliance" in data:
        log.diet_compliance = data["diet_compliance"]
    if "symptoms" in data:
        log.symptoms = data["symptoms"]
    if "notes" in data:
        log.notes = data["notes"]
    if "goals_completed" in data:
        log.goals_completed = data["goals_completed"]

    db.session.commit()

    # Generate AI feedback via LangChain
    latest_scan = ScanResult.query.filter_by(
        patient_id=pid, doctor_id=current_user.id
    ).order_by(ScanResult.created_at.desc()).first()

    active_goals = LifestyleGoal.query.filter_by(
        patient_id=pid, doctor_id=current_user.id, is_active=True
    ).all()

    from datetime import date as dt, timedelta
    log_dates = {l.log_date for l in DailyLog.query.filter_by(
        patient_id=pid, doctor_id=current_user.id
    ).filter(DailyLog.log_date >= dt.today() - timedelta(days=30)).all()}
    streak = 0
    for i in range(30):
        if (dt.today() - timedelta(days=i)) in log_dates:
            streak += 1
        else:
            break

    feedback = generate_tracker_feedback(data, {
        "name": patient.name,
        "diagnosis": latest_scan.prediction if latest_scan else "",
        "goals_summary": ", ".join(g.title for g in active_goals[:5]),
        "streak": streak,
    })

    response = {"log": log.to_dict()}
    if feedback:
        response["ai_feedback"] = feedback

    return jsonify(response), 200 if existing else 201


@app.route("/api/patients/<int:pid>/daily-logs", methods=["GET"])
@login_required
def list_daily_logs(pid):
    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    days = request.args.get("days", 30, type=int)
    from datetime import date as date_type, timedelta
    since = date_type.today() - timedelta(days=days)

    logs = (
        DailyLog.query
        .filter_by(patient_id=pid, doctor_id=current_user.id)
        .filter(DailyLog.log_date >= since)
        .order_by(DailyLog.log_date.desc())
        .all()
    )
    return jsonify({"logs": [l.to_dict() for l in logs]})


@app.route("/api/patients/<int:pid>/tracker-summary", methods=["GET"])
@login_required
def tracker_summary(pid):
    patient = Patient.query.filter_by(id=pid, doctor_id=current_user.id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    from datetime import date as date_type, timedelta

    days = request.args.get("days", 30, type=int)
    since = date_type.today() - timedelta(days=days)

    logs = (
        DailyLog.query
        .filter_by(patient_id=pid, doctor_id=current_user.id)
        .filter(DailyLog.log_date >= since)
        .order_by(DailyLog.log_date.desc())
        .all()
    )

    total_goals = LifestyleGoal.query.filter_by(
        patient_id=pid, doctor_id=current_user.id, is_active=True
    ).count()

    # Compute streak
    streak = 0
    today = date_type.today()
    log_dates = {l.log_date for l in logs}
    for i in range(days):
        d = today - timedelta(days=i)
        if d in log_dates:
            streak += 1
        else:
            break

    # Averages
    n = len(logs) or 1
    avg_sleep = round(sum(l.sleep_hours or 0 for l in logs) / n, 1)
    avg_water = round(sum(l.water_intake or 0 for l in logs) / n, 1)
    avg_exercise = round(sum(l.exercise_minutes or 0 for l in logs) / n, 0)
    avg_mood = round(sum(l.mood or 0 for l in logs) / n, 1)
    avg_diet = round(sum(l.diet_compliance or 0 for l in logs) / n, 1)

    # Goal adherence
    if total_goals > 0 and logs:
        completed_counts = [
            len(l.goals_completed) if l.goals_completed else 0 for l in logs
        ]
        adherence = round(
            sum(completed_counts) / (total_goals * len(logs)) * 100, 1
        )
    else:
        adherence = 0

    return jsonify({
        "streak": streak,
        "totalLogs": len(logs),
        "totalGoals": total_goals,
        "avgSleep": avg_sleep,
        "avgWater": avg_water,
        "avgExercise": int(avg_exercise),
        "avgMood": avg_mood,
        "avgDiet": avg_diet,
        "adherence": adherence,
    })


# ── Patient Comparison / Analytics ────────────────────────────────────────

@app.route("/api/patients/compare", methods=["POST", "OPTIONS"])
@login_required
def compare_patients():
    """Compare two patients' progress, treatment effectiveness."""
    if request.method == "OPTIONS":
        return "", 204
    if current_user.is_patient:
        return jsonify({"error": "Not authorized"}), 403

    data = request.json or {}
    pid1 = data.get("patient1_id")
    pid2 = data.get("patient2_id")
    if not pid1 or not pid2:
        return jsonify({"error": "Two patient IDs required"}), 400

    p1 = Patient.query.filter_by(id=pid1, doctor_id=current_user.id).first()
    p2 = Patient.query.filter_by(id=pid2, doctor_id=current_user.id).first()
    if not p1 or not p2:
        return jsonify({"error": "One or both patients not found"}), 404

    from datetime import date as date_type, timedelta
    since = date_type.today() - timedelta(days=30)

    def get_patient_stats(patient):
        scans = ScanResult.query.filter_by(
            patient_id=patient.id, doctor_id=current_user.id
        ).order_by(ScanResult.created_at.desc()).all()

        logs = DailyLog.query.filter_by(
            patient_id=patient.id, doctor_id=current_user.id
        ).filter(DailyLog.log_date >= since).order_by(DailyLog.log_date.desc()).all()

        goals = LifestyleGoal.query.filter_by(
            patient_id=patient.id, doctor_id=current_user.id, is_active=True
        ).all()

        n = len(logs) or 1
        avg_sleep = round(sum(l.sleep_hours or 0 for l in logs) / n, 1)
        avg_water = round(sum(l.water_intake or 0 for l in logs) / n, 1)
        avg_exercise = round(sum(l.exercise_minutes or 0 for l in logs) / n, 0)
        avg_mood = round(sum(l.mood or 0 for l in logs) / n, 1)
        avg_diet = round(sum(l.diet_compliance or 0 for l in logs) / n, 1)

        total_goals = len(goals)
        if total_goals > 0 and logs:
            completed_counts = [
                len(l.goals_completed) if l.goals_completed else 0 for l in logs
            ]
            adherence = round(sum(completed_counts) / (total_goals * len(logs)) * 100, 1)
        else:
            adherence = 0

        # Streak
        streak = 0
        today = date_type.today()
        log_dates = {l.log_date for l in logs}
        for i in range(30):
            if (today - timedelta(days=i)) in log_dates:
                streak += 1
            else:
                break

        # Diagnosis info
        tumor_scans = [s for s in scans if s.prediction != "No Tumor"]
        dominant = "No Tumor"
        if tumor_scans:
            preds = [s.prediction for s in tumor_scans]
            dominant = max(set(preds), key=preds.count)

        # Mood trend (improvement over time)
        mood_trend = 0
        if len(logs) >= 4:
            recent_half = logs[:len(logs)//2]
            older_half = logs[len(logs)//2:]
            recent_avg = sum(l.mood or 0 for l in recent_half) / len(recent_half)
            older_avg = sum(l.mood or 0 for l in older_half) / len(older_half)
            mood_trend = round(recent_avg - older_avg, 1)

        return {
            "patient": patient.to_dict(include_scan_count=True),
            "diagnosis": dominant,
            "totalScans": len(scans),
            "totalLogs": len(logs),
            "streak": streak,
            "avgSleep": avg_sleep,
            "avgWater": avg_water,
            "avgExercise": int(avg_exercise),
            "avgMood": avg_mood,
            "avgDiet": avg_diet,
            "adherence": adherence,
            "moodTrend": mood_trend,
            "goals": [g.to_dict() for g in goals],
            "recentLogs": [l.to_dict() for l in logs[:7]],
        }

    stats1 = get_patient_stats(p1)
    stats2 = get_patient_stats(p2)

    # Auto-analysis
    insights = []
    if stats1["diagnosis"] == stats2["diagnosis"]:
        insights.append(f"Both patients share the same diagnosis: {stats1['diagnosis']}")

        if stats1["adherence"] > stats2["adherence"]:
            insights.append(f"{p1.name} has higher goal adherence ({stats1['adherence']}% vs {stats2['adherence']}%)")
        elif stats2["adherence"] > stats1["adherence"]:
            insights.append(f"{p2.name} has higher goal adherence ({stats2['adherence']}% vs {stats1['adherence']}%)")

        if stats1["avgExercise"] > stats2["avgExercise"]:
            insights.append(f"{p1.name} exercises more ({stats1['avgExercise']} min/day vs {stats2['avgExercise']} min/day)")
        elif stats2["avgExercise"] > stats1["avgExercise"]:
            insights.append(f"{p2.name} exercises more ({stats2['avgExercise']} min/day vs {stats1['avgExercise']} min/day)")

        if stats1["moodTrend"] > stats2["moodTrend"]:
            insights.append(f"{p1.name} shows better mood improvement trend (+{stats1['moodTrend']} vs +{stats2['moodTrend']})")
        elif stats2["moodTrend"] > stats1["moodTrend"]:
            insights.append(f"{p2.name} shows better mood improvement trend (+{stats2['moodTrend']} vs +{stats1['moodTrend']})")

        better = p1.name if stats1["adherence"] >= stats2["adherence"] else p2.name
        insights.append(f"Recommendation: The lifestyle approach of {better} appears more effective for {stats1['diagnosis']}. Consider applying similar prescriptions to other patients with this diagnosis.")
    else:
        insights.append(f"Different diagnoses: {p1.name} ({stats1['diagnosis']}) vs {p2.name} ({stats2['diagnosis']})")
        insights.append("Comparison is most meaningful between patients with the same tumor type.")

    if stats1["streak"] > stats2["streak"]:
        insights.append(f"{p1.name} has a longer tracking streak ({stats1['streak']} days vs {stats2['streak']} days), indicating better engagement.")
    elif stats2["streak"] > stats1["streak"]:
        insights.append(f"{p2.name} has a longer tracking streak ({stats2['streak']} days vs {stats1['streak']} days), indicating better engagement.")

    # Enhance with LangChain AI insights
    ai_result = compare_patients_with_langchain(stats1, stats2)
    recommendation = ""
    effective_practices = []
    if ai_result:
        insights = ai_result.get("insights", insights)
        recommendation = ai_result.get("recommendation", "")
        effective_practices = ai_result.get("effective_practices", [])
        print(f"[LangChain] Comparison insights generated for {p1.name} vs {p2.name}")

    return jsonify({
        "patient1": stats1,
        "patient2": stats2,
        "insights": insights,
        "recommendation": recommendation,
        "effective_practices": effective_practices,
    })


# ── Patient Portal Routes (patient-facing, read-only reports + tracker) ───

@app.route("/api/portal/me", methods=["GET"])
@login_required
def portal_me():
    if not current_user.is_patient:
        return jsonify({"error": "Not a patient account"}), 403
    return jsonify({"user": current_user.to_portal_dict()})


@app.route("/api/portal/reports", methods=["GET"])
@login_required
def portal_reports():
    """Patient views their own scan reports (read-only)."""
    if not current_user.is_patient:
        return jsonify({"error": "Not authorized"}), 403

    scans = (
        ScanResult.query
        .filter_by(patient_id=current_user.id)
        .order_by(ScanResult.created_at.desc())
        .all()
    )
    return jsonify({
        "patient": current_user.to_dict(include_scan_count=False),
        "scans": [s.to_dict() for s in scans],
    })


@app.route("/api/portal/goals", methods=["GET"])
@login_required
def portal_goals():
    """Patient views their lifestyle goals."""
    if not current_user.is_patient:
        return jsonify({"error": "Not authorized"}), 403

    goals = (
        LifestyleGoal.query
        .filter_by(patient_id=current_user.id)
        .order_by(LifestyleGoal.is_active.desc(), LifestyleGoal.created_at.desc())
        .all()
    )
    return jsonify({"goals": [g.to_dict() for g in goals]})


@app.route("/api/portal/daily-log", methods=["POST", "OPTIONS"])
@login_required
def portal_upsert_log():
    """Patient submits their own daily log."""
    if request.method == "OPTIONS":
        return "", 204
    if not current_user.is_patient:
        return jsonify({"error": "Not authorized"}), 403

    data = request.json or {}
    from datetime import date as date_type
    log_date_str = data.get("log_date")
    log_date = date_type.fromisoformat(log_date_str) if log_date_str else date_type.today()

    existing = DailyLog.query.filter_by(
        patient_id=current_user.id, doctor_id=current_user.doctor_id, log_date=log_date
    ).first()

    if existing:
        log = existing
    else:
        log = DailyLog(
            patient_id=current_user.id,
            doctor_id=current_user.doctor_id,
            log_date=log_date,
        )
        db.session.add(log)

    if "water_intake" in data:
        log.water_intake = data["water_intake"]
    if "sleep_hours" in data:
        log.sleep_hours = data["sleep_hours"]
    if "exercise_minutes" in data:
        log.exercise_minutes = data["exercise_minutes"]
    if "mood" in data:
        log.mood = data["mood"]
    if "diet_compliance" in data:
        log.diet_compliance = data["diet_compliance"]
    if "symptoms" in data:
        log.symptoms = data["symptoms"]
    if "notes" in data:
        log.notes = data["notes"]
    if "goals_completed" in data:
        log.goals_completed = data["goals_completed"]

    db.session.commit()
    return jsonify({"log": log.to_dict()}), 200 if existing else 201


@app.route("/api/portal/daily-logs", methods=["GET"])
@login_required
def portal_list_logs():
    """Patient views their own log history."""
    if not current_user.is_patient:
        return jsonify({"error": "Not authorized"}), 403

    days = request.args.get("days", 30, type=int)
    from datetime import date as date_type, timedelta
    since = date_type.today() - timedelta(days=days)

    logs = (
        DailyLog.query
        .filter_by(patient_id=current_user.id)
        .filter(DailyLog.log_date >= since)
        .order_by(DailyLog.log_date.desc())
        .all()
    )
    return jsonify({"logs": [l.to_dict() for l in logs]})


@app.route("/api/portal/tracker-summary", methods=["GET"])
@login_required
def portal_tracker_summary():
    """Patient views their own tracker summary."""
    if not current_user.is_patient:
        return jsonify({"error": "Not authorized"}), 403

    from datetime import date as date_type, timedelta
    days = request.args.get("days", 30, type=int)
    since = date_type.today() - timedelta(days=days)

    logs = (
        DailyLog.query
        .filter_by(patient_id=current_user.id)
        .filter(DailyLog.log_date >= since)
        .order_by(DailyLog.log_date.desc())
        .all()
    )

    total_goals = LifestyleGoal.query.filter_by(
        patient_id=current_user.id, is_active=True
    ).count()

    streak = 0
    today = date_type.today()
    log_dates = {l.log_date for l in logs}
    for i in range(days):
        if (today - timedelta(days=i)) in log_dates:
            streak += 1
        else:
            break

    n = len(logs) or 1
    avg_sleep = round(sum(l.sleep_hours or 0 for l in logs) / n, 1)
    avg_water = round(sum(l.water_intake or 0 for l in logs) / n, 1)
    avg_exercise = round(sum(l.exercise_minutes or 0 for l in logs) / n, 0)
    avg_mood = round(sum(l.mood or 0 for l in logs) / n, 1)
    avg_diet = round(sum(l.diet_compliance or 0 for l in logs) / n, 1)

    if total_goals > 0 and logs:
        completed_counts = [
            len(l.goals_completed) if l.goals_completed else 0 for l in logs
        ]
        adherence = round(sum(completed_counts) / (total_goals * len(logs)) * 100, 1)
    else:
        adherence = 0

    return jsonify({
        "streak": streak,
        "totalLogs": len(logs),
        "totalGoals": total_goals,
        "avgSleep": avg_sleep,
        "avgWater": avg_water,
        "avgExercise": int(avg_exercise),
        "avgMood": avg_mood,
        "avgDiet": avg_diet,
        "adherence": adherence,
    })


# ── Serve React Frontend (production build) ────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if not os.path.isdir(FRONTEND_DIST):
        return jsonify({
            "message": "Brain Tumor Detection API is running.",
            "hint": "Start the React frontend with: cd frontend && npm run dev",
        })
    full = os.path.join(FRONTEND_DIST, path)
    if path and os.path.isfile(full):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
