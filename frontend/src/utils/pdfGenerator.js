import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND_COLOR = [79, 70, 229];
const DARK_TEXT = [15, 23, 42];
const LIGHT_TEXT = [100, 116, 139];
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function drawHeader(doc, reportId, now) {
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, PAGE_W, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NeuroScan AI", MARGIN, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Brain Tumor Detection — Diagnostic Report", MARGIN, 20);
  doc.text(
    `Report ${reportId}  |  ${now.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    })}`,
    MARGIN, 26
  );
  return 38;
}

function drawSignature(doc, y, doctorName) {
  if (y > PAGE_H - 55) { doc.addPage(); y = 20; }

  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_TEXT);
  doc.text("Reviewed & Approved by:", MARGIN, y);
  y += 6;

  const sx = MARGIN;
  doc.setDrawColor(30, 30, 80);
  doc.setLineWidth(0.5);
  doc.lines(
    [[2,-4],[4,-6],[3,-2],[-1,3],[-3,4],[1,2],[4,0],[3,-1],[2,-3],[2,0],[3,2],[2,0],[2,-1],[3,-3],[1,0],[2,2],[3,1],[2,-1],[3,-2],[2,0],[1,2],[1,1]],
    sx, y + 6, [1, 1], "S"
  );
  y += 14;

  const displayName = doctorName || "Doctor";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK_TEXT);
  doc.text(`Dr. ${displayName}`, MARGIN, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("Attending Physician — NeuroScan AI Diagnostic Center", MARGIN, y);
  y += 4;
  doc.text(
    `Digital Signature — ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    MARGIN, y
  );
  return y + 4;
}

/**
 * Generate a professional PDF report with patient info and comparative analysis.
 */
export function generatePDF({
  scans,
  patient,
  previousScans,
  doctorName,
  // Legacy single-scan params
  patientName, patientAge, patientId,
  prediction, confidence, risk, medical, allProbabilities, imageData, fileName,
}) {
  const scanList =
    scans && scans.length > 0
      ? scans
      : [{ prediction, confidence, risk, medical, allProbabilities, imageData, fileName }];

  const pName = patient?.name || patientName || "Anonymous";
  const pAge = patient?.age || patientAge || "N/A";
  const pGender = patient?.gender || "";
  const pId = patient?.id ? `NS-P${patient.id}` : patientId || "N/A";

  const doc = new jsPDF("p", "mm", "a4");
  const now = new Date();
  const reportId = `NS-${now.getTime().toString(36).toUpperCase()}`;

  // ── Cover page ────────────────────────────────────────────────────────
  let y = drawHeader(doc, reportId, now);

  doc.setTextColor(...DARK_TEXT);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Information", MARGIN, y);
  y += 2;

  const patientRows = [
    ["Name", pName, "Age", pAge ? String(pAge) : "N/A"],
    ["Patient ID", pId, "Gender", pGender || "N/A"],
  ];
  if (patient?.medicalHistory) {
    patientRows.push(["Medical History", patient.medicalHistory, "", ""]);
  }
  if (doctorName) {
    patientRows.push(["Attending Doctor", doctorName, "Total Scans", String(scanList.length)]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, textColor: LIGHT_TEXT },
      1: { cellWidth: CONTENT_W / 2 - 15, textColor: DARK_TEXT },
      2: { fontStyle: "bold", cellWidth: 35, textColor: LIGHT_TEXT },
      3: { textColor: DARK_TEXT },
    },
    body: patientRows,
  });
  y = doc.lastAutoTable.finalY + 6;

  // ── Comparative Analysis (if previous scans exist) ────────────────────
  const prevScans = previousScans || [];
  if (prevScans.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_COLOR);
    doc.text("Scan History & Comparative Analysis", MARGIN, y);
    y += 2;

    const historyRows = prevScans.slice(0, 8).map((s) => [
      s.date ? new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
      s.prediction,
      `${s.confidence}%`,
      s.risk || "—",
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontSize: 8 },
      head: [["Date", "Diagnosis", "Confidence", "Risk"]],
      body: historyRows,
    });
    y = doc.lastAutoTable.finalY + 4;

    // Trend summary
    const tumorScans = prevScans.filter((s) => s.prediction !== "No Tumor");
    const clearScans = prevScans.filter((s) => s.prediction === "No Tumor");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_TEXT);
    doc.text(
      `Summary: ${prevScans.length} total scans — ${tumorScans.length} with tumor detected, ${clearScans.length} clear.`,
      MARGIN, y
    );
    y += 4;

    if (tumorScans.length >= 2) {
      const latest = tumorScans[0];
      const oldest = tumorScans[tumorScans.length - 1];
      const confDiff = latest.confidence - oldest.confidence;
      const trend = confDiff > 2 ? "Increasing confidence trend" : confDiff < -2 ? "Decreasing confidence trend" : "Stable confidence";
      const sameDiag = latest.prediction === oldest.prediction;
      doc.text(
        `Trend: ${trend} (${confDiff > 0 ? "+" : ""}${confDiff.toFixed(1)}%). ${sameDiag ? "Consistent diagnosis." : `Diagnosis changed: ${oldest.prediction} → ${latest.prediction}.`}`,
        MARGIN, y
      );
      y += 6;
    } else {
      y += 2;
    }
  }

  // ── Per-scan pages ────────────────────────────────────────────────────
  scanList.forEach((scan, idx) => {
    if (idx > 0 || prevScans.length > 0) {
      doc.addPage();
      y = drawHeader(doc, reportId, now);
    }

    if (scanList.length > 1) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_COLOR);
      doc.text(`Scan ${idx + 1} of ${scanList.length} — ${pName}`, MARGIN, y);
      y += 6;
    }

    const imgW = 50;
    const imgH = 50;
    const textX = MARGIN + imgW + 8;
    const textMaxW = CONTENT_W - imgW - 8;

    const displayImg = scan.heatmap || scan.imageData;
    if (displayImg) {
      try {
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(MARGIN - 0.5, y - 0.5, imgW + 1, imgH + 1, 1.5, 1.5, "S");
        doc.addImage(displayImg, "JPEG", MARGIN, y, imgW, imgH);
      } catch { /* skip */ }
    }

    let ty = y + 2;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_TEXT);
    doc.text("AI DIAGNOSIS", textX, ty);
    ty += 5;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_TEXT);
    const predLines = doc.splitTextToSize(scan.prediction || "Unknown", textMaxW);
    doc.text(predLines, textX, ty);
    ty += predLines.length * 6 + 2;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_TEXT);
    doc.text(`Confidence: ${scan.confidence}%`, textX, ty);
    ty += 4.5;
    doc.text(`Risk Level: ${scan.risk || "—"}`, textX, ty);
    ty += 6;

    if (scan.allProbabilities) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK_TEXT);
      doc.text("Class Probabilities:", textX, ty);
      ty += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...LIGHT_TEXT);
      for (const [label, prob] of Object.entries(scan.allProbabilities).sort((a, b) => b[1] - a[1])) {
        doc.text(`${label}: ${prob}%`, textX + 1, ty);
        ty += 3.8;
      }
    }

    y += imgH + 6;

    const med = scan.medical;
    if (med) {
      const sections = [
        { title: "Overview", content: med.overview },
        med.symptoms?.length > 0 && { title: "Common Symptoms", items: med.symptoms },
        { title: "Recommended Diagnostics", items: med.diagnostics },
        med.treatments?.length > 0 && { title: "Treatment Options", items: med.treatments },
        { title: "Recommendations", items: med.recommendations },
      ].filter(Boolean);

      for (const sec of sections) {
        if (y > PAGE_H - 40) break;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLOR);
        doc.text(sec.title, MARGIN, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK_TEXT);
        if (sec.content) {
          const lines = doc.splitTextToSize(sec.content, CONTENT_W).slice(0, 3);
          doc.text(lines, MARGIN, y);
          y += lines.length * 3.5 + 3;
        }
        if (sec.items) {
          for (const item of sec.items.slice(0, 3)) {
            if (y > PAGE_H - 40) break;
            const lines = doc.splitTextToSize(`•  ${item}`, CONTENT_W - 3).slice(0, 2);
            doc.text(lines, MARGIN + 1, y);
            y += lines.length * 3.5 + 1;
          }
          y += 2;
        }
      }
    }

    y = drawSignature(doc, y, doctorName);
  });

  // ── Final page disclaimer ─────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);
  const disclaimerY = PAGE_H - 18;
  doc.setDrawColor(230, 230, 230);
  doc.line(MARGIN, disclaimerY - 4, PAGE_W - MARGIN, disclaimerY - 4);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  const disclaimer = doc.splitTextToSize(
    "DISCLAIMER: This report is generated by NeuroScan AI for educational and research purposes only. " +
    "It is NOT a certified medical diagnosis. AI predictions should never replace professional medical advice, " +
    "diagnosis, or treatment. Consult a qualified healthcare professional for clinical decisions.",
    CONTENT_W
  );
  doc.text(disclaimer, MARGIN, disclaimerY);

  doc.save(`NeuroScan_Report_${pName.replace(/\s+/g, "_")}_${reportId}.pdf`);
}

// ── Consolidated Report helpers ────────────────────────────────────────────

const GREEN = [34, 197, 94];
const RED_COLOR = [239, 68, 68];
const AMBER = [245, 158, 11];
const SECTION_BG = [248, 250, 252];

function sectionTitle(doc, title, y, color) {
  const col = color || BRAND_COLOR;
  doc.setFillColor(...col);
  doc.rect(MARGIN, y, CONTENT_W, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(title.toUpperCase(), MARGIN + 3, y + 5.5);
  return y + 11;
}

function checkBreak(doc, y, needed, rid, now) {
  if (y + needed > PAGE_H - 22) {
    doc.addPage();
    return drawHeader(doc, rid, now);
  }
  return y;
}

function bodyText(doc, text, y, opts = {}) {
  const { fs = 8.5, style = "normal", color = DARK_TEXT, maxW = CONTENT_W, indent = 0 } = opts;
  doc.setFontSize(fs);
  doc.setFont("helvetica", style);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, maxW - indent);
  doc.text(lines, MARGIN + indent, y);
  return y + lines.length * (fs * 0.45 + 0.5) + 1.5;
}

function bulletList(doc, items, y, rid, now, opts = {}) {
  const { indent = 3, fs = 8, maxW = CONTENT_W - 6, color = DARK_TEXT } = opts;
  for (const item of items) {
    y = checkBreak(doc, y, 7, rid, now);
    const text = typeof item === "string" ? item : `${item.activity} — ${item.frequency}${item.note ? ` (${item.note})` : ""}`;
    const lines = doc.splitTextToSize(`•  ${text}`, maxW);
    doc.setFontSize(fs);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...color);
    doc.text(lines, MARGIN + indent, y);
    y += lines.length * (fs * 0.45 + 0.5) + 1.5;
  }
  return y + 1;
}

function riskBadge(doc, risk, x, y) {
  const colors = {
    High: RED_COLOR,
    Medium: AMBER,
    Low: GREEN,
  };
  const col = colors[risk] || LIGHT_TEXT;
  doc.setFillColor(...col);
  doc.roundedRect(x, y - 4, 28, 6, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(risk.toUpperCase(), x + 2, y);
}

function subHeading(doc, text, y, color) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...(color || BRAND_COLOR));
  doc.text(text, MARGIN, y);
  return y + 5;
}

/**
 * Generate a comprehensive consolidated patient report across all scans,
 * optionally enriched with AI-generated content from the Gemini API.
 *
 * @param {object} param0
 * @param {object}   param0.patient       - Patient object from API
 * @param {Array}    param0.scans         - All scan results with .medical (medicalData)
 * @param {object}   [param0.aiReport]    - AI-generated report data (optional)
 * @param {string}   [param0.doctorName]  - Attending physician name
 */
export function generateConsolidatedReport({ patient, scans, aiReport, doctorName }) {
  if (!scans || scans.length === 0) return;

  const doc = new jsPDF("p", "mm", "a4");
  const now = new Date();
  const reportId = `NS-CR-${now.getTime().toString(36).toUpperCase()}`;
  const pName = patient?.name || "Anonymous";
  const pId = patient?.id ? `NS-P${patient.id}` : "N/A";

  // Determine dominant diagnosis
  const tumorScans = scans.filter((s) => s.prediction !== "No Tumor");
  const clearScans = scans.filter((s) => s.prediction === "No Tumor");
  const dominantDiagnosis =
    tumorScans.length > 0
      ? (() => {
          const counts = {};
          tumorScans.forEach((s) => { counts[s.prediction] = (counts[s.prediction] || 0) + 1; });
          return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
        })()
      : "No Tumor";

  const avgConf = (scans.reduce((s, x) => s + x.confidence, 0) / scans.length).toFixed(1);
  const overallRisk = aiReport?.overall_risk || scans.find((s) => s.risk === "High")
    ? "High"
    : scans.find((s) => s.risk === "Medium")
    ? "Medium"
    : "Low";

  const primaryMed = scans.find((s) => s.prediction === dominantDiagnosis)?.medical || scans[0]?.medical || {};
  const dietData = aiReport?.diet_chart || primaryMed?.dietChart;
  const lifestyleData = aiReport?.lifestyle_changes || primaryMed?.lifestyleChanges;

  // ── PAGE 1: Cover + Patient Profile ───────────────────────────────────────

  let y = drawHeader(doc, reportId, now);

  // Report type banner
  doc.setFillColor(...SECTION_BG);
  doc.rect(MARGIN, y, CONTENT_W, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_COLOR);
  doc.text("CONSOLIDATED PATIENT DIAGNOSTIC REPORT", MARGIN + 3, y + 6);
  y += 13;

  // Patient info table
  const patientRows = [
    ["Patient Name", pName, "Patient ID", pId],
    ["Age", patient?.age ? `${patient.age} years` : "N/A", "Gender", patient?.gender || "N/A"],
    ["Attending Doctor", `Dr. ${doctorName || "N/A"}`, "Report Date", now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
  ];
  if (patient?.contactPhone) patientRows.push(["Contact Phone", patient.contactPhone, "Contact Email", patient?.contactEmail || "N/A"]);
  if (patient?.medicalHistory) patientRows.push(["Medical History", { content: patient.medicalHistory, colSpan: 3 }, "", ""]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [220, 220, 230], lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 38, textColor: LIGHT_TEXT, fillColor: SECTION_BG },
      1: { cellWidth: 55, textColor: DARK_TEXT },
      2: { fontStyle: "bold", cellWidth: 38, textColor: LIGHT_TEXT, fillColor: SECTION_BG },
      3: { textColor: DARK_TEXT },
    },
    body: patientRows,
  });
  y = doc.lastAutoTable.finalY + 7;

  // Summary statistics
  const statBoxes = [
    { label: "Total MRI Scans", value: String(scans.length), color: BRAND_COLOR },
    { label: "Tumors Detected", value: String(tumorScans.length), color: tumorScans.length > 0 ? RED_COLOR : GREEN },
    { label: "Clear Scans", value: String(clearScans.length), color: GREEN },
    { label: "Avg Confidence", value: `${avgConf}%`, color: BRAND_COLOR },
  ];
  const boxW = (CONTENT_W - 9) / 4;
  statBoxes.forEach((box, i) => {
    const bx = MARGIN + i * (boxW + 3);
    doc.setFillColor(...SECTION_BG);
    doc.setDrawColor(...box.color);
    doc.setLineWidth(0.6);
    doc.roundedRect(bx, y, boxW, 16, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...box.color);
    doc.text(box.value, bx + boxW / 2, y + 9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...LIGHT_TEXT);
    doc.text(box.label, bx + boxW / 2, y + 14, { align: "center" });
  });
  y += 21;

  // Overall risk + primary diagnosis row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_TEXT);
  doc.text("Primary Diagnosis:", MARGIN, y + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(dominantDiagnosis, MARGIN + 36, y + 1);
  doc.text("Overall Risk:", MARGIN + 110, y + 1);
  riskBadge(doc, overallRisk, MARGIN + 132, y + 4.5);
  y += 9;

  // ── PAGE 2: Executive Summary ──────────────────────────────────────────────

  doc.addPage();
  y = drawHeader(doc, reportId, now);
  y = sectionTitle(doc, "AI Clinical Executive Summary", y);

  const aiNote = aiReport ? "" : "  [Static fallback — Gemini AI not configured]";
  if (aiNote) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...AMBER);
    doc.text("Note: AI analysis unavailable. Displaying standard clinical information.", MARGIN, y);
    y += 5;
  }

  const execSummary = aiReport?.executive_summary ||
    primaryMed?.overview ||
    "No summary available.";
  y = bodyText(doc, execSummary, y, { fs: 9, color: DARK_TEXT });
  y += 3;

  if (aiReport?.clinical_interpretation) {
    y = checkBreak(doc, y, 20, reportId, now);
    y = subHeading(doc, "Clinical Interpretation", y);
    y = bodyText(doc, aiReport.clinical_interpretation, y, { fs: 8.5 });
    y += 3;
  }

  // Treatment Urgency + Prognosis
  y = checkBreak(doc, y, 28, reportId, now);
  if (aiReport?.treatment_urgency || aiReport?.prognosis) {
    const urgencyColor = (aiReport.treatment_urgency || "").toLowerCase().startsWith("immediate") ? RED_COLOR
      : (aiReport.treatment_urgency || "").toLowerCase().startsWith("urgent") ? AMBER : GREEN;

    if (aiReport.treatment_urgency) {
      doc.setFillColor(...urgencyColor);
      doc.roundedRect(MARGIN, y, CONTENT_W, 9, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`TREATMENT URGENCY: ${aiReport.treatment_urgency}`, MARGIN + 4, y + 6);
      y += 13;
    }

    if (aiReport.prognosis) {
      y = subHeading(doc, "Prognosis", y);
      y = bodyText(doc, aiReport.prognosis, y, { fs: 8.5 });
      y += 3;
    }
  }

  // Recommended Specialists
  const specialists = aiReport?.recommended_specialists || primaryMed?.recommendations?.slice(0, 3) || [];
  if (specialists.length > 0) {
    y = checkBreak(doc, y, 20, reportId, now);
    y = subHeading(doc, "Recommended Specialists", y);
    y = bulletList(doc, specialists, y, reportId, now, { color: BRAND_COLOR });
  }

  // ── PAGE 3: Scan History ───────────────────────────────────────────────────

  doc.addPage();
  y = drawHeader(doc, reportId, now);
  y = sectionTitle(doc, "Complete Scan History & Trend Analysis", y);

  const scanRows = scans.map((s, i) => [
    String(i + 1),
    s.date ? new Date(s.date).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—",
    s.fileName || s.file_name || "scan.jpg",
    s.prediction,
    `${s.confidence}%`,
    s.risk || "—",
  ]);

  const riskBodyStyles = (row) => {
    const risk = row[5];
    if (risk === "High") return { textColor: RED_COLOR, fontStyle: "bold" };
    if (risk === "Medium") return { textColor: AMBER, fontStyle: "bold" };
    if (risk === "Low") return { textColor: GREEN };
    return {};
  };

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    head: [["#", "Date", "File Name", "Diagnosis", "Confidence", "Risk"]],
    body: scanRows,
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: 42 },
      3: { cellWidth: 48 },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 20, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const s = riskBodyStyles(scanRows[data.row.index]);
        Object.assign(data.cell.styles, s);
      }
      if (data.section === "body" && data.column.index === 3 && data.cell.text[0] !== "No Tumor") {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = doc.lastAutoTable.finalY + 6;

  // Trend analysis
  y = checkBreak(doc, y, 30, reportId, now);
  y = subHeading(doc, "Trend Analysis", y);

  if (tumorScans.length >= 2) {
    const latest = tumorScans[tumorScans.length - 1];
    const oldest = tumorScans[0];
    const confDiff = latest.confidence - oldest.confidence;
    const trendDir = confDiff > 2 ? "increasing" : confDiff < -2 ? "decreasing" : "stable";
    const trendText = `Over ${scans.length} scans, the AI model detected tumors in ${tumorScans.length} instance(s). ` +
      `Confidence trend is ${trendDir} (${confDiff > 0 ? "+" : ""}${confDiff.toFixed(1)}% from first to latest tumor scan). ` +
      (latest.prediction === oldest.prediction
        ? `Diagnosis has remained consistent: ${latest.prediction}.`
        : `Diagnosis changed from ${oldest.prediction} (initial) to ${latest.prediction} (latest) — warrants clinical discussion.`);
    y = bodyText(doc, trendText, y, { fs: 8.5 });
  } else if (tumorScans.length === 1) {
    y = bodyText(doc, `Tumor detected in 1 of ${scans.length} scan(s). Primary finding: ${dominantDiagnosis} with ${tumorScans[0].confidence}% confidence. Further follow-up imaging is recommended to establish a baseline trend.`, y, { fs: 8.5 });
  } else {
    y = bodyText(doc, `All ${scans.length} scan(s) returned clear results (No Tumor detected). This is a reassuring finding. Continue routine health monitoring as advised.`, y, { fs: 8.5, color: [...GREEN] });
  }
  y += 4;

  // Follow-up Schedule
  const followUp = aiReport?.follow_up_schedule || [
    { timeframe: "Within 1 week", action: "Review results with treating physician", priority: "High" },
    { timeframe: "1 month", action: "Neurological examination and symptom review", priority: "Medium" },
    { timeframe: "3–6 months", action: "Follow-up MRI as directed by treating doctor", priority: "Routine" },
    { timeframe: "Annually", action: "Comprehensive brain health evaluation", priority: "Routine" },
  ];

  y = checkBreak(doc, y, 40, reportId, now);
  y = sectionTitle(doc, "Recommended Follow-up Schedule", y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8 },
    head: [["Timeframe", "Required Action", "Priority"]],
    body: followUp.map((f) => [f.timeframe, f.action, f.priority || "—"]),
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold" },
      1: { cellWidth: 120 },
      2: { cellWidth: 22, halign: "center" },
    },
  });
  y = doc.lastAutoTable.finalY + 6;

  // ── PAGE 4: Medical Information ────────────────────────────────────────────

  doc.addPage();
  y = drawHeader(doc, reportId, now);
  y = sectionTitle(doc, `Medical Information — ${dominantDiagnosis}`, y);

  const sections = [
    primaryMed?.overview && { title: "Condition Overview", content: primaryMed.overview },
    primaryMed?.symptoms?.length > 0 && { title: "Common Symptoms", items: primaryMed.symptoms },
    primaryMed?.diagnostics?.length > 0 && { title: "Recommended Diagnostics", items: primaryMed.diagnostics },
    primaryMed?.treatments?.length > 0 && { title: "Treatment Options", items: primaryMed.treatments },
    primaryMed?.recommendations?.length > 0 && { title: "Clinical Recommendations", items: primaryMed.recommendations },
  ].filter(Boolean);

  for (const sec of sections) {
    y = checkBreak(doc, y, 18, reportId, now);
    y = subHeading(doc, sec.title, y);
    if (sec.content) {
      y = bodyText(doc, sec.content, y, { fs: 8.5 });
      y += 2;
    }
    if (sec.items) {
      y = bulletList(doc, sec.items, y, reportId, now);
    }
  }

  // ── PAGE 5: Diet & Nutrition ───────────────────────────────────────────────

  if (dietData) {
    doc.addPage();
    y = drawHeader(doc, reportId, now);
    y = sectionTitle(doc, "Personalised Diet & Nutrition Plan", y, GREEN);

    if (dietData.overview) {
      y = bodyText(doc, dietData.overview, y, { fs: 8.5, color: [30, 80, 30] });
      y += 4;
    }

    // Recommended Foods table
    if (dietData.recommended?.length > 0) {
      y = subHeading(doc, "Recommended Foods", y, GREEN);
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        theme: "grid",
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontSize: 8 },
        head: [["Food Category", "Recommended Items", "Health Benefit"]],
        body: dietData.recommended.map((item) => [
          item.category,
          Array.isArray(item.items) ? item.items.join(", ") : item.items,
          item.benefit || item.reason || "",
        ]),
        columnStyles: {
          0: { cellWidth: 42, fontStyle: "bold" },
          1: { cellWidth: 80 },
          2: { cellWidth: CONTENT_W - 122 },
        },
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    // Foods to Avoid table
    if (dietData.avoid?.length > 0) {
      y = checkBreak(doc, y, 35, reportId, now);
      y = subHeading(doc, "Foods & Substances to Avoid", y, RED_COLOR);
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        theme: "grid",
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: RED_COLOR, textColor: [255, 255, 255], fontSize: 8 },
        head: [["Category", "Items to Avoid", "Reason"]],
        body: dietData.avoid.map((item) => [
          item.category,
          Array.isArray(item.items) ? item.items.join(", ") : item.items,
          item.reason || "",
        ]),
        columnStyles: {
          0: { cellWidth: 42, fontStyle: "bold" },
          1: { cellWidth: 80 },
          2: { cellWidth: CONTENT_W - 122 },
        },
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    // Supplements
    if (dietData.supplements?.length > 0) {
      y = checkBreak(doc, y, 25, reportId, now);
      y = subHeading(doc, "Suggested Supplements (Consult Doctor Before Starting)", y, [99, 102, 241]);
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        theme: "plain",
        styles: { fontSize: 7.5, cellPadding: 2, lineWidth: 0.2, lineColor: [200, 200, 220] },
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontSize: 8 },
        head: [["Supplement", "Suggested Dose", "Important Note"]],
        body: dietData.supplements.map((s) =>
          typeof s === "string"
            ? [s, "As per doctor", "Always consult before use"]
            : [s.name, s.dose || "As prescribed", s.note || "Consult doctor"]
        ),
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold" },
          1: { cellWidth: 40 },
          2: { cellWidth: CONTENT_W - 90 },
        },
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    // Hydration + Meal Timing
    if (dietData.hydration || dietData.meal_timing || dietData.mealTiming) {
      y = checkBreak(doc, y, 18, reportId, now);
      y = subHeading(doc, "Hydration & Meal Timing", y);
      if (dietData.hydration) {
        y = bodyText(doc, `Hydration: ${dietData.hydration}`, y, { fs: 8.5 });
      }
      if (dietData.meal_timing || dietData.mealTiming) {
        y = bodyText(doc, `Meal Timing: ${dietData.meal_timing || dietData.mealTiming}`, y, { fs: 8.5 });
      }
    }
  }

  // ── PAGE 6: Lifestyle Modifications ───────────────────────────────────────

  if (lifestyleData) {
    doc.addPage();
    y = drawHeader(doc, reportId, now);
    y = sectionTitle(doc, "Lifestyle Modifications & Self-Care Plan", y, [99, 102, 241]);

    // Exercise
    if (lifestyleData.exercise?.length > 0) {
      y = subHeading(doc, "Exercise Recommendations", y, BRAND_COLOR);
      const exerciseRows = lifestyleData.exercise.map((e) =>
        typeof e === "string"
          ? [e, "Regularly", ""]
          : [e.activity, e.frequency, e.note || ""]
      );
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        theme: "striped",
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontSize: 8 },
        head: [["Activity", "Frequency / Duration", "Notes & Precautions"]],
        body: exerciseRows,
        columnStyles: {
          0: { cellWidth: 52, fontStyle: "bold" },
          1: { cellWidth: 50 },
          2: { cellWidth: CONTENT_W - 102 },
        },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Sleep
    if (lifestyleData.sleep?.length > 0) {
      y = checkBreak(doc, y, 22, reportId, now);
      y = subHeading(doc, "Sleep Hygiene", y);
      y = bulletList(doc, lifestyleData.sleep, y, reportId, now);
    }

    // Stress Management
    if (lifestyleData.stress_management?.length > 0 || lifestyleData.stressManagement?.length > 0) {
      y = checkBreak(doc, y, 22, reportId, now);
      y = subHeading(doc, "Stress Management Techniques", y);
      y = bulletList(doc, lifestyleData.stress_management || lifestyleData.stressManagement, y, reportId, now);
    }

    // Things to Avoid
    if (lifestyleData.avoid?.length > 0) {
      y = checkBreak(doc, y, 22, reportId, now);
      y = subHeading(doc, "Things to Avoid", y, RED_COLOR);
      y = bulletList(doc, lifestyleData.avoid, y, reportId, now, { color: [...RED_COLOR] });
    }

    // Mental Health
    if (lifestyleData.mental_health?.length > 0 || lifestyleData.mentalHealth?.length > 0) {
      y = checkBreak(doc, y, 22, reportId, now);
      y = subHeading(doc, "Mental Health & Emotional Wellbeing", y, [99, 102, 241]);
      y = bulletList(doc, lifestyleData.mental_health || lifestyleData.mentalHealth, y, reportId, now, { color: [99, 102, 241] });
    }

    // Self Monitoring
    if (lifestyleData.self_monitoring?.length > 0 || lifestyleData.selfMonitoring?.length > 0) {
      y = checkBreak(doc, y, 22, reportId, now);
      y = subHeading(doc, "Self-Monitoring Checklist", y);
      y = bulletList(doc, lifestyleData.self_monitoring || lifestyleData.selfMonitoring, y, reportId, now);
    }
  }

  // ── PAGE 7: Scan Images Appendix ──────────────────────────────────────────

  const scansWithImages = scans.filter((s) => s.heatmap || s.imageData);
  if (scansWithImages.length > 0) {
    doc.addPage();
    y = drawHeader(doc, reportId, now);
    y = sectionTitle(doc, "Appendix: Individual Scan Analysis", y, [71, 85, 105]);

    const imgSize = 50;
    const imgsPerRow = 3;
    const imgSpacing = (CONTENT_W - imgsPerRow * imgSize) / (imgsPerRow - 1);

    let col = 0;
    let rowY = y;

    for (const scan of scansWithImages) {
      const imgX = MARGIN + col * (imgSize + imgSpacing);
      rowY = checkBreak(doc, rowY, imgSize + 22, reportId, now);

      const img = scan.heatmap || scan.imageData;
      try {
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(imgX - 0.5, rowY - 0.5, imgSize + 1, imgSize + 1, 1.5, 1.5, "S");
        doc.addImage(img, "JPEG", imgX, rowY, imgSize, imgSize);
      } catch { /* skip broken images */ }

      const labelY = rowY + imgSize + 4;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK_TEXT);
      const predLines = doc.splitTextToSize(scan.prediction || "Unknown", imgSize);
      doc.text(predLines, imgX + imgSize / 2, labelY, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...LIGHT_TEXT);
      doc.text(`${scan.confidence}% confidence`, imgX + imgSize / 2, labelY + 4, { align: "center" });
      if (scan.date) {
        doc.text(new Date(scan.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), imgX + imgSize / 2, labelY + 8, { align: "center" });
      }

      col++;
      if (col >= imgsPerRow) {
        col = 0;
        rowY += imgSize + 20;
      }
    }
    y = rowY + (col > 0 ? imgSize + 20 : 0);
  }

  // ── Emergency Warning Signs + Signature ───────────────────────────────────

  const warningSigns = aiReport?.emergency_warning_signs || [
    "Sudden, severe 'thunderclap' headache unlike any before",
    "New onset seizures or prolonged seizure activity",
    "Sudden loss of vision, speech, or limb movement",
    "Rapid decline in consciousness or confusion",
    "Persistent vomiting with worsening headache",
  ];

  y = checkBreak(doc, y, 45, reportId, now);
  y = sectionTitle(doc, "Emergency Warning Signs — Seek Immediate Medical Attention", y, RED_COLOR);
  y = bulletList(doc, warningSigns, y, reportId, now, { color: [...RED_COLOR] });
  y += 2;

  if (aiReport?.caregiver_guidance) {
    y = checkBreak(doc, y, 18, reportId, now);
    y = subHeading(doc, "Guidance for Family & Caregivers", y, [99, 102, 241]);
    y = bodyText(doc, aiReport.caregiver_guidance, y, { fs: 8.5, color: [50, 50, 100] });
    y += 4;
  }

  y = drawSignature(doc, y, doctorName);

  // Footer disclaimer on last page
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);
  const disclaimerY = PAGE_H - 16;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, disclaimerY - 3, PAGE_W - MARGIN, disclaimerY - 3);
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(160, 160, 160);
  doc.text(
    doc.splitTextToSize(
      "DISCLAIMER: This report is generated by NeuroScan AI for educational and research purposes. It is NOT a certified medical diagnosis. " +
      "AI predictions must never replace professional medical advice, diagnosis, or treatment. All dietary and lifestyle recommendations are general guidelines — " +
      "consult qualified healthcare professionals before making clinical decisions. In case of emergency, call your local emergency services immediately.",
      CONTENT_W
    ),
    MARGIN,
    disclaimerY
  );

  doc.save(`NeuroScan_Consolidated_Report_${pName.replace(/\s+/g, "_")}_${reportId}.pdf`);
}
