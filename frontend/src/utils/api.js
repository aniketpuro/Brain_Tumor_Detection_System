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

// ── Lifestyle Tracker ────────────────────────────────────────────────────

export async function generateGoals(patientId, force = false) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/goals/generate`, {
    method: "POST",
    ...JSON_OPTS,
    body: JSON.stringify({ force }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate goals");
  return data.goals;
}

export async function fetchGoals(patientId) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/goals`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch goals");
  return data.goals;
}

export async function updateGoal(patientId, goalId, updates) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/goals/${goalId}`, {
    method: "PUT",
    ...JSON_OPTS,
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update goal");
  return data.goal;
}

export async function submitDailyLog(patientId, logData) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/daily-log`, {
    method: "POST",
    ...JSON_OPTS,
    body: JSON.stringify(logData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save daily log");
  return data;
}

export async function fetchDailyLogs(patientId, days = 30) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/daily-logs?days=${days}`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch logs");
  return data.logs;
}

export async function fetchTrackerSummary(patientId, days = 30) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/tracker-summary?days=${days}`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch summary");
  return data;
}

// ── Patient Comparison ───────────────────────────────────────────────────

export async function comparePatients(patient1Id, patient2Id) {
  const res = await fetch(`${API_BASE}/patients/compare`, {
    method: "POST",
    ...JSON_OPTS,
    body: JSON.stringify({ patient1_id: patient1Id, patient2_id: patient2Id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to compare patients");
  return data;
}

// ── Patient Portal ───────────────────────────────────────────────────────

export async function patientLogin(email, password) {
  const res = await fetch(`${API_BASE}/auth/patient/login`, {
    method: "POST",
    ...JSON_OPTS,
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data.user;
}

export async function enablePatientPortal(patientId, password) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/portal/enable`, {
    method: "POST",
    ...JSON_OPTS,
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to enable portal");
  return data;
}

export async function portalFetchReports() {
  const res = await fetch(`${API_BASE}/portal/reports`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch reports");
  return data;
}

export async function portalFetchGoals() {
  const res = await fetch(`${API_BASE}/portal/goals`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch goals");
  return data.goals;
}

export async function portalSubmitDailyLog(logData) {
  const res = await fetch(`${API_BASE}/portal/daily-log`, {
    method: "POST",
    ...JSON_OPTS,
    body: JSON.stringify(logData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save log");
  return data.log;
}

export async function portalFetchDailyLogs(days = 30) {
  const res = await fetch(`${API_BASE}/portal/daily-logs?days=${days}`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch logs");
  return data.logs;
}

export async function portalFetchSummary(days = 30) {
  const res = await fetch(`${API_BASE}/portal/tracker-summary?days=${days}`, OPTS);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch summary");
  return data;
}
