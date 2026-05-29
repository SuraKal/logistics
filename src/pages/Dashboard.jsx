import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Navigation,
  Plus,
  Search,
  Truck,
  Wrench,
} from "lucide-react";
import { appClient } from "@/lib/local-client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import { getRoleLabel } from "@/lib/role-access";
import { getSectionImage } from "@/lib/section-images";
import { makePreviewDataUrl } from "@/lib/media";

function StatCard({ icon: Icon, label, value, tone, link, imageKey, note }) {
  const image = imageKey ? getSectionImage(imageKey) : null;

  const content = (
    <div className="subtle-panel group h-full overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_-36px_rgba(37,99,235,0.28)]">
      {image && (
        <div className="relative h-32 overflow-hidden bg-slate-100">
          <img
            src={image.src}
            alt={image.alt}
            onError={(event) => {
              event.currentTarget.src = makePreviewDataUrl({
                title: image.title,
                subtitle: image.subtitle,
                seed: imageKey,
              });
            }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-white">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Logistics view
              </p>
              <p className="mt-1 text-sm font-semibold">{label}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/80 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      )}
      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
          {!image && (
            <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
          )}
        </div>
        <p className="text-3xl font-bold text-slate-950">{value}</p>
        <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
        {note && <p className="mt-3 text-xs leading-5 text-slate-400">{note}</p>}
      </div>
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

function SectionCard({ icon: Icon, title, accent, actionLabel = null, actionTo = null, children }) {
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

const today = new Date().toISOString().split("T")[0];
const mileagePeriods = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "other", label: "Other" },
];

export default function Dashboard() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || "admin";

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [mileageReports, setMileageReports] = useState([]);
  const [tripIssues, setTripIssues] = useState([]);
  const [mileageForm, setMileageForm] = useState({
    km_traveled: "",
    period_type: "daily",
  });
  const [savingMileage, setSavingMileage] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      appClient.entities.Vehicle.list(),
      appClient.entities.Driver.list(),
      appClient.entities.Trip.list("-created_date"),
      appClient.entities.ServiceSession.list("-created_date"),
      appClient.entities.Notification.list("-created_date", 20),
      appClient.entities.MileageReport.list("-created_date"),
      appClient.entities.TripIssue.list("-created_date"),
    ])
      .then(([v, d, t, s, n, m, i]) => {
        setVehicles(v);
        setDrivers(d);
        setTrips(t);
        setSessions(s);
        setNotifications(n);
        setMileageReports(m);
        setTripIssues(i);
      })
      .catch(() => {});
  }, []);

  const driverRecord = useMemo(
    () => drivers.find((driver) => driver.id === currentUser?.driver_id) || null,
    [currentUser?.driver_id, drivers],
  );

  const myGarageJobs =
    role === "driver" && driverRecord
      ? sessions.filter((session) => session.vehicle_id === driverRecord.assigned_vehicle_id)
      : [];

  const myTrips =
    role === "driver" && driverRecord
      ? trips.filter(
          (trip) => trip.driver_id === driverRecord.id || trip.driver_name === driverRecord.name,
        )
      : [];

  const myIssues =
    role === "driver" && driverRecord
      ? tripIssues.filter((issue) => issue.driver_id === driverRecord.id)
      : [];

  const myMileageReports =
    role === "driver" && driverRecord
      ? mileageReports.filter((report) => report.driver_id === driverRecord.id)
      : [];

  const vehicleTotals = useMemo(() => {
    const totals = new Map();
    mileageReports.forEach((report) => {
      const key = report.vehicle_id;
      const current = totals.get(key) || 0;
      totals.set(key, current + (Number(report.km_traveled) || 0));
    });
    return [...totals.entries()]
      .map(([vehicleId, km]) => ({ vehicle: vehicles.find((item) => item.id === vehicleId), km }))
      .sort((left, right) => right.km - left.km);
  }, [mileageReports, vehicles]);

  const openTrips = trips.filter((trip) => ["confirmed", "departed"].includes(trip.status));
  const openJobs = sessions.filter((session) => session.status === "open");
  const openIssues = tripIssues.filter((issue) => issue.status === "open");
  const roleCopy = {
    admin: {
      title: "Admin view",
      text: "You can see all loads, repairs, and fleet activity.",
    },
    driver: {
      title: "Driver view",
      text: "See your trips, garage jobs, issues, and KM reports.",
    },
    dispatcher: {
      title: "Dispatcher view",
      text: "Add client loads and assign trucks and drivers.",
    },
    main_mechanic: {
      title: "Main mechanic view",
      text: "Open garage jobs, log parts, and keep repairs moving.",
    },
  };

  const handleMileageSave = async () => {
    if (!driverRecord) return;
    setSavingMileage(true);
    try {
      await appClient.entities.MileageReport.create({
        ...mileageForm,
        driver_id: driverRecord.id,
        driver_name: driverRecord.name,
        vehicle_id: driverRecord.assigned_vehicle_id || "",
        km_traveled: Number(mileageForm.km_traveled) || 0,
        period_type: mileageForm.period_type,
        start_date: today,
        end_date: today,
        notes: "",
      });
      setMileageForm({
        km_traveled: "",
        period_type: "daily",
      });
      const nextMileageReports = await appClient.entities.MileageReport.list("-created_date");
      setMileageReports(nextMileageReports);
    } finally {
      setSavingMileage(false);
    }
  };

  const filteredNotifications = notifications.filter((notif) =>
    search
      ? `${notif.title} ${notif.message}`.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="page-shell">
      <div className="glass-panel overflow-hidden">
        <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.4fr_0.9fr] lg:px-8 lg:py-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              <SparklesIcon />
              {getRoleLabel(role)}
            </div>
            <h1 className="max-w-2xl text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              {roleCopy[role]?.title || "Work view"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              {roleCopy[role]?.text || "See only the work you need."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Vehicles
              </p>
              <p className="mt-4 text-4xl font-bold text-slate-950">{vehicles.length}</p>
              <p className="mt-2 text-sm text-slate-500">All trucks in the fleet</p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.85)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Open work
              </p>
              <p className="mt-4 text-4xl font-bold">
                {role === "driver"
                  ? myTrips.length + myIssues.length + myMileageReports.length
                  : openTrips.length + openJobs.length + openIssues.length}
              </p>
              <p className="mt-2 text-sm text-slate-300">Things that need attention</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/70 bg-white/45 px-6 py-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Truck}
              label="Vehicles"
              value={vehicles.length}
              tone="bg-slate-950 text-white"
              link={role === "admin" || role === "main_mechanic" ? "/vehicles" : null}
              imageKey="vehicles"
              note="Heavy trucks, trailers, and service status."
            />
            <StatCard
              icon={Navigation}
              label={role === "driver" ? "My trips" : "Open trips"}
              value={role === "driver" ? myTrips.length : openTrips.length}
              tone="bg-blue-50 text-blue-700"
              link="/trips"
              imageKey="trips"
              note="Client loads moving across the route map."
            />
            <StatCard
              icon={Wrench}
              label={role === "driver" ? "My garage jobs" : "Open jobs"}
              value={role === "driver" ? myGarageJobs.length : openJobs.length}
              tone="bg-amber-50 text-amber-700"
              link={role === "driver" ? null : "/garage-sessions"}
              imageKey="garage"
              note="Truck repairs, parts, and job notes."
            />
            <StatCard
              icon={AlertTriangle}
              label="Open issues"
              value={openIssues.length}
              tone="bg-red-50 text-red-700"
              link="/trips"
              imageKey="dashboard"
              note="Alerts that need action before the next run."
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {role === "driver" && driverRecord && (
          <SectionCard
            icon={Plus}
            title="Send KM report"
            accent="bg-emerald-50 text-emerald-700"
          >
            <div className="space-y-4 p-5">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Interval
                </Label>
                <Select
                  value={mileageForm.period_type}
                  onValueChange={(value) =>
                    setMileageForm((current) => ({ ...current, period_type: value }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pick an interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {mileagePeriods.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  KM traveled
                </p>
                <Input
                  type="number"
                  value={mileageForm.km_traveled}
                  onChange={(event) =>
                    setMileageForm((current) => ({
                      ...current,
                      km_traveled: event.target.value,
                    }))
                  }
                  className="mt-2"
                />
              </div>
              <Button onClick={handleMileageSave} disabled={savingMileage}>
                {savingMileage ? "Saving..." : "Save report"}
              </Button>
            </div>
          </SectionCard>
        )}

        {role === "driver" && (
          <SectionCard
            icon={AlertTriangle}
            title="My issues"
            accent="bg-red-50 text-red-700"
            actionLabel="Trips"
            actionTo="/trips"
          >
            {myIssues.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No issues yet.</p>
            ) : (
              myIssues.slice(0, 5).map((issue) => (
                <div key={issue.id} className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">{issue.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{issue.details}</p>
                </div>
              ))
            )}
          </SectionCard>
        )}

        {role === "driver" && (
          <SectionCard
            icon={Navigation}
            title="My KM reports"
            accent="bg-emerald-50 text-emerald-700"
          >
            {myMileageReports.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No KM reports yet.</p>
            ) : (
              myMileageReports.slice(0, 5).map((report) => (
                <div key={report.id} className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {report.km_traveled?.toLocaleString()} km
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {report.period_type} - {report.start_date} to {report.end_date}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Added on{" "}
                    {report.created_date
                      ? new Date(report.created_date).toLocaleDateString()
                      : "Today"}
                  </p>
                </div>
              ))
            )}
          </SectionCard>
        )}

        {role === "driver" && (
          <SectionCard
            icon={Wrench}
            title="My garage jobs"
            accent="bg-orange-50 text-orange-700"
          >
            {myGarageJobs.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">
                No garage jobs for your truck yet.
              </p>
            ) : (
              myGarageJobs.slice(0, 5).map((session) => (
                <div key={session.id} className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">{session.garage_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {session.date} - {session.status?.replace(/_/g, " ") || "open"}
                  </p>
                  {session.notes && (
                    <p className="mt-1 text-xs leading-5 text-slate-400">{session.notes}</p>
                  )}
                </div>
              ))
            )}
          </SectionCard>
        )}

        {role === "admin" && (
          <SectionCard
            icon={Search}
            title="Recent alerts"
            accent="bg-sky-50 text-sky-700"
            actionLabel="Alerts"
            actionTo="/notifications"
          >
            <div className="space-y-2 p-5">
              <Input
                placeholder="Search alerts"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {filteredNotifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No alerts found.</p>
              ) : (
                filteredNotifications.slice(0, 5).map((notif) => (
                  <div key={notif.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{notif.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard
          icon={Navigation}
          title={role === "driver" ? "My trips" : "Recent trips"}
          accent="bg-violet-50 text-violet-700"
          actionLabel="Trips"
          actionTo="/trips"
        >
          {role === "driver" ? (
            myTrips.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No trips yet.</p>
            ) : (
              myTrips.slice(0, 5).map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trips/${trip.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50/90"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {trip.origin} - {trip.destination}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{trip.departure_datetime}</p>
                  </div>
                  <StatusBadge status={trip.status} />
                </Link>
              ))
            )
          ) : trips.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">No trips yet.</p>
          ) : (
            trips.slice(0, 5).map((trip) => (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50/90"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {trip.origin} - {trip.destination}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{trip.driver_name}</p>
                </div>
                <StatusBadge status={trip.status} />
              </Link>
            ))
          )}
        </SectionCard>

        {role !== "driver" && (
          <SectionCard
            icon={Wrench}
            title="Garage jobs"
            accent="bg-orange-50 text-orange-700"
            actionLabel="Garage"
            actionTo="/garage-sessions"
          >
            {openJobs.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No open jobs.</p>
            ) : (
              openJobs.slice(0, 5).map((session) => (
                <Link
                  key={session.id}
                  to={`/garage-sessions/${session.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50/90"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {session.garage_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{session.date}</p>
                  </div>
                  <StatusBadge status={session.status} />
                </Link>
              ))
            )}
          </SectionCard>
        )}

        {(role === "admin" || role === "main_mechanic") && (
          <SectionCard
            icon={Truck}
            title="Vehicle KM"
            accent="bg-slate-50 text-slate-700"
          >
            {vehicleTotals.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No KM reports yet.</p>
            ) : (
              vehicleTotals.slice(0, 5).map(({ vehicle, km }) => (
                <div key={vehicle?.id || km} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {vehicle?.plate_number || "Unknown vehicle"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {vehicle?.make} {vehicle?.model}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{km.toLocaleString()} km</p>
                </div>
              ))
            )}
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function SparklesIcon() {
  return <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />;
}
