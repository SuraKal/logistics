import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { appClient } from '@/lib/local-client';
import { Plus, User, Phone, Car, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '../components/StatusBadge';

export default function Drivers() {


  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [form, setForm] = useState({ name: '', license_number: '', phone: '', assigned_vehicle_id: '', status: 'active' });

  const load = async () => {
    const [d, v, t] = await Promise.all([appClient.entities.Driver.list(), appClient.entities.Vehicle.list(), appClient.entities.Trip.list('-created_date', 100)]);
    setDrivers(d);
    setVehicles(v);
    setTrips(t);
  };

  useEffect(() => { load(); }, []);

  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  const handleAdd = async () => {
    await appClient.entities.Driver.create(form);
    setShowAdd(false);
    setForm({ name: '', license_number: '', phone: '', assigned_vehicle_id: '', status: 'active' });
    load();
  };

  const getDriverTrips = (driverId, driverName) => trips.filter(t => t.driver_id === driverId || t.driver_name === driverName);

  const filtered = drivers.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.license_number?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Driver Management</h1>
          <p className="text-sm text-slate-500">{drivers.length} drivers registered</p>
        </div>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Driver
          </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search drivers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(driver => {
          const assignedVehicle = vehicleMap[driver.assigned_vehicle_id];
          const driverTrips = getDriverTrips(driver.id, driver.name);
          return (
            <div key={driver.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDriver(driver)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{driver.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{driver.license_number}</p>
                  </div>
                </div>
                <StatusBadge status={driver.status} />
              </div>
              <div className="space-y-1 text-sm text-slate-500">
                <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{driver.phone}</div>
                {assignedVehicle && <div className="flex items-center gap-2"><Car className="w-3 h-3" />{assignedVehicle.plate_number} — {assignedVehicle.make} {assignedVehicle.model}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50 text-xs text-slate-400">
                {driverTrips.length} trip{driverTrips.length !== 1 ? 's' : ''} total
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-slate-400"><User className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No drivers found</p></div>
        )}
      </div>

      {/* Driver Trip History Modal */}
      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedDriver?.name} — Trip History</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            {getDriverTrips(selectedDriver?.id, selectedDriver?.name).length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">No trips found</p>
            ) : getDriverTrips(selectedDriver?.id, selectedDriver?.name).map(t => (
              <Link key={t.id} to={`/trips/${t.id}`} onClick={() => setSelectedDriver(null)} className="block bg-slate-50 rounded-lg p-3 hover:bg-slate-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">{t.origin} → {t.destination}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-xs text-slate-400">{vehicleMap[t.vehicle_id]?.plate_number} · {t.departure_datetime}</p>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Driver Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Driver</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {[['Full Name', 'name'], ['License Number', 'license_number'], ['Phone', 'phone']].map(([l, k]) => (
              <div key={k}><Label className="text-xs">{l}</Label><Input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>
            ))}
            <div>
              <Label className="text-xs">Assigned Vehicle (optional)</Label>
              <Select value={form.assigned_vehicle_id || "none"} onValueChange={v => setForm(f => ({ ...f, assigned_vehicle_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleAdd}>Add Driver</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
