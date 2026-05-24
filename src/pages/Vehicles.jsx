import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { Plus, Search, Truck, AlertTriangle } from "lucide-react";
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Vehicle Registry
          </h1>
          <p className="text-sm text-slate-500">
            {vehicles.length} vehicles in fleet
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Vehicle
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by plate, make, model..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => (
          <Link
            key={v.id}
            to={`/vehicles/${v.id}`}
            className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-slate-600" />
              </div>
              <StatusBadge status={v.status} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">
              {v.plate_number}
            </h3>
            <p className="text-slate-500 text-sm">
              {v.year} {v.make} {v.model}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
              <span>{v.current_mileage?.toLocaleString()} km</span>
              {maintenanceWarnings[v.id] > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  {maintenanceWarnings[v.id]} alert
                  {maintenanceWarnings[v.id] > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No vehicles found</p>
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              ["Plate Number", "plate_number", "text"],
              ["Make", "make", "text"],
              ["Model", "model", "text"],
              ["Year", "year", "number"],
              ["Current Mileage (km)", "current_mileage", "number"],
            ].map(([label, key, type]) => (
              <div key={key}>
                <Label className="text-xs text-slate-500">{label}</Label>
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
              <Label className="text-xs text-slate-500">Type</Label>
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
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleAdd}
            >
              Add Vehicle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
