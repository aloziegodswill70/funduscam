"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import AlignmentOverlay from "../components/AlignmentOverlay.jsx";
import EllipseCropper from "../components/EllipseCropper.jsx";
import { claheDataUrl } from "../lib/imageUtils";
import PdfExporter from "../components/PdfExporter.jsx";

export default function Home() {
  const webcamRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [bestImage, setBestImage] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [cropped, setCropped] = useState(null);
  const [useCLAHE, setUseCLAHE] = useState(false);
  const [eye, setEye] = useState("OD");

  // Store OD/OS separately
  const [odImage, setOdImage] = useState(null);
  const [osImage, setOsImage] = useState(null);

  const [patient, setPatient] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fundus_patient") || "{}");
    } catch {
      return {};
    }
  });

  // Camera
  const onUserMedia = useCallback((stream) => {
    streamRef.current = stream;
    setReady(true);
  }, []);

  const takeShot = () => {
    const cam = webcamRef.current;
    if (!cam) return null;
    return cam.getScreenshot();
  };

  const captureBurst = async () => {
    if (capturing) return;
    setCapturing(true);
    setBestImage(null);
    setCropped(null);
    try {
      const frames = [];
      for (let i = 0; i < 5; i++) {
        const shot = takeShot();
        if (shot) frames.push(shot);
        await new Promise((r) => setTimeout(r, 110));
      }
      if (!frames.length) return;
      const scores = await Promise.all(frames.map(scoreSharpness));
      let bestIdx = 0;
      for (let i = 1; i < scores.length; i++) {
        if (scores[i] > scores[bestIdx]) bestIdx = i;
      }
      setBestImage(frames[bestIdx]);
    } finally {
      setCapturing(false);
    }
  };

  // Save patient record to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("fundus_patient", JSON.stringify(patient || {}));
    } catch {}
  }, [patient]);

  // Apply CLAHE (if toggled)
  const applyCLAHE = async () => {
    if (!bestImage) return;
    const p = await claheDataUrl(bestImage, { tileSize: 64, clipLimit: 0.01 });
    setBestImage(p);
  };

  // Save current image to OD/OS slot
  const saveEyeImage = () => {
    if (!bestImage) return;
    const img = cropped || bestImage;
    if (eye === "OD") setOdImage(img);
    if (eye === "OS") setOsImage(img);
    alert(`Saved ${eye} image! You can now switch eye or export PDF.`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-neutral-900/90 border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-base font-semibold">SmartFundus</div>
          <div className="text-xs opacity-80">PWA • Beta</div>
        </div>
      </div>

      <div className="max-w-md mx-auto flex-1 w-full">
        {/* Patient form */}
        <div className="p-3 bg-neutral-800 border-b border-white/5">
          <div className="flex gap-2">
            <input
              value={patient.firstName || ""}
              onChange={(e) =>
                setPatient({ ...patient, firstName: e.target.value })
              }
              placeholder="First name"
              className="flex-1 px-2 py-2 rounded bg-neutral-700"
            />
            <input
              value={patient.lastName || ""}
              onChange={(e) =>
                setPatient({ ...patient, lastName: e.target.value })
              }
              placeholder="Last name"
              className="flex-1 px-2 py-2 rounded bg-neutral-700"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={patient.mrn || ""}
              onChange={(e) => setPatient({ ...patient, mrn: e.target.value })}
              placeholder="MRN"
              className="px-2 py-2 rounded bg-neutral-700"
            />
            <input
              value={patient.dob || ""}
              onChange={(e) => setPatient({ ...patient, dob: e.target.value })}
              placeholder="DOB (YYYY-MM-DD)"
              className="px-2 py-2 rounded bg-neutral-700"
            />
          </div>
          <div className="mt-2 flex gap-2 items-center">
            <div className="text-sm">Eye:</div>
            <button
              className={`px-2 py-1 rounded ${
                eye === "OD" ? "bg-brand" : "bg-neutral-700"
              }`}
              onClick={() => setEye("OD")}
            >
              OD
            </button>
            <button
              className={`px-2 py-1 rounded ${
                eye === "OS" ? "bg-brand" : "bg-neutral-700"
              }`}
              onClick={() => setEye("OS")}
            >
              OS
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useCLAHE}
                onChange={(e) => setUseCLAHE(e.target.checked)}
              />
              <span>CLAHE</span>
            </label>
          </div>
        </div>

        {/* Camera / Viewer */}
        <div className="relative bg-black" style={{ height: 480 }}>
          {!bestImage ? (
            <div className="relative h-full">
              <Webcam
                ref={webcamRef}
                onUserMedia={onUserMedia}
                audio={false}
                forceScreenshotSourceSize
                screenshotFormat="image/jpeg"
                screenshotQuality={0.92}
                videoConstraints={{ facingMode: { ideal: "environment" } }}
                className="w-full h-full object-cover"
              />
              <AlignmentOverlay />
              {!ready && (
                <div className="absolute inset-0 grid place-items-center text-white/80">
                  Initializing camera…
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-full bg-black grid place-items-center">
              <img
                src={cropped || bestImage}
                className="max-h-full max-w-full object-contain"
                alt="fundus"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  className="px-2 py-1 bg-neutral-800 rounded"
                  onClick={() => setShowCrop(true)}
                >
                  Ellipse Crop
                </button>
                <button
                  className="px-2 py-1 bg-neutral-800 rounded"
                  onClick={applyCLAHE}
                >
                  Apply CLAHE
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 py-3 bg-neutral-900 border-t border-white/10 flex flex-wrap gap-2">
          {!bestImage ? (
            <button
              onClick={captureBurst}
              disabled={!ready || capturing}
              className="flex-1 px-4 py-2 bg-brand rounded text-white"
            >
              {capturing ? "Capturing…" : "Capture Burst"}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setBestImage(null);
                  setCropped(null);
                }}
                className="px-3 py-2 bg-gray-700 rounded"
              >
                Retake
              </button>
              <button
                onClick={saveEyeImage}
                className="px-3 py-2 bg-blue-600 rounded text-white"
              >
                Save {eye}
              </button>
            </>
          )}
        </div>

        {/* Exporter */}
        {(odImage || osImage) && (
          <div className="p-4">
            <PdfExporter patient={patient} odImage={odImage} osImage={osImage} />
          </div>
        )}
      </div>

      {/* Ellipse Cropper */}
      {showCrop && bestImage && (
        <EllipseCropper
          src={bestImage}
          onDone={(dataUrl) => {
            setCropped(dataUrl);
            setShowCrop(false);
          }}
          onCancel={() => setShowCrop(false)}
        />
      )}
    </div>
  );
}

/* ---------- helpers ---------- */
async function scoreSharpness(dataUrl) {
  const img = await imageFromDataUrl(dataUrl);
  const w = 256;
  const h = Math.max(1, Math.round((img.height / img.width) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const k = [0, 1, 0, 1, -4, 1, 0, 1, 0];
  const lap = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      let s = 0;
      s += gray[idx - w] * k[1];
      s += gray[idx - 1] * k[3];
      s += gray[idx] * k[4];
      s += gray[idx + 1] * k[5];
      s += gray[idx + w] * k[7];
      lap[idx] = s;
    }
  }

  let m = 0;
  for (let i = 0; i < lap.length; i++) m += lap[i];
  m /= lap.length;

  let v = 0;
  for (let i = 0; i < lap.length; i++) {
    const d = lap[i] - m;
    v += d * d;
  }
  v /= lap.length;

  return v;
}

function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
