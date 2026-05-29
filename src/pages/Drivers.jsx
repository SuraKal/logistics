import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Car,
  Download,
  FileText,
  Image as ImageIcon,
  Phone,
  Plus,
  Search,
  Pencil,
  User,
} from "lucide-react";
import { appClient } from "@/lib/local-client";
import { useAuth } from "@/lib/AuthContext";
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
import MediaUpload from "@/components/MediaUpload";
import StatusBadge from "@/components/StatusBadge";
import { getMediaUrl, makePreviewDataUrl, normalizeMediaItems } from "@/lib/media";
import { getSectionImage } from "@/lib/section-images";
import { downloadPdfReport } from "@/lib/report-downloads";

const emptyForm = {
  name: "",
  license_number: "",
  phone: "",
  assigned_vehicle_id: "",
  status: "active",
  notes: "",
  profile_photo: [],
  fayda_id_photos: [],
  normal_id_photos: [],
  wastena_documents: [],
  contract_document: [],
};

const driverBannerSlides = [
  {
    title: "Driver faces",
    subtitle: "Recognize the people behind every route without digging into each profile.",
    badge: "People view",
    image: getSectionImage("drivers").src,
    alt: "Close-up portrait of a truck driver",
    seed: "drivers-banner-1",
  },
  {
    title: "Documents ready",
    subtitle: "Keep licenses, Fayda, Wastena, and contracts close to the driver record.",
    badge: "Records",
    image: getSectionImage("vehicles").src,
    alt: "Fleet trucks parked in a yard",
    seed: "drivers-banner-2",
  },
  {
    title: "Road crew",
    subtitle: "See the driver, the assigned truck, and the work lane all in one place.",
    badge: "Fleet crew",
    image: getSectionImage("trips").src,
    alt: "Truck moving on the highway",
    seed: "drivers-banner-3",
  },
];

export default function Drivers() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || "admin";
  const canEdit = role === "admin";

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [driverList, vehicleList, tripList] = await Promise.all([
      appClient.entities.Driver.list(),
      appClient.entities.Vehicle.list(),
      appClient.entities.Trip.list("-created_date", 100),
    ]);
    setDrivers(driverList);
    setVehicles(vehicleList);
    setTrips(tripList);
  };

  useEffect(() => {
    load();
  }, []);

  const vehicleMap = Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  const getDriverCardImage = (driver, index) => {
    const photo = normalizeMediaItems(driver.profile_photo)[0];
    if (photo) {
      return {
        src: getMediaUrl(photo),
        alt: driver.name,
      };
    }

    if (index % 2 === 0) {
      const portrait = getSectionImage("drivers");
      return {
        src: portrait.src,
        alt: portrait.alt,
      };
    }

    return {
      src: makePreviewDataUrl({
        title: driver.name || "Driver",
        subtitle: driver.license_number || "Driver profile",
        seed: driver.id,
      }),
      alt: driver.name || "Driver",
    };
  };

  const openForm = (driver = null) => {
    const nextForm = driver
      ? {
          name: driver.name || "",
          license_number: driver.license_number || "",
          phone: driver.phone || "",
          assigned_vehicle_id: driver.assigned_vehicle_id || "",
          status: driver.status || "active",
          notes: driver.notes || "",
          profile_photo: normalizeMediaItems(driver.profile_photo),
          fayda_id_photos: normalizeMediaItems(driver.fayda_id_photos),
          normal_id_photos: normalizeMediaItems(driver.normal_id_photos),
          wastena_documents: normalizeMediaItems(driver.wastena_documents),
          contract_document: normalizeMediaItems(driver.contract_document),
        }
      : emptyForm;

    setEditingDriver(driver);
    setForm(nextForm);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDriver(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    const payload = {
      ...form,
    };

    if (editingDriver) {
      await appClient.entities.Driver.update(editingDriver.id, payload);
    } else {
      await appClient.entities.Driver.create(payload);
    }

    closeForm();
    load();
  };

  const getDriverTrips = (driverId, driverName) =>
    trips.filter(
      (trip) => trip.driver_id === driverId || trip.driver_name === driverName,
    );

  const filtered = drivers.filter((driver) => {
    const term = search.toLowerCase();
    return (
      !term ||
      driver.name?.toLowerCase().includes(term) ||
      driver.license_number?.toLowerCase().includes(term)
    );
  });

  const handleDownloadReport = () => {
    downloadPdfReport({
      title: "Driver report",
      subtitle: "Simple list of all drivers on this page.",
      summaryLines: [
        `Drivers in report: ${filtered.length}`,
        `Search word: ${search || "None"}`,
      ],
      sections: [
        {
          title: "Drivers",
          items: filtered.map((driver) => {
            const assignedVehicle = vehicleMap[driver.assigned_vehicle_id];
            const driverTrips = getDriverTrips(driver.id, driver.name);
            return {
              title: driver.name,
              lines: [
                `License: ${driver.license_number || "No license"}`,
                `Phone: ${driver.phone || "No phone"}`,
                `Vehicle: ${assignedVehicle?.plate_number || "No vehicle"}`,
                `Trips: ${driverTrips.length}`,
                `Status: ${driver.status?.replace(/_/g, " ") || "No status"}`,
              ],
            };
          }),
          emptyText: "No drivers found.",
        },
      ],
      filename: "driver-report.pdf",
    });
  };

  return (
    <div className="page-shell space-y-6">
      <PageBannerSlider
        eyebrow="Driver pool"
        title="Recognize the faces behind every haul."
        description="This section keeps the driver roster visually memorable with portrait-style images, IDs, and route context."
        stats={[
          {
            label: "Drivers",
            value: drivers.length,
            hint: "People on the roster",
          },
          {
            label: "Photos ready",
            value: drivers.filter((driver) => normalizeMediaItems(driver.profile_photo).length > 0).length,
            hint: "Uploaded profile photos",
          },
          {
            label: "Documents",
            value: drivers.reduce(
              (sum, driver) =>
                sum +
                normalizeMediaItems(driver.fayda_id_photos).length +
                normalizeMediaItems(driver.normal_id_photos).length +
                normalizeMediaItems(driver.wastena_documents).length +
                normalizeMediaItems(driver.contract_document).length,
              0,
            ),
            hint: "Files on record",
          },
        ]}
        slides={driverBannerSlides}
      />

      <div className="glass-panel overflow-hidden">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Drivers
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950">
              Driver list
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              See driver photos and trip history in one place.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {drivers.slice(0, 3).map((driver, index) => {
                const image = getDriverCardImage(driver, index);
                return (
                  <div
                    key={driver.id}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm"
                  >
                    {image ? (
                      <img
                        src={image.src}
                        alt={driver.name}
                        className="h-28 w-full object-cover object-[center_18%]"
                      />
                    ) : null}
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {driver.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {driver.license_number}
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
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Driver count
                  </p>
                  <p className="text-2xl font-bold text-slate-950">
                    {drivers.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.85)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Photos ready
                  </p>
                  <p className="text-2xl font-bold">
                    {drivers.filter((driver) => normalizeMediaItems(driver.profile_photo).length > 0).length}
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
                placeholder="Search by name or license number"
                className="pl-11"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadReport} className="h-11 px-5">
                <Download className="mr-2 h-4 w-4" />
                Download report
              </Button>
              {canEdit && (
                <Button onClick={() => openForm()} className="h-11 px-5">
                  <Plus className="mr-2 h-4 w-4" />
                  Add driver
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((driver, index) => {
          const assignedVehicle = vehicleMap[driver.assigned_vehicle_id];
          const driverTrips = getDriverTrips(driver.id, driver.name);
          const image = getDriverCardImage(driver, index);
          const hasDocs =
            normalizeMediaItems(driver.fayda_id_photos).length +
            normalizeMediaItems(driver.normal_id_photos).length +
            normalizeMediaItems(driver.wastena_documents).length +
            normalizeMediaItems(driver.contract_document).length;

          return (
            <button
              key={driver.id}
              type="button"
              className="subtle-panel overflow-hidden p-0 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_-38px_rgba(15,23,42,0.3)]"
              onClick={() => setSelectedDriver(driver)}
            >
              <div className="grid gap-0 sm:grid-cols-[140px_1fr]">
                <div className="bg-slate-100">
                  {image ? (
                    <img
                      src={image.src}
                      alt={driver.name}
                      className="h-full min-h-[180px] w-full object-cover object-[center_18%]"
                    />
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-950">
                        {driver.name}
                      </p>
                      <p className="mt-1 text-xs font-mono text-slate-400">
                        {driver.license_number}
                      </p>
                    </div>
                    <StatusBadge status={driver.status} />
                  </div>

                  <div className="space-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      {driver.phone}
                    </div>
                    {assignedVehicle && (
                      <div className="flex items-center gap-2">
                        <Car className="h-3.5 w-3.5" />
                        {assignedVehicle.plate_number} - {assignedVehicle.make} {assignedVehicle.model}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      <ImageIcon className="h-3 w-3" />
                      Photo ready
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      <FileText className="h-3 w-3" />
                      {hasDocs} file{hasDocs !== 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {driverTrips.length} trip{driverTrips.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400">
            <User className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p>No drivers found</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <DialogTitle>{selectedDriver?.name} - Trips</DialogTitle>
              {canEdit && selectedDriver && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    openForm(selectedDriver);
                    setSelectedDriver(null);
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedDriver && (
            <div className="space-y-4 py-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-0 sm:grid-cols-[120px_1fr]">
                  {normalizeMediaItems(selectedDriver.profile_photo)[0] ? (
                    <img
                      src={getMediaUrl(normalizeMediaItems(selectedDriver.profile_photo)[0])}
                      alt={selectedDriver.name}
                      className="h-full min-h-[140px] w-full object-cover object-[center_18%]"
                    />
                  ) : (
                    <div className="flex min-h-[140px] items-center justify-center bg-slate-100 text-slate-400">
                      <User className="h-8 w-8" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-semibold text-slate-900">{selectedDriver.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedDriver.license_number}
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      {selectedDriver.phone}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900">
                  Files
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ["Fayda ID", selectedDriver.fayda_id_photos],
                    ["Normal ID", selectedDriver.normal_id_photos],
                    ["Wastena", selectedDriver.wastena_documents],
                    ["Contract", selectedDriver.contract_document],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {normalizeMediaItems(value).length
                          ? `${normalizeMediaItems(value).length} file${normalizeMediaItems(value).length !== 1 ? "s" : ""}`
                          : "No file"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {getDriverTrips(selectedDriver?.id, selectedDriver?.name).length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No trips found
                  </p>
                ) : (
                  getDriverTrips(selectedDriver?.id, selectedDriver?.name).map((trip) => (
                    <Link
                      key={trip.id}
                      to={`/trips/${trip.id}`}
                      onClick={() => setSelectedDriver(null)}
                      className="block rounded-lg bg-slate-50 p-3 hover:bg-slate-100"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-700">
                          {trip.origin} - {trip.destination}
                        </p>
                        <StatusBadge status={trip.status} />
                      </div>
                      <p className="text-xs text-slate-400">
                        {vehicleMap[trip.vehicle_id]?.plate_number || "Vehicle"} -{" "}
                        {trip.departure_datetime}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={(open) => (!open ? closeForm() : setShowForm(true))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDriver ? "Edit driver" : "Add new driver"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Full name", "name"],
                ["License number", "license_number"],
                ["Phone", "phone"],
                ["Status", "status"],
              ].map(([label, key]) => (
                <div key={key}>
                  <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </Label>
                  {key === "status" ? (
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, status: value }))
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["active", "inactive", "on_trip"].map((value) => (
                          <SelectItem key={value} value={value}>
                            {value.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={form[key]}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, [key]: event.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Assigned vehicle
              </Label>
              <Select
                value={form.assigned_vehicle_id || "none"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    assigned_vehicle_id: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vehicle" />
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
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Notes
              </Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>

            <MediaUpload
              label="Profile photo"
              helperText="Add one clear photo of the driver."
              value={form.profile_photo}
              onChange={(value) =>
                setForm((current) => ({ ...current, profile_photo: value }))
              }
              multiple={false}
              accept="image/*"
              emptyText="No profile photo yet."
            />

            <div className="grid gap-4">
              <MediaUpload
                label="Fayda ID"
                helperText="Upload the driver's Fayda card."
                value={form.fayda_id_photos}
                onChange={(value) =>
                  setForm((current) => ({ ...current, fayda_id_photos: value }))
                }
                accept="image/*,.pdf,.doc,.docx"
                emptyText="No Fayda ID uploaded yet."
              />
              <MediaUpload
                label="Government ID"
                helperText="Upload the government's ID or license file."
                value={form.normal_id_photos}
                onChange={(value) =>
                  setForm((current) => ({ ...current, normal_id_photos: value }))
                }
                accept="image/*,.pdf,.doc,.docx"
                emptyText="No Government ID uploaded yet."
              />
              <MediaUpload
                label="Wastena"
                helperText="Upload Wastena documents if the driver has them."
                value={form.wastena_documents}
                onChange={(value) =>
                  setForm((current) => ({ ...current, wastena_documents: value }))
                }
                accept="image/*,.pdf,.doc,.docx"
                emptyText="No Wastena documents uploaded yet."
              />
              <MediaUpload
                label="Contract"
                helperText="Upload the driver's contract."
                value={form.contract_document}
                onChange={(value) =>
                  setForm((current) => ({ ...current, contract_document: value }))
                }
                accept="image/*,.pdf,.doc,.docx"
                emptyText="No contract uploaded yet."
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeForm}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              {editingDriver ? "Update driver" : "Save driver"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
