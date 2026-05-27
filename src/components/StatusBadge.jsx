export default function StatusBadge({ status, type = "default" }) {
  const configs = {
    // Vehicle status
    active: "bg-emerald-100 text-emerald-700",
    in_garage: "bg-amber-100 text-amber-700",
    inactive: "bg-slate-100 text-slate-500",
    // Maintenance
    ok: "bg-emerald-100 text-emerald-700",
    due_soon: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700",
    // Trip
    draft: "bg-slate-100 text-slate-600",
    confirmed: "bg-blue-100 text-blue-700",
    departed: "bg-violet-100 text-violet-700",
    arrived: "bg-emerald-100 text-emerald-700",
    closed: "bg-slate-100 text-slate-500",
    // Session
    open: "bg-amber-100 text-amber-700",
    // Health
    good: "bg-emerald-100 text-emerald-700",
    worn: "bg-amber-100 text-amber-700",
    needs_replacement: "bg-red-100 text-red-700",
    // Priority
    low: "bg-slate-100 text-slate-600",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-amber-100 text-amber-700",
    urgent: "bg-red-100 text-red-700",
    // Severity
    info: "bg-blue-100 text-blue-700",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
    // Recommendation
    pending: "bg-amber-100 text-amber-700",
    acknowledged: "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    // Driver
    on_trip: "bg-violet-100 text-violet-700",
  };

  const cls = configs[status] || "bg-slate-100 text-slate-600";
  const label = status?.replace(/_/g, " ") || "unknown";

  return (
    <span
      className={`inline-flex items-center rounded-full border border-white/70 px-2.5 py-1 text-[11px] font-semibold capitalize shadow-sm ${cls}`}
    >
      {label}
    </span>
  );
}
