import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchScans, deleteScan } from "../utils/api";
import { getRiskLevel, getRiskColor, getMedicalData } from "../utils/medicalData";
import { generatePDF } from "../utils/pdfGenerator";
import { useAuth } from "../context/AuthContext";
import {
  Clock,
  Trash2,
  Download,
  Search,
  X,
  ScanLine,
  ChevronRight,
  AlertTriangle,
  FileImage,
  RefreshCw,
} from "lucide-react";

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirmClear, setConfirmClear] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScans();
      setScans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = scans.filter(
    (s) =>
      s.prediction.toLowerCase().includes(search.toLowerCase()) ||
      (s.fileName || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteScan(id);
      setScans((prev) => prev.filter((s) => s.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownloadPDF = (scan) => {
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
      doctorName: user?.full_name || "Doctor",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw size={32} className="text-brand-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading scan history...</p>
      </div>
    );
  }

  if (scans.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
          <Clock size={36} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Scan History</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
          Previous scan results will appear here after you analyze MRI scans.
        </p>
        <button onClick={() => navigate("/scan")} className="btn-primary">
          <ScanLine size={18} /> Start First Scan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <AlertTriangle size={16} />{error}
          <button onClick={load} className="ml-auto text-brand-600 hover:underline text-xs">Retry</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search scans..." className="input-field pl-9 pr-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">{filtered.length} scan{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={load} className="btn-secondary text-sm py-2 px-3"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filtered.map((scan) => {
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
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                  {scan.heatmap ? (
                    <img src={scan.heatmap} alt="Scan" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><FileImage size={20} className="text-slate-600" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{scan.prediction}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors.bg} ${colors.text}`}>{risk}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {scan.fileName || "scan"} &middot; {scan.date ? new Date(scan.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <span className="text-lg font-bold">{scan.confidence}%</span>
                  <p className="text-[11px] text-slate-400">confidence</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(scan); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-brand-600 transition-colors" title="Download PDF"><Download size={16} /></button>
                  {confirmClear === scan.id ? (
                    <button onClick={(e) => { handleDelete(scan.id, e); setConfirmClear(null); }} className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-medium">Confirm</button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setConfirmClear(scan.id); setTimeout(() => setConfirmClear(null), 3000); }} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          {selected ? (
            <div className="card p-6 sticky top-6 space-y-4 animate-fade-in">
              <div className="aspect-square rounded-xl overflow-hidden bg-slate-900">
                {selected.heatmap ? (
                  <img src={selected.heatmap} alt="Scan Heatmap" className="w-full h-full object-contain" />
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
              <button onClick={() => handleDownloadPDF(selected)} className="btn-primary w-full justify-center"><Download size={16} /> Download Report</button>
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-400 dark:text-slate-500">
              <ChevronRight size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a scan to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
