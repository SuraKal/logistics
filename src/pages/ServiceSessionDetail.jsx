import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, CheckCircle, FileText, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import MediaGallery from "@/components/MediaGallery";
import { normalizeMediaItems } from "@/lib/media";

const emptyForm = {
  item_name: "",
  action: "checked",
  notes: "",
  is_part_replacement: false,
};

export default function ServiceSessionDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const role = currentUser?.role || "admin";
  const canManage = role === "admin" || role === "main_mechanic";

  const [session, setSession] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const nextSession = await appClient.entities.ServiceSession.get(id);
    setSession(nextSession);
    if (!nextSession) return;

    const [nextVehicle, nextItems] = await Promise.all([
      appClient.entities.Vehicle.get(nextSession.vehicle_id),
      appClient.entities.ServiceItem.filter({ session_id: id }),
    ]);

    setVehicle(nextVehicle);
    setItems(nextItems);
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const addItem = async () => {
    if (!form.item_name.trim()) return;

    await appClient.entities.ServiceItem.create({
      session_id: id,
      vehicle_id: session.vehicle_id,
      item_name: form.item_name.trim(),
      action: form.action,
      notes: form.notes.trim(),
      is_part_replacement: Boolean(form.is_part_replacement),
    });
    setShowAdd(false);
    setForm(emptyForm);
    load();
  };

  const closeSession = async () => {
    await appClient.entities.ServiceSession.update(id, {
      status: "closed",
      closed_at: new Date().toISOString(),
    });
    load();
  };

  if (!session) {
    return <div className="p-6 text-center text-slate-400">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        to="/garage-sessions"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to garage jobs
      </Link>

      <div className="mb-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {vehicle?.plate_number || "Unknown"} - {vehicle?.make} {vehicle?.model}
            </h1>
            <p className="text-sm text-slate-500">
              {session.garage_name} - {session.date}
            </p>
            <p className="text-xs text-slate-400">
              Entry odometer: {session.odometer_at_entry?.toLocaleString()} km
            </p>
          </div>
          <StatusBadge status={session.status} />
        </div>

        {session.status === "open" && canManage && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-3 w-3" /> Add work
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-600"
              onClick={closeSession}
            >
              <CheckCircle className="mr-1 h-3 w-3" /> Close job
            </Button>
          </div>
        )}

        {!canManage && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
            <Lock className="h-3 w-3" /> Read only
          </div>
        )}
      </div>

      <div className="mb-5 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Files</h3>
        </div>
        <MediaGallery
          items={normalizeMediaItems(session.attachments)}
          emptyText="No files added for this job."
        />
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No work added yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-700">{item.item_name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {item.action?.replace(/_/g, " ") || "No action"}
                  </p>
                  {item.notes && <p className="mt-1 text-xs text-slate-500">{item.notes}</p>}
                  {item.is_part_replacement && (
                    <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                      Part replacement
                    </p>
                  )}
                </div>
                <StatusBadge status={item.action} />
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add work item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Work item
              </Label>
              <Input
                value={form.item_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, item_name: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Action
              </Label>
              <Select
                value={form.action}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, action: value }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["checked", "replaced", "repaired", "adjusted"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Checkbox
                id="part-replacement"
                checked={form.is_part_replacement}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    is_part_replacement: Boolean(checked),
                  }))
                }
              />
              <Label htmlFor="part-replacement" className="text-sm font-medium text-slate-700">
                This is a part replacement
              </Label>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Notes
              </Label>
              <Input
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Optional note"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-amber-500 text-white hover:bg-amber-600" onClick={addItem}>
              Save work
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
