// components/EllipseCropper.jsx
import React, { useEffect, useRef, useState } from "react";
import { ellipseCropDataUrl } from "../lib/imageUtils";

export default function EllipseCropper({ src, onDone, onCancel }) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [rect, setRect] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      // default ellipse: center & 70% of min dimension
      const rx = Math.floor(img.width * 0.35);
      const ry = Math.floor(img.height * 0.35);
      setRect({ cx: Math.floor(img.width / 2), cy: Math.floor(img.height / 2), rx, ry, rot: 0});
      draw(img, { cx: Math.floor(img.width / 2), cy: Math.floor(img.height / 2), rx, ry, rot: 0 });
    };
    img.src = src;
  }, [src]);

  function draw(img, r) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // dim background
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw image centered
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // draw ellipse guide
    ctx.save();
    ctx.beginPath();
    ctx.translate(r.cx, r.cy);
    ctx.rotate(r.rot || 0);
    ctx.scale(r.rx, r.ry);
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2 / Math.max(r.rx / 100, 1); // scale stroke
    ctx.setLineDash([6, 6]);
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function pointerDown(e) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, rect: { ...rect } };
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
  }
  function pointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const newRect = { ...dragRef.current.rect, cx: Math.max(0, Math.min(imgRef.current.width, dragRef.current.rect.cx + dx)), cy: Math.max(0, Math.min(imgRef.current.height, dragRef.current.rect.cy + dy)) };
    setRect(newRect);
    draw(imgRef.current, newRect);
  }
  function pointerUp() {
    dragRef.current = null;
    window.removeEventListener("pointermove", pointerMove);
    window.removeEventListener("pointerup", pointerUp);
  }

  async function confirmCrop() {
    if (!rect) return;
    const cropped = await ellipseCropDataUrl(src, { cx: rect.cx, cy: rect.cy, rx: rect.rx, ry: rect.ry, rotation: rect.rot });
    onDone(cropped);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
      <div className="bg-neutral-900 p-2 rounded shadow-lg">
        <div style={{ width: 320, height: 320, maxWidth: "80vw", maxHeight: "80vh" }}>
          <canvas ref={canvasRef} onPointerDown={pointerDown} style={{ width: "100%", height: "100%", touchAction: "none", display: "block" }} />
        </div>
        <div className="mt-2 flex gap-2 justify-end">
          <button className="px-3 py-2 bg-gray-700 rounded" onClick={onCancel}>Cancel</button>
          <button className="px-3 py-2 bg-green-600 rounded" onClick={confirmCrop}>Crop</button>
        </div>
      </div>
    </div>
  );
}
