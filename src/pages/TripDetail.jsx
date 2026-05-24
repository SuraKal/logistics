import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "../components/StatusBadge";

const TRIP_ACTIONS = {
  draft: {
    next: "confirmed",
    label: "Confirm Trip",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  confirmed: {
    next: "departed",
    label: "Log Departure",
    color: "bg-violet-500 hover:bg-violet-600",
  },
  departed: {
    next: "arrived",
    label: "Log Arrival",
    color: "bg-emerald-500 hover:bg-emerald-600",
  },
  arrived: {
    next: "closed",
    label: "Close Trip",
    color: "bg-slate-500 hover:bg-slate-600",
  },
};

export default function TripDetail() {
  const { id } = useParams();

  const [trip, setTrip] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [stops, setStops] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [showStop, setShowStop] = useState(false);
  const [showHandover, setShowHandover] = useState(false);
  const [stopForm, setStopForm] = useState({
    location: "",
    stop_time: new Date().toISOString().slice(0, 16),
    reason: "fuel_stop",
    notes: "",
    is_part_change: false,
    old_part_serial: "",
    old_part_condition: "",
    new_part_serial: "",
    new_part_brand: "",
    part_position: "",
  });
  const [handoverForm, setHandoverForm] = useState({
    check_type: "pre_trip",
    odometer: "",
    fuel_level: "full",
    condition_notes: "",
    tire_fl_serial: "",
    tire_fr_serial: "",
    tire_rl_serial: "",
    tire_rr_serial: "",
  });

  const load = async () => {
    const t = await appClient.entities.Trip.get(id);
    setTrip(t);
    const [s, h, v] = await Promise.all([
      appClient.entities.TripStop.filter({ trip_id: id }),
      appClient.entities.HandoverCheck.filter({ trip_id: id }),
      t.vehicle_id
        ? appClient.entities.Vehicle.get(t.vehicle_id)
        : Promise.resolve(null),
    ]);
    setStops(
      s.sort(
        (a, b) =>
          new Date(a.stop_time).getTime() - new Date(b.stop_time).getTime(),
      ),
    );
    setHandovers(h);
    setVehicle(v);
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const advanceStatus = async () => {
    const action = TRIP_ACTIONS[trip.status];
    if (!action) return;
    const updates = { status: action.next };
    if (action.next === "departed")
      updates.departed_at = new Date().toISOString();
    if (action.next === "arrived")
      updates.arrived_at = new Date().toISOString();
    await appClient.entities.Trip.update(id, updates);
    await appClient.entities.Notification.create({
      type: "dispatch",
      title:
        action.next === "departed"
          ? "Vehicle Departed"
          : action.next === "arrived"
            ? "Vehicle Arrived"
            : `Trip ${action.next}`,
      message: `Trip ${trip.origin} -> ${trip.destination} is now ${action.next}. Vehicle: ${vehicle?.plate_number}.`,
      severity: "info",
      is_read: false,
      recipient_roles: "admin,fleet_manager",
      vehicle_plate: vehicle?.plate_number,
      related_id: id,
      related_type: "Trip",
    });
    load();
  };

  const addStop = async () => {
    await appClient.entities.TripStop.create({
      ...stopForm,
      trip_id: id,
      logged_by: "admin",
    });
    if (stopForm.is_part_change) {
      await appClient.entities.Notification.create({
        type: "dispatch",
        title: "Part Changed En-route",
        message: `Part change during trip (${trip.origin}->${trip.destination}). Position: ${stopForm.part_position}. New S/N: ${stopForm.new_part_serial}.`,
        severity: "warning",
        is_read: false,
        recipient_roles: "admin,fleet_manager",
        vehicle_plate: vehicle?.plate_number,
        related_id: id,
        related_type: "Trip",
      });
    } else {
      await appClient.entities.Notification.create({
        type: "dispatch",
        title: `En-route ${stopForm.reason.replace(/_/g, " ")}`,
        message: `Stop logged at ${stopForm.location} during trip ${trip.origin}->${trip.destination}. ${stopForm.notes}`,
        severity: stopForm.reason === "breakdown" ? "critical" : "info",
        is_read: false,
        recipient_roles: "admin,fleet_manager",
        vehicle_plate: vehicle?.plate_number,
      });
    }
    setShowStop(false);
    setStopForm({
      location: "",
      stop_time: new Date().toISOString().slice(0, 16),
      reason: "fuel_stop",
      notes: "",
      is_part_change: false,
      old_part_serial: "",
      old_part_condition: "",
      new_part_serial: "",
      new_part_brand: "",
      part_position: "",
    });
    load();
  };

  const addHandover = async () => {
    const preCheck = handovers.find((h) => h.check_type === "pre_trip");
    let mismatches = false;
    let mismatchDetails = "";
    if (handoverForm.check_type === "post_trip" && preCheck) {
      const positions = ["fl", "fr", "rl", "rr"];
      const diffs = positions.filter(
        (p) =>
          preCheck[`tire_${p}_serial`] &&
          handoverForm[`tire_${p}_serial`] &&
          preCheck[`tire_${p}_serial`] !== handoverForm[`tire_${p}_serial`],
      );
      if (diffs.length > 0) {
        mismatches = true;
        mismatchDetails = `Tire mismatch at: ${diffs.join(", ")}`;
      }
    }
    const check = await appClient.entities.HandoverCheck.create({
      ...handoverForm,
      trip_id: id,
      vehicle_id: trip.vehicle_id,
      driver_name: trip.driver_name,
      odometer: +handoverForm.odometer,
      mismatches_flagged: mismatches,
      mismatch_details: mismatchDetails,
      signed_off_at: new Date().toISOString(),
    });
    if (mismatches) {
      await appClient.entities.Notification.create({
        type: "dispatch",
        title: "⚠️ Handover Mismatch Detected",
        message: `${mismatchDetails} on vehicle ${vehicle?.plate_number}. Driver: ${trip.driver_name}.`,
        severity: "critical",
        is_read: false,
        recipient_roles: "admin,fleet_manager",
        vehicle_plate: vehicle?.plate_number,
        related_id: id,
        related_type: "Trip",
      });
    }
    setShowHandover(false);
    setHandoverForm({
      check_type: "pre_trip",
      odometer: "",
      fuel_level: "full",
      condition_notes: "",
      tire_fl_serial: "",
      tire_fr_serial: "",
      tire_rl_serial: "",
      tire_rr_serial: "",
    });
    load();
  };

  if (!trip)
    return <div className="p-6 text-center text-slate-400">Loading...</div>;
  const action = TRIP_ACTIONS[trip.status];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        to="/trips"
        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Trips
      </Link>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {trip.origin} → {trip.destination}
            </h1>
            <p className="text-slate-500 text-sm">
              Driver: {trip.driver_name} · {vehicle?.plate_number || "Vehicle"}
            </p>
            <p className="text-slate-400 text-xs">
              Departure: {trip.departure_datetime}
            </p>
            {trip.cargo_description && (
              <p className="text-slate-400 text-xs">
                Cargo: {trip.cargo_description}
              </p>
            )}
          </div>
          <StatusBadge status={trip.status} />
        </div>
        {trip.has_vehicle_warnings && (
          <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 rounded-lg px-3 py-2 mb-3">
            <AlertTriangle className="w-4 h-4" /> This vehicle had maintenance
            alerts when trip was created
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {action && (
            <Button
              size="sm"
              className={`text-white ${action.color}`}
              onClick={advanceStatus}
            >
              {action.label}
            </Button>
          )}
          {["departed", "arrived"].includes(trip.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowStop(true)}
            >
              <MapPin className="w-3 h-3 mr-1" /> Log Stop/Incident
            </Button>
          )}
          {
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHandover(true)}
            >
              <CheckCircle className="w-3 h-3 mr-1" /> Handover Check
            </Button>
          }
        </div>
      </div>

      <Tabs defaultValue="stops">
        <TabsList className="mb-4">
          <TabsTrigger value="stops">
            En-route Stops ({stops.length})
          </TabsTrigger>
          <TabsTrigger value="handovers">
            Handover Checks ({handovers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stops">
          <div className="space-y-3">
            {stops.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">
                No stops logged
              </p>
            ) : (
              stops.map((stop) => (
                <div
                  key={stop.id}
                  className="bg-white rounded-lg border border-slate-100 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-700">
                        {stop.location}
                      </p>
                      <p className="text-xs text-slate-400">
                        {stop.stop_time} · {stop.reason?.replace(/_/g, " ")}
                      </p>
                      {stop.notes && (
                        <p className="text-xs text-slate-500 mt-1">
                          {stop.notes}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={stop.reason} />
                  </div>
                  {stop.is_part_change && (
                    <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-red-50 rounded p-2">
                        <p className="font-medium text-red-700">Removed</p>
                        <p className="text-red-600">
                          S/N: {stop.old_part_serial}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded p-2">
                        <p className="font-medium text-emerald-700">
                          Installed
                        </p>
                        <p className="text-emerald-600">
                          S/N: {stop.new_part_serial} · {stop.new_part_brand}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="handovers">
          <div className="space-y-3">
            {handovers.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">
                No handover checks yet
              </p>
            ) : (
              handovers.map((h) => (
                <div
                  key={h.id}
                  className={`bg-white rounded-lg border p-4 ${h.mismatches_flagged ? "border-red-200" : "border-slate-100"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-700 capitalize">
                      {h.check_type?.replace("_", " ")} — {h.driver_name}
                    </p>
                    {h.mismatches_flagged ? (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        ⚠️ Mismatch
                      </span>
                    ) : (
                      <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                        ✓ OK
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <p>Odometer: {h.odometer?.toLocaleString()} km</p>
                    <p>Fuel: {h.fuel_level}</p>
                    <p>FL Tire: {h.tire_fl_serial || "—"}</p>
                    <p>FR Tire: {h.tire_fr_serial || "—"}</p>
                    <p>RL Tire: {h.tire_rl_serial || "—"}</p>
                    <p>RR Tire: {h.tire_rr_serial || "—"}</p>
                  </div>
                  {h.mismatches_flagged && (
                    <p className="text-xs text-red-600 mt-2">
                      {h.mismatch_details}
                    </p>
                  )}
                  {h.condition_notes && (
                    <p className="text-xs text-slate-500 mt-1">
                      {h.condition_notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Stop Dialog */}
      <Dialog open={showStop} onOpenChange={setShowStop}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Stop / Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Location</Label>
              <Input
                value={stopForm.location}
                onChange={(e) =>
                  setStopForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Input
                type="datetime-local"
                value={stopForm.stop_time}
                onChange={(e) =>
                  setStopForm((f) => ({ ...f, stop_time: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Select
                value={stopForm.reason}
                onValueChange={(v) => setStopForm((f) => ({ ...f, reason: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "fuel_stop",
                    "breakdown",
                    "flat_tire",
                    "rest",
                    "delivery",
                    "pickup",
                    "other",
                  ].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={stopForm.notes}
                onChange={(e) =>
                  setStopForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
                <Checkbox
                  id="partChange"
                  checked={stopForm.is_part_change}
                  onCheckedChange={(v) =>
                    setStopForm((f) => ({ ...f, is_part_change: v === true }))
                  }
                />
              <Label htmlFor="partChange" className="text-sm">
                Part was changed
              </Label>
            </div>
            {stopForm.is_part_change && (
              <div className="space-y-2 pt-2 border-t">
                <div>
                  <Label className="text-xs">Old Part Serial</Label>
                  <Input
                    value={stopForm.old_part_serial}
                    onChange={(e) =>
                      setStopForm((f) => ({
                        ...f,
                        old_part_serial: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Old Part Condition</Label>
                  <Input
                    value={stopForm.old_part_condition}
                    onChange={(e) =>
                      setStopForm((f) => ({
                        ...f,
                        old_part_condition: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">New Part Serial</Label>
                  <Input
                    value={stopForm.new_part_serial}
                    onChange={(e) =>
                      setStopForm((f) => ({
                        ...f,
                        new_part_serial: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">New Part Brand</Label>
                  <Input
                    value={stopForm.new_part_brand}
                    onChange={(e) =>
                      setStopForm((f) => ({
                        ...f,
                        new_part_brand: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Position</Label>
                  <Input
                    value={stopForm.part_position}
                    onChange={(e) =>
                      setStopForm((f) => ({
                        ...f,
                        part_position: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowStop(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={addStop}
            >
              Log Stop
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Handover Dialog */}
      <Dialog open={showHandover} onOpenChange={setShowHandover}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Handover Check</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Check Type</Label>
              <Select
                value={handoverForm.check_type}
                onValueChange={(v) =>
                  setHandoverForm((f) => ({ ...f, check_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_trip">Pre-trip</SelectItem>
                  <SelectItem value="post_trip">Post-trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Odometer (km)</Label>
              <Input
                type="number"
                value={handoverForm.odometer}
                onChange={(e) =>
                  setHandoverForm((f) => ({ ...f, odometer: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Fuel Level</Label>
              <Select
                value={handoverForm.fuel_level}
                onValueChange={(v) =>
                  setHandoverForm((f) => ({ ...f, fuel_level: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["full", "3/4", "1/2", "1/4", "empty"].map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase pt-1">
              Tire Serials
            </p>
            {[
              ["tire_fl_serial", "Front Left"],
              ["tire_fr_serial", "Front Right"],
              ["tire_rl_serial", "Rear Left"],
              ["tire_rr_serial", "Rear Right"],
            ].map(([k, l]) => (
              <div key={k}>
                <Label className="text-xs">{l}</Label>
                <Input
                  value={handoverForm[k]}
                  onChange={(e) =>
                    setHandoverForm((f) => ({ ...f, [k]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div>
              <Label className="text-xs">Condition Notes</Label>
              <Textarea
                value={handoverForm.condition_notes}
                onChange={(e) =>
                  setHandoverForm((f) => ({
                    ...f,
                    condition_notes: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowHandover(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={addHandover}
            >
              Submit Check
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
