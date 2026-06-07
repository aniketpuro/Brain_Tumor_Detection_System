import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analyzeScan, fetchPatients, createPatient, fetchPatientScans } from "../utils/api";
import { getMedicalData, getRiskLevel, getRiskColor } from "../utils/medicalData";
import { generatePDF } from "../utils/pdfGenerator";
import {
  Upload,
  FileImage,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Download,
  RotateCcw,
  Stethoscope,
  Activity,
  ShieldAlert,
  FlaskConical,
  Pill,
  ClipboardList,
  Sparkles,
  X,
  ImageIcon,
  Info,
  Plus,
  Layers,
  Users,
  User as UserIcon,
  Search,
} from "lucide-react";

const STEPS = [
  { num: 1, label: "Patient", icon: UserIcon },
  { num: 2, label: "Upload", icon: Upload },
  { num: 3, label: "Preview", icon: FileImage },
  { num: 4, label: "Analysis", icon: Brain },
  { num: 5, label: "Results", icon: CheckCircle2 },
];

const ANALYSIS_MESSAGES = [
  "Initializing neural network...",
  "Pre-processing MRI scan...",
  "Analyzing brain structures...",
  "Detecting anomalies...",
  "Classifying tissue patterns...",
  "Localizing tumor region...",
  "Generating diagnosis...",
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8 overflow-x-auto">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = current === s.num;
        const done = current > s.num;
        return (
          <div key={s.num} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  done
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                    : active
                      ? "bg-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-500/20"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                }`}
              >
                {done ? <CheckCircle2 size={16} /> : <Icon size={16} />}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  active ? "text-brand-700 dark:text-brand-400" : done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 rounded transition-colors duration-300 ${current > s.num ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceDonut({ value, riskColor }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const colorMap = { red: "#ef4444", amber: "#f59e0b", emerald: "#10b981", slate: "#64748b" };
  const stroke = colorMap[riskColor] || colorMap.slate;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={stroke} strokeWidth="10" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 60 60)" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">percent</span>
      </div>
    </div>
  );
}

export default function ScanAnalysis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patient");

  const [step, setStep] = useState(preselectedPatientId ? 2 : 1);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", age: "", gender: "", medical_history: "", contact_phone: "", contact_email: "" });
  const [previousScans, setPreviousScans] = useState([]);

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const [error, setError] = useState(null);
  const [statusIdx, setStatusIdx] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Load patients list
  useEffect(() => {
    fetchPatients().then(setPatients).catch(() => {});
  }, []);

  // Auto-select preselected patient
  useEffect(() => {
    if (preselectedPatientId && patients.length > 0 && !selectedPatient) {
      const p = patients.find((pt) => pt.id === Number(preselectedPatientId));
      if (p) {
        setSelectedPatient(p);
        fetchPatientScans(p.id).then((data) => setPreviousScans(data.scans || [])).catch(() => {});
      }
    }
  }, [preselectedPatientId, patients, selectedPatient]);

  useEffect(() => {
    if (!analyzing) return;
    const id = setInterval(() => setStatusIdx((i) => (i + 1) % ANALYSIS_MESSAGES.length), 2000);
    return () => clearInterval(id);
  }, [analyzing]);

  const selectPatient = async (p) => {
    setSelectedPatient(p);
    setStep(2);
    try {
      const data = await fetchPatientScans(p.id);
      setPreviousScans(data.scans || []);
    } catch {
      setPreviousScans([]);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      const p = await createPatient({ ...newPatient, age: newPatient.age ? Number(newPatient.age) : null });
      setPatients((prev) => [p, ...prev]);
      setSelectedPatient(p);
      setPreviousScans([]);
      setShowNewPatient(false);
      setNewPatient({ name: "", age: "", gender: "", medical_history: "", contact_phone: "", contact_email: "" });
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
  };

  const addFiles = useCallback(
    (incoming) => {
      const valid = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
      if (valid.length === 0) { setError("Please select valid image files."); return; }
      setError(null);
      setFiles((prev) => [...prev, ...valid]);
      valid.forEach((f) => {
        const reader = new FileReader();
        reader.onload = (e) => setPreviews((prev) => [...prev, e.target.result]);
        reader.readAsDataURL(f);
      });
      setStep(3);
    },
    []
  );

  const removeFile = (idx) => {
    setFiles((f) => f.filter((_, i) => i !== idx));
    setPreviews((p) => p.filter((_, i) => i !== idx));
    if (files.length <= 1) { setStep(2); setFiles([]); setPreviews([]); }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleAnalyze = async () => {
    setStep(4);
    setAnalyzing(true);
    setError(null);
    setStatusIdx(0);
    setAnalyzeProgress({ done: 0, total: files.length });

    const allResults = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const data = await analyzeScan(files[i], selectedPatient.id);
        const medData = getMedicalData(data.prediction);
        allResults.push({
          ...data,
          risk: data.risk || getRiskLevel(data.prediction),
          riskColor: medData.riskColor || "slate",
          medical: medData,
          fileName: files[i].name,
          imageData: previews[i],
          heatmap: data.heatmap || null,
        });
        setAnalyzeProgress({ done: i + 1, total: files.length });
      }
      setResults(allResults);
      setActiveResultIdx(0);
      setStep(5);
    } catch (err) {
      setError(err.message);
      setStep(3);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setStep(selectedPatient ? 2 : 1);
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setActiveResultIdx(0);
    setError(null);
  };

  const handleDownloadPDF = () => {
    if (results.length === 0) return;
    generatePDF({
      scans: results.map((r) => ({
        prediction: r.prediction,
        confidence: r.prediction_prob,
        risk: r.risk,
        medical: r.medical,
        allProbabilities: r.all_probabilities,
        imageData: r.imageData,
        heatmap: r.heatmap,
        fileName: r.fileName,
      })),
      patient: selectedPatient,
      previousScans,
      doctorName: user?.full_name || "Doctor",
    });
  };

  // ── Step 1: Patient Selection ─────────────────────────────────────────
  const renderPatientSelect = () => {
    const filteredPatients = patients.filter((p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase())
    );

    return (
      <div className="max-w-3xl mx-auto animate-slide-up space-y-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users size={18} className="text-brand-500" />
              Select Patient
            </h3>
            <button onClick={() => setShowNewPatient(!showNewPatient)} className="btn-secondary text-sm py-2 px-3">
              <Plus size={14} /> New Patient
            </button>
          </div>

          {/* New patient inline form */}
          {showNewPatient && (
            <form onSubmit={handleCreatePatient} className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <input type="text" required placeholder="Patient Name *" className="input-field" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} />
                <input type="number" placeholder="Age" min="0" max="150" className="input-field" value={newPatient.age} onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })} />
                <select className="input-field" value={newPatient.gender} onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}>
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <textarea placeholder="Medical history (optional)" rows={2} className="input-field" value={newPatient.medical_history} onChange={(e) => setNewPatient({ ...newPatient, medical_history: e.target.value })} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input type="tel" placeholder="Phone (optional)" className="input-field" value={newPatient.contact_phone} onChange={(e) => setNewPatient({ ...newPatient, contact_phone: e.target.value })} />
                <input type="email" placeholder="Email (optional)" className="input-field" value={newPatient.contact_email} onChange={(e) => setNewPatient({ ...newPatient, contact_email: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm">Create & Select</button>
                <button type="button" onClick={() => setShowNewPatient(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search patients..." className="input-field pl-9" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
          </div>

          {filteredPatients.length === 0 ? (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
              {patients.length === 0 ? "No patients registered yet. Create one above." : "No patients match your search."}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm shrink-0">
                    {p.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[p.age && `${p.age}y`, p.gender, `${p.scanCount || 0} scans`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
      </div>
    );
  };

  // ── Step 2: Upload ────────────────────────────────────────────────────
  const renderUpload = () => (
    <div className="max-w-2xl mx-auto animate-slide-up space-y-4">
      {/* Patient banner */}
      {selectedPatient && (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
            {selectedPatient.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{selectedPatient.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {[selectedPatient.age && `${selectedPatient.age}y`, selectedPatient.gender].filter(Boolean).join(" · ")}
              {previousScans.length > 0 && ` · ${previousScans.length} previous scan${previousScans.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button onClick={() => { setSelectedPatient(null); setPreviousScans([]); setStep(1); }} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
            Change
          </button>
        </div>
      )}

      <div className="card p-8 text-center">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input").click()}
          className={`border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-200 ${
            dragActive ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors ${dragActive ? "bg-brand-100 dark:bg-brand-900/50 text-brand-600" : "bg-slate-100 dark:bg-slate-700 text-slate-400"}`}>
            <Upload size={32} />
          </div>
          <p className="text-lg font-semibold mb-1">{dragActive ? "Drop MRI scans here" : "Upload MRI Scans"}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Drag & drop or click to browse. Select one or multiple images.</p>
          <span className="btn-primary text-sm"><ImageIcon size={16} /> Choose Files</span>
          <input id="file-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
            <AlertTriangle size={16} />{error}
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 3: Preview ───────────────────────────────────────────────────
  const renderPreview = () => (
    <div className="max-w-5xl mx-auto animate-slide-up">
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Layers size={18} className="text-brand-500" />
              {files.length} {files.length === 1 ? "Scan" : "Scans"} Selected
            </h3>
            <button onClick={() => document.getElementById("file-input-add").click()} className="btn-secondary text-sm py-2 px-3">
              <Plus size={14} /> Add More
            </button>
            <input id="file-input-add" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />
          </div>
          <div className={`grid gap-3 ${files.length === 1 ? "grid-cols-1 max-w-sm" : files.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
            {previews.map((src, i) => (
              <div key={i} className="card p-2 group relative">
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-900">
                  <img src={src} alt={`MRI ${i + 1}`} className="w-full h-full object-contain" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 px-1 truncate">{files[i]?.name}</p>
                <button onClick={() => removeFile(i)} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedPatient && (
            <div className="card p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ClipboardList size={18} className="text-brand-500" /> Patient
              </h3>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Name</dt><dd className="font-medium">{selectedPatient.name}</dd></div>
                {selectedPatient.age && <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Age</dt><dd className="font-medium">{selectedPatient.age}</dd></div>}
                {selectedPatient.gender && <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Gender</dt><dd className="font-medium">{selectedPatient.gender}</dd></div>}
                <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Previous Scans</dt><dd className="font-medium">{previousScans.length}</dd></div>
              </dl>
            </div>
          )}

          <div className="card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Info size={18} className="text-brand-500" /> Scan Summary</h3>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Total Files</dt><dd className="font-medium">{files.length}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Total Size</dt><dd className="font-medium">{(files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(1)} KB</dd></div>
            </dl>
          </div>

          <button onClick={handleAnalyze} className="btn-primary w-full justify-center py-3 text-base">
            <Brain size={20} />
            Analyze {files.length > 1 ? `All ${files.length} Scans` : "Scan"}
            <ChevronRight size={18} />
          </button>
          <button onClick={handleReset} className="btn-secondary w-full justify-center"><RotateCcw size={16} /> Clear All</button>
          {error && <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3"><AlertTriangle size={16} />{error}</div>}
        </div>
      </div>
    </div>
  );

  // ── Step 4: Analyzing ─────────────────────────────────────────────────
  const renderAnalyzing = () => (
    <div className="max-w-md mx-auto text-center animate-fade-in">
      <div className="card p-8">
        <div className="relative w-40 h-40 mx-auto mb-6 rounded-2xl overflow-hidden bg-slate-900">
          <img src={previews[Math.min(analyzeProgress.done, previews.length - 1)]} alt="Scanning" className="w-full h-full object-contain opacity-70" />
          <div className="scan-overlay" />
        </div>
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Brain size={32} className="text-brand-600 dark:text-brand-400" />
            <div className="absolute inset-0 rounded-full border-2 border-brand-500 animate-pulse-ring" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-1">Analyzing MRI Scans</h3>
        {selectedPatient && <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Patient: {selectedPatient.name}</p>}
        {files.length > 1 && (
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400 mb-1">
            Scan {Math.min(analyzeProgress.done + 1, analyzeProgress.total)} of {analyzeProgress.total}
          </p>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400 h-5 transition-all">{ANALYSIS_MESSAGES[statusIdx]}</p>
        <div className="mt-6 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${analyzeProgress.total > 0 ? (analyzeProgress.done / analyzeProgress.total) * 100 : 0}%` }} />
        </div>
      </div>
    </div>
  );

  // ── Step 5: Results ───────────────────────────────────────────────────
  const renderResults = () => {
    if (results.length === 0) return null;
    const r = results[activeResultIdx];
    const med = r.medical;
    const colors = getRiskColor(r.prediction);

    const sections = [
      { key: "overview", title: "Overview", icon: Stethoscope, content: med.overview },
      med.symptoms?.length > 0 && { key: "symptoms", title: "Common Symptoms", icon: Activity, list: med.symptoms },
      { key: "diagnostics", title: "Recommended Diagnostics", icon: FlaskConical, list: med.diagnostics },
      med.treatments?.length > 0 && { key: "treatments", title: "Treatment Options", icon: Pill, list: med.treatments },
      { key: "recommendations", title: "Recommendations", icon: ClipboardList, list: med.recommendations },
    ].filter(Boolean);

    return (
      <div className="space-y-6 animate-slide-up">
        {results.length > 1 && (
          <div className="card p-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-thin">
              {results.map((res, i) => {
                const c = getRiskColor(res.prediction);
                return (
                  <button key={i} onClick={() => setActiveResultIdx(i)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shrink-0 transition-all ${i === activeResultIdx ? "bg-brand-600 text-white shadow-md" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 shrink-0"><img src={res.imageData} alt="" className="w-full h-full object-contain" /></div>
                    <div className="text-left">
                      <p className="leading-tight">Scan {i + 1}</p>
                      <p className={`text-[11px] leading-tight ${i === activeResultIdx ? "text-white/70" : c.text}`}>{res.prediction}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-900">
              {r.heatmap ? (
                <img src={r.heatmap} alt="Tumor Region" className="w-full h-full object-contain" />
              ) : (
                <img src={r.imageData} alt="MRI Scan" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 px-1">
              <Sparkles size={14} className="text-brand-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {r.heatmap ? "AI-detected tumor region highlighted" : "Original MRI scan"}
              </span>
            </div>
          </div>

          <div className="card p-6 flex flex-col items-center justify-center text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${colors.bg}`}>
              <ShieldAlert size={28} className={colors.text} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">AI Diagnosis</p>
            <h2 className="text-2xl font-bold mb-2">{r.prediction}</h2>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}>Risk: {r.risk}</span>
          </div>

          <div className="card p-6 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Confidence Score</p>
            <ConfidenceDonut value={r.prediction_prob} riskColor={r.riskColor} />
            {r.all_probabilities && (
              <div className="w-full mt-4 space-y-2">
                {Object.entries(r.all_probabilities).sort((a, b) => b[1] - a[1]).map(([label, prob]) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className="w-24 text-right text-slate-500 dark:text-slate-400 truncate">{label.replace(" Tumor", "")}</span>
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${prob}%` }} /></div>
                    <span className="w-12 text-right font-medium">{prob}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comparative analysis with previous scans */}
        {previousScans.length > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity size={18} className="text-brand-500" />
              Scan History Comparison — {selectedPatient?.name}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Diagnosis</th>
                    <th className="pb-2 pr-4">Confidence</th>
                    <th className="pb-2">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {previousScans.slice(0, 10).map((s) => {
                    const sc = getRiskColor(s.prediction);
                    return (
                      <tr key={s.id}>
                        <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{s.date ? new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                        <td className="py-2 pr-4 font-medium">{s.prediction}</td>
                        <td className="py-2 pr-4">{s.confidence}%</td>
                        <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>{s.risk || getRiskLevel(s.prediction)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div key={sec.key} className="card p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Icon size={18} className="text-brand-500" />{sec.title}</h3>
                {sec.content && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{sec.content}</p>}
                {sec.list && <ul className="space-y-2">{sec.list.map((item, i) => (<li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><ChevronRight size={14} className="mt-1 text-brand-400 shrink-0" />{item}</li>))}</ul>}
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Medical Disclaimer:</strong> This AI analysis is for educational and research purposes only. Always consult a qualified healthcare professional for clinical decisions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={handleDownloadPDF} className="btn-primary">
            <Download size={18} /> Download PDF Report
            {results.length > 1 && <span className="text-xs opacity-80">({results.length} scans)</span>}
          </button>
          <button onClick={handleReset} className="btn-secondary"><RotateCcw size={18} /> New Scan</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <StepIndicator current={step} />
      {step === 1 && renderPatientSelect()}
      {step === 2 && renderUpload()}
      {step === 3 && renderPreview()}
      {step === 4 && renderAnalyzing()}
      {step === 5 && renderResults()}
    </div>
  );
}
