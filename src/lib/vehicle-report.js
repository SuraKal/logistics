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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildListSection = (title, items) => `
  <section>
    <h2>${escapeHtml(title)}</h2>
    ${
      items.length === 0
        ? "<p>No records found.</p>"
        : items
            .map(
              (item) => `
                <article class="card">
                  <h3>${escapeHtml(item.title)}</h3>
                  <ul>
                    ${item.lines
                      .map((line) => `<li>${escapeHtml(line)}</li>`)
                      .join("")}
                  </ul>
                </article>
              `,
            )
            .join("")
    }
  </section>
`;

const createReportMarkup = ({
  vehicle,
  schedules,
  components,
  sessions,
  serviceItemsBySession,
}) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Vehicle Report - ${escapeHtml(vehicle?.plate_number || "Vehicle")}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #1e293b;
        margin: 32px;
        line-height: 1.5;
      }
      h1, h2, h3 {
        margin: 0 0 12px;
      }
      h1 {
        font-size: 28px;
      }
      h2 {
        font-size: 20px;
        margin-top: 28px;
        padding-bottom: 6px;
        border-bottom: 1px solid #cbd5e1;
      }
      h3 {
        font-size: 16px;
      }
      p {
        margin: 6px 0;
      }
      ul {
        margin: 8px 0 0 18px;
        padding: 0;
      }
      .meta {
        color: #475569;
        margin-bottom: 8px;
      }
      .summary {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        margin-top: 20px;
      }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px 16px;
        margin: 12px 0;
        background: #ffffff;
      }
    </style>
  </head>
  <body>
    <h1>Vehicle Report</h1>
    <p class="meta">Generated: ${escapeHtml(new Date().toLocaleString())}</p>

    <section class="summary">
      <h2>Vehicle Summary</h2>
      <p><strong>Plate Number:</strong> ${escapeHtml(vehicle?.plate_number || "N/A")}</p>
      <p><strong>Vehicle:</strong> ${escapeHtml(
        `${vehicle?.year || "N/A"} ${vehicle?.make || ""} ${vehicle?.model || ""}`.trim(),
      )}</p>
      <p><strong>Type:</strong> ${escapeHtml(formatLabel(vehicle?.vehicle_type))}</p>
      <p><strong>Status:</strong> ${escapeHtml(formatLabel(vehicle?.status))}</p>
      <p><strong>Current Mileage:</strong> ${escapeHtml(formatNumber(vehicle?.current_mileage))} km</p>
    </section>

    ${buildListSection(
      `Maintenance Schedule (${schedules.length})`,
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
    )}

    ${buildListSection(
      `Components (${components.length})`,
      components.map((component) => ({
        title: `${formatLabel(component.component_type)} - ${component.brand || "Unknown brand"} ${component.name || ""}`.trim(),
        lines: [
          `Position: ${formatLabel(component.position)}`,
          `Serial Number: ${component.serial_number || "N/A"}`,
          `Health Status: ${formatLabel(component.health_status)}`,
          `Installed: ${component.install_date || "N/A"}`,
        ],
      })),
    )}

    ${buildListSection(
      `Service History (${sessions.length})`,
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
    )}
  </body>
</html>
`;

export const downloadVehicleReport = ({
  vehicle,
  schedules,
  components,
  sessions,
  serviceItemsBySession,
}) => {
  const safePlate =
    vehicle?.plate_number?.replace(/[^a-z0-9-]/gi, "_") || "vehicle";
  const markup = createReportMarkup({
    vehicle,
    schedules,
    components,
    sessions,
    serviceItemsBySession,
  });

  const blob = new Blob([markup], {
    type: "application/msword;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safePlate}-report.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
