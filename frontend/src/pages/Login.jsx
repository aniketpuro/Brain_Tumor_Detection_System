import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Brain, LogIn, AlertTriangle, Stethoscope, Heart } from "lucide-react";

export default function Login() {
  const { login, patientLogin } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (role === "doctor") {
        await login(email, password);
        navigate("/");
      } else {
        await patientLogin(email, password);
        navigate("/portal");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-brand-500/30 mb-4">
              <Brain size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">Welcome to NeuroScan AI</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Who are you?
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setRole("doctor")}
              className="card p-6 w-full flex items-center gap-4 hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-600 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Stethoscope size={28} className="text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">I'm a Doctor</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Access diagnostic tools, manage patients & reports
                </p>
              </div>
            </button>

            <button
              onClick={() => setRole("patient")}
              className="card p-6 w-full flex items-center gap-4 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Heart size={28} className="text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">I'm a Patient</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Track recovery, log daily habits & view reports
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDoctor = role === "doctor";
  const gradientClass = isDoctor
    ? "from-brand-500 to-indigo-500 shadow-brand-500/30"
    : "from-emerald-500 to-teal-500 shadow-emerald-500/30";
  const btnClass = isDoctor
    ? "btn-primary w-full justify-center py-3 disabled:opacity-60"
    : "w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-60";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-xl mb-4`}>
            {isDoctor ? <Stethoscope size={32} className="text-white" /> : <Heart size={32} className="text-white" />}
          </div>
          <h1 className="text-2xl font-bold">
            {isDoctor ? "Doctor Sign In" : "Patient Sign In"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isDoctor ? "Access the diagnostic platform" : "Track your recovery & view reports"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              className="input-field"
              placeholder={isDoctor ? "doctor@example.com" : "patient@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className={btnClass}>
            <LogIn size={18} />
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {isDoctor && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Don't have an account?{" "}
              <Link to="/register" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                Create one
              </Link>
            </p>
          )}

          <button
            type="button"
            onClick={() => { setRole(null); setError(null); setEmail(""); setPassword(""); }}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            &larr; Back to role selection
          </button>
        </form>
      </div>
    </div>
  );
}
