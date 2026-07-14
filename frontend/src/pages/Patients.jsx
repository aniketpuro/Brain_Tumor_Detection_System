import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchPatients,
  createPatient,
  deletePatient,
} from "../utils/api";
import {
  Users,
  Plus,
  Search,
  X,
  Trash2,
  ScanLine,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  User,
} from "lucide-react";

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    medical_history: "",
    contact_phone: "",
    contact_email: "",
    password: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPatients();
      setPatients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.contactEmail || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      const patient = await createPatient({
        ...form,
        age: form.age ? Number(form.age) : null,
      });
      setPatients((prev) => [patient, ...prev]);
      setShowForm(false);
      setForm({ name: "", age: "", gender: "", medical_history: "", contact_phone: "", contact_email: "", password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deletePatient(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
    setConfirmDel(null);
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw size={32} className="text-brand-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading patients...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients..."
            className="input-field pl-9 pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">
            {filtered.length} patient{filtered.length !== 1 ? "s" : ""}
          </span>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus size={16} /> New Patient
          </button>
        </div>
      </div>

      {/* New patient form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus size={18} className="text-brand-500" />
              Register New Patient
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <input type="text" required placeholder="Patient Name *" className="input-field" value={form.name} onChange={set("name")} />
            <input type="number" placeholder="Age" min="0" max="150" className="input-field" value={form.age} onChange={set("age")} />
            <select className="input-field" value={form.gender} onChange={set("gender")}>
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <textarea
            placeholder="Medical history (optional)"
            rows={2}
            className="input-field"
            value={form.medical_history}
            onChange={set("medical_history")}
          />

          <div className="grid sm:grid-cols-3 gap-3">
            <input type="tel" placeholder="Phone (optional)" className="input-field" value={form.contact_phone} onChange={set("contact_phone")} />
            <input type="email" placeholder="Email (optional)" className="input-field" value={form.contact_email} onChange={set("contact_email")} />
            <input type="password" placeholder="Portal Password (optional)" className="input-field" value={form.password} onChange={set("password")} />
          </div>
          <p className="text-xs text-slate-500">Entering an email and password will enable portal access for this patient.</p>

          <div className="flex gap-2">
            <button type="submit" disabled={formLoading} className="btn-primary disabled:opacity-60">
              {formLoading ? "Creating..." : "Create Patient"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Patient list */}
      {filtered.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
            <Users size={36} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Patients Yet</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
            Register a patient to begin uploading and analyzing MRI scans.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={18} /> Register First Patient
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="card p-5 hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/patients/${p.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                    {p.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{p.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[p.age && `${p.age}y`, p.gender].filter(Boolean).join(" · ") || "No details"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {confirmDel === p.id ? (
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg font-medium"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDel(p.id);
                        setTimeout(() => setConfirmDel(null), 3000);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {p.scanCount || 0} scan{(p.scanCount || 0) !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 font-medium">
                  View Details <ChevronRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
