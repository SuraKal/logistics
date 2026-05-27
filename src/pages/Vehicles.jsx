import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { Plus, Search, Truck, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    plate_number: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    vehicle_type: "truck",
    current_mileage: 0,
    status: "active",
  });
  const [maintenanceWarnings, setMaintenanceWarnings] = useState({});

  const load = async () => {
    const [veh, maint] = await Promise.all([
      appClient.entities.Vehicle.list(),
      appClient.entities.MaintenanceSchedule.filter({
        status: ["overdue", "due_soon"],
      }),
    ]);
    setVehicles(veh);
    const warnings = {};
    maint.forEach((m) => {
      if (!warnings[m.vehicle_id]) warnings[m.vehicle_id] = 0;
      warnings[m.vehicle_id]++;
    });
    setMaintenanceWarnings(warnings);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    await appClient.entities.Vehicle.create(form);
    await appClient.entities.Notification.create({
      type: "vehicle",
      title: "New Vehicle Added",
      message: `Vehicle ${form.plate_number} (${form.make} ${form.model}) added to fleet.`,
      severity: "info",
      is_read: false,
      recipient_roles: "admin,fleet_manager",
      vehicle_plate: form.plate_number,
    });
    setShowAdd(false);
    setForm({
      plate_number: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      vehicle_type: "truck",
      current_mileage: 0,
      status: "active",
    });
    load();
  };

  const filtered = vehicles.filter(
    (v) =>
      v.plate_number?.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-shell">
      <div className="glass-panel overflow-hidden">
        <div className="flex flex-col gap-6 px-6 py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                Registry
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Fleet assets at a glance
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-500">
                Explore vehicle readiness, service exposure, and maintenance alerts
                from a brighter, executive-friendly registry view.
              </p>
            </div>

            <Button onClick={() => setShowAdd(true)} className="h-11 px-5">
              <Plus className="mr-2 h-4 w-4" /> Add Vehicle
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by plate, make, or model..."
                className="pl-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Fleet size</p>
                <p className="text-sm font-semibold text-slate-900">
                  {vehicles.length} vehicles
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v) => (
          <Link
            key={v.id}
            to={`/vehicles/${v.id}`}
            className="subtle-panel group overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_-38px_rgba(15,23,42,0.3)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.75)]">
                <Truck className="h-5 w-5" />
              </div>
              <StatusBadge status={v.status} />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  {v.plate_number}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {v.year} {v.make} {v.model}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50/90 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Current mileage</span>
                <span className="font-semibold text-slate-900">
                  {v.current_mileage?.toLocaleString()} km
                </span>
              </div>
              {maintenanceWarnings[v.id] > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {maintenanceWarnings[v.id]} maintenance alert
                  {maintenanceWarnings[v.id] > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="subtle-panel col-span-full py-16 text-center">
            <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No vehicles found</p>
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              ["Plate Number", "plate_number", "text"],
              ["Make", "make", "text"],
              ["Model", "model", "text"],
              ["Year", "year", "number"],
              ["Current Mileage (km)", "current_mileage", "number"],
            ].map(([label, key, type]) => (
              <div key={key}>
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </Label>
                <Input
                  type={type}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [key]:
                        type === "number" ? +e.target.value : e.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Type
              </Label>
              <Select
                value={form.vehicle_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, vehicle_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["truck", "car", "van", "other"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAdd}>
              Add Vehicle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
