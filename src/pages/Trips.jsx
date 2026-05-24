import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { Plus, Navigation, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import StatusBadge from "../components/StatusBadge";

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [vehicleWarnings, setVehicleWarnings] = useState([]);
  const [form, setForm] = useState({
    vehicle_id: "",
    driver_name: "",
    origin: "",
    destination: "",
    departure_datetime: "",
    cargo_description: "",
    load_weight: "",
    dispatcher_notes: "",
  });

  const load = async () => {
    const [t, v, d] = await Promise.all([
      appClient.entities.Trip.list("-created_date"),
      appClient.entities.Vehicle.list(),
      appClient.entities.Driver.list(),
    ]);
    setTrips(t);
    setVehicles(v);
    setDrivers(d);
  };

  useEffect(() => {
    load();
  }, []);

  const checkVehicleWarnings = async (vehicleId) => {
    if (!vehicleId) return;
    const warnings = await appClient.entities.MaintenanceSchedule.filter({
      vehicle_id: vehicleId,
      status: ["overdue", "due_soon"],
    });
    setVehicleWarnings(warnings);
  };

  const vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v]));

  const handleCreate = async () => {
    const veh = vehicleMap[form.vehicle_id];
    const trip = await appClient.entities.Trip.create({
      ...form,
      status: "draft",
      has_vehicle_warnings: vehicleWarnings.length > 0,
    });
    await appClient.entities.Notification.create({
      type: "dispatch",
      title: "New Trip Created",
      message: `Trip from ${form.origin} to ${form.destination} created. Driver: ${form.driver_name}. Vehicle: ${veh?.plate_number}.`,
      severity: "info",
      is_read: false,
      recipient_roles: "admin,fleet_manager",
      vehicle_plate: veh?.plate_number,
      related_id: trip.id,
      related_type: "Trip",
    });
    setShowAdd(false);
    setForm({
      vehicle_id: "",
      driver_name: "",
      origin: "",
      destination: "",
      departure_datetime: "",
      cargo_description: "",
      load_weight: "",
      dispatcher_notes: "",
    });
    setVehicleWarnings([]);
    load();
  };

  const filtered = trips.filter(
    (t) =>
      !search ||
      t.origin?.toLowerCase().includes(search.toLowerCase()) ||
      t.destination?.toLowerCase().includes(search.toLowerCase()) ||
      t.driver_name?.toLowerCase().includes(search.toLowerCase()),
  );

  const statusOrder = {
    departed: 0,
    confirmed: 1,
    draft: 2,
    arrived: 3,
    closed: 4,
  };
  const sorted = [...filtered].sort(
    (a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5),
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dispatch Control
          </h1>
          <p className="text-sm text-slate-500">
            {
              trips.filter((t) => ["departed", "confirmed"].includes(t.status))
                .length
            }{" "}
            active trips
          </p>
        </div>
        <Button
          className="bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> New Trip
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by origin, destination, driver..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Navigation className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No trips found</p>
          </div>
        ) : (
          sorted.map((trip) => {
            const veh = vehicleMap[trip.vehicle_id];
            return (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {trip.origin} → {trip.destination}
                    </p>
                    <p className="text-sm text-slate-500">
                      Driver: {trip.driver_name} ·{" "}
                      {veh?.plate_number || "Vehicle"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {trip.departure_datetime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {trip.has_vehicle_warnings && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <StatusBadge status={trip.status} />
                </div>
              </Link>
            );
          })
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Vehicle</Label>
              <Select
                value={form.vehicle_id}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, vehicle_id: v }));
                  checkVehicleWarnings(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number} — {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {vehicleWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" /> Vehicle has{" "}
                  {vehicleWarnings.length} maintenance alert
                  {vehicleWarnings.length > 1 ? "s" : ""}
                </div>
                {vehicleWarnings.map((w) => (
                  <p key={w.id} className="text-xs text-amber-600">
                    • {w.name} —{" "}
                    <span className="capitalize">
                      {w.status.replace("_", " ")}
                    </span>
                  </p>
                ))}
              </div>
            )}
            <div>
              <Label className="text-xs">Driver Name</Label>
              <Input
                value={form.driver_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, driver_name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Origin</Label>
              <Input
                value={form.origin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, origin: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Destination</Label>
              <Input
                value={form.destination}
                onChange={(e) =>
                  setForm((f) => ({ ...f, destination: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Departure Date/Time</Label>
              <Input
                type="datetime-local"
                value={form.departure_datetime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departure_datetime: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Cargo Description</Label>
              <Textarea
                value={form.cargo_description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cargo_description: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Load Weight</Label>
              <Input
                value={form.load_weight}
                onChange={(e) =>
                  setForm((f) => ({ ...f, load_weight: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleCreate}
            >
              Create Trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
