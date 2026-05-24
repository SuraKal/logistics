import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { ArrowLeft, Plus, Lock, CheckCircle } from "lucide-react";
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
import StatusBadge from "../components/StatusBadge";

export default function ServiceSessionDetail() {
  const { id } = useParams();

  const [session, setSession] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    item_name: "",
    action: "checked",
    notes: "",
    is_part_replacement: false,
    old_serial: "",
    old_condition: "",
    old_removal_reason: "",
    new_serial: "",
    new_brand: "",
    new_condition: "",
    part_position: "n/a",
  });

  const load = async () => {
    const s = await appClient.entities.ServiceSession.get(id);
    setSession(s);
    const [v, it] = await Promise.all([
      appClient.entities.Vehicle.get(s.vehicle_id),
      appClient.entities.ServiceItem.filter({ session_id: id }),
    ]);
    setVehicle(v);
    setItems(it);
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const addItem = async () => {
    await appClient.entities.ServiceItem.create({
      ...form,
      session_id: id,
      vehicle_id: session.vehicle_id,
    });
    if (form.is_part_replacement) {
      await appClient.entities.Notification.create({
        type: "garage",
        title: "Part Replacement Logged",
        message: `${form.item_name} replaced on ${vehicle?.plate_number}. Old: ${form.old_serial}, New: ${form.new_serial}.`,
        severity: "info",
        is_read: false,
        recipient_roles: "admin",
        vehicle_plate: vehicle?.plate_number,
        related_id: id,
        related_type: "ServiceSession",
      });
    }
    setShowAdd(false);
    setForm({
      item_name: "",
      action: "checked",
      notes: "",
      is_part_replacement: false,
      old_serial: "",
      old_condition: "",
      old_removal_reason: "",
      new_serial: "",
      new_brand: "",
      new_condition: "",
      part_position: "n/a",
    });
    load();
  };

  const closeSession = async () => {
    await appClient.entities.ServiceSession.update(id, {
      status: "closed",
      closed_at: new Date().toISOString(),
    });
    const summary = items.map((i) => `${i.item_name} (${i.action})`).join(", ");
    await appClient.entities.Notification.create({
      type: "garage",
      title: "Garage Session Closed",
      message: `Session closed for ${vehicle?.plate_number}. Work done: ${summary || "No items logged"}.`,
      severity: "info",
      is_read: false,
      recipient_roles: "admin,fleet_manager",
      vehicle_plate: vehicle?.plate_number,
      related_id: id,
      related_type: "ServiceSession",
    });
    load();
  };

  if (!session)
    return <div className="p-6 text-center text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        to="/garage-sessions"
        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Sessions
      </Link>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {vehicle?.plate_number} — {vehicle?.make} {vehicle?.model}
            </h1>
            <p className="text-slate-500 text-sm">
              {session.garage_name} · {session.date}
            </p>
            <p className="text-slate-400 text-xs">
              Mechanic: {session.mechanic_name} · Entry:{" "}
              {session.odometer_at_entry?.toLocaleString()} km
            </p>
          </div>
          <StatusBadge status={session.status} />
        </div>
        {session.status === "open" && (
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="w-3 h-3 mr-1" /> Log Item
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={closeSession}
            >
              <CheckCircle className="w-3 h-3 mr-1" /> Close Session
            </Button>
          </div>
        )}
        {session.status === "closed" && (
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-400">
            <Lock className="w-3 h-3" /> Session closed — read only
          </div>
        )}
      </div>

      <h2 className="font-semibold text-slate-700 mb-3">
        Service Items ({items.length})
      </h2>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm">
            No items logged yet
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-slate-100 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-700">{item.item_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>
                </div>
                <StatusBadge status={item.action} />
              </div>
              {item.is_part_replacement && (
                <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="font-medium text-red-700 mb-1">
                      Part Removed
                    </p>
                    <p className="text-red-600">S/N: {item.old_serial}</p>
                    <p className="text-red-600">
                      Condition: {item.old_condition}
                    </p>
                    <p className="text-red-600">
                      Reason: {item.old_removal_reason}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="font-medium text-emerald-700 mb-1">
                      Part Installed
                    </p>
                    <p className="text-emerald-600">S/N: {item.new_serial}</p>
                    <p className="text-emerald-600">Brand: {item.new_brand}</p>
                    <p className="text-emerald-600">
                      Condition: {item.new_condition}
                    </p>
                    {item.part_position !== "n/a" && (
                      <p className="text-emerald-600">
                        Position: {item.part_position}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Service Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Item Name</Label>
              <Input
                value={form.item_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, item_name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Action</Label>
              <Select
                value={form.action}
                onValueChange={(v) => setForm((f) => ({ ...f, action: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["replaced", "repaired", "checked", "adjusted"].map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
                <Checkbox
                  id="partRep"
                  checked={form.is_part_replacement}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, is_part_replacement: v === true }))
                  }
                />
              <Label htmlFor="partRep" className="text-sm">
                This is a part replacement
              </Label>
            </div>
            {form.is_part_replacement && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500 uppercase">
                  Old Part Details
                </p>
                <div>
                  <Label className="text-xs">Serial Number</Label>
                  <Input
                    value={form.old_serial}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, old_serial: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Condition</Label>
                  <Input
                    value={form.old_condition}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, old_condition: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Reason Removed</Label>
                  <Input
                    value={form.old_removal_reason}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        old_removal_reason: e.target.value,
                      }))
                    }
                  />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase pt-1">
                  New Part Details
                </p>
                <div>
                  <Label className="text-xs">Serial Number</Label>
                  <Input
                    value={form.new_serial}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, new_serial: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Brand</Label>
                  <Input
                    value={form.new_brand}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, new_brand: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Condition at Install</Label>
                  <Input
                    value={form.new_condition}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, new_condition: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Position</Label>
                  <Select
                    value={form.part_position}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, part_position: v }))
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
              </div>
            )}
          </div>
          <div className="flex gap-2 sticky bottom-0 bg-white pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={addItem}
            >
              Log Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
