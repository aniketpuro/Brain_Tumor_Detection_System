import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  portalFetchReports,
  portalFetchGoals,
  portalSubmitDailyLog,
  portalFetchDailyLogs,
  portalFetchSummary,
} from "../utils/api";
import {
  Heart,
  LogOut,
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
  Calendar,
  FileText,
  Activity,
  Sun,
} from "lucide-react";

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="card p-4 text-center">
      <Icon size={20} className={`mx-auto mb-1 ${color}`} />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function MiniBarChart({ data, label, unit, color }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barCount = data.length;
  const gap = 3;
  const totalWidth = 240;
  const barW = Math.max(4, Math.floor((totalWidth - gap * (barCount - 1)) / barCount));

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">{label}</p>
      <svg viewBox={`0 0 ${totalWidth} 64`} className="w-full h-16" preserveAspectRatio="none">
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

export default function PatientPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("tracker");
  const [goals, setGoals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
      const [goalsData, logsData, summaryData] = await Promise.all([
        portalFetchGoals(),
        portalFetchDailyLogs(period),
        portalFetchSummary(period),
      ]);
      setGoals(goalsData);
      setLogs(logsData);
      setSummary(summaryData);

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
  }, [period]);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await portalFetchReports();
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "tracker") loadData();
    else loadReports();
  }, [tab, loadData, loadReports]);

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
      const payload = { log_date: new Date().toISOString().split("T")[0] };
      if (form.water_intake !== "") payload.water_intake = parseFloat(form.water_intake);
      if (form.sleep_hours !== "") payload.sleep_hours = parseFloat(form.sleep_hours);
      if (form.exercise_minutes !== "") payload.exercise_minutes = parseInt(form.exercise_minutes);
      if (form.mood !== "") payload.mood = parseInt(form.mood);
      if (form.diet_compliance !== "") payload.diet_compliance = parseInt(form.diet_compliance);
      if (form.symptoms) payload.symptoms = form.symptoms;
      if (form.notes) payload.notes = form.notes;
      payload.goals_completed = form.goals_completed;

      await portalSubmitDailyLog(payload);
      setSuccessMsg("Daily log saved!");
      setTimeout(() => setSuccessMsg(null), 3000);

      const [logsData, summaryData] = await Promise.all([
        portalFetchDailyLogs(period),
        portalFetchSummary(period),
      ]);
      setLogs(logsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const chartData = (key) => {
    const sorted = [...logs].sort((a, b) => a.logDate.localeCompare(b.logDate));
    return sorted.map((l) => ({
      value: l[key] || 0,
      label: new Date(l.logDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  };

  const activeGoals = goals.filter((g) => g.isActive);

  const getRiskColor = (prediction) => {
    if (prediction === "No Tumor") return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" };
    if (prediction === "Glioma Tumor") return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" };
    return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
            <Heart size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Patient Portal</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Welcome, {user?.full_name || user?.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("tracker")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "tracker"
                ? "bg-emerald-500 text-white"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Target size={16} /> My Tracker
          </button>
          <button
            onClick={() => setTab("reports")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "reports"
                ? "bg-emerald-500 text-white"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <FileText size={16} /> My Reports
          </button>
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={32} className="text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Loading...</p>
          </div>
        ) : tab === "tracker" ? (
          <>
            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Flame} value={summary.streak} label="Day Streak" color="text-orange-500" />
                <StatCard icon={Moon} value={summary.avgSleep} label="Avg Sleep (hrs)" color="text-indigo-500" />
                <StatCard icon={Droplets} value={summary.avgWater} label="Avg Water" color="text-cyan-500" />
                <StatCard icon={TrendingUp} value={`${summary.adherence}%`} label="Goal Adherence" color="text-emerald-500" />
              </div>
            )}

            {/* Period toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod(7)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === 7 ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setPeriod(30)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === 30 ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                30 Days
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Goals */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Target size={16} className="text-emerald-500" /> My Goals ({activeGoals.length})
                </h3>
                {activeGoals.length === 0 ? (
                  <div className="card p-4 text-center text-sm text-slate-500">
                    No goals assigned yet. Your doctor will set them up.
                  </div>
                ) : (
                  activeGoals.map((goal) => (
                    <div key={goal.id} className="card p-3">
                      <p className="text-sm font-medium">{goal.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {goal.description}
                      </p>
                      <span className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {goal.category} &middot; {goal.targetValue} {goal.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Daily Log Form */}
              <div className="lg:col-span-2">
                <div className="card p-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm">
                    <Calendar size={16} className="text-emerald-500" /> Today's Log
                    <span className="text-xs text-slate-400 font-normal ml-auto">
                      {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </span>
                  </h3>

                  <form onSubmit={handleSubmitLog} className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                          <Droplets size={12} /> Water (glasses)
                        </label>
                        <input
                          type="number" min="0" max="20" step="0.5"
                          value={form.water_intake}
                          onChange={(e) => setForm({ ...form, water_intake: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                          placeholder="8"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                          <Moon size={12} /> Sleep (hours)
                        </label>
                        <input
                          type="number" min="0" max="24" step="0.5"
                          value={form.sleep_hours}
                          onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                          placeholder="8"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                          <Dumbbell size={12} /> Exercise (min)
                        </label>
                        <input
                          type="number" min="0" max="300"
                          value={form.exercise_minutes}
                          onChange={(e) => setForm({ ...form, exercise_minutes: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
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
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
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
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
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
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Goals Completed Today</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeGoals.map((goal) => (
                            <label key={goal.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors">
                              <input
                                type="checkbox"
                                checked={form.goals_completed.includes(goal.id)}
                                onChange={() => handleGoalCheck(goal.id)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                              />
                              <span className="truncate">{goal.title}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Symptoms</label>
                        <textarea
                          value={form.symptoms}
                          onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                          placeholder="Headache, nausea..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Notes</label>
                        <textarea
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                          placeholder="Any observations..."
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-60"
                    >
                      {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {submitting ? "Saving..." : "Save Daily Log"}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Charts */}
            {logs.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm">
                  <TrendingUp size={16} className="text-emerald-500" /> My Progress
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MiniBarChart data={chartData("sleepHours")} label="Sleep Hours" unit="hrs" color="#6366f1" />
                  <MiniBarChart data={chartData("waterIntake")} label="Water Intake" unit="glasses" color="#06b6d4" />
                  <MiniBarChart data={chartData("exerciseMinutes")} label="Exercise" unit="min" color="#f59e0b" />
                  <MiniBarChart data={chartData("mood")} label="Mood Score" unit="1-5" color="#10b981" />
                </div>
              </div>
            )}
          </>
        ) : (
          /* Reports Tab */
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText size={18} className="text-emerald-500" /> My Scan Reports
            </h3>
            {reports && reports.scans && reports.scans.length > 0 ? (
              <div className="space-y-3">
                {reports.scans.map((scan) => {
                  const colors = getRiskColor(scan.prediction);
                  return (
                    <div key={scan.id} className="card p-4 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                        {scan.heatmap ? (
                          <img src={scan.heatmap} alt="Scan" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Activity size={18} className="text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{scan.prediction}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors.bg} ${colors.text}`}>
                            {scan.risk}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {scan.date ? new Date(scan.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-bold">{scan.confidence}%</span>
                        <p className="text-[11px] text-slate-400">confidence</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card p-8 text-center text-slate-500">
                <FileText size={32} className="mx-auto mb-3 opacity-50" />
                <p>No reports available yet.</p>
              </div>
            )}
            <p className="text-xs text-slate-400 italic text-center mt-4">
              Reports are read-only. Contact your doctor for any changes or questions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
