import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import { chatAPI } from "../utils/api";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { t } from "../utils/i18n";

const SPEECH_LOCALES = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
  kn: "kn-IN",
};

const WELCOME_MESSAGES = {
  hi: "नमस्ते! मैं किसानमित्र हूँ। फसल रोग, उर्वरक, सिंचाई या किसी भी कृषि विषय पर मुझसे पूछें। आप बोलकर भी सवाल पूछ सकते हैं।",
  te: "నమస్కారం! నేను కిసాన్‌మిత్ర. పంట వ్యాధులు, ఎరువులు, నీటిపారుదల లేదా వ్యవసాయ విషయాలపై నన్ను అడగండి. మీరు మాట్లాడి కూడా ప్రశ్న అడగవచ్చు.",
  kn: "ನಮಸ್ಕಾರ! ನಾನು ಕಿಸಾನ್‌ಮಿತ್ರ. ಬೆಳೆ ರೋಗಗಳು, ಗೊಬ್ಬರ, ನೀರಾವರಿ ಅಥವಾ ಕೃಷಿ ವಿಷಯಗಳ ಬಗ್ಗೆ ನನ್ನನ್ನು ಕೇಳಿ. ನೀವು ಮಾತನಾಡಿಯೂ ಪ್ರಶ್ನೆ ಕೇಳಬಹುದು.",
  en: "Hello! I'm KisanMitra, your agricultural AI assistant. Ask me about crop diseases, fertilizers, irrigation, or any farming topic — by typing or using voice!",
};

function stripMarkdown(text) {
  return (text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_~`#>]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function pickSupportedAudioMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function Message({ msg, index, language, speakingIndex, onToggleSpeak }) {
  const isUser = msg.role === "user";
  const isSpeaking = speakingIndex === index;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-fade-in`}>
      {!isUser && (
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <span className="text-sm">🌱</span>
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "order-1" : "order-2"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary-600 text-white rounded-br-sm"
              : "bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm"
          }`}
        >
          {isUser ? (
            <p className="text-sm flex items-center gap-1.5">
              {msg.isVoice && <span title="Voice question">🎤</span>}
              <span>{msg.content}</span>
            </p>
          ) : (
            <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources & Listen button */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {!isUser && typeof window !== "undefined" && "speechSynthesis" in window && (
            <button
              type="button"
              onClick={() => onToggleSpeak(msg.content, index)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                isSpeaking
                  ? "bg-primary-100 text-primary-800 border-primary-300 font-medium"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-primary-50 hover:text-primary-700"
              }`}
            >
              <span>{isSpeaking ? "⏹️" : "🔊"}</span>
              <span>{isSpeaking ? t(language, "stopSpeaking") : t(language, "speak")}</span>
            </button>
          )}
          {!isUser &&
            msg.sources &&
            msg.sources.map((s, i) => (
              <span
                key={i}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100"
              >
                📄 {s.name}
              </span>
            ))}
        </div>

        <p className="text-xs text-gray-400 mt-1 px-1">
          {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center ml-2 flex-shrink-0 mt-1 order-2">
          <span className="text-sm">👤</span>
        </div>
      )}
    </div>
  );
}

function TypingIndicator({ label }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-2">
        <span className="text-sm">🌱</span>
      </div>
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3">
        <div className="flex gap-1 items-center">
          {[0, 0.2, 0.4].map((d, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>
        {label && <span className="text-xs text-gray-500">{label}</span>}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en,
      timestamp: Date.now(),
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState("text"); // "text" | "voice"
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Voice recording & TTS state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const cancelRecordingRef = useRef(false);
  const speechRecRef = useRef(null);
  const audioCtxRef = useRef(null);
  const levelRafRef = useRef(null);
  const peakLevelRef = useRef(0);
  const hasAudioMeterRef = useRef(false);
  const liveTranscriptRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    chatAPI
      .getSuggestions(language)
      .then(({ data }) => setSuggestions(data.suggestions || []))
      .catch(() => {});
  }, [language]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
  }, []);

  const speakText = useCallback(
    (text, idx = null) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const cleaned = stripMarkdown(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const targetLocale = SPEECH_LOCALES[language] || "en-IN";
      utterance.lang = targetLocale;

      const voices = window.speechSynthesis.getVoices();
      const matchingVoice =
        voices.find((v) => v.lang.toLowerCase() === targetLocale.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(language.toLowerCase()));
      if (matchingVoice) utterance.voice = matchingVoice;

      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);
      setSpeakingIndex(idx);
      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  const handleToggleSpeak = useCallback(
    (text, idx) => {
      if (speakingIndex === idx) {
        stopSpeaking();
      } else {
        speakText(text, idx);
      }
    },
    [speakingIndex, speakText, stopSpeaking]
  );

  const cleanupRecordingResources = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {}
      speechRecRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    liveTranscriptRef.current = "";
    setIsRecording(false);
    setRecordingSeconds(0);
    setLiveTranscript("");
  }, []);

  useEffect(() => {
    return () => {
      cancelRecordingRef.current = true;
      cleanupRecordingResources();
      stopSpeaking();
    };
  }, [cleanupRecordingResources, stopSpeaking]);

  const sendMessage = useCallback(
    async (text, options = {}) => {
      const { isVoice = false, speakReply = false } = options;
      const userText = (text || input).trim();
      if (!userText || loading || (!isVoice && isRecording)) return;

      stopSpeaking();
      if (!isVoice) setInput("");
      setMessages((prev) => [
        ...prev,
        { role: "user", isVoice, content: userText, timestamp: Date.now() },
      ]);
      setLoadingMode(isVoice ? "voice" : "text");
      setLoading(true);

      try {
        const { data } = await chatAPI.sendMessage(userText, language, sessionId);
        setSessionId(data.session_id);
        setMessages((prev) => {
          const next = [
            ...prev,
            {
              role: "assistant",
              content: data.reply,
              timestamp: Date.now(),
              sources: data.sources || [],
            },
          ];
          if (autoSpeak || speakReply) speakText(data.reply, next.length - 1);
          return next;
        });
        if (data.suggested_questions) setSuggestions(data.suggested_questions);
      } catch (err) {
        const detail = err.response?.data?.detail;
        const msg =
          typeof detail === "string"
            ? detail.slice(0, 180)
            : "Failed to get response. Please try again.";
        toast.error(msg);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: msg,
            timestamp: Date.now(),
            sources: [],
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [input, loading, isRecording, language, sessionId, autoSpeak, speakText, stopSpeaking]
  );

  const uploadVoiceRecording = useCallback(
    async (audioBlob, mimeType) => {
      if (!audioBlob || audioBlob.size === 0) {
        toast.error("No audio recorded.");
        return;
      }

      const ext = mimeType.includes("ogg")
        ? "ogg"
        : mimeType.includes("mp4")
        ? "mp4"
        : "webm";
      const placeholderId = `voice_${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        {
          id: placeholderId,
          role: "user",
          isVoice: true,
          content: "🎤 ...",
          timestamp: Date.now(),
        },
      ]);
      setLoadingMode("voice");
      setLoading(true);

      try {
        const { data } = await chatAPI.sendVoice(
          audioBlob,
          language,
          sessionId,
          `question.${ext}`
        );
        setSessionId(data.session_id);
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === placeholderId ? { ...m, content: data.transcript } : m
          );
          const next = [
            ...updated,
            {
              role: "assistant",
              content: data.reply,
              timestamp: Date.now(),
              sources: data.sources || [],
            },
          ];
          // Read voice answers aloud automatically
          speakText(data.reply, next.length - 1);
          return next;
        });
        if (data.suggested_questions) setSuggestions(data.suggested_questions);
      } catch (err) {
        const detail = err.response?.data?.detail;
        const msg =
          typeof detail === "string"
            ? detail.slice(0, 180)
            : "Could not process voice message. Please try again.";
        toast.error(msg);
        setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      } finally {
        setLoading(false);
      }
    },
    [language, sessionId, speakText]
  );

  const startRecording = async () => {
    if (loading || isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(t(language, "micUnsupported"));
      return;
    }

    stopSpeaking();
    cancelRecordingRef.current = false;
    audioChunksRef.current = [];
    liveTranscriptRef.current = "";
    setLiveTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = pickSupportedAudioMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const wasCancelled = cancelRecordingRef.current;
        const recordedMime = recorder.mimeType || mimeType || "audio/webm";
        const chunks = [...audioChunksRef.current];
        const peak = peakLevelRef.current;
        const spokenPreview = liveTranscriptRef.current.trim();
        cleanupRecordingResources();

        if (!wasCancelled) {
          // If browser SpeechRecognition captured clean text, send text directly (saves 1 AI call)
          if (spokenPreview.length >= 3) {
            sendMessage(spokenPreview, { isVoice: true, speakReply: true });
            return;
          }
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: recordedMime });
            if (blob.size < 800 || (hasAudioMeterRef.current && peak < 0.008)) {
              toast.error("No speech detected. Please speak into your microphone and try again.");
              return;
            }
            uploadVoiceRecording(blob, recordedMime);
          }
        }
      };

      // Monitor microphone peak level to avoid sending dead silence
      peakLevelRef.current = 0;
      hasAudioMeterRef.current = false;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          audioCtxRef.current = ctx;
          hasAudioMeterRef.current = true;
          const buf = new Float32Array(analyser.fftSize);
          const sampleLevel = () => {
            if (!audioCtxRef.current) return;
            analyser.getFloatTimeDomainData(buf);
            for (let i = 0; i < buf.length; i++) {
              const abs = Math.abs(buf[i]);
              if (abs > peakLevelRef.current) peakLevelRef.current = abs;
            }
            levelRafRef.current = requestAnimationFrame(sampleLevel);
          };
          levelRafRef.current = requestAnimationFrame(sampleLevel);
        } catch {}
      }

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);

      // Optional live speech preview (Chrome/Edge) while recording audio
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognition = new SpeechRec();
          recognition.lang = SPEECH_LOCALES[language] || "en-IN";
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.onresult = (event) => {
            let text = "";
            for (let i = 0; i < event.results.length; i++) {
              text += event.results[i][0].transcript + " ";
            }
            const trimmed = text.trim();
            liveTranscriptRef.current = trimmed;
            setLiveTranscript(trimmed);
          };
          recognition.onerror = () => {};
          recognition.start();
          speechRecRef.current = recognition;
        } catch {}
      }
    } catch {
      cleanupRecordingResources();
      toast.error(t(language, "micDenied"));
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    cancelRecordingRef.current = false;
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      cleanupRecordingResources();
      return;
    }
    cancelRecordingRef.current = true;
    mediaRecorderRef.current.stop();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewChat = () => {
    cancelRecording();
    stopSpeaking();
    setSessionId(null);
    setMessages([
      {
        role: "assistant",
        content: WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en,
        timestamp: Date.now(),
        sources: [],
      },
    ]);
    setInput("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            💬 {t(language, "chatTitle")}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Powered by Gemini AI · {!user && "Login to save chat history"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (autoSpeak) stopSpeaking();
              setAutoSpeak((v) => !v);
            }}
            className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
              autoSpeak
                ? "bg-primary-100 text-primary-800 border-primary-300"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span>{autoSpeak ? "🔊" : "🔈"}</span>
            <span>{t(language, "autoSpeak")}</span>
          </button>
          <button onClick={handleNewChat} className="btn-secondary text-sm flex items-center gap-1">
            🔄 {t(language, "newChat")}
          </button>
        </div>
      </div>

      {/* Suggested questions */}
      {suggestions.length > 0 && messages.length <= 1 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
            {t(language, "suggestedQuestions")}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-sm bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat container */}
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col"
        style={{ height: "60vh", minHeight: "400px" }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, i) => (
            <Message
              key={msg.id || i}
              msg={msg}
              index={i}
              language={language}
              speakingIndex={speakingIndex}
              onToggleSpeak={handleToggleSpeak}
            />
          ))}
          {loading && (
            <TypingIndicator
              label={
                loadingMode === "voice"
                  ? t(language, "transcribing")
                  : t(language, "thinking")
              }
            />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input / Voice Recorder Bar */}
        <div className="border-t border-gray-100 p-4">
          {isRecording ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-ping flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-red-700">
                      {t(language, "recording")}
                    </span>
                    <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {formatDuration(recordingSeconds)}
                    </span>
                  </div>
                  {liveTranscript && (
                    <p className="text-xs text-gray-600 truncate mt-0.5">
                      “{liveTranscript}”
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  ✕ {t(language, "voiceCancel")}
                </button>
                <button
                  type="button"
                  onClick={stopAndSendRecording}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
                >
                  ✓ {t(language, "voiceStop")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <button
                type="button"
                onClick={startRecording}
                disabled={loading}
                title={t(language, "voiceStart")}
                className="h-12 w-12 rounded-xl border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-50 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t(language, "chatPlaceholder")}
                className="input-field resize-none flex-1 h-12 py-3 text-sm"
                rows={1}
                style={{ maxHeight: "120px" }}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="btn-primary h-12 px-4 flex-shrink-0 flex items-center justify-center"
              >
                {loading ? (
                  <div className="spinner w-5 h-5" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1.5">
            🎤 {t(language, "voiceHint")} · Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}
