import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { t } from "../utils/i18n";

const features = [
  {
    icon: "🔬",
    titleKey: "diseaseDetection",
    desc: "Upload a photo of your crop and get instant AI-powered disease identification with treatment recommendations.",
    path: "/detect",
    color: "bg-green-50 border-green-200",
    btnColor: "bg-green-600 hover:bg-green-700",
  },
  {
    icon: "💬",
    titleKey: "chatbot",
    desc: "Ask questions about crops, fertilizers, irrigation and farming in your preferred language.",
    path: "/chat",
    color: "bg-blue-50 border-blue-200",
    btnColor: "bg-blue-600 hover:bg-blue-700",
  },
  {
    icon: "📋",
    titleKey: "history",
    desc: "Review your past disease analyses and conversations at any time.",
    path: "/history",
    color: "bg-amber-50 border-amber-200",
    btnColor: "bg-amber-600 hover:bg-amber-700",
  },
];

const stats = [
  { label: "Crops Covered", value: "150+", icon: "🌾" },
  { label: "Diseases Detected", value: "200+", icon: "🦠" },
  { label: "Languages", value: "4", icon: "🗣️" },
  { label: "AI Powered", value: "Gemini", icon: "🤖" },
];

const steps = [
  { step: "1", text: "Upload a clear photo of your crop or leaf", icon: "📷" },
  { step: "2", text: "AI analyses the image and identifies diseases", icon: "🔍" },
  { step: "3", text: "Get prevention and management recommendations", icon: "📋" },
  { step: "4", text: "Chat with KisanMitra for more guidance", icon: "💬" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 rounded-3xl p-8 md:p-12 mb-10 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 text-9xl">🌱</div>
          <div className="absolute bottom-4 left-4 text-6xl">🌾</div>
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-sm font-medium">🤖 AI-Powered Agricultural Assistant</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {t(language, "welcomeTitle")} 🙏
          </h1>
          <p className="text-primary-100 text-lg mb-6">
            {t(language, "welcomeSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/detect" className="bg-white text-primary-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-50 transition-colors shadow-sm">
              🔬 {t(language, "uploadCropImage")}
            </Link>
            <Link to="/chat" className="bg-primary-800/60 backdrop-blur border border-white/30 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-800/80 transition-colors">
              💬 {t(language, "askQuestion")}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <div key={i} className="card text-center hover:shadow-md transition-shadow">
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold text-primary-700">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">What can KisanMitra do?</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {features.map((f, i) => (
          <div key={i} className={`rounded-2xl border-2 p-6 ${f.color} flex flex-col hover:shadow-md transition-shadow`}>
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">{t(language, f.titleKey)}</h3>
            <p className="text-gray-600 text-sm flex-1 mb-4">{f.desc}</p>
            <Link
              to={f.path}
              className={`inline-flex items-center justify-center gap-2 ${f.btnColor} text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm`}
            >
              Get Started →
            </Link>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="card mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6">How It Works</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">{s.icon}</span>
              </div>
              <div className="text-xs font-bold text-primary-600 mb-1">STEP {s.step}</div>
              <p className="text-sm text-gray-600">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex gap-3">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <div>
            <h3 className="font-semibold text-amber-800 mb-1">Important Disclaimer</h3>
            <p className="text-amber-700 text-sm">
              KisanMitra provides AI-assisted crop disease information for educational purposes only.
              Always confirm diagnoses with a qualified agricultural extension officer, KVK specialist,
              or state agricultural university before applying any treatments. Never use unregistered
              pesticides or agrochemicals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
