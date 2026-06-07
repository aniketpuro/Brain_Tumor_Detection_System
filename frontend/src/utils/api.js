const API_BASE = "/api";
const OPTS = { credentials: "include" };
const JSON_OPTS = {
  headers: { "Content-Type": "application/json" },
  ...OPTS,
};

// ── Scan Analysis ─────────────────────────────────────────────────────────

export async function analyzeScan(file, patientId) {
  const form = new FormData();
  form.append("image", file);
  form.append("patient_id", String(patientId));

  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    body: form,
    ...OPTS,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Server responded with ${res.status}`);
  }
  return data;
}

// ── Scans ─────────────────────────────────────────────────────────────────

export async function fetchScans() {
  const res = await fetch(`${API_BASE}/scans`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch scans");
  return data.scans;
}

export async function deleteScan(id) {
  const res = await fetch(`${API_BASE}/scans/${id}`, {
    method: "DELETE",
    ...OPTS,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete scan");
  return data;
}

// ── Patients ──────────────────────────────────────────────────────────────

export async function fetchPatients() {
  const res = await fetch(`${API_BASE}/patients`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch patients");
  return data.patients;
}

export async function createPatient(info) {
  const res = await fetch(`${API_BASE}/patients`, {
    method: "POST",
    ...JSON_OPTS,
    body: JSON.stringify(info),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create patient");
  return data.patient;
}

export async function updatePatient(id, info) {
  const res = await fetch(`${API_BASE}/patients/${id}`, {
    method: "PUT",
    ...JSON_OPTS,
    body: JSON.stringify(info),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update patient");
  return data.patient;
}

export async function deletePatient(id) {
  const res = await fetch(`${API_BASE}/patients/${id}`, {
    method: "DELETE",
    ...OPTS,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete patient");
  return data;
}

export async function fetchPatientScans(patientId) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/scans`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch patient scans");
  return data;
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch dashboard");
  return data;
}

// ── Misc ──────────────────────────────────────────────────────────────────

export async function sendReport({ prediction, confidence }) {
  const res = await fetch(`${API_BASE}/send-report`, {
    method: "POST",
    ...JSON_OPTS,
    body: JSON.stringify({ prediction, confidence }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Server responded with ${res.status}`);
  }
  return data;
}

export async function healthCheck() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch {
    return { status: "error", model_loaded: false };
  }
}

export async function generateAIReport(patientId) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/ai-report`, {
    method: "POST",
    ...OPTS,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 500) {
    throw new Error(data.error || "Failed to generate AI report");
  }
  return data;
}
