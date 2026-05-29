import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Plus, Search } from "lucide-react";
import { appClient } from "@/lib/local-client";
import PageBannerSlider from "@/components/PageBannerSlider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSectionImage } from "@/lib/section-images";

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  cost_type: "service",
  amount: "",
  vehicle_id: "",
  session_id: "",
  notes: "",
};

const costLabels = {
  service: "Service cost",
  part: "Part cost",
  other: "Other cost",
};

const costStyles = {
  service: "from-sky-50 via-white to-sky-50/60 text-sky-700 border-sky-100",
  part: "from-amber-50 via-white to-amber-50/60 text-amber-700 border-amber-100",
  other: "from-slate-50 via-white to-slate-50/60 text-slate-700 border-slate-100",
};

const financeBannerSlides = [
  {
    title: "Cost control",
    subtitle: "Follow the money behind each truck, garage job, and delivery decision.",
    badge: "Finance desk",
    image: getSectionImage("finance").src,
    alt: "Invoices and logistics notes on a desk",
    seed: "finance-banner-1",
  },
  {
    title: "Service spending",
    subtitle: "Track garage expenses alongside the vehicle and the job that created them.",
    badge: "Service spend",
    image: getSectionImage("garage").src,
    alt: "Heavy truck in a workshop",
    seed: "finance-banner-2",
  },
  {
    title: "Fleet performance",
    subtitle: "Keep a clean picture of part costs, service costs, and other fleet expenses.",
    badge: "Fleet spend",
    image: getSectionImage("vehicles").src,
    alt: "Fleet trucks ready for transport",
    seed: "finance-banner-3",
  },
];

export default function Finance() {
  const [entries, setEntries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [entryList, vehicleList, sessionList] = await Promise.all([
      appClient.entities.FinanceEntry.list("-created_date"),
      appClient.entities.Vehicle.list(),
      appClient.entities.ServiceSession.list("-created_date"),
    ]);

    setEntries(entryList);
    setVehicles(vehicleList);
    setSessions(sessionList);
  };

  useEffect(() => {
    load();
  }, []);

  const vehicleMap = useMemo(
    () => Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );
  const sessionMap = useMemo(
    () => Object.fromEntries(sessions.map((session) => [session.id, session])),
    [sessions],
  );

  const summaryTotal = entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const filtered = entries.filter((entry) => {
    const term = search.toLowerCase();
    const vehicle = vehicleMap[entry.vehicle_id];
    const session = sessionMap[entry.session_id];
    return (
      !term ||
      costLabels[entry.cost_type]?.toLowerCase().includes(term) ||
      vehicle?.plate_number?.toLowerCase().includes(term) ||
      session?.garage_name?.toLowerCase().includes(term) ||
      entry.notes?.toLowerCase().includes(term)
    );
  });

  const addEntry = async () => {
    const vehicleId = form.vehicle_id === "none" ? "" : form.vehicle_id;
    const sessionId = form.session_id === "none" ? "" : form.session_id;

    if (!form.amount || (!vehicleId && !sessionId)) {
      return;
    }

    const selectedSession = sessionId ? sessionMap[sessionId] : null;

    await appClient.entities.FinanceEntry.create({
      date: form.date,
      cost_type: form.cost_type,
      amount: Number(form.amount) || 0,
      vehicle_id: vehicleId || selectedSession?.vehicle_id || "",
      session_id: sessionId,
      notes: form.notes.trim(),
    });

    setShowAdd(false);
    setForm(emptyForm);
    load();
  };

  return (
    <div className="page-shell space-y-6">
      <PageBannerSlider
        eyebrow="Finance watch"
        title="Keep fleet spending tied to the work that created it."
        description="See service costs, part replacement costs, and other expenses in one visual banner before you drill into the ledger."
        stats={[
          {
            label: "Total cost",
            value: summaryTotal.toLocaleString(),
            hint: "All entries on this page",
          },
          {
            label: "Entries",
            value: entries.length,
            hint: "Current finance rows",
          },
          {
            label: "Parts",
            value: entries.filter((entry) => entry.cost_type === "part").length,
            hint: "Part-related costs",
          },
        ]}
        slides={financeBannerSlides}
      />

      <div className="glass-panel overflow-hidden">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Finance
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950">
              Cost list
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              Add simple costs for service, parts, and other vehicle work.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Total cost
              </p>
              <p className="mt-3 text-4xl font-bold text-slate-950">
                {summaryTotal.toLocaleString()}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.85)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Cost entries
              </p>
              <p className="mt-3 text-4xl font-bold">{entries.length}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/70 bg-white/45 px-6 py-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by vehicle, job, or note"
                className="pl-11"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button onClick={() => setShowAdd(true)} className="h-11 px-5">
              <Plus className="mr-2 h-4 w-4" />
              Add cost
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="subtle-panel py-16 text-center text-slate-400">
            <Banknote className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p>No costs yet</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const vehicle = vehicleMap[entry.vehicle_id];
            const session = sessionMap[entry.session_id];
            const linkedVehicle = vehicle || (session ? vehicleMap[session.vehicle_id] : null);
            const style = costStyles[entry.cost_type] || costStyles.other;

            return (
              <div
                key={entry.id}
                className={`subtle-panel border bg-gradient-to-br p-5 shadow-sm ${style}`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-950">
                        {costLabels[entry.cost_type] || "Cost"}
                      </p>
                      <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {entry.cost_type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {entry.date} - {entry.amount?.toLocaleString() || "0"} ETB
                    </p>
                    <p className="text-xs text-slate-400">
                      Linked to{" "}
                      {session ? (
                        <Link
                          to={`/garage-sessions/${session.id}`}
                          className="font-medium text-sky-700 hover:text-sky-900"
                        >
                          {session.garage_name}
                        </Link>
                      ) : linkedVehicle ? (
                        <Link
                          to={`/vehicles/${linkedVehicle.id}`}
                          className="font-medium text-sky-700 hover:text-sky-900"
                        >
                          {linkedVehicle.plate_number}
                        </Link>
                      ) : (
                        "a vehicle"
                      )}
                    </p>
                    {entry.notes && (
                      <p className="text-xs leading-5 text-slate-500">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-right shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Amount
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">
                        {entry.amount?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
                      {costLabels[entry.cost_type] || entry.cost_type}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white/70 px-5 py-4 text-sm text-slate-500">
          Other features to be added soon
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add cost</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: event.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={form.cost_type}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, cost_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(costLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Vehicle</Label>
              <Select
                value={form.vehicle_id}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, vehicle_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vehicle</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Garage job</Label>
              <Select
                value={form.session_id}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, session_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a garage job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job</SelectItem>
                  {sessions.map((session) => {
                    const vehicle = vehicleMap[session.vehicle_id];
                    return (
                      <SelectItem key={session.id} value={session.id}>
                        {session.garage_name} - {vehicle?.plate_number || "Vehicle"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Note</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>
            <p className="text-xs text-slate-400">
              Pick a vehicle or a garage job before saving.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={addEntry}>
              Save cost
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
