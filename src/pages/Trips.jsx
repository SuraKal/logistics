import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Image as ImageIcon, Navigation, Plus, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { getMediaUrl, makePreviewDataUrl, normalizeMediaItems } from "@/lib/media";
import { getSectionImage } from "@/lib/section-images";
import {
  downloadPdfReport,
  formatReportDateTime,
} from "@/lib/report-downloads";

const emptyForm = {
  vehicle_id: "",
  driver_id: "",
  driver_name: "",
  origin: "",
  destination: "",
  departure_datetime: "",
};

const tripBannerSlides = [
  {
    title: "Route planning",
    subtitle: "Set up the trip with the right truck, the right driver, and the right cargo.",
    badge: "Dispatch lane",
    image: getSectionImage("trips").src,
    alt: "Cargo truck on a highway route",
    seed: "trips-banner-1",
  },
  {
    title: "Load visibility",
    subtitle: "Keep a clear picture of what is moving, where it started, and where it ends.",
    badge: "Cargo tracking",
    image: getSectionImage("vehicles").src,
    alt: "Fleet trucks ready for delivery",
    seed: "trips-banner-2",
  },
  {
    title: "Delivery control",
    subtitle: "Follow client deliveries from departure to arrival with fewer clicks.",
    badge: "Delivery flow",
    image: getSectionImage("dashboard").src,
    alt: "Fleet trucks at a logistics terminal",
    seed: "trips-banner-3",
  },
];

const tripStatusOrder = {
  draft: 0,
  confirmed: 1,
  departed: 2,
  arrived: 3,
  closed: 4,
};

const getTripDate = (trip) => trip?.departure_datetime ? new Date(trip.departure_datetime) : null;

export default function Trips() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || "admin";
  const canEdit = role === "admin" || role === "dispatcher";
  const canDownload = role !== "driver";

  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const load = async () => {
    const [tripList, vehicleList, driverList] = await Promise.all([
      appClient.entities.Trip.list("-created_date"),
      appClient.entities.Vehicle.list(),
      appClient.entities.Driver.list(),
    ]);
    setTrips(tripList);
    setVehicles(vehicleList);
    setDrivers(driverList);
  };

  useEffect(() => {
    load();
  }, []);

  const getTripCardImage = (trip) => {
    const vehicle = vehicleMap[trip.vehicle_id];
    const photo = normalizeMediaItems(vehicle?.photo_gallery)[0];

    if (photo) {
      return {
        src: getMediaUrl(photo),
        alt: vehicle?.plate_number || "Vehicle",
      };
    }

    return {
      src: makePreviewDataUrl({
        title: trip.origin && trip.destination ? `${trip.origin} to ${trip.destination}` : "Trip",
        subtitle: vehicle?.plate_number || trip.driver_name || "Route overview",
        seed: trip.id,
      }),
      alt: vehicle?.plate_number || "Vehicle",
    };
  };

  const driverMap = useMemo(
    () => Object.fromEntries(drivers.map((driver) => [driver.id, driver])),
    [drivers],
  );
  const vehicleMap = useMemo(
    () => Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );

  const currentDriver = useMemo(
    () => drivers.find((driver) => driver.id === currentUser?.driver_id) || null,
    [currentUser?.driver_id, drivers],
  );

  useEffect(() => {
    if (role === "driver" && currentDriver) {
      setForm((current) => ({
        ...current,
        driver_id: currentDriver.id,
        driver_name: currentDriver.name,
        vehicle_id: currentDriver.assigned_vehicle_id || current.vehicle_id,
      }));
    }
  }, [currentDriver, role]);

  const visibleTrips =
    role === "driver" && currentDriver
      ? trips.filter(
          (trip) =>
            trip.driver_id === currentDriver.id ||
            trip.driver_name === currentDriver.name,
        )
      : trips;

  const filteredTrips = visibleTrips.filter((trip) => {
    const term = search.toLowerCase();
    return (
      !term ||
      trip.origin?.toLowerCase().includes(term) ||
      trip.destination?.toLowerCase().includes(term) ||
      trip.driver_name?.toLowerCase().includes(term) ||
      vehicleMap[trip.vehicle_id]?.plate_number?.toLowerCase().includes(term)
    );
  });

  const sortedTrips = [...filteredTrips].sort(
    (left, right) =>
      (tripStatusOrder[left.status] ?? 5) - (tripStatusOrder[right.status] ?? 5),
  );

  const handleCreate = async () => {
    const selectedDriver = driverMap[form.driver_id];
    const selectedVehicle = vehicleMap[form.vehicle_id];

    await appClient.entities.Trip.create({
      ...form,
      driver_name: selectedDriver?.name || form.driver_name,
      status: "draft",
      has_vehicle_warnings: false,
    });

    await appClient.entities.Notification.create({
      type: "dispatch",
      title: "New trip added",
      message: `Trip from ${form.origin} to ${form.destination} was added.`,
      severity: "info",
      is_read: false,
      recipient_roles: "admin,dispatcher",
      vehicle_plate: selectedVehicle?.plate_number,
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
      const reportTrips = visibleTrips.filter((trip) => {
        const tripDate = getTripDate(trip);
        if (!tripDate) return false;
        if (fromDate && tripDate < fromDate) return false;
        if (toDate && tripDate > toDate) return false;
        return true;
      });

      downloadPdfReport({
        title: "Trip report",
        subtitle: "Simple trip list for the date range you picked.",
        summaryLines: [
          `Trips in report: ${reportTrips.length}`,
          `Date from: ${reportFrom || "Any"}`,
          `Date to: ${reportTo || "Any"}`,
        ],
        sections: [
          {
            title: "Trips",
            items: reportTrips.map((trip) => ({
              title: `${trip.origin} to ${trip.destination}`,
              lines: [
                `Driver: ${trip.driver_name || "No driver"}`,
                `Vehicle: ${vehicleMap[trip.vehicle_id]?.plate_number || "No vehicle"}`,
                `Departure: ${formatReportDateTime(trip.departure_datetime)}`,
                `Status: ${trip.status?.replace(/_/g, " ") || "No status"}`,
                `Evidence photos: ${normalizeMediaItems(trip.evidence_photos).length}`,
              ],
            })),
            emptyText: "No trips found for this range.",
          },
        ],
        filename: `trip-report-${reportFrom || "all"}-${reportTo || "all"}.pdf`,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="page-shell space-y-6">
      <PageBannerSlider
        eyebrow="Dispatch board"
        title="Plan each trip like a load moving through the network."
        description="Use route images, truck visuals, and delivery updates to keep dispatch and drivers aligned on every trip."
        stats={[
          {
            label: "Trips shown",
            value: sortedTrips.length,
            hint: "Visible on this page",
          },
          {
            label: "Photo trips",
            value: visibleTrips.filter(
              (trip) => normalizeMediaItems(trip.evidence_photos).length > 0,
            ).length,
            hint: "Trips with evidence files",
          },
          {
            label: "Drivers",
            value: drivers.length,
            hint: "Available on the roster",
          },
        ]}
        slides={tripBannerSlides}
      />

      <div className="glass-panel overflow-hidden">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Trips
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950">
              {role === "driver" ? "My trips" : "Trip list"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              {role === "driver"
                ? "See only your trips and log a problem if something goes wrong."
                : "Add trips, pick the driver, and keep each trip simple to follow."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Trips shown
              </p>
              <p className="mt-3 text-4xl font-bold text-slate-950">
                {sortedTrips.length}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.85)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Photos
              </p>
              <p className="mt-3 text-4xl font-bold">
                {
                  visibleTrips.filter(
                    (trip) => normalizeMediaItems(trip.evidence_photos).length > 0,
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
                placeholder="Search by route, driver, or vehicle"
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
              {canEdit && (
                <Button onClick={() => setShowAdd(true)} className="h-11 px-5">
                  <Plus className="mr-2 h-4 w-4" />
                  Add trip
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {sortedTrips.length === 0 ? (
          <div className="subtle-panel py-16 text-center text-slate-400">
            <Navigation className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p>No trips found</p>
          </div>
        ) : (
          sortedTrips.map((trip) => {
            const vehicle = vehicleMap[trip.vehicle_id];
            const image = getTripCardImage(trip);
            const photoCount = normalizeMediaItems(trip.evidence_photos).length;

            return (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="subtle-panel block overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)]"
              >
                <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                  <div className="bg-slate-100">
                    {image ? (
                      <img
                        src={image.src}
                        alt={vehicle?.plate_number || "Vehicle"}
                        className="h-full min-h-[160px] w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {trip.origin} - {trip.destination}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {trip.driver_name || "No driver"} -{" "}
                          {vehicle?.plate_number || "No vehicle"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatReportDateTime(trip.departure_datetime)}
                        </p>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        <ImageIcon className="h-3 w-3" />
                        {photoCount} photo{photoCount !== 1 ? "s" : ""}
                      </span>
                      {trip.cargo_description && (
                        <span className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                          {trip.cargo_description}
                        </span>
                      )}
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
            <DialogTitle>Add trip</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Driver
                </Label>
                <Select
                  value={form.driver_id}
                  onValueChange={(value) => {
                    const selectedDriver = driverMap[value];
                    setForm((current) => ({
                      ...current,
                      driver_id: value,
                      driver_name: selectedDriver?.name || "",
                      vehicle_id: selectedDriver?.assigned_vehicle_id || current.vehicle_id,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              {[
                ["Origin", "origin"],
                ["Destination", "destination"],
                ["Departure time", "departure_datetime", "datetime-local"],
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
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreate}>
              Save trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
