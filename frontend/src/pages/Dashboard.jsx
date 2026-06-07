import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboard } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import {
  ScanLine,
  Activity,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Brain,
  Clock,
  AlertTriangle,
  Users,
} from "lucide-react";
import { getRiskColor, getRiskLevel } from "../utils/medicalData";

function StatCard({ icon: Icon, label, value, sub, gradient }) {
  return (
    <div className="card p-6 flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
        bg-gradient-to-br ${gradient} text-white shadow-lg`}
      >
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboard().then(setStats).catch(() => {});
  }, []);

  const totalScans = stats?.totalScans || 0;
  const tumorsDetected = stats?.tumorsDetected || 0;
  const noTumor = stats?.clearScans || 0;
  const avgConf = stats ? `${stats.avgConfidence}%` : "—";
  const totalPatients = stats?.totalPatients || 0;
  const recentScans = stats?.recentScans || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-cyan-500 p-8 text-white shadow-xl shadow-brand-500/20">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">
            Welcome, Dr. {user?.full_name?.split(" ")[0] || "Doctor"}
          </h1>
          <p className="mt-2 text-brand-100 max-w-xl">
            Advanced brain tumor detection powered by deep learning. Select a
            patient and upload MRI scans for instant AI-assisted diagnostic
            analysis.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => navigate("/scan")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-brand-700 font-semibold
                         hover:bg-brand-50 shadow-lg transition-all duration-200 active:scale-[0.98]"
            >
              <ScanLine size={18} /> New Scan <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate("/patients")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/20 text-white font-semibold
                         hover:bg-white/30 transition-all duration-200 active:scale-[0.98]"
            >
              <Users size={18} /> Patients
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-4 bottom-0 w-32 h-32 rounded-full bg-cyan-400/20 blur-xl" />
        <Brain size={160} className="absolute right-8 top-1/2 -translate-y-1/2 text-white/[0.07]" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          label="Patients"
          value={totalPatients}
          sub="Registered"
          gradient="from-violet-500 to-purple-600"
        />
        <StatCard
          icon={Activity}
          label="Total Scans"
          value={totalScans}
          sub="Lifetime analyses"
          gradient="from-brand-500 to-brand-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Tumors Detected"
          value={tumorsDetected}
          sub={`${totalScans > 0 ? ((tumorsDetected / totalScans) * 100).toFixed(0) : 0}% detection rate`}
          gradient="from-red-500 to-rose-600"
        />
        <StatCard
          icon={ShieldCheck}
          label="Clear Scans"
          value={noTumor}
          sub="No tumor detected"
          gradient="from-emerald-500 to-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg. Confidence"
          value={avgConf}
          sub="Model certainty"
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* Recent Scans */}
      <div className="card">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold">Recent Scans</h3>
          {recentScans.length > 0 && (
            <button
              onClick={() => navigate("/history")}
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          )}
        </div>

        {recentScans.length === 0 ? (
          <div className="px-6 pb-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Clock size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              No scans yet. Start your first analysis!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Diagnosis</th>
                  <th className="px-6 py-3">Confidence</th>
                  <th className="px-6 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {recentScans.map((scan) => {
                  const colors = getRiskColor(scan.prediction);
                  return (
                    <tr
                      key={scan.id}
                      onClick={() => navigate("/history")}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {scan.date
                          ? new Date(scan.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4 font-medium text-sm">{scan.prediction}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${scan.confidence}%` }} />
                          </div>
                          <span className="text-sm font-medium">{scan.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                          {scan.risk || getRiskLevel(scan.prediction)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
