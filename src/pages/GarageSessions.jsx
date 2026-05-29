import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, Plus, Search, Wrench } from "lucide-react";
import { appClient } from "@/lib/local-client";
import { useAuth } from "@/lib/AuthContext";
import PageBannerSlider from "@/components/PageBannerSlider";
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
import MediaUpload from "@/components/MediaUpload";
import StatusBadge from "@/components/StatusBadge";
import { normalizeMediaItems } from "@/lib/media";
import { getSectionImage } from "@/lib/section-images";
import {
  downloadPdfReport,
  formatReportDate,
} from "@/lib/report-downloads";

const emptyForm = {
  vehicle_id: "",
  date: new Date().toISOString().split("T")[0],
  garage_name: "",
  attachments: [],
  item_name: "",
  item_action: "checked",
  item_notes: "",
  item_is_part_replacement: false,
};

const garageBannerSlides = [
  {
    title: "Garage workflow",
    subtitle: "See the truck in the workshop, then open the job and log the first repair item.",
    badge: "Workshop view",
    image: getSectionImage("garage").src,
    alt: "Heavy truck being serviced in a workshop",
    seed: "garage-banner-1",
  },
  {
    title: "Parts and checks",
    subtitle: "Track part replacements, checked items, and the notes that go with them.",
    badge: "Repair log",
    image: getSectionImage("vehicles").src,
    alt: "Fleet trucks lined up in a yard",
    seed: "garage-banner-2",
  },
  {
    title: "Service records",
    subtitle: "Keep every garage session ready for finance, reporting, and follow-up work.",
    badge: "Records",
    image: getSectionImage("dashboard").src,
    alt: "Logistics trucks at a terminal",
    seed: "garage-banner-3",
  },
];

export default function GarageSessions() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || "admin";
  const canManage = role === "admin" || role === "main_mechanic";
  const canDownload = canManage;

  const [sessions, setSessions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [sessionList, vehicleList] = await Promise.all([
      appClient.entities.ServiceSession.list("-created_date"),
      appClient.entities.Vehicle.list(),
    ]);
    setSessions(sessionList);
    setVehicles(vehicleList);
  };

  useEffect(() => {
    load();
  }, []);

  const vehicleMap = useMemo(
    () => Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );

  const visibleSessions = sessions;

  const filtered = visibleSessions.filter((session) => {
    const vehicle = vehicleMap[session.vehicle_id];
    const term = search.toLowerCase();
    return (
      !term ||
      vehicle?.plate_number?.toLowerCase().includes(term) ||
      session.garage_name?.toLowerCase().includes(term)
    );
  });

  const handleCreate = async () => {
    if (!form.vehicle_id || !form.garage_name.trim()) {
      return;
    }

    const session = await appClient.entities.ServiceSession.create({
      vehicle_id: form.vehicle_id,
      date: form.date,
      garage_name: form.garage_name,
      mechanic_name: currentUser?.full_name || currentUser?.email || "",
      status: "open",
      attachments: form.attachments,
    });

    if (form.item_name.trim()) {
      await appClient.entities.ServiceItem.create({
        session_id: session.id,
        vehicle_id: form.vehicle_id,
        item_name: form.item_name.trim(),
        action: form.item_action,
        notes: form.item_notes.trim(),
        is_part_replacement: Boolean(form.item_is_part_replacement),
      });
    }

    const vehicle = vehicleMap[form.vehicle_id];
    await appClient.entities.Notification.create({
      type: "garage",
      title: "New garage job",
      message: `Vehicle ${vehicle?.plate_number || "Unknown"} is now in ${form.garage_name}.`,
      severity: "info",
      is_read: false,
      recipient_roles: "admin,main_mechanic",
      vehicle_plate: vehicle?.plate_number,
      related_id: session.id,
      related_type: "ServiceSession",
    });

    setShowAdd(false);
    setForm(emptyForm);
    load();
  };

  const handleDownloadReport = async () => {
    if (!canDownload) return;

    setIsDownloading(true);

    try {
      const fromDate = reportFrom ? new Date(reportFrom) : null;
      const toDate = reportTo ? new Date(`${reportTo}T23:59:59`) : null;
      const reportSessions = visibleSessions.filter((session) => {
        const sessionDate = session.date ? new Date(session.date) : null;
        if (!sessionDate || Number.isNaN(sessionDate.getTime())) return false;
        if (fromDate && sessionDate < fromDate) return false;
        if (toDate && sessionDate > toDate) return false;
        return true;
      });

      downloadPdfReport({
        title: "Garage report",
        subtitle: "Simple list of garage jobs in the date range you picked.",
        summaryLines: [
          `Jobs in report: ${reportSessions.length}`,
          `Date from: ${reportFrom || "Any"}`,
          `Date to: ${reportTo || "Any"}`,
        ],
        sections: [
          {
            title: "Garage jobs",
            items: reportSessions.map((session) => {
              const vehicle = vehicleMap[session.vehicle_id];

              return {
                title: `${vehicle?.plate_number || "Unknown"} - ${session.garage_name}`,
                lines: [
                  `Date: ${formatReportDate(session.date)}`,
                  `Mechanic: ${session.mechanic_name || "No name"}`,
                  `Odometer: ${session.odometer_at_entry?.toLocaleString() || "0"} km`,
                  `Status: ${session.status?.replace(/_/g, " ") || "No status"}`,
                  `Files: ${normalizeMediaItems(session.attachments).length}`,
                ],
              };
            }),
            emptyText: "No garage jobs found for this range.",
          },
        ],
        filename: `garage-report-${reportFrom || "all"}-${reportTo || "all"}.pdf`,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="page-shell space-y-6">
      <PageBannerSlider
        eyebrow="Garage control"
        title="Open jobs, part logs, and truck repair notes in one place."
        description="Use the banner to orient the team, then open a garage job and keep the repair trail simple from the first item onward."
        stats={[
          {
            label: "Jobs",
            value: sessions.length,
            hint: "All garage sessions",
          },
          {
            label: "Open",
            value: sessions.filter((session) => session.status === "open").length,
            hint: "Currently active jobs",
          },
          {
            label: "Files",
            value: sessions.reduce(
              (sum, session) => sum + normalizeMediaItems(session.attachments).length,
              0,
            ),
            hint: "Uploaded garage documents",
          },
        ]}
        slides={garageBannerSlides}
      />

      <div className="glass-panel overflow-hidden">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Garage
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950">
              Garage jobs
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              Open a job, attach files, and keep garage work easy to follow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Open jobs
              </p>
              <p className="mt-3 text-4xl font-bold text-slate-950">
                {visibleSessions.filter((session) => session.status === "open").length}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.85)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Files
              </p>
              <p className="mt-3 text-4xl font-bold">
                {
                  visibleSessions.filter(
                    (session) => normalizeMediaItems(session.attachments).length > 0,
                  ).length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/70 bg-white/45 px-6 py-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by vehicle or garage"
                className="pl-11"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {canDownload && (
                <>
                  <div className="w-32">
                    <Label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      From
                    </Label>
                    <Input
                      type="date"
                      value={reportFrom}
                      onChange={(event) => setReportFrom(event.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      To
                    </Label>
                    <Input
                      type="date"
                      value={reportTo}
                      onChange={(event) => setReportTo(event.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="h-11 px-4"
                    onClick={handleDownloadReport}
                    disabled={isDownloading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isDownloading ? "Making file..." : "Download report"}
                  </Button>
                </>
              )}
              {canManage && (
                <>
                  <Button onClick={() => setShowAdd(true)} className="h-11 px-5">
                    <Plus className="mr-2 h-4 w-4" />
                    New job
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="subtle-panel py-16 text-center text-slate-400">
            <Wrench className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p>No garage jobs found</p>
          </div>
        ) : (
          filtered.map((session) => {
            const vehicle = vehicleMap[session.vehicle_id];
            const fileCount = normalizeMediaItems(session.attachments).length;

            return (
              <Link
                key={session.id}
                to={`/garage-sessions/${session.id}`}
                className="subtle-panel block overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)]"
              >
                <div className="grid gap-0 sm:grid-cols-[170px_1fr]">
                  <div className="flex min-h-[150px] items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600">
                    <Wrench className="h-10 w-10" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {vehicle?.plate_number || "Unknown"} - {vehicle?.make} {vehicle?.model}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {session.garage_name} - {formatReportDate(session.date)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {session.mechanic_name || "No mechanic"} -{" "}
                          {session.odometer_at_entry?.toLocaleString()} km
                        </p>
                      </div>
                      <StatusBadge status={session.status} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        <FileText className="h-3 w-3" />
                        {fileCount} file{fileCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New garage job</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Vehicle
              </Label>
              <Select
                value={form.vehicle_id}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, vehicle_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Date", "date", "date"],
                ["Garage name", "garage_name"],
              ].map(([label, key, type = "text"]) => (
                <div key={key}>
                  <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </Label>
                  <Input
                    type={type}
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <MediaUpload
              label="Job files"
              helperText="Add photos or papers that help the garage team."
              value={form.attachments}
              onChange={(value) =>
                setForm((current) => ({ ...current, attachments: value }))
              }
              multiple
              accept="image/*,.pdf,.doc,.docx"
              emptyText="No files added yet."
            />

            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Initial work item</p>
                <p className="mt-1 text-xs text-slate-500">
                  Add the first item now so the job starts with a clear log.
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Item name
                </Label>
                <Input
                  value={form.item_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, item_name: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Action
                  </Label>
                  <Select
                    value={form.item_action}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, item_action: value }))
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
                <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Checkbox
                    id="garage-part-replacement"
                    checked={form.item_is_part_replacement}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        item_is_part_replacement: Boolean(checked),
                      }))
                    }
                  />
                  <Label
                    htmlFor="garage-part-replacement"
                    className="text-sm font-medium text-slate-700"
                  >
                    This is a part replacement
                  </Label>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Notes
                </Label>
                <Input
                  value={form.item_notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, item_notes: event.target.value }))
                  }
                  placeholder="Optional note about the item"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreate}>
              Save job
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
