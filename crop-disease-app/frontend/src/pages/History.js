import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { historyAPI, getImageUrl } from "../utils/api";
import { useLanguage } from "../contexts/LanguageContext";
import { t } from "../utils/i18n";

const SEVERITY_BADGE = {
  mild: "badge-yellow",
  moderate: "text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full text-xs font-medium",
  severe: "badge-red",
  none: "badge-green",
  unknown: "text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium",
};

function AnalysisCard({ analysis, onDelete }) {
  const { language } = useLanguage();
  const cfg = {
    yes: { border: "border-red-200 bg-red-50", badge: "badge-red", label: "Disease Detected" },
    no: { border: "border-green-200 bg-green-50", badge: "badge-green", label: "Healthy" },
    uncertain: { border: "border-yellow-200 bg-yellow-50", badge: "badge-yellow", label: "Uncertain" },
  }[analysis.is_diseased] || { border: "border-gray-200 bg-white", badge: "", label: "" };

  return (
    <div className={`rounded-2xl border-2 ${cfg.border} p-4 hover:shadow-md transition-all animate-fade-in`}>
      <div className="flex gap-4">
        {analysis.image_url && (
          <img
            src={getImageUrl(analysis.image_url)}
            alt="Crop"
            className="w-24 h-24 object-cover rounded-xl border border-white shadow-sm flex-shrink-0"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-800 truncate">
                {analysis.disease_name || "Unknown"}
              </h3>
              <p className="text-sm text-gray-500">
                {analysis.crop_name && `🌱 ${analysis.crop_name} · `}
                {new Date(analysis.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => onDelete(analysis.id)}
              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors flex-shrink-0"
              title={t(language, "deleteAnalysis")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {cfg.badge && <span className={cfg.badge}>{cfg.label}</span>}
            {analysis.severity && analysis.severity !== "unknown" && (
              <span className={SEVERITY_BADGE[analysis.severity] || SEVERITY_BADGE.unknown}>
                Severity: {analysis.severity}
              </span>
            )}
            {analysis.confidence > 0 && (
              <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                {Math.round(analysis.confidence * 100)}% confidence
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const { language } = useLanguage();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data } = await historyAPI.getAnalyses();
      setAnalyses(data);
    } catch (err) {
      toast.error("Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this analysis?")) return;
    setDeleting(id);
    try {
      await historyAPI.deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Analysis deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setDeleting(null);
    }
  };

  const diseaseCount = analyses.filter((a) => a.is_diseased === "yes").length;
  const healthyCount = analyses.filter((a) => a.is_diseased === "no").length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📋 {t(language, "historyTitle")}
          </h1>
          {analyses.length > 0 && (
            <p className="text-gray-500 text-sm mt-1">
              {analyses.length} analyses · {diseaseCount} diseases found · {healthyCount} healthy
            </p>
          )}
        </div>
        <button onClick={loadHistory} className="btn-secondary text-sm">
          🔄 Refresh
        </button>
      </div>

      {/* Stats summary */}
      {analyses.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600">{analyses.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total Analyses</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-500">{diseaseCount}</div>
            <div className="text-xs text-gray-500 mt-1">Diseases Found</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
            <div className="text-xs text-gray-500 mt-1">Healthy Plants</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="spinner mx-auto mb-3" />
          <p className="text-gray-500">{t(language, "loading")}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && analyses.length === 0 && (
        <div className="text-center py-16 card">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No History Yet</h3>
          <p className="text-gray-500 text-sm">{t(language, "noHistory")}</p>
        </div>
      )}

      {/* Analysis list */}
      {!loading && (
        <div className="space-y-4">
          {analyses.map((a) => (
            <AnalysisCard
              key={a.id}
              analysis={a}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
