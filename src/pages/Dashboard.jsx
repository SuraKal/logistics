import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import {
  Truck,
  Navigation,
  Wrench,
  AlertTriangle,
  Bell,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";

function StatCard({ icon: Icon, label, value, tone, link }) {
  const content = (
    <div className="subtle-panel group h-full p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_-36px_rgba(37,99,235,0.28)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </div>
      <p className="text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

function SectionCard({
  icon: Icon,
  title,
  accent,
  actionLabel = null,
  actionTo = null,
  children,
}) {
  return (
    <div className="subtle-panel overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accent}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        {actionLabel && actionTo && (
          <Link
            to={actionTo}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            {actionLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="divide-y divide-slate-100/80">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [handoverMismatches, setHandoverMismatches] = useState([]);

  useEffect(() => {
    Promise.all([
      appClient.entities.Vehicle.list(),
      appClient.entities.Trip.filter({ status: ["departed", "confirmed"] }),
      appClient.entities.ServiceSession.filter({ status: "open" }),
      appClient.entities.MaintenanceSchedule.filter({
        status: ["overdue", "due_soon"],
      }),
      appClient.entities.Notification.list("-created_date", 20),
      appClient.entities.HandoverCheck.filter({ mismatches_flagged: true }),
    ])
      .then(([v, t, s, m, n, h]) => {
        setVehicles(v);
        setTrips(t);
        setSessions(s);
        setMaintenance(m);
        setNotifications(n);
        setHandoverMismatches(h);
      })
      .catch(() => {});
  }, []);

  const overdueItems = maintenance.filter((m) => m.status === "overdue");
  const activeTrips = trips.filter(
    (t) => t.status === "departed" || t.status === "confirmed",
  );

  return (
    <div className="page-shell">
      <div className="glass-panel overflow-hidden">
        <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.4fr_0.9fr] lg:px-8 lg:py-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              <Sparkles className="h-3.5 w-3.5" />
              Operations overview
            </div>
            <h1 className="max-w-2xl text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              A cleaner command surface for fleet, garage, and dispatch teams.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              All in one system to manage your 
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Fleet readiness
              </p>
              <p className="mt-4 text-4xl font-bold text-slate-950">
                {vehicles.length}
              </p>
              <p className="mt-2 text-sm text-slate-500">Vehicles actively tracked</p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.85)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Critical focus
              </p>
              <p className="mt-4 text-4xl font-bold">
                {overdueItems.length + handoverMismatches.length}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Items needing leadership attention
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/70 bg-white/45 px-6 py-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Truck}
              label="Total Vehicles"
              value={vehicles.length}
              tone="bg-slate-950 text-white"
              link="/vehicles"
            />
            <StatCard
              icon={Navigation}
              label="Active Trips"
              value={activeTrips.length}
              tone="bg-blue-50 text-blue-700"
              link="/trips"
            />
            <StatCard
              icon={Wrench}
              label="Open Sessions"
              value={sessions.length}
              tone="bg-amber-50 text-amber-700"
              link="/garage-sessions"
            />
            <StatCard
              icon={AlertTriangle}
              label="Overdue Services"
              value={overdueItems.length}
              tone="bg-red-50 text-red-700"
              link="/vehicles"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          icon={AlertTriangle}
          title="Overdue Maintenance"
          accent="bg-red-50 text-red-600"
          actionLabel="View all"
          actionTo="/vehicles"
        >
          {overdueItems.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              All vehicles are currently on schedule.
            </p>
          ) : (
            overdueItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Vehicle ID: {item.vehicle_id?.slice(0, 8)}...
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          icon={Bell}
          title="Recent Activity"
          accent="bg-sky-50 text-sky-700"
          actionLabel="View all"
          actionTo="/notifications"
        >
          {notifications.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              No recent activity.
            </p>
          ) : (
            notifications.slice(0, 6).map((n) => (
              <div key={n.id} className="flex items-start gap-4 px-5 py-4">
                <div
                  className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${n.severity === "critical" ? "bg-red-500" : n.severity === "warning" ? "bg-amber-500" : "bg-blue-500"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {n.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {n.message}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
                )}
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          icon={Navigation}
          title="Active Trips"
          accent="bg-violet-50 text-violet-700"
          actionLabel="Manage"
          actionTo="/trips"
        >
          {activeTrips.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              No active trips right now.
            </p>
          ) : (
            activeTrips.slice(0, 5).map((trip) => (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50/90"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {trip.origin} {"->"} {trip.destination}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{trip.driver_name}</p>
                </div>
                <StatusBadge status={trip.status} />
              </Link>
            ))
          )}
        </SectionCard>

        <SectionCard
          icon={AlertTriangle}
          title="Handover Mismatches"
          accent="bg-orange-50 text-orange-700"
        >
          {handoverMismatches.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              No unresolved handover mismatches.
            </p>
          ) : (
            handoverMismatches.slice(0, 5).map((h) => (
              <Link
                key={h.id}
                to={`/trips/${h.trip_id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50/90"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {h.driver_name}
                  </p>
                  <p className="mt-1 truncate text-xs text-red-500">
                    {h.mismatch_details || "Tire serial mismatch"}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600">
                  Review
                </span>
              </Link>
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}
