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
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { format } from "date-fns";

function StatCard({ icon: Icon, label, value, color, link }) {
  const content = (
    <div
      className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow`}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Fleet Overview</h1>
        <p className="text-slate-500 text-sm">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Truck}
          label="Total Vehicles"
          value={vehicles.length}
          color="bg-slate-700"
          link="/vehicles"
        />
        <StatCard
          icon={Navigation}
          label="Active Trips"
          value={activeTrips.length}
          color="bg-violet-500"
          link="/trips"
        />
        <StatCard
          icon={Wrench}
          label="Open Sessions"
          value={sessions.length}
          color="bg-amber-500"
          link="/garage-sessions"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue Services"
          value={overdueItems.length}
          color="bg-red-500"
          link="/vehicles"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Maintenance */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Overdue
              Maintenance
            </h2>
            <Link
              to="/vehicles"
              className="text-xs text-amber-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {overdueItems.length === 0 ? (
              <p className="px-5 py-8 text-center text-slate-400 text-sm">
                All vehicles up to date
              </p>
            ) : (
              overdueItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Vehicle ID: {item.vehicle_id?.slice(0, 8)}...
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> Recent Activity
            </h2>
            <Link
              to="/notifications"
              className="text-xs text-amber-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <p className="px-5 py-8 text-center text-slate-400 text-sm">
                No recent activity
              </p>
            ) : (
              notifications.slice(0, 6).map((n) => (
                <div key={n.id} className="px-5 py-3 flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.severity === "critical" ? "bg-red-500" : n.severity === "warning" ? "bg-amber-500" : "bg-blue-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Trips */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-violet-500" /> Active Trips
            </h2>
            <Link
              to="/trips"
              className="text-xs text-amber-600 hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {activeTrips.length === 0 ? (
              <p className="px-5 py-8 text-center text-slate-400 text-sm">
                No active trips
              </p>
            ) : (
              activeTrips.slice(0, 5).map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trips/${trip.id}`}
                  className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 block"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {trip.origin} → {trip.destination}
                    </p>
                    <p className="text-xs text-slate-400">{trip.driver_name}</p>
                  </div>
                  <StatusBadge status={trip.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Handover Mismatches */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Handover
              Mismatches
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {handoverMismatches.length === 0 ? (
              <p className="px-5 py-8 text-center text-slate-400 text-sm">
                No unresolved mismatches
              </p>
            ) : (
              handoverMismatches.slice(0, 5).map((h) => (
                <Link
                  key={h.id}
                  to={`/trips/${h.trip_id}`}
                  className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 block"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {h.driver_name}
                    </p>
                    <p className="text-xs text-red-500">
                      {h.mismatch_details || "Tire serial mismatch"}
                    </p>
                  </div>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    Review
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
