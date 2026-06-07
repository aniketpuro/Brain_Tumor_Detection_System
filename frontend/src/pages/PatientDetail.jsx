import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPatientScans, deleteScan, generateAIReport } from "../utils/api";
import { getRiskLevel, getRiskColor, getMedicalData } from "../utils/medicalData";
import { generatePDF, generateConsolidatedReport } from "../utils/pdfGenerator";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  ScanLine,
  Download,
  Trash2,
  AlertTriangle,
  RefreshCw,
  FileImage,
  ChevronRight,
  Activity,
  User,
  Clock,
  Phone,
  Mail,
  Sparkles,
} from "lucide-react";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStatus, setReportStatus] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPatientScans(id);
      setPatient(data.patient);
      setScans(data.scans || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (scanId, e) => {
    e.stopPropagation();
    try {
      await deleteScan(scanId);
      setScans((prev) => prev.filter((s) => s.id !== scanId));
      if (selected?.id === scanId) setSelected(null);
    } catch (err) {
      setError(err.message);
    }
    setConfirmDel(null);
  };

  const handleDownloadSinglePDF = (scan) => {
    const med = getMedicalData(scan.prediction);
    generatePDF({
      scans: [{
        prediction: scan.prediction,
        confidence: scan.confidence,
        risk: scan.risk || getRiskLevel(scan.prediction),
        medical: med,
        allProbabilities: scan.allProbabilities,
        imageData: scan.heatmap || null,
        fileName: scan.fileName || "scan.jpg",
      }],
      patient,
      previousScans: scans,
      doctorName: user?.full_name || "Doctor",
    });
  };

  const handleDownloadFullReport = async () => {
    if (scans.length === 0 || reportLoading) return;
    setReportLoading(true);

    const statusMessages = [
      "Initialising AI diagnostic engine...",
      "Analysing MRI scan patterns...",
      "Running deep learning inference...",
      "Correlating multi-scan findings...",
      "Generating clinical narrative...",
    ];
    let msgIdx = 0;
    setReportStatus(statusMessages[0]);
    const interval = setInterval(() => {
      msgIdx++;
      if (msgIdx < statusMessages.length) {
        setReportStatus(statusMessages[msgIdx]);
      }
    }, 800);

    let aiReport = null;
    try {
      const result = await generateAIReport(id);
      clearInterval(interval);
      if (result.ai_available && result.data) {
        aiReport = result.data;
        setReportStatus("AI analysis complete. Building PDF...");
      } else {
        setReportStatus("Compiling report...");
      }
    } catch {
      clearInterval(interval);
      setReportStatus("Compiling report...");
    }

    try {
      generateConsolidatedReport({
        patient,
        scans: scans.map((s) => ({
          ...s,
          medical: getMedicalData(s.prediction),
        })),
        aiReport,
        doctorName: user?.full_name || "Doctor",
      });
      setReportStatus(null);
    } catch (err) {
      setReportStatus(`Report failed: ${err.message}`);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw size={32} className="text-brand-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading patient...</p>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={32} className="text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button onClick={() => navigate("/patients")} className="btn-secondary">
          <ArrowLeft size={16} /> Back to Patients
        </button>
      </div>
    );
  }

  const tumorScans = scans.filter((s) => s.prediction !== "No Tumor");
  const clearScans = scans.filter((s) => s.prediction === "No Tumor");
  const avgConf = scans.length > 0
    ? (scans.reduce((sum, s) => sum + s.confidence, 0) / scans.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/patients")}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Patients
      </button>

      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {reportStatus && reportStatus.startsWith("Report failed") && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <AlertTriangle size={16} />{reportStatus}
        </div>
      )}

      {/* Patient info header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xl shrink-0">
            {patient?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{patient?.name}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
              {patient?.age && (
                <span className="flex items-center gap-1"><User size={14} /> {patient.age} years</span>
              )}
              {patient?.gender && (
                <span className="flex items-center gap-1">{patient.gender}</span>
              )}
              {patient?.contactPhone && (
                <span className="flex items-center gap-1"><Phone size={14} /> {patient.contactPhone}</span>
              )}
              {patient?.contactEmail && (
                <span className="flex items-center gap-1"><Mail size={14} /> {patient.contactEmail}</span>
              )}
            </div>
            {patient?.medicalHistory && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-500 dark:text-slate-400">Medical History:</span> {patient.medicalHistory}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button onClick={() => navigate(`/scan?patient=${id}`)} className="btn-primary text-sm">
              <ScanLine size={16} /> New Scan
            </button>
            {scans.length > 0 && (
              <button
                onClick={handleDownloadFullReport}
                disabled={reportLoading}
                className="btn-secondary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                title="Generate a comprehensive AI-powered consolidated report"
              >
                {reportLoading ? (
                  <><RefreshCw size={16} className="animate-spin" /> {reportStatus || "Generating..."}</>
                ) : (
                  <><Sparkles size={16} /> AI Full Report</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{scans.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Scans</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{tumorScans.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tumors Found</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{clearScans.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Clear Scans</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{avgConf}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Avg Confidence</p>
        </div>
      </div>

      {/* Scan history */}
      {scans.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Clock size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold mb-2">No Scans Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Upload MRI scans for this patient to begin analysis.
          </p>
          <button onClick={() => navigate(`/scan?patient=${id}`)} className="btn-primary">
            <ScanLine size={18} /> Upload Scans
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Scan list */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity size={18} className="text-brand-500" />
              Scan History ({scans.length})
            </h3>
            {scans.map((scan) => {
              const colors = getRiskColor(scan.prediction);
              const risk = scan.risk || getRiskLevel(scan.prediction);
              const isSelected = selected?.id === scan.id;
              return (
                <div
                  key={scan.id}
                  onClick={() => setSelected(scan)}
                  className={`card p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected ? "ring-2 ring-brand-500 shadow-md" : "hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    {scan.heatmap ? (
                      <img src={scan.heatmap} alt="Scan" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><FileImage size={18} className="text-slate-600" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{scan.prediction}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors.bg} ${colors.text}`}>{risk}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {scan.fileName || "scan"} &middot;{" "}
                      {scan.date ? new Date(scan.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <span className="text-lg font-bold">{scan.confidence}%</span>
                    <p className="text-[11px] text-slate-400">confidence</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownloadSinglePDF(scan); }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-brand-600 transition-colors"
                      title="Download PDF"
                    >
                      <Download size={16} />
                    </button>
                    {confirmDel === scan.id ? (
                      <button
                        onClick={(e) => handleDelete(scan.id, e)}
                        className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-medium"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDel(scan.id); setTimeout(() => setConfirmDel(null), 3000); }}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            {selected ? (
              <div className="card p-6 sticky top-6 space-y-4 animate-fade-in">
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-900">
                  {selected.heatmap ? (
                    <img src={selected.heatmap} alt="Scan" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><FileImage size={40} className="text-slate-600" /></div>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold">{selected.prediction}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Confidence: {selected.confidence}%</p>
                </div>
                <dl className="text-sm space-y-2">
                  <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">File</dt><dd className="font-medium truncate ml-4">{selected.fileName || "scan"}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Date</dt><dd className="font-medium">{selected.date ? new Date(selected.date).toLocaleDateString() : "—"}</dd></div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Risk</dt>
                    <dd><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRiskColor(selected.prediction).bg} ${getRiskColor(selected.prediction).text}`}>{selected.risk || getRiskLevel(selected.prediction)}</span></dd>
                  </div>
                </dl>
                {selected.allProbabilities && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Class Probabilities</p>
                    {Object.entries(selected.allProbabilities).sort((a, b) => b[1] - a[1]).map(([label, prob]) => (
                      <div key={label} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-right text-slate-500 truncate">{label.replace(" Tumor", "")}</span>
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${prob}%` }} /></div>
                        <span className="w-10 text-right font-medium">{prob}%</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => handleDownloadSinglePDF(selected)} className="btn-primary w-full justify-center"><Download size={16} /> Download Report</button>
              </div>
            ) : (
              <div className="card p-8 text-center text-slate-400 dark:text-slate-500">
                <ChevronRight size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a scan to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
