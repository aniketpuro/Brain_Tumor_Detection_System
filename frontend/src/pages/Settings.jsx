import { useApp } from "../context/AppContext";
import {
  Moon,
  Sun,
  Brain,
  Monitor,
  Info,
  Shield,
} from "lucide-react";

export default function Settings() {
  const { state, dispatch } = useApp();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Appearance */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Monitor size={18} className="text-brand-500" />
          Appearance
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            {state.darkMode ? (
              <Moon size={20} className="text-brand-400" />
            ) : (
              <Sun size={20} className="text-amber-500" />
            )}
            <div>
              <p className="font-medium text-sm">
                {state.darkMode ? "Dark Mode" : "Light Mode"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {state.darkMode
                  ? "Easier on the eyes in low light"
                  : "Best for well-lit environments"}
              </p>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: "TOGGLE_DARK_MODE" })}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              state.darkMode ? "bg-brand-600" : "bg-slate-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                state.darkMode ? "translate-x-7" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Info size={18} className="text-brand-500" />
          About NeuroScan AI
        </h3>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
            <Brain size={28} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-lg">NeuroScan AI</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Version 2.0.0 &middot; Diagnostic Platform
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          NeuroScan AI is an advanced brain tumor detection platform powered by a
          fine-tuned InceptionNet deep learning model. It analyzes MRI scans to
          classify brain tumors into four categories: Glioma, Meningioma,
          Pituitary Tumor, and No Tumor, with high accuracy and detailed medical
          guidance.
        </p>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <dt className="text-slate-500 dark:text-slate-400">Model</dt>
            <dd className="font-medium">InceptionNet V3 (Fine-tuned)</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <dt className="text-slate-500 dark:text-slate-400">Accuracy</dt>
            <dd className="font-medium">~90% on test dataset</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <dt className="text-slate-500 dark:text-slate-400">Backend</dt>
            <dd className="font-medium">Flask + TensorFlow</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-slate-500 dark:text-slate-400">Frontend</dt>
            <dd className="font-medium">React + Tailwind CSS</dd>
          </div>
        </dl>
      </div>

      {/* Disclaimer */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield size={18} className="text-brand-500" />
          Medical Disclaimer
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          This application is intended for <strong>educational and research
          purposes only</strong>. It is NOT a certified medical diagnostic tool.
          AI predictions should never replace professional medical advice,
          diagnosis, or treatment. All results must be verified by a qualified
          healthcare professional before any clinical decision is made.
        </p>
      </div>
    </div>
  );
}
