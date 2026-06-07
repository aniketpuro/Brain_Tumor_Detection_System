# 🧠 Brain Tumor Detection System

🚀 **AI-Powered MRI Classification & Medical Guidance**

## 🌟 Overview
The **Brain Tumor Detection System** is a cutting-edge Deep Learning application designed to assist in the identification and classification of brain tumors from MRI scans. Utilizing a fine-tuned **InceptionNet** architecture, this tool provides rapid insights and basic medical guidance based on the detected tumor type.

This project seamlessly integrates **Advanced Machine Learning** with a user-friendly **Flask Web Interface**, making complex diagnostic assistance accessible.

---

## 🔍 Capabilities
The system is trained to identify the following categories:
- **Glioma**: Malignant tumors originating in the glial cells.
- **Meningioma**: Typically benign tumors arising from the meninges.
- **Pituitary Tumor**: Tumors affecting the pituitary gland and hormone regulation.
- **No Tumor**: Healthy brain scans showing no signs of tumorous growth.

## 🛠️ Tech Stack
- **Backend:** Python, Flask
- **Deep Learning:** TensorFlow, Keras, InceptionNet (V3)
- **Image Processing:** OpenCV, NumPy
- **Frontend:** HTML5, Modern CSS, JavaScript
- **Optimization:** Keras Tuner, Data Augmentation

---

## 📈 Performance Highlights
- ✅ **High Accuracy:** Achieved 90% test accuracy through rigorous training.
- ✅ **Robustness:** Optimized with Data Augmentation for better generalization across different MRI qualities.
- ✅ **Hyperparameter Tuned:** Fine-tuned using Keras Tuner for peak performance.

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have Python 3.9+ installed on your system.

### 📥 Installation
1. **Clone the Repository:**
   ```bash
   git clone <your-repository-url>
   cd Brain-Tumor-Detection
   ```

2. **Set Up Environment:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Download the Model:**
   *Place your `Brain_tumor_inception_model.h5` inside the `src/models/` directory.*

4. **Launch the Application:**
   ```bash
   python src/app.py
   ```

## 🖥️ Usage Guide
1. Launch the app and navigate to `http://127.0.0.1:5000`.
2. **Upload** a clear MRI scan image.
3. Click **Predict** to analyze the scan.
4. Review the **Classification Result** and the accompanying **Medical Guidance**.

---

## ⚠️ Medical Disclaimer
**IMPORTANT:** This application is intended for educational and research purposes only. It is **NOT** a certified medical diagnostic tool. All results should be verified by a qualified healthcare professional.

## 📜 License
Distributed under the **MIT License**. See `LICENSE` for more information.

---
✨ *Developed with dedication to AI in Healthcare* ✨
