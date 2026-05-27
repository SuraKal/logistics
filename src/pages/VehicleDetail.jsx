import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Download, Plus, Truck, Gauge, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "../components/StatusBadge";
import { format, addDays, addMonths, addWeeks } from "date-fns";
import { downloadVehicleReport } from "@/lib/vehicle-report";

function EmptyState({ children }) {
  return (
    <div className="subtle-panel px-5 py-10 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

export default function VehicleDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const role = currentUser?.role || "driver";
  const canEdit = ["admin", "garage_person"].includes(role);

  const [vehicle, setVehicle] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [components, setComponents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSchedDlg, setShowSchedDlg] = useState(false);
  const [showCompDlg, setShowCompDlg] = useState(false);
  const [schedForm, setSchedForm] = useState({
    name: "",
    interval_type: "km",
    interval_value: "",
    interval_unit: "months",
    last_done_date: "",
    last_done_mileage: "",
  });
  const [compForm, setCompForm] = useState({
    component_type: "tire",
    name: "",
    serial_number: "",
    position: "front-left",
    brand: "",
    health_status: "good",
    install_date: "",
  });

  const load = async () => {
    const [v, s, c, sess] = await Promise.all([
      appClient.entities.Vehicle.get(id),
      appClient.entities.MaintenanceSchedule.filter({ vehicle_id: id }),
      appClient.entities.VehicleComponent.filter({
        vehicle_id: id,
        is_active: true,
      }),
      appClient.entities.ServiceSession.filter({ vehicle_id: id }),
    ]);
    setVehicle(v);
    setSchedules(s);
    setComponents(c);
    setSessions(
      sess.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    );
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const calcNextDue = (form) => {
    const updates = {};
    if (
      form.interval_type === "km" &&
      form.last_done_mileage &&
      form.interval_value
    ) {
      updates.next_due_mileage = +form.last_done_mileage + +form.interval_value;
    }
    if (
      form.interval_type === "time" &&
      form.last_done_date &&
      form.interval_value
    ) {
      const base = new Date(form.last_done_date);
      const next =
        form.interval_unit === "days"
          ? addDays(base, +form.interval_value)
          : form.interval_unit === "weeks"
            ? addWeeks(base, +form.interval_value)
            : addMonths(base, +form.interval_value);
      updates.next_due_date = format(next, "yyyy-MM-dd");
    }
    return updates;
  };

  const checkStatus = (sched, currentMileage) => {
    if (sched.interval_type === "km" && sched.next_due_mileage) {
      const diff = sched.next_due_mileage - (currentMileage || 0);
      if (diff <= 0) return "overdue";
      if (diff <= 500) return "due_soon";
    }
    if (sched.interval_type === "time" && sched.next_due_date) {
      const diff =
        (new Date(sched.next_due_date).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24);
      if (diff <= 0) return "overdue";
      if (diff <= 7) return "due_soon";
    }
    return "ok";
  };

  const addSchedule = async () => {
    const nextDue = calcNextDue(schedForm);
    const status = checkStatus(
      { ...schedForm, ...nextDue },
      vehicle?.current_mileage,
    );
    await appClient.entities.MaintenanceSchedule.create({
      ...schedForm,
      ...nextDue,
      vehicle_id: id,
      status,
    });
    if (status !== "ok") {
      await appClient.entities.Notification.create({
        type: "maintenance",
        title: `Maintenance ${status === "overdue" ? "Overdue" : "Due Soon"}`,
        message: `${schedForm.name} on vehicle ${vehicle?.plate_number} is ${status.replace("_", " ")}.`,
        severity: status === "overdue" ? "critical" : "warning",
        is_read: false,
        recipient_roles: "admin,fleet_manager",
        vehicle_plate: vehicle?.plate_number,
      });
    }
    setShowSchedDlg(false);
    setSchedForm({
      name: "",
      interval_type: "km",
      interval_value: "",
      interval_unit: "months",
      last_done_date: "",
      last_done_mileage: "",
    });
    load();
  };

  const addComponent = async () => {
    await appClient.entities.VehicleComponent.create({
      ...compForm,
      vehicle_id: id,
    });
    setShowCompDlg(false);
    setCompForm({
      component_type: "tire",
      name: "",
      serial_number: "",
      position: "front-left",
      brand: "",
      health_status: "good",
      install_date: "",
    });
    load();
  };

  const handleDownloadReport = async () => {
    if (!vehicle) return;

    setIsDownloading(true);

    try {
      const serviceItemsBySessionEntries = await Promise.all(
        sessions.map(async (session) => [
          session.id,
          await appClient.entities.ServiceItem.filter({ session_id: session.id }),
        ]),
      );

      downloadVehicleReport({
        vehicle,
        schedules,
        components,
        sessions,
        serviceItemsBySession: Object.fromEntries(serviceItemsBySessionEntries),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!vehicle) {
    return <div className="page-shell text-center text-slate-400">Loading...</div>;
  }

  return (
    <div className="page-shell">
      <Link
        to="/vehicles"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Vehicles
      </Link>

      <div className="glass-panel overflow-hidden">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.35fr_0.95fr] lg:px-8 lg:py-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.75)]">
                <Truck className="h-5 w-5" />
              </div>
              <StatusBadge status={vehicle.status} />
            </div>
            <h1 className="text-3xl font-bold text-slate-950">
              {vehicle.plate_number}
            </h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              {vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.vehicle_type}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Gauge className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                    Mileage
                  </span>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {vehicle.current_mileage?.toLocaleString()} km
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarClock className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                    Service records
                  </span>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {sessions.length}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                Asset profile
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Download the latest report or update maintenance and components
                without leaving the vehicle workspace.
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11 w-full justify-center"
              onClick={handleDownloadReport}
              disabled={isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Preparing..." : "Download Report"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="maintenance" className="mt-6">
        <TabsList className="mb-5 flex w-full flex-wrap justify-start gap-2 overflow-x-auto whitespace-nowrap p-1.5">
          <TabsTrigger value="maintenance">Maintenance Schedule</TabsTrigger>
          <TabsTrigger value="components">Components / Tires</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Maintenance Schedule
            </h2>
            {canEdit && (
              <Button size="sm" onClick={() => setShowSchedDlg(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {schedules.length === 0 ? (
              <EmptyState>No maintenance items configured.</EmptyState>
            ) : (
              schedules.map((s) => (
                <div
                  key={s.id}
                  className="subtle-panel flex items-center justify-between gap-4 p-5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Every {s.interval_value}{" "}
                      {s.interval_type === "km" ? "km" : s.interval_unit}
                      {s.next_due_date && ` • Due: ${s.next_due_date}`}
                      {s.next_due_mileage &&
                        ` • Due at: ${s.next_due_mileage?.toLocaleString()} km`}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="components">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Components / Tires</h2>
            {canEdit && (
              <Button size="sm" onClick={() => setShowCompDlg(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {components.length === 0 ? (
              <div className="md:col-span-2">
                <EmptyState>No components recorded.</EmptyState>
              </div>
            ) : (
              components.map((c) => (
                <div key={c.id} className="subtle-panel p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {c.component_type} • {c.position}
                    </span>
                    <StatusBadge status={c.health_status} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {c.brand} {c.name}
                  </p>
                  <p className="mt-2 font-mono text-xs text-slate-500">
                    S/N: {c.serial_number}
                  </p>
                  {c.install_date && (
                    <p className="mt-1 text-xs text-slate-500">
                      Installed: {c.install_date}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Service History</h2>
          </div>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <EmptyState>No service history.</EmptyState>
            ) : (
              sessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/garage-sessions/${s.id}`}
                  className="subtle-panel flex items-center justify-between gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {s.garage_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {s.date} • {s.mechanic_name} •{" "}
                      {s.odometer_at_entry?.toLocaleString()} km
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </Link>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showSchedDlg} onOpenChange={setShowSchedDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Maintenance Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Service Name
              </Label>
              <Input
                value={schedForm.name}
                onChange={(e) =>
                  setSchedForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Interval Type
              </Label>
              <Select
                value={schedForm.interval_type}
                onValueChange={(v) =>
                  setSchedForm((f) => ({ ...f, interval_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">Distance (km)</SelectItem>
                  <SelectItem value="time">Time-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Interval Value
              </Label>
              <Input
                type="number"
                value={schedForm.interval_value}
                onChange={(e) =>
                  setSchedForm((f) => ({
                    ...f,
                    interval_value: e.target.value,
                  }))
                }
              />
            </div>
            {schedForm.interval_type === "time" && (
              <div>
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Time Unit
                </Label>
                <Select
                  value={schedForm.interval_unit}
                  onValueChange={(v) =>
                    setSchedForm((f) => ({ ...f, interval_unit: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["days", "weeks", "months"].map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Last Done Date
              </Label>
              <Input
                type="date"
                value={schedForm.last_done_date}
                onChange={(e) =>
                  setSchedForm((f) => ({
                    ...f,
                    last_done_date: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Last Done Mileage (km)
              </Label>
              <Input
                type="number"
                value={schedForm.last_done_mileage}
                onChange={(e) =>
                  setSchedForm((f) => ({
                    ...f,
                    last_done_mileage: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowSchedDlg(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={addSchedule}>
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompDlg} onOpenChange={setShowCompDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Component / Tire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Component Type
              </Label>
              <Select
                value={compForm.component_type}
                onValueChange={(v) =>
                  setCompForm((f) => ({ ...f, component_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "tire",
                    "battery",
                    "brake_pad",
                    "filter",
                    "belt",
                    "other",
                  ].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {["name", "serial_number", "brand"].map((k) => (
              <div key={k}>
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {k.replace("_", " ")}
                </Label>
                <Input
                  value={compForm[k]}
                  onChange={(e) =>
                    setCompForm((f) => ({ ...f, [k]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Position
              </Label>
              <Select
                value={compForm.position}
                onValueChange={(v) =>
                  setCompForm((f) => ({ ...f, position: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "front-left",
                    "front-right",
                    "rear-left",
                    "rear-right",
                    "spare",
                    "n/a",
                  ].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Health Status
              </Label>
              <Select
                value={compForm.health_status}
                onValueChange={(v) =>
                  setCompForm((f) => ({ ...f, health_status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["good", "worn", "needs_replacement"].map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Install Date
              </Label>
              <Input
                type="date"
                value={compForm.install_date}
                onChange={(e) =>
                  setCompForm((f) => ({ ...f, install_date: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCompDlg(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={addComponent}>
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
