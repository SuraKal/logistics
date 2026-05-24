import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { Plus, Wrench, Search } from "lucide-react";
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
import StatusBadge from "../components/StatusBadge";

export default function GarageSessions() {
  const [sessions, setSessions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "",
    date: new Date().toISOString().split("T")[0],
    garage_name: "",
    odometer_at_entry: "",
    mechanic_name: "",
  });

  const load = async () => {
    const [s, v] = await Promise.all([
      appClient.entities.ServiceSession.list("-created_date"),
      appClient.entities.Vehicle.list(),
    ]);
    setSessions(s);
    setVehicles(v);
  };

  useEffect(() => {
    load();
  }, []);

  const vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v]));

  const handleCreate = async () => {
    const session = await appClient.entities.ServiceSession.create({
      ...form,
      odometer_at_entry: +form.odometer_at_entry,
      status: "open",
    });
    const veh = vehicleMap[form.vehicle_id];
    await appClient.entities.Notification.create({
      type: "garage",
      title: "Garage Session Opened",
      message: `Vehicle ${veh?.plate_number || ""} entered ${form.garage_name}. Mechanic: ${form.mechanic_name}.`,
      severity: "info",
      is_read: false,
      recipient_roles: "admin,fleet_manager",
      vehicle_plate: veh?.plate_number,
      related_id: session.id,
      related_type: "ServiceSession",
    });
    setShowAdd(false);
    setForm({
      vehicle_id: "",
      date: new Date().toISOString().split("T")[0],
      garage_name: "",
      odometer_at_entry: "",
      mechanic_name: "",
    });
    load();
  };

  const filtered = sessions.filter((s) => {
    const veh = vehicleMap[s.vehicle_id];
    return (
      !search ||
      veh?.plate_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.garage_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Garage Sessions</h1>
          <p className="text-sm text-slate-500">
            {sessions.filter((s) => s.status === "open").length} sessions
            currently open
          </p>
        </div>
        <Button
          className="bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> New Session
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by vehicle plate or garage..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No sessions found</p>
          </div>
        ) : (
          filtered.map((s) => {
            const veh = vehicleMap[s.vehicle_id];
            return (
              <Link
                key={s.id}
                to={`/garage-sessions/${s.id}`}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {veh?.plate_number || "Unknown"} — {veh?.make}{" "}
                      {veh?.model}
                    </p>
                    <p className="text-sm text-slate-500">
                      {s.garage_name} · {s.date}
                    </p>
                    <p className="text-xs text-slate-400">
                      Mechanic: {s.mechanic_name} ·{" "}
                      {s.odometer_at_entry?.toLocaleString()} km
                    </p>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            );
          })
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Open New Garage Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Vehicle</Label>
              <Select
                value={form.vehicle_id}
                onValueChange={(v) => setForm((f) => ({ ...f, vehicle_id: v }))}
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
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Garage Name / Location</Label>
              <Input
                value={form.garage_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, garage_name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Odometer at Entry (km)</Label>
              <Input
                type="number"
                value={form.odometer_at_entry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, odometer_at_entry: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Assigned Mechanic</Label>
              <Input
                value={form.mechanic_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mechanic_name: e.target.value }))
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
              Open Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
