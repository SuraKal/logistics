import { jsPDF } from "jspdf";

const PAGE_HEIGHT = 297;
const PAGE_WIDTH = 210;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const formatLabel = (value) => {
  if (!value) return "N/A";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const formatNumber = (value) => {
  if (value == null || value === "") return "N/A";
  if (typeof value === "number") return value.toLocaleString();
  return value;
};

const addWrappedText = (doc, text, x, y, options = {}) => {
  const lines = doc.splitTextToSize(String(text), options.maxWidth || CONTENT_WIDTH);
  doc.text(lines, x, y);
  return y + lines.length * (options.lineHeight || 5);
};

const ensureSpace = (doc, y, neededHeight = 10) => {
  if (y + neededHeight <= PAGE_HEIGHT - MARGIN) return y;
  doc.addPage();
  return MARGIN;
};

const addSectionTitle = (doc, title, y) => {
  const nextY = ensureSpace(doc, y, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, MARGIN, nextY);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, nextY + 2, PAGE_WIDTH - MARGIN, nextY + 2);
  return nextY + 8;
};

const addBulletList = (doc, items, y) => {
  let nextY = y;

  if (items.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    nextY = ensureSpace(doc, nextY, 8);
    doc.text("No records found.", MARGIN, nextY);
    return nextY + 7;
  }

  items.forEach((item) => {
    nextY = ensureSpace(doc, nextY, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    nextY = addWrappedText(doc, item.title, MARGIN, nextY, {
      maxWidth: CONTENT_WIDTH,
      lineHeight: 5,
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    item.lines.forEach((line) => {
      nextY = ensureSpace(doc, nextY, 8);
      nextY = addWrappedText(doc, `- ${line}`, MARGIN + 3, nextY, {
        maxWidth: CONTENT_WIDTH - 3,
        lineHeight: 4.8,
      });
    });

    nextY += 2;
  });

  return nextY + 2;
};

export const downloadVehicleReport = ({
  vehicle,
  schedules,
  components,
  sessions,
  serviceItemsBySession,
}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Vehicle Report", MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    `Generated: ${new Date().toLocaleString()}`,
    MARGIN,
    y,
    { lineHeight: 5 },
  );
  y += 2;

  y = addSectionTitle(doc, "Vehicle Summary", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  [
    `Plate Number: ${vehicle?.plate_number || "N/A"}`,
    `Vehicle: ${vehicle?.year || "N/A"} ${vehicle?.make || ""} ${vehicle?.model || ""}`.trim(),
    `Type: ${formatLabel(vehicle?.vehicle_type)}`,
    `Status: ${formatLabel(vehicle?.status)}`,
    `Current Mileage: ${formatNumber(vehicle?.current_mileage)} km`,
  ].forEach((line) => {
    y = ensureSpace(doc, y, 7);
    doc.text(line, MARGIN, y);
    y += 5;
  });

  y += 2;
  y = addSectionTitle(
    doc,
    `Maintenance Schedule (${schedules.length})`,
    y,
  );
  y = addBulletList(
    doc,
    schedules.map((schedule) => ({
      title: schedule.name || "Unnamed maintenance item",
      lines: [
        `Status: ${formatLabel(schedule.status)}`,
        `Interval: ${schedule.interval_value || "N/A"} ${
          schedule.interval_type === "km"
            ? "km"
            : formatLabel(schedule.interval_unit)
        }`,
        `Last Done Date: ${schedule.last_done_date || "N/A"}`,
        `Last Done Mileage: ${formatNumber(schedule.last_done_mileage)} km`,
        `Next Due Date: ${schedule.next_due_date || "N/A"}`,
        `Next Due Mileage: ${formatNumber(schedule.next_due_mileage)} km`,
      ],
    })),
    y,
  );

  y = addSectionTitle(doc, `Components (${components.length})`, y);
  y = addBulletList(
    doc,
    components.map((component) => ({
      title: `${formatLabel(component.component_type)} - ${component.brand || "Unknown brand"} ${component.name || ""}`.trim(),
      lines: [
        `Position: ${formatLabel(component.position)}`,
        `Serial Number: ${component.serial_number || "N/A"}`,
        `Health Status: ${formatLabel(component.health_status)}`,
        `Installed: ${component.install_date || "N/A"}`,
      ],
    })),
    y,
  );

  y = addSectionTitle(doc, `Service History (${sessions.length})`, y);
  y = addBulletList(
    doc,
    sessions.map((session) => {
      const serviceItems = serviceItemsBySession[session.id] || [];
      return {
        title: `${session.date || "N/A"} - ${session.garage_name || "Unknown garage"}`,
        lines: [
          `Status: ${formatLabel(session.status)}`,
          `Mechanic: ${session.mechanic_name || "N/A"}`,
          `Odometer at Entry: ${formatNumber(session.odometer_at_entry)} km`,
          `Closed At: ${formatDateTime(session.closed_at)}`,
          `Logged Items: ${
            serviceItems.length > 0
              ? serviceItems
                  .map((item) => `${item.item_name} (${formatLabel(item.action)})`)
                  .join(", ")
              : "No service items logged"
          }`,
        ],
      };
    }),
    y,
  );

  const safePlate = vehicle?.plate_number?.replace(/[^a-z0-9-]/gi, "_") || "vehicle";
  doc.save(`${safePlate}-report.pdf`);
};
