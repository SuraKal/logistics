import {
  downloadPdfReport,
  formatReportDate,
  formatReportDateTime,
} from "@/lib/report-downloads";

export const downloadVehicleReport = ({
  vehicle,
  schedules,
  components,
  sessions,
  serviceItemsBySession,
}) => {
  const safePlate =
    vehicle?.plate_number?.replace(/[^a-z0-9-]/gi, "_") || "vehicle";

  downloadPdfReport({
    title: "Vehicle report",
    subtitle: `Simple report for ${vehicle?.plate_number || "this vehicle"}.`,
    summaryLines: [
      `Plate: ${vehicle?.plate_number || "No plate"}`,
      `Vehicle: ${[vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "No vehicle"}`,
      `Type: ${vehicle?.vehicle_type || "No type"}`,
      `Status: ${vehicle?.status?.replace(/_/g, " ") || "No status"}`,
      `Mileage: ${vehicle?.current_mileage?.toLocaleString() || "0"} km`,
    ],
    sections: [
      {
        title: "Service plan",
        items: schedules.map((schedule) => ({
          title: schedule.name || "Unnamed service item",
          lines: [
            `Status: ${schedule.status?.replace(/_/g, " ") || "No status"}`,
            `Interval: ${schedule.interval_value || "No value"} ${
              schedule.interval_type === "km" ? "km" : schedule.interval_unit || "time"
            }`,
            `Last done: ${schedule.last_done_date || "No date"} / ${schedule.last_done_mileage || "0"} km`,
            `Next due: ${schedule.next_due_date || "No date"} / ${schedule.next_due_mileage || "0"} km`,
          ],
        })),
        emptyText: "No service plan items found.",
      },
      {
        title: "Parts",
        items: components.map((component) => ({
          title: `${component.brand || "Unknown"} ${component.name || "Part"}`.trim(),
          lines: [
            `Type: ${component.component_type || "No type"}`,
            `Position: ${component.position || "No position"}`,
            `Serial: ${component.serial_number || "No serial"}`,
            `Health: ${component.health_status || "No status"}`,
            `Installed: ${component.install_date || "No date"}`,
          ],
        })),
        emptyText: "No parts found.",
      },
      {
        title: "Service history",
        items: sessions.map((session) => {
          const serviceItems = serviceItemsBySession[session.id] || [];
          return {
            title: `${session.garage_name || "Unknown garage"} - ${formatReportDate(session.date)}`,
            lines: [
              `Status: ${session.status?.replace(/_/g, " ") || "No status"}`,
              `Mechanic: ${session.mechanic_name || "No name"}`,
              `Odometer: ${session.odometer_at_entry?.toLocaleString() || "0"} km`,
              `Closed: ${formatReportDateTime(session.closed_at)}`,
              `Work done: ${
                serviceItems.length > 0
                  ? serviceItems.map((item) => `${item.item_name} (${item.action})`).join(", ")
                  : "No work added"
              }`,
            ],
          };
        }),
        emptyText: "No service history found.",
      },
    ],
    filename: `${safePlate}-report.pdf`,
  });
};
