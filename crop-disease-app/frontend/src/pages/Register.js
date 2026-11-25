import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { t, LANGUAGES } from "../utils/i18n";

export default function Register() {
  const { register, loading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    confirm_password: "",
    language: "en",
  });
  const [error, setError] = useState("");

  const validate = () => {
    if (!form.username || !form.email || !form.password) return "Please fill all required fields.";
    if (form.username.length < 3) return "Username must be at least 3 characters.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirm_password) return "Passwords do not match.";
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Please enter a valid email address.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    try {
      const { confirm_password, ...payload } = form;
      await register(payload);
      setLanguage(form.language);
      toast.success("Account created! Welcome to KisanMitra 🌱");
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.detail || "Registration failed. Please try again.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌱</div>
          <h1 className="text-2xl font-bold text-gray-900">{t(language, "registerTitle")}</h1>
          <p className="text-gray-500 mt-1">Join KisanMitra — Your Farming AI Partner</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t(language, "username")} *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="farmer123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t(language, "fullName")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Ramesh Kumar"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t(language, "email")} *
              </label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="farmer@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t(language, "password")} *
              </label>
              <input
                type="password"
                className="input-field"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                className="input-field"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="Repeat your password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t(language, "selectLanguage")}
              </label>
              <select
                className="input-field"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5" />
                  Creating account...
                </span>
              ) : (
                t(language, "signUp")
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {t(language, "haveAccount")}{" "}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              {t(language, "signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
