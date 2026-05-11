import os
import io
import time
import numpy as np
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, jsonify
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'Brain_tumor_inception_model.h5')

# Email Configuration
DOCTOR_EMAIL = "aniketpurohit851@gmail.com"
SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "") # Provide your gmail here
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "") # Provide your App Password here

# Initialize Flask app
app = Flask(__name__)

# Load Model
print("Loading model... this may take a moment.")
start_time = time.time()
if os.path.exists(MODEL_PATH):
    try:
        model = load_model(MODEL_PATH)
        print(f"Model loaded successfully in {time.time() - start_time:.2f} seconds.")
    except Exception as e:
        print(f"Error loading model: {e}")
        model = None
else:
    print(f"WARNING: Model file not found at {MODEL_PATH}")
    model = None

# Class mapping
CLASS_MAP = {
    0: 'Glioma Tumor',
    1: 'Meningioma Tumor',
    2: 'No Tumor',
    3: 'Pituitary Tumor'
}

def preprocess_image(img):
    """Preprocess the uploaded image for the model."""
    if img.mode != 'RGB':
        img = img.convert('RGB')
    img = img.resize((224, 224))
    img_array = np.array(img).astype('float32')
    img_array /= 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

@app.route('/')
def index():
    """Render the main UI."""
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """Handle image upload and return prediction."""
    if model is None:
        return jsonify({'error': 'Model not loaded. Please ensure the .h5 file is in the models folder.'}), 500

    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    
    if image_file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        print(f"Starting prediction for file: {image_file.filename}")
        t1 = time.time()
        
        # Load and preprocess image
        img = image.load_img(io.BytesIO(image_file.read()))
        processed_img = preprocess_image(img)
        t2 = time.time()
        print(f"Preprocessing took {t2 - t1:.2f} seconds.")

        # Make prediction
        predictions = model(processed_img, training=False).numpy()
        t3 = time.time()
        print(f"Inference took {t3 - t2:.2f} seconds.")

        class_idx = np.argmax(predictions)
        confidence = float(predictions[0][class_idx]) * 100

        result = CLASS_MAP.get(class_idx, "Unknown")
        print(f"Result: {result} ({confidence:.2f}%)")
        
        return jsonify({
            'prediction': result,
            'prediction_prob': round(confidence, 2)
        })

    except Exception as e:
        print(f"Prediction Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/send_report', methods=['POST'])
def send_report():
    """Send the diagnostic report to the doctor."""
    data = request.json
    prediction = data.get('prediction')
    confidence = data.get('confidence')

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        return jsonify({'error': 'Email configuration is missing on the server.'}), 500

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_EMAIL
        msg['To'] = DOCTOR_EMAIL
        msg['Subject'] = f"URGENT: Automated MRI Scan Report - {prediction}"

        body = f"""
        Dear Doctor,

        An automated MRI scan analysis has been completed.

        Diagnostic Result: {prediction}
        AI Confidence Level: {confidence}%

        Please review the patient's scan in the system immediately.

        Regards,
        Brain Tumor Detection System
        """
        msg.attach(MIMEText(body, 'plain'))

        # Fast send using SMTP_SSL
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()

        return jsonify({'success': 'Report sent successfully to Dr. Aniket.'})
    except Exception as e:
        print(f"Email Error: {e}")
        return jsonify({'error': f'Failed to send email: {str(e)}'}), 500

if __name__ == '__main__':
    # Run the app
    app.run(host='0.0.0.0', port=5000, debug=False)
