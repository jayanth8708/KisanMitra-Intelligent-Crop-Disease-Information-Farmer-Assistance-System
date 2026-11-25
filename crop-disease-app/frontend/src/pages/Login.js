import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { t, LANGUAGES } from "../utils/i18n";

export default function Login() {
  const { login, loading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      await login(form.username, form.password);
      toast.success("Welcome back! 🌱");
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid username or password.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌱</div>
          <h1 className="text-2xl font-bold text-gray-900">{t(language, "loginTitle")}</h1>
          <p className="text-gray-500 mt-1">KisanMitra — Farmer's AI Assistant</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t(language, "username")}
              </label>
              <input
                type="text"
                className="input-field"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t(language, "password")}
              </label>
              <input
                type="password"
                className="input-field"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5" />
                  Signing in...
                </span>
              ) : (
                t(language, "signIn")
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {t(language, "noAccount")}{" "}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              {t(language, "signUp")}
            </Link>
          </p>
        </div>

        {/* Guest mode notice */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-sm text-blue-700">
            💡 You can use disease detection and chatbot without an account.
            Login is only required to save history.
          </p>
        </div>
      </div>
    </div>
  );
}
