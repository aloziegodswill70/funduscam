"use client";
import { useState } from "react";
import jsPDF from "jspdf";

export default function PdfExporter({ patient, odImage, osImage }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const exportPDF = async () => {
    try {
      setLoading(true);
      setSuccess(false);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Header
      pdf.setFontSize(16);
      pdf.text("SmartFundus Report", pageWidth / 2, 15, { align: "center" });

      // Patient details
      pdf.setFontSize(11);
      pdf.text(`Name: ${patient.firstName || ""} ${patient.lastName || ""}`, 14, 30);
      pdf.text(`MRN: ${patient.mrn || ""}`, 14, 37);
      pdf.text(`DOB: ${patient.dob || ""}`, 14, 44);

      // OD image
      if (odImage) {
        pdf.addImage(odImage, "JPEG", 14, 60, 80, 80);
        pdf.text("OD", 54, 150, { align: "center" });
      }

      // OS image
      if (osImage) {
        pdf.addImage(osImage, "JPEG", 110, 60, 80, 80);
        pdf.text("OS", 150, 150, { align: "center" });
      }

      pdf.save("SmartFundus_Report.pdf");
      setSuccess(true);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={exportPDF}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
      >
        {loading ? "Exporting..." : "Export PDF"}
      </button>
      {success && (
        <p className="text-green-600 text-sm mt-2">✅ PDF exported successfully!</p>
      )}
    </div>
  );
}
