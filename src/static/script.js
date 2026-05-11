const fileInput = document.querySelector('#input_file');
const fileNameDisplay = document.querySelector('#file-name');
const inputImage = document.querySelector('#input_image');
const inputImageHeading = document.querySelector('#input_image_heading');
const predictBtn = document.querySelector('#predict_btn');
const loader = document.querySelector('#loader');
const resultSection = document.querySelector('#result-section');
const outputResult = document.querySelector('#output_result');
const outputInfo = document.querySelector('#output_info');
const confidenceFill = document.querySelector('#confidence-fill');
const emailBtn = document.querySelector('#email_btn');

let selectedFile = null;
let currentPrediction = null;
let currentConfidence = null;

// File Selection Handler
fileInput.onchange = function() {
    selectedFile = fileInput.files[0];
    if (selectedFile) {
        fileNameDisplay.textContent = selectedFile.name;
        const imageUrl = URL.createObjectURL(selectedFile);
        inputImage.src = imageUrl;
        inputImageHeading.style.display = 'block';
        inputImage.style.display = 'block';
        // Reset results on new file
        resultSection.style.display = 'none';
        emailBtn.textContent = "✉️ Alert Doctor (aniketpurohit851@gmail.com)";
        emailBtn.disabled = false;
    }
};

// Prediction Handler
predictBtn.onclick = () => {
    if (!selectedFile) {
        alert("Please select an MRI image first.");
        return;
    }

    // UI Updates
    predictBtn.disabled = true;
    loader.style.display = 'block';
    resultSection.style.display = 'none';

    const formData = new FormData();
    formData.append('image', selectedFile);

    fetch('/predict', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        predictBtn.disabled = false;
        loader.style.display = 'none';

        if (data.error) {
            alert("Error: " + data.error);
            return;
        }

        currentPrediction = data.prediction;
        currentConfidence = data.prediction_prob;

        // Display Result
        resultSection.style.display = 'block';
        outputResult.textContent = `${currentPrediction} (${currentConfidence}%)`;
        confidenceFill.style.width = `${currentConfidence}%`;

        // Medical Guidance Logic
        let adviceHtml = "";
        if (currentPrediction === 'Glioma Tumor') {
            adviceHtml = `
                <ul>
                    <li><strong>Overview:</strong> Gliomas arise from glial cells and can be benign or malignant.</li>
                    <li><strong>Next Steps:</strong> Immediate consultation with a neurologist or oncologist is recommended.</li>
                    <li><strong>Diagnostics:</strong> Further assessment via MRI and biopsy may be necessary.</li>
                    <li><strong>Treatments:</strong> Options include surgery, radiation, or chemotherapy based on grading.</li>
                </ul>`;
        } else if (currentPrediction === 'Meningioma Tumor') {
            adviceHtml = `
                <ul>
                    <li><strong>Overview:</strong> Typically slow-growing tumors arising from the meninges.</li>
                    <li><strong>Next Steps:</strong> Consult a neurosurgeon to discuss monitoring or intervention.</li>
                    <li><strong>Diagnostics:</strong> Regular MRI scans are often recommended for observation.</li>
                    <li><strong>Treatments:</strong> May include observation, surgery, or specialized radiation.</li>
                </ul>`;
        } else if (currentPrediction === 'Pituitary Tumor') {
            adviceHtml = `
                <ul>
                    <li><strong>Overview:</strong> Tumors affecting hormone regulation and vision.</li>
                    <li><strong>Next Steps:</strong> Consultation with an endocrinologist is highly recommended.</li>
                    <li><strong>Diagnostics:</strong> Blood tests for hormone levels and vision exams are standard.</li>
                    <li><strong>Treatments:</strong> Medication, hormone therapy, or surgery depending on tumor size.</li>
                </ul>`;
        } else if (currentPrediction === 'No Tumor') {
            adviceHtml = `
                <div class="success-message">
                    <p>✅ <strong>No tumorous growth detected.</strong></p>
                    <p>Continue to monitor for symptoms like persistent headaches or dizziness. Maintain routine health check-ups.</p>
                </div>`;
        }

        outputInfo.innerHTML = adviceHtml;
    })
    .catch(error => {
        predictBtn.disabled = false;
        loader.style.display = 'none';
        console.error('Error:', error);
        alert("An unexpected error occurred.");
    });
};

// Email Alert Handler
emailBtn.onclick = () => {
    if (!currentPrediction) return;

    emailBtn.disabled = true;
    emailBtn.textContent = "Sending...";

    fetch('/send_report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prediction: currentPrediction,
            confidence: currentConfidence
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            emailBtn.textContent = "Error Sending";
        } else {
            emailBtn.textContent = "✅ Alert Sent!";
            emailBtn.style.backgroundColor = "#10b981";
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Failed to send email alert.");
        emailBtn.textContent = "Try Again";
        emailBtn.disabled = false;
    });
};
