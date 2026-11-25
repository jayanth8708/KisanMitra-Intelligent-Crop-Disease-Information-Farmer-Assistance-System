import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes for AI processing
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — auto logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  me: () => api.get("/api/auth/me"),
  updateLanguage: (language) => api.patch("/api/auth/language", { language }),
};

// ─── Disease Detection ────────────────────────────────────────────────────────
export const diseaseAPI = {
  analyze: (file, language) => {
    const form = new FormData();
    form.append("file", file);
    form.append("language", language);
    return api.post("/api/disease/analyze", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getAnalysis: (id) => api.get(`/api/disease/analysis/${id}`),
};

// ─── Chatbot ─────────────────────────────────────────────────────────────────
export const chatAPI = {
  sendMessage: (message, language, sessionId) =>
    api.post("/api/chat/message", { message, language, session_id: sessionId }),
  sendVoice: (audioBlob, language, sessionId, filename = "voice.webm") => {
    const form = new FormData();
    form.append("audio", audioBlob, filename);
    form.append("language", language);
    if (sessionId) form.append("session_id", sessionId);
    return api.post("/api/chat/voice", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getHistory: (sessionId) => api.get(`/api/chat/history/${sessionId}`),
  getSuggestions: (language) => api.get(`/api/chat/suggestions?language=${language}`),
};

// ─── History ─────────────────────────────────────────────────────────────────
export const historyAPI = {
  getAnalyses: (limit = 20) => api.get(`/api/history/analyses?limit=${limit}`),
  deleteAnalysis: (id) => api.delete(`/api/history/analysis/${id}`),
  getChatSessions: () => api.get("/api/history/chat-sessions"),
};

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
};

export default api;
