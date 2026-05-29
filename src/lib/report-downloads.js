import { jsPDF } from "jspdf";

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentWidth = pageWidth - margin * 2;

const cleanText = (value) => (value == null || value === "" ? "No data" : String(value));

const formatDate = (value) => {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const ensurePageSpace = (doc, y, needed = 12) => {
  if (y + needed <= pageHeight - margin) {
    return y;
  }

  doc.addPage();
  return margin;
};

const writeWrapped = (doc, text, x, y, width, lineHeight = 6, fontSize = 10) => {
  const lines = doc.splitTextToSize(cleanText(text), width);
  doc.setFontSize(fontSize);

  lines.forEach((line) => {
    y = ensurePageSpace(doc, y, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  });

  return y;
};

const writeSectionTitle = (doc, title, y) => {
  y = ensurePageSpace(doc, y, 12);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  return y + 6;
};

export const downloadPdfReport = ({
  title,
  subtitle,
  summaryLines = [],
  sections = [],
  filename,
}) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = margin;

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, margin, y);
  y += 7;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = writeWrapped(doc, subtitle, margin, y, contentWidth, 5.5, 10);
    y += 2;
  }

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  y = writeWrapped(doc, `Created: ${new Date().toLocaleString()}`, margin, y, contentWidth, 5, 9);
  y += 3;

  if (summaryLines.length > 0) {
    y = writeSectionTitle(doc, "Summary", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    summaryLines.forEach((line) => {
      y = writeWrapped(doc, `- ${line}`, margin + 2, y, contentWidth - 4, 5.5, 10);
    });
    y += 2;
  }

  sections.forEach((section) => {
    y = writeSectionTitle(doc, section.title, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    if (!section.items || section.items.length === 0) {
      y = writeWrapped(doc, section.emptyText || "No records found.", margin, y, contentWidth, 5.5, 10);
      y += 2;
      return;
    }

    section.items.forEach((item) => {
      y = ensurePageSpace(doc, y, 16);
      doc.setFont("helvetica", "bold");
      doc.text(cleanText(item.title), margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      (item.lines || []).forEach((line) => {
        y = writeWrapped(doc, line, margin + 4, y, contentWidth - 8, 5.2, 9.5);
      });
      y += 2;
    });
  });

  doc.save(filename);
};

export const formatReportDate = formatDate;
export const formatReportDateTime = formatDateTime;
