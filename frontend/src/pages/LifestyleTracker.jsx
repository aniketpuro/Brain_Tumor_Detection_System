import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchGoals,
  generateGoals,
  updateGoal,
  submitDailyLog,
  fetchDailyLogs,
  fetchTrackerSummary,
  fetchPatientScans,
} from "../utils/api";
import {
  ArrowLeft,
  Target,
  Droplets,
  Moon,
  Dumbbell,
  Smile,
  Apple,
  RefreshCw,
  CheckCircle2,
  Circle,
  Flame,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Calendar,
  Plus,
} from "lucide-react";

function MiniBarChart({ data, label, unit, color }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barCount = data.length;
  const gap = 3;
  const totalWidth = 240;
  const barW = Math.max(4, Math.floor((totalWidth - gap * (barCount - 1)) / barCount));

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
        {label}
      </p>
      <svg
        viewBox={`0 0 ${totalWidth} 64`}
        className="w-full h-16"
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * 56);
          return (
            <rect
              key={i}
              x={i * (barW + gap)}
              y={64 - h}
              width={barW}
              height={h}
              rx={2}
              style={{ fill: color, opacity: 0.8 }}
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{data[0]?.label || ""}</span>
        <span className="text-slate-500 font-medium">{unit}</span>
        <span>{data[data.length - 1]?.label || ""}</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="card p-4 text-center">
      <Icon size={20} className={`mx-auto mb-1 ${color}`} />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export default function LifestyleTracker() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [goals, setGoals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [period, setPeriod] = useState(7);

  const [form, setForm] = useState({
    water_intake: "",
    sleep_hours: "",
    exercise_minutes: "",
    mood: "",
    diet_compliance: "",
    symptoms: "",
    notes: "",
    goals_completed: [],
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [patientData, goalsData, logsData, summaryData] = await Promise.all([
        fetchPatientScans(id),
        fetchGoals(id),
        fetchDailyLogs(id, period),
        fetchTrackerSummary(id, period),
      ]);
      setPatient(patientData.patient);
      setGoals(goalsData);
      setLogs(logsData);
      setSummary(summaryData);

      // Pre-fill form if today's log exists
      const today = new Date().toISOString().split("T")[0];
      const todayLog = logsData.find((l) => l.logDate === today);
      if (todayLog) {
        setForm({
          water_intake: todayLog.waterIntake ?? "",
          sleep_hours: todayLog.sleepHours ?? "",
          exercise_minutes: todayLog.exerciseMinutes ?? "",
          mood: todayLog.mood ?? "",
          diet_compliance: todayLog.dietCompliance ?? "",
          symptoms: todayLog.symptoms ?? "",
          notes: todayLog.notes ?? "",
          goals_completed: todayLog.goalsCompleted || [],
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateGoals = async (force = false) => {
    try {
      setGenerating(true);
      const newGoals = await generateGoals(id, force);
      setGoals(newGoals);
      setSuccessMsg("Goals generated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleGoal = async (goalId, currentActive) => {
    try {
      const updated = await updateGoal(id, goalId, { is_active: !currentActive });
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoalCheck = (goalId) => {
    setForm((prev) => {
      const completed = prev.goals_completed.includes(goalId)
        ? prev.goals_completed.filter((gid) => gid !== goalId)
        : [...prev.goals_completed, goalId];
      return { ...prev, goals_completed: completed };
    });
  };

  const handleSubmitLog = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        log_date: new Date().toISOString().split("T")[0],
      };
      if (form.water_intake !== "") payload.water_intake = parseFloat(form.water_intake);
      if (form.sleep_hours !== "") payload.sleep_hours = parseFloat(form.sleep_hours);
      if (form.exercise_minutes !== "") payload.exercise_minutes = parseInt(form.exercise_minutes);
      if (form.mood !== "") payload.mood = parseInt(form.mood);
      if (form.diet_compliance !== "") payload.diet_compliance = parseInt(form.diet_compliance);
      if (form.symptoms) payload.symptoms = form.symptoms;
      if (form.notes) payload.notes = form.notes;
      payload.goals_completed = form.goals_completed;

      const result = await submitDailyLog(id, payload);
      setSuccessMsg("Daily log saved!");
      if (result.ai_feedback) {
        setAiFeedback(result.ai_feedback);
      }
      setTimeout(() => setSuccessMsg(null), 5000);

      const [logsData, summaryData] = await Promise.all([
        fetchDailyLogs(id, period),
        fetchTrackerSummary(id, period),
      ]);
      setLogs(logsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = (key) => {
    const sorted = [...logs].sort((a, b) => a.logDate.localeCompare(b.logDate));
    return sorted.map((l) => ({
      value: l[key] || 0,
      label: new Date(l.logDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw size={32} className="text-brand-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading tracker...</p>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.isActive);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(`/patients/${id}`)}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Patient
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Target size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Lifestyle Tracker</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {patient?.name} &mdash; Daily metrics & recovery goals
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod(7)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === 7
                  ? "bg-brand-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod(30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === 30
                  ? "bg-brand-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}
      {aiFeedback && (
        <div className="card p-4 border-l-4 border-brand-500 bg-brand-50/50 dark:bg-brand-900/10">
          <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mb-1">AI Health Coach</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{aiFeedback}</p>
          <button onClick={() => setAiFeedback(null)} className="text-xs text-slate-400 mt-2 hover:text-slate-600">Dismiss</button>
        </div>
      )}

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Flame} value={summary.streak} label="Day Streak" color="text-orange-500" />
          <StatCard icon={Moon} value={summary.avgSleep} label="Avg Sleep (hrs)" color="text-indigo-500" />
          <StatCard icon={Droplets} value={summary.avgWater} label="Avg Water" color="text-cyan-500" />
          <StatCard icon={TrendingUp} value={`${summary.adherence}%`} label="Goal Adherence" color="text-emerald-500" />
        </div>
      )}

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Goals column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Target size={18} className="text-brand-500" />
              Active Goals ({activeGoals.length})
            </h3>
            {goals.length === 0 ? (
              <button
                onClick={() => handleGenerateGoals(false)}
                disabled={generating}
                className="btn-primary text-xs"
              >
                {generating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate
              </button>
            ) : (
              <button
                onClick={() => handleGenerateGoals(true)}
                disabled={generating}
                className="text-xs text-slate-400 hover:text-brand-500 transition-colors"
                title="Regenerate goals from latest diagnosis"
              >
                <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          {goals.length === 0 ? (
            <div className="card p-6 text-center">
              <Plus size={24} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No goals yet. Generate goals based on the patient's diagnosis.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`card p-3 flex items-start gap-3 transition-opacity ${
                    !goal.isActive ? "opacity-50" : ""
                  }`}
                >
                  <button
                    onClick={() => handleToggleGoal(goal.id, goal.isActive)}
                    className="mt-0.5 shrink-0"
                  >
                    {goal.isActive ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <Circle size={18} className="text-slate-300 dark:text-slate-600" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{goal.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {goal.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {goal.category}
                      </span>
                      {goal.targetValue && (
                        <span className="text-[10px] text-slate-400">
                          Target: {goal.targetValue} {goal.unit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Log form */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-brand-500" />
              Today's Log
              <span className="text-xs text-slate-400 font-normal ml-auto">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </h3>

            <form onSubmit={handleSubmitLog} className="space-y-4">
              {/* Metric inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                    <Droplets size={12} /> Water (glasses)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={form.water_intake}
                    onChange={(e) => setForm({ ...form, water_intake: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    placeholder="8"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                    <Moon size={12} /> Sleep (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.sleep_hours}
                    onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    placeholder="8"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                    <Dumbbell size={12} /> Exercise (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={form.exercise_minutes}
                    onChange={(e) => setForm({ ...form, exercise_minutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                    <Smile size={12} /> Mood (1-5)
                  </label>
                  <select
                    value={form.mood}
                    onChange={(e) => setForm({ ...form, mood: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select</option>
                    <option value="1">1 - Very Low</option>
                    <option value="2">2 - Low</option>
                    <option value="3">3 - Moderate</option>
                    <option value="4">4 - Good</option>
                    <option value="5">5 - Excellent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                    <Apple size={12} /> Diet (1-5)
                  </label>
                  <select
                    value={form.diet_compliance}
                    onChange={(e) => setForm({ ...form, diet_compliance: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select</option>
                    <option value="1">1 - Poor</option>
                    <option value="2">2 - Fair</option>
                    <option value="3">3 - Moderate</option>
                    <option value="4">4 - Good</option>
                    <option value="5">5 - Excellent</option>
                  </select>
                </div>
              </div>

              {/* Goal checkboxes */}
              {activeGoals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Goals Completed Today
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeGoals.map((goal) => (
                      <label
                        key={goal.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.goals_completed.includes(goal.id)}
                          onChange={() => handleGoalCheck(goal.id)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                        />
                        <span className="truncate">{goal.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Text fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                    Symptoms (if any)
                  </label>
                  <textarea
                    value={form.symptoms}
                    onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
                    placeholder="Headache, nausea..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
                    placeholder="Any additional observations..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full sm:w-auto justify-center disabled:opacity-60"
              >
                {submitting ? (
                  <><RefreshCw size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle2 size={16} /> Save Daily Log</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Progress charts */}
      {logs.length > 0 && (
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-500" />
            Progress ({period}-Day View)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniBarChart
              data={chartData("sleepHours")}
              label="Sleep Hours"
              unit="hrs"
              color="#6366f1"
            />
            <MiniBarChart
              data={chartData("waterIntake")}
              label="Water Intake"
              unit="glasses"
              color="#06b6d4"
            />
            <MiniBarChart
              data={chartData("exerciseMinutes")}
              label="Exercise"
              unit="min"
              color="#f59e0b"
            />
            <MiniBarChart
              data={chartData("mood")}
              label="Mood Score"
              unit="1-5"
              color="#10b981"
            />
          </div>
        </div>
      )}

      {/* Log history table */}
      {logs.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Recent Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Date</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Water</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Sleep</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Exercise</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Mood</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Diet</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">Goals</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-2">
                      {new Date(log.logDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="text-center py-2 px-2">{log.waterIntake ?? "—"}</td>
                    <td className="text-center py-2 px-2">{log.sleepHours ?? "—"}</td>
                    <td className="text-center py-2 px-2">{log.exerciseMinutes ?? "—"}</td>
                    <td className="text-center py-2 px-2">{log.mood ?? "—"}</td>
                    <td className="text-center py-2 px-2">{log.dietCompliance ?? "—"}</td>
                    <td className="text-center py-2 px-2">
                      {log.goalsCompleted ? log.goalsCompleted.length : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
