import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPatients, comparePatients } from "../utils/api";
import {
  ArrowLeft,
  Users,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Flame,
  Droplets,
  Moon,
  Dumbbell,
  Smile,
  Apple,
  Target,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

function CompareBar({ label, val1, val2, name1, name2, unit, max }) {
  const maxVal = max || Math.max(val1, val2, 1);
  const w1 = (val1 / maxVal) * 100;
  const w2 = (val2 / maxVal) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>{unit}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs w-16 truncate text-right text-slate-600 dark:text-slate-300">{name1}</span>
          <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full flex items-center justify-end pr-1"
              style={{ width: `${w1}%` }}
            >
              <span className="text-[10px] text-white font-medium">{val1}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-16 truncate text-right text-slate-600 dark:text-slate-300">{name2}</span>
          <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-1"
              style={{ width: `${w2}%` }}
            >
              <span className="text-[10px] text-white font-medium">{val2}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparePatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [patient1, setPatient1] = useState("");
  const [patient2, setPatient2] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPatients()
      .then(setPatients)
      .catch((err) => setError(err.message))
      .finally(() => setPatientsLoading(false));
  }, []);

  const handleCompare = async () => {
    if (!patient1 || !patient2) {
      setError("Please select two patients to compare.");
      return;
    }
    if (patient1 === patient2) {
      setError("Please select two different patients.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const data = await comparePatients(parseInt(patient1), parseInt(patient2));
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Patient Progress Comparison</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Compare treatment effectiveness and recovery between patients
            </p>
          </div>
        </div>

        {/* Patient Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Patient 1</label>
            <select
              value={patient1}
              onChange={(e) => setPatient1(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              disabled={patientsLoading}
            >
              <option value="">Select patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.age ? `(${p.age}y)` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ArrowRight size={18} className="text-slate-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Patient 2</label>
            <select
              value={patient2}
              onChange={(e) => setPatient2(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              disabled={patientsLoading}
            >
              <option value="">Select patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.age ? `(${p.age}y)` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || !patient1 || !patient2}
          className="btn-primary mt-4 disabled:opacity-60"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
          {loading ? "Analyzing..." : "Compare Progress"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Comparison Results */}
      {result && (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5 border-l-4 border-brand-500">
              <h4 className="font-bold">{result.patient1.patient.name}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Diagnosis: <span className="font-medium text-slate-700 dark:text-slate-200">{result.patient1.diagnosis}</span>
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{result.patient1.streak}</p>
                  <p className="text-[10px] text-slate-400">Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{result.patient1.adherence}%</p>
                  <p className="text-[10px] text-slate-400">Adherence</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{result.patient1.totalLogs}</p>
                  <p className="text-[10px] text-slate-400">Logs</p>
                </div>
              </div>
            </div>
            <div className="card p-5 border-l-4 border-emerald-500">
              <h4 className="font-bold">{result.patient2.patient.name}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Diagnosis: <span className="font-medium text-slate-700 dark:text-slate-200">{result.patient2.diagnosis}</span>
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{result.patient2.streak}</p>
                  <p className="text-[10px] text-slate-400">Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{result.patient2.adherence}%</p>
                  <p className="text-[10px] text-slate-400">Adherence</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{result.patient2.totalLogs}</p>
                  <p className="text-[10px] text-slate-400">Logs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Comparison */}
          <div className="card p-6 space-y-5">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-500" /> Metric Comparison (30-Day Average)
            </h3>
            <CompareBar
              label="Sleep" val1={result.patient1.avgSleep} val2={result.patient2.avgSleep}
              name1={result.patient1.patient.name.split(" ")[0]}
              name2={result.patient2.patient.name.split(" ")[0]}
              unit="hours" max={12}
            />
            <CompareBar
              label="Water Intake" val1={result.patient1.avgWater} val2={result.patient2.avgWater}
              name1={result.patient1.patient.name.split(" ")[0]}
              name2={result.patient2.patient.name.split(" ")[0]}
              unit="glasses" max={12}
            />
            <CompareBar
              label="Exercise" val1={result.patient1.avgExercise} val2={result.patient2.avgExercise}
              name1={result.patient1.patient.name.split(" ")[0]}
              name2={result.patient2.patient.name.split(" ")[0]}
              unit="min/day" max={120}
            />
            <CompareBar
              label="Mood" val1={result.patient1.avgMood} val2={result.patient2.avgMood}
              name1={result.patient1.patient.name.split(" ")[0]}
              name2={result.patient2.patient.name.split(" ")[0]}
              unit="score" max={5}
            />
            <CompareBar
              label="Diet Compliance" val1={result.patient1.avgDiet} val2={result.patient2.avgDiet}
              name1={result.patient1.patient.name.split(" ")[0]}
              name2={result.patient2.patient.name.split(" ")[0]}
              unit="score" max={5}
            />
            <CompareBar
              label="Goal Adherence" val1={result.patient1.adherence} val2={result.patient2.adherence}
              name1={result.patient1.patient.name.split(" ")[0]}
              name2={result.patient2.patient.name.split(" ")[0]}
              unit="%" max={100}
            />
          </div>

          {/* AI Insights */}
          <div className="card p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Lightbulb size={18} className="text-amber-500" /> AI-Powered Analysis (LangChain)
            </h3>
            <div className="space-y-3">
              {result.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">{insight}</p>
                </div>
              ))}
            </div>

            {result.recommendation && (
              <div className="mt-4 p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mb-1">Doctor's Recommendation</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{result.recommendation}</p>
              </div>
            )}

            {result.effective_practices && result.effective_practices.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Effective Practices to Replicate</p>
                <div className="flex flex-wrap gap-2">
                  {result.effective_practices.map((practice, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                      {practice}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Goals Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Target size={14} className="text-brand-500" />
                {result.patient1.patient.name}'s Goals
              </h4>
              {result.patient1.goals.length > 0 ? (
                <div className="space-y-2">
                  {result.patient1.goals.map((g) => (
                    <div key={g.id} className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="font-medium">{g.title}</span>
                      <span className="text-slate-400 ml-2">({g.category})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No active goals</p>
              )}
            </div>
            <div className="card p-5">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Target size={14} className="text-emerald-500" />
                {result.patient2.patient.name}'s Goals
              </h4>
              {result.patient2.goals.length > 0 ? (
                <div className="space-y-2">
                  {result.patient2.goals.map((g) => (
                    <div key={g.id} className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="font-medium">{g.title}</span>
                      <span className="text-slate-400 ml-2">({g.category})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No active goals</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
