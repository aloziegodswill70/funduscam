"use client";
import { useEffect, useRef, useState } from "react";

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stream;
    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setLoading(false);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setLoading(false);
      }
    }
    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);
    const imgData = canvas.toDataURL("image/png");
    onCapture(imgData);
  };

  return (
    <div className="flex flex-col items-center">
      {loading ? (
        <p className="text-gray-500">Initializing camera…</p>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="rounded-lg shadow-md max-w-full"
        />
      )}
      <button
        onClick={handleCapture}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Capture
      </button>
    </div>
  );
}
