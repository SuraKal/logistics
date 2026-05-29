import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { appClient } from "@/lib/local-client";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon,
  MapPin,
  Plus,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "../components/StatusBadge";
import MediaGallery from "@/components/MediaGallery";
import MediaUpload from "@/components/MediaUpload";
import { normalizeMediaItems } from "@/lib/media";

const TRIP_ACTIONS = {
  draft: {
    next: "confirmed",
    label: "Confirm trip",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  confirmed: {
    next: "departed",
    label: "Mark departed",
    color: "bg-violet-500 hover:bg-violet-600",
  },
  departed: {
    next: "arrived",
    label: "Mark arrived",
    color: "bg-emerald-500 hover:bg-emerald-600",
  },
  arrived: {
    next: "closed",
    label: "Close trip",
    color: "bg-slate-500 hover:bg-slate-600",
  },
};

const emptyStopForm = {
  location: "",
  reason: "fuel_stop",
};

export default function TripDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const role = currentUser?.role || "admin";
  const canEditTrip = role === "admin" || role === "dispatcher";
  const canLogStop = canEditTrip;
  const canLogIssue = role === "admin" || role === "dispatcher" || role === "driver";

  const [trip, setTrip] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [stops, setStops] = useState([]);
  const [issues, setIssues] = useState([]);
  const [showStop, setShowStop] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [stopForm, setStopForm] = useState(emptyStopForm);
  const [issueForm, setIssueForm] = useState({ title: "" });
  const [issueNoteDrafts, setIssueNoteDrafts] = useState({});
  const [editForm, setEditForm] = useState({
    origin: "",
    destination: "",
    departure_datetime: "",
    evidence_photos: [],
  });

  const load = async () => {
    const t = await appClient.entities.Trip.get(id);
    setTrip(t);
    if (!t) return;

    const [stopList, issueList, v] = await Promise.all([
      appClient.entities.TripStop.filter({ trip_id: id }),
      appClient.entities.TripIssue.filter({ trip_id: id }),
      t.vehicle_id ? appClient.entities.Vehicle.get(t.vehicle_id) : Promise.resolve(null),
    ]);

    setStops(
      stopList.sort(
        (a, b) => new Date(a.stop_time).getTime() - new Date(b.stop_time).getTime(),
      ),
    );
    setIssues(issueList.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()));
    setVehicle(v);
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const canSeeTrip = useMemo(() => {
    if (!trip) return true;
    if (role !== "driver") return true;
    return trip.driver_id === currentUser?.driver_id;
  }, [currentUser?.driver_id, role, trip]);

  const advanceStatus = async () => {
    const action = TRIP_ACTIONS[trip.status];
    if (!action) return;

    const updates = { status: action.next };
    if (action.next === "departed") {
      updates.departed_at = new Date().toISOString();
    }
    if (action.next === "arrived") {
      updates.arrived_at = new Date().toISOString();
    }

    await appClient.entities.Trip.update(id, updates);
    await load();
  };

  const openEditTrip = () => {
    setEditForm({
      origin: trip.origin || "",
      destination: trip.destination || "",
      departure_datetime: trip.departure_datetime?.slice(0, 16) || "",
      evidence_photos: normalizeMediaItems(trip.evidence_photos),
    });
    setShowEditTrip(true);
  };

  const saveTrip = async () => {
    await appClient.entities.Trip.update(id, {
      origin: editForm.origin,
      destination: editForm.destination,
      departure_datetime: editForm.departure_datetime,
      evidence_photos: editForm.evidence_photos,
    });
    setShowEditTrip(false);
    load();
  };

  const addStop = async () => {
    if (!stopForm.location.trim()) return;

    await appClient.entities.TripStop.create({
      ...stopForm,
      stop_time: new Date().toISOString().slice(0, 16),
      trip_id: id,
      logged_by: currentUser?.full_name || currentUser?.email || "user",
    });
    setShowStop(false);
    setStopForm(emptyStopForm);
    load();
  };

  const addIssue = async () => {
    if (!issueForm.title.trim()) return;

    await appClient.entities.TripIssue.create({
      trip_id: id,
      vehicle_id: trip.vehicle_id,
      driver_id: trip.driver_id,
      driver_name: trip.driver_name,
      title: issueForm.title,
      details: "",
      status: "open",
      notes: [],
    });
    setShowIssue(false);
    setIssueForm({ title: "" });
    load();
  };

  const addIssueNote = async (issue) => {
    const text = (issueNoteDrafts[issue.id] || "").trim();
    if (!text) return;

    const nextNotes = [
      ...(issue.notes || []),
      {
        id: `issue-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        author_name: currentUser?.full_name || currentUser?.email || "user",
        author_role: role,
        created_date: new Date().toISOString(),
      },
    ];

    await appClient.entities.TripIssue.update(issue.id, {
      notes: nextNotes,
      updated_date: new Date().toISOString(),
    });
    setIssueNoteDrafts((current) => ({ ...current, [issue.id]: "" }));
    load();
  };

  if (!trip) {
    return <div className="p-6 text-center text-slate-400">Loading...</div>;
  }

  if (!canSeeTrip) {
    return <Navigate to="/trips" replace />;
  }

  const action = canEditTrip ? TRIP_ACTIONS[trip.status] : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        to="/trips"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to trips
      </Link>

      <div className="mb-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {trip.origin} - {trip.destination}
            </h1>
            <p className="text-sm text-slate-500">
              Driver: {trip.driver_name} - {vehicle?.plate_number || "Vehicle"}
            </p>
            <p className="text-xs text-slate-400">Departure: {trip.departure_datetime}</p>
            {trip.cargo_description && (
              <p className="mt-1 text-xs text-slate-400">Cargo: {trip.cargo_description}</p>
            )}
          </div>
          <StatusBadge status={trip.status} />
        </div>

        {trip.has_vehicle_warnings && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            This vehicle had service alerts when the trip was made.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {action && (
            <Button size="sm" className={`text-white ${action.color}`} onClick={advanceStatus}>
              {action.label}
            </Button>
          )}
          {canEditTrip && (
            <Button size="sm" variant="outline" onClick={openEditTrip}>
              Edit trip
            </Button>
          )}
          {canLogStop && ["departed", "arrived"].includes(trip.status) && (
            <Button size="sm" variant="outline" onClick={() => setShowStop(true)}>
              <MapPin className="mr-1 h-3 w-3" /> Log stop
            </Button>
          )}
          {canLogIssue && (
            <Button size="sm" variant="outline" onClick={() => setShowIssue(true)}>
              <Plus className="mr-1 h-3 w-3" /> Log issue
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="stops">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="stops">Stops ({stops.length})</TabsTrigger>
          <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
          <TabsTrigger value="photos">Photos ({normalizeMediaItems(trip.evidence_photos).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="stops">
          <div className="space-y-3">
            {stops.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No stops yet.</p>
            ) : (
              stops.map((stop) => (
                <div key={stop.id} className="rounded-lg border border-slate-100 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-700">{stop.location}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {stop.stop_time} - {stop.reason?.replace(/_/g, " ")}
                      </p>
                      {stop.notes && <p className="mt-1 text-xs text-slate-500">{stop.notes}</p>}
                    </div>
                    <StatusBadge status={stop.reason} />
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="issues">
          <div className="space-y-3">
            {issues.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No issues yet.</p>
            ) : (
              issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`rounded-lg border bg-white p-4 ${issue.status === "open" ? "border-amber-200" : "border-slate-100"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-700">{issue.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{issue.details}</p>
                    </div>
                    <StatusBadge status={issue.status} />
                  </div>

                  <div className="mt-3 space-y-2 border-t border-slate-50 pt-3">
                    {(issue.notes || []).length === 0 ? (
                      <p className="text-xs text-slate-400">No notes yet.</p>
                    ) : (
                      issue.notes.map((note) => (
                        <div key={note.id} className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-700">{note.author_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{note.text}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{note.created_date}</p>
                        </div>
                      ))
                    )}

                    {canLogIssue && (
                      <div className="space-y-2">
                        <Textarea
                          rows={2}
                          placeholder="Add a note"
                          value={issueNoteDrafts[issue.id] || ""}
                          onChange={(event) =>
                            setIssueNoteDrafts((current) => ({
                              ...current,
                              [issue.id]: event.target.value,
                            }))
                          }
                        />
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => addIssueNote(issue)}>
                            Save note
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="photos">
          <div className="rounded-lg border border-slate-100 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Trip photos</h3>
            </div>
            <MediaGallery items={trip.evidence_photos} emptyText="No trip photos yet." />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showStop} onOpenChange={setShowStop}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log stop</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Location</Label>
              <Input
                value={stopForm.location}
                onChange={(event) =>
                  setStopForm((current) => ({ ...current, location: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Select
                value={stopForm.reason}
                onValueChange={(value) =>
                  setStopForm((current) => ({ ...current, reason: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["fuel_stop", "breakdown", "flat_tire", "rest", "delivery", "pickup", "other"].map(
                    (reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason.replace(/_/g, " ")}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowStop(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-amber-500 text-white hover:bg-amber-600" onClick={addStop}>
              Save stop
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={issueForm.title}
                onChange={(event) =>
                  setIssueForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowIssue(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-amber-500 text-white hover:bg-amber-600" onClick={addIssue}>
              Save issue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditTrip} onOpenChange={setShowEditTrip}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  value={editForm.origin}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, origin: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  value={editForm.destination}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, destination: event.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Departure time</Label>
              <Input
                type="datetime-local"
                value={editForm.departure_datetime}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    departure_datetime: event.target.value,
                  }))
                }
              />
            </div>

            <MediaUpload
              label="Trip photos"
              helperText="Add one or more photos for this trip."
              value={editForm.evidence_photos}
              onChange={(value) =>
                setEditForm((current) => ({ ...current, evidence_photos: value }))
              }
              multiple
              accept="image/*"
              emptyText="No trip photos yet."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowEditTrip(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={saveTrip}>
              Save trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
