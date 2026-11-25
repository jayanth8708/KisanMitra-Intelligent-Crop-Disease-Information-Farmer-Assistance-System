import React, { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { diseaseAPI } from "../utils/api";
import { useLanguage } from "../contexts/LanguageContext";
import { t } from "../utils/i18n";

const SEVERITY_COLORS = {
  mild: "badge-yellow",
  moderate: "text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full text-xs font-medium",
  severe: "badge-red",
  none: "badge-green",
  unknown: "text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full text-xs font-medium",
};

const DISEASED_CONFIG = {
  yes: { color: "bg-red-50 border-red-200", badge: "badge-red", icon: "🔴", label: "Disease Detected" },
  no: { color: "bg-green-50 border-green-200", badge: "badge-green", icon: "✅", label: "Healthy Plant" },
  uncertain: { color: "bg-yellow-50 border-yellow-200", badge: "badge-yellow", icon: "⚠️", label: "Uncertain" },
};

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">Confidence</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const cfg = DISEASED_CONFIG[result.is_diseased] || DISEASED_CONFIG.uncertain;
  const severityClass = SEVERITY_COLORS[result.severity] || SEVERITY_COLORS.unknown;

  return (
    <div className={`rounded-2xl border-2 ${cfg.color} p-6 mt-6 animate-slide-up`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{cfg.icon}</span>
            <h2 className="text-xl font-bold text-gray-800">{result.disease_name}</h2>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={cfg.badge}>{cfg.label}</span>
            {result.severity && result.severity !== "unknown" && (
              <span className={severityClass}>Severity: {result.severity}</span>
            )}
            {result.crop_name && (
              <span className="badge-green">🌱 {result.crop_name}</span>
            )}
          </div>
        </div>
      </div>

      <ConfidenceBar value={result.confidence} />

      {/* Details */}
      <div className="mt-5 grid gap-4">
        {result.symptoms && (
          <Section title="🔍 Symptoms" content={result.symptoms} />
        )}
        {result.causes && (
          <Section title="🧬 Causes" content={result.causes} />
        )}
        {result.prevention && (
          <Section title="🛡️ Prevention" content={result.prevention} />
        )}
        {result.management && (
          <Section title="💊 Management" content={result.management} />
        )}
        {result.recommendations && (
          <Section title="📋 Recommendations" content={result.recommendations} />
        )}

        {/* Sources */}
        {result.rag_sources && result.rag_sources.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📚 Referenced Sources</h4>
            <div className="flex flex-wrap gap-2">
              {result.rag_sources.map((src, i) => (
                <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                  📄 {src.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        {result.disclaimer && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-semibold text-amber-800 mb-1">⚠️ Disclaimer</h4>
            <p className="text-amber-700 text-sm">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, content }) {
  return (
    <div className="bg-white/70 rounded-xl p-4 border border-white">
      <h4 className="font-semibold text-gray-800 mb-2">{title}</h4>
      <div className="text-gray-700 text-sm prose prose-sm max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function DiseaseDetection() {
  const { language } = useLanguage();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Live camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const selectImageFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10 MB.");
      return;
    }
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        toast.error("Invalid file. Please upload JPG, PNG, or WebP under 10 MB.");
        return;
      }
      selectImageFile(acceptedFiles[0]);
    },
    [selectImageFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/bmp": [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const startCamera = useCallback(
    async (mode = facingMode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error(t(language, "cameraUnsupported"));
        nativeCameraInputRef.current?.click();
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setCameraOpen(true);
      setCameraReady(false);

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback to any available camera if facingMode constraint isn't supported
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } catch {
        stopCamera();
        toast.error(t(language, "cameraDenied"));
      }
    },
    [facingMode, language, stopCamera]
  );

  const handleFlipCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      toast.error("Camera is still loading. Please wait a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Could not capture image. Please try again.");
          return;
        }
        const capturedFile = new File([blob], `plant_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopCamera();
        selectImageFile(capturedFile);
        toast.success("Photo captured!");
      },
      "image/jpeg",
      0.92
    );
  };

  const handleNativeCameraChange = (e) => {
    const captured = e.target.files?.[0];
    if (captured) selectImageFile(captured);
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    if (!file) return toast.error("Please select an image first.");
    setLoading(true);
    setResult(null);
    try {
      const { data } = await diseaseAPI.analyze(file, language);
      setResult(data);
      toast.success("Analysis complete!");
    } catch (err) {
      const msg = err.response?.data?.detail || "Analysis failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🔬 {t(language, "uploadTitle")}
        </h1>
        <p className="text-gray-500 mt-1">{t(language, "uploadDesc")}</p>
      </div>

      {/* Hidden native camera fallback input for mobile browsers */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraChange}
        className="hidden"
      />

      {/* Upload / Camera Area */}
      <div className="card">
        {cameraOpen ? (
          <div className="space-y-4">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setCameraReady(true)}
                className="w-full h-full object-cover"
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900/70">
                  <div className="spinner mb-2" />
                  <p className="text-sm">{t(language, "loading")}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleFlipCamera}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                🔄 {t(language, "switchCamera")}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="btn-secondary text-sm"
                >
                  ✕ {t(language, "closeCamera")}
                </button>
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  disabled={!cameraReady}
                  className="btn-primary flex items-center gap-2"
                >
                  📸 {t(language, "takePhoto")}
                </button>
              </div>
            </div>
          </div>
        ) : !preview ? (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Option 1: Upload Photo */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                isDragActive
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-primary-400 hover:bg-gray-50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-5xl mb-3">📁</div>
              <p className="text-gray-800 font-semibold mb-1">{t(language, "dragDrop")}</p>
              <p className="text-gray-400 text-xs">{t(language, "supported")}</p>
            </div>

            {/* Option 2: Capture Photo with Camera */}
            <div className="border-2 border-dashed border-primary-200 bg-primary-50/40 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <div className="text-5xl mb-3">📸</div>
              <p className="text-gray-800 font-semibold mb-1">{t(language, "captureTitle")}</p>
              <p className="text-gray-500 text-xs mb-4 max-w-xs">{t(language, "captureDesc")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  📷 {t(language, "openCamera")}
                </button>
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="btn-secondary text-sm md:hidden"
                >
                  📱 {t(language, "mobileCameraBtn")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <img
                src={preview}
                alt="Crop preview"
                className="w-48 h-48 object-cover rounded-xl border border-gray-200 shadow-sm"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-800 mb-1">📁 {file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="spinner w-4 h-4" />
                        {t(language, "analyzing")}
                      </>
                    ) : (
                      <>🔬 {t(language, "analyzeBtn")}</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleReset();
                      startCamera(facingMode);
                    }}
                    className="btn-secondary text-sm"
                    disabled={loading}
                  >
                    📸 {t(language, "openCamera")}
                  </button>
                  <button onClick={handleReset} className="btn-secondary text-sm" disabled={loading}>
                    🔄 New Image
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="spinner" />
                  <div>
                    <p className="font-medium text-primary-800">Analysing your crop image...</p>
                    <p className="text-sm text-primary-600">
                      Gemini Vision AI is examining the image. This may take 15–30 seconds.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result */}
      {result && <ResultCard result={result} />}

      {/* Tips */}
      <div className="mt-6 card bg-primary-50 border border-primary-100">
        <h3 className="font-semibold text-primary-800 mb-3">💡 Tips for Better Results</h3>
        <ul className="text-sm text-primary-700 space-y-1">
          <li>• Take photos in good natural daylight</li>
          <li>• Focus on affected leaves, stems or fruits</li>
          <li>• Include both healthy and diseased parts if possible</li>
          <li>• Avoid blurry or low-resolution images</li>
          <li>• Clean the lens before taking the photo</li>
        </ul>
      </div>
    </div>
  );
}
