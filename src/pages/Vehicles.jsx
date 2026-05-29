import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Image as ImageIcon,
  Plus,
  Search,
  Truck,
} from "lucide-react";
import { appClient } from "@/lib/local-client";
import { useAuth } from "@/lib/AuthContext";
import PageBannerSlider from "@/components/PageBannerSlider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MediaUpload from "@/components/MediaUpload";
import StatusBadge from "@/components/StatusBadge";
import { getMediaUrl, makePreviewDataUrl, normalizeMediaItems } from "@/lib/media";
import { getSectionImage } from "@/lib/section-images";
import { downloadPdfReport } from "@/lib/report-downloads";

const emptyForm = {
  plate_number: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  current_mileage: 0,
  status: "active",
  photo_gallery: [],
};

const vehicleBannerSlides = [
  {
    title: "Fleet visibility",
    subtitle: "Track every truck, its load readiness, and its service status from one screen.",
    badge: "Fleet overview",
    image: getSectionImage("vehicles").src,
    alt: "Heavy cargo trucks lined up in a fleet yard",
    seed: "vehicles-banner-1",
  },
  {
    title: "Workshop-ready units",
    subtitle: "See which vehicles are active, in the garage, or due for a maintenance check.",
    badge: "Workshop status",
    image: getSectionImage("garage").src,
    alt: "A heavy truck being serviced in a workshop",
    seed: "vehicles-banner-2",
  },
  {
    title: "Route-ready trucks",
    subtitle: "Keep the fleet positioned for client deliveries, long-haul moves, and return trips.",
    badge: "Route control",
    image: getSectionImage("trips").src,
    alt: "Cargo truck moving on a highway",
    seed: "vehicles-banner-3",
  },
];

export default function Vehicles() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || "admin";
  const canEdit = role === "admin";
  const canDownload = role === "admin" || role === "main_mechanic";

  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [maintenanceWarnings, setMaintenanceWarnings] = useState({});
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [veh, maint] = await Promise.all([
      appClient.entities.Vehicle.list(),
      appClient.entities.MaintenanceSchedule.filter({
        status: ["overdue", "due_soon"],
      }),
    ]);

    setVehicles(veh);

    const warnings = {};
    maint.forEach((item) => {
      warnings[item.vehicle_id] = (warnings[item.vehicle_id] || 0) + 1;
    });
    setMaintenanceWarnings(warnings);
  };

  useEffect(() => {
    load();
  }, []);

  const getVehicleCardImage = (vehicle) => {
    const thumb = normalizeMediaItems(vehicle.photo_gallery)[0];
    if (thumb) {
      return {
        src: getMediaUrl(thumb),
        alt: vehicle.plate_number,
      };
    }

    return {
      src: makePreviewDataUrl({
        title: vehicle.plate_number || "Fleet truck",
        subtitle: `${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "Heavy vehicle",
        seed: vehicle.id,
      }),
      alt: vehicle.plate_number || "Fleet truck",
    };
  };

  const handleAdd = async () => {
    await appClient.entities.Vehicle.create({
      ...form,
      year: Number(form.year) || new Date().getFullYear(),
      current_mileage: Number(form.current_mileage) || 0,
    });

    await appClient.entities.Notification.create({
      type: "vehicle",
      title: "New vehicle added",
      message: `Vehicle ${form.plate_number} was added to the fleet.`,
      severity: "info",
      is_read: false,
      recipient_roles: "admin",
      vehicle_plate: form.plate_number,
    });

    setShowAdd(false);
    setForm(emptyForm);
    load();
  };

  const filtered = vehicles.filter((vehicle) => {
    const term = search.toLowerCase();
    return (
      !term ||
      vehicle.plate_number?.toLowerCase().includes(term) ||
      vehicle.make?.toLowerCase().includes(term) ||
      vehicle.model?.toLowerCase().includes(term)
    );
  });

  const handleDownloadReport = () => {
    if (!canDownload) return;

    downloadPdfReport({
      title: "Vehicle report",
      subtitle: "Simple list of all vehicles you can see on this page.",
      summaryLines: [
        `Vehicles in report: ${filtered.length}`,
        `Search word: ${search || "None"}`,
      ],
      sections: [
        {
          title: "Vehicles",
          items: filtered.map((vehicle) => ({
            title: `${vehicle.plate_number} - ${vehicle.make} ${vehicle.model}`,
            lines: [
              `Year: ${vehicle.year}`,
              `Mileage: ${vehicle.current_mileage?.toLocaleString() || "0"} km`,
              `Status: ${vehicle.status?.replace(/_/g, " ") || "No status"}`,
              `Photos: ${normalizeMediaItems(vehicle.photo_gallery).length}`,
              `Service alerts: ${maintenanceWarnings[vehicle.id] || 0}`,
            ],
          })),
          emptyText: "No vehicles found.",
        },
      ],
      filename: "vehicle-report.pdf",
    });
  };

  return (
    <div className="page-shell space-y-6">
      <PageBannerSlider
        eyebrow="Fleet control"
        title="Every truck, every load, every service check."
        description="Keep the fleet visible with images that show the trucks on the road, in the yard, and headed to the workshop."
        stats={[
          {
            label: "Fleet count",
            value: vehicles.length,
            hint: "Trucks in the active list",
          },
          {
            label: "Photos",
            value: vehicles.reduce(
              (sum, vehicle) => sum + normalizeMediaItems(vehicle.photo_gallery).length,
              0,
            ),
            hint: "Uploaded vehicle images",
          },
          {
            label: "Alerts",
            value: Object.values(maintenanceWarnings).reduce((sum, value) => sum + value, 0),
            hint: "Service work waiting",
          },
        ]}
        slides={vehicleBannerSlides}
      />

      <div className="glass-panel overflow-hidden">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Vehicles
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950">
              Vehicle list
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              See each vehicle, its photos, and its current mileage.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {vehicles.slice(0, 3).map((vehicle) => {
                const image = getVehicleCardImage(vehicle);
                return (
                  <div
                    key={vehicle.id}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm"
                  >
                    {image ? (
                      <img
                        src={image.src}
                        alt={vehicle.plate_number}
                        className="h-28 w-full object-cover"
                      />
                    ) : null}
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {vehicle.plate_number}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {vehicle.make} {vehicle.model}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Vehicle count
                  </p>
                  <p className="text-2xl font-bold text-slate-950">
                    {vehicles.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.85)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Service alerts
                  </p>
                  <p className="text-2xl font-bold">
                    {Object.values(maintenanceWarnings).reduce((sum, value) => sum + value, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/70 bg-white/45 px-6 py-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by plate, make, or model"
                className="pl-11"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {canDownload && (
                <Button variant="outline" onClick={handleDownloadReport} className="h-11 px-5">
                  <Download className="mr-2 h-4 w-4" />
                  Download report
                </Button>
              )}
              {canEdit && (
                <Button onClick={() => setShowAdd(true)} className="h-11 px-5">
                  <Plus className="mr-2 h-4 w-4" />
                  Add vehicle
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((vehicle) => {
          const image = getVehicleCardImage(vehicle);

          return (
            <Link
              key={vehicle.id}
              to={`/vehicles/${vehicle.id}`}
              className="subtle-panel group overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_-38px_rgba(15,23,42,0.3)]"
            >
              <div className="mb-4 overflow-hidden rounded-2xl bg-slate-100">
                {image ? (
                  <img
                    src={image.src}
                    alt={vehicle.plate_number}
                    className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 text-white">
                    <Truck className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    {vehicle.plate_number}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <StatusBadge status={vehicle.status} />
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {normalizeMediaItems(vehicle.photo_gallery).length} photo
                  {normalizeMediaItems(vehicle.photo_gallery).length !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50/90 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Current mileage</span>
                  <span className="font-semibold text-slate-900">
                    {vehicle.current_mileage?.toLocaleString()} km
                  </span>
                </div>
                {maintenanceWarnings[vehicle.id] > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {maintenanceWarnings[vehicle.id]} service alert
                    {maintenanceWarnings[vehicle.id] > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="subtle-panel col-span-full py-16 text-center">
            <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No vehicles found</p>
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add new vehicle</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Plate number", "plate_number", "text"],
                ["Make", "make", "text"],
                ["Model", "model", "text"],
                ["Year", "year", "number"],
                ["Current mileage", "current_mileage", "number"],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </Label>
                  <Input
                    type={type}
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]:
                          type === "number"
                            ? Number(event.target.value)
                            : event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <MediaUpload
              label="Photos"
              helperText="Add one or more vehicle photos."
              value={form.photo_gallery}
              onChange={(value) =>
                setForm((current) => ({ ...current, photo_gallery: value }))
              }
              multiple
              accept="image/*"
              emptyText="No vehicle photos yet."
            />
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
              Save vehicle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
