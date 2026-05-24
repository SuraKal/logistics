import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Download, Plus } from "lucide-react";
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
    setSessions(sess.sort((a, b) => new Date(b.date) - new Date(a.date)));
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
          await appClient.entities.ServiceItem.filter({
            session_id: session.id,
          }),
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

  if (!vehicle)
    return (
      <div className="p-4 sm:p-6 text-center text-slate-400">Loading...</div>
    );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        to="/vehicles"
        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Vehicles
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 break-words">
              {vehicle.plate_number}
            </h1>
            <p className="text-slate-500">
              {vehicle.year} {vehicle.make} {vehicle.model} •{" "}
              {vehicle.vehicle_type}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {vehicle.current_mileage?.toLocaleString()} km
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={handleDownloadReport}
              disabled={isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Preparing..." : "Download"}
            </Button>

            <StatusBadge status={vehicle.status} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="maintenance">
        <TabsList className="mb-4 flex w-full overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="maintenance" className="flex-shrink-0">
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="components" className="flex-shrink-0">
            Components
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-shrink-0">
            History
          </TabsTrigger>
        </TabsList>

        {/* Maintenance */}
        <TabsContent value="maintenance">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-slate-700">
              Maintenance Schedule
            </h2>

            {canEdit && (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => setShowSchedDlg(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {schedules.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">
                No maintenance items configured
              </p>
            ) : (
              schedules.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-lg border border-slate-100 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-700">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      Every {s.interval_value}{" "}
                      {s.interval_type === "km" ? "km" : s.interval_unit}
                      {s.next_due_date && ` • Due: ${s.next_due_date}`}
                      {s.next_due_mileage &&
                        ` • ${s.next_due_mileage.toLocaleString()} km`}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Components */}
        <TabsContent value="components">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-slate-700">Components / Tires</h2>

            {canEdit && (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => setShowCompDlg(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {components.length === 0 ? (
              <p className="col-span-2 text-center py-8 text-slate-400 text-sm">
                No components recorded
              </p>
            ) : (
              components.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-lg border border-slate-100 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      {c.component_type} • {c.position}
                    </span>
                    <StatusBadge status={c.health_status} />
                  </div>

                  <p className="font-medium text-slate-700">
                    {c.brand} {c.name}
                  </p>

                  <p className="text-xs text-slate-400 font-mono mt-1">
                    S/N: {c.serial_number}
                  </p>

                  {c.install_date && (
                    <p className="text-xs text-slate-400">
                      Installed: {c.install_date}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <h2 className="font-semibold text-slate-700 mb-3">Service History</h2>

          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">
                No service history
              </p>
            ) : (
              sessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/garage-sessions/${s.id}`}
                  className="bg-white rounded-lg border border-slate-100 p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                >
                  <div>
                    <p className="font-medium text-slate-700">
                      {s.garage_name}
                    </p>
                    <p className="text-xs text-slate-400">
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

      {/* ================= Dialogs (UNCHANGED) ================= */}

      {/* Add Schedule Dialog */}
      <Dialog open={showSchedDlg} onOpenChange={setShowSchedDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Maintenance Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Service Name</Label>
              <Input
                value={schedForm.name}
                onChange={(e) =>
                  setSchedForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Label className="text-xs">Interval Type</Label>
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
              <Label className="text-xs">Interval Value</Label>
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
                <Label className="text-xs">Time Unit</Label>
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
              <Label className="text-xs">Last Done Date</Label>
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
              <Label className="text-xs">Last Done Mileage</Label>
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
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={addSchedule}
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Component Dialog */}
      <Dialog open={showCompDlg} onOpenChange={setShowCompDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Component / Tire</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Component Type</Label>
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
                <Label className="text-xs capitalize">
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
              <Label className="text-xs">Position</Label>
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
              <Label className="text-xs">Health Status</Label>
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
              <Label className="text-xs">Install Date</Label>
              <Input
                type="date"
                value={compForm.install_date}
                onChange={(e) =>
                  setCompForm((f) => ({
                    ...f,
                    install_date: e.target.value,
                  }))
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
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={addComponent}
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
