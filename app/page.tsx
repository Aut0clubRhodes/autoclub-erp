'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import Window from '@/components/Window';
import { fetchCars, addCar, deleteCar } from '@/lib/carsApi';

type WindowType = 'Αυτοκίνητα' | 'Ταμείο' | 'Προμηθευτές' | null;

type Vehicle = {
  id: string;
  plate: string;
  category: string;
  brand: string;
  model: string;
  year: string;
  km: string;
  price: string;
  vin?: string;
  fuel?: string;
  engine_cc?: string;
  kteo_expiry?: string;
  insurance_expiry?: string;
  road_tax_expiry?: string;
};

const initialVehicles: Vehicle[] = [
  {
    id: '1',
    plate: 'PKA1815',
    category: 'A',
    brand: 'Peugeot',
    model: '108',
    year: '2019',
    km: '85,240',
    price: '€18,500',
    vin: '',
    fuel: '',
    engine_cc: '',
    kteo_expiry: '',
    insurance_expiry: '',
    road_tax_expiry: '',
  },
  {
    id: '2',
    plate: 'PKA4421',
    category: 'B',
    brand: 'Fiat',
    model: 'Panda',
    year: '2020',
    km: '62,100',
    price: '€14,200',
    vin: '',
    fuel: '',
    engine_cc: '',
    kteo_expiry: '',
    insurance_expiry: '',
    road_tax_expiry: '',
  },
  {
    id: '3',
    plate: 'PKA7712',
    category: 'A',
    brand: 'Toyota',
    model: 'Aygo',
    year: '2021',
    km: '41,650',
    price: '€16,800',
    vin: '',
    fuel: '',
    engine_cc: '',
    kteo_expiry: '',
    insurance_expiry: '',
    road_tax_expiry: '',
  },
];

export default function Home() {
  const [activeWindow, setActiveWindow] = useState<WindowType>(null);
  const [showAddCar, setShowAddCar] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [newVehicle, setNewVehicle] = useState<Vehicle>({
    id: '',
    plate: '',
    category: '',
    brand: '',
    model: '',
    year: '',
    km: '',
    price: '',
    vin: '',
    fuel: '',
    engine_cc: '',
    kteo_expiry: '',
    insurance_expiry: '',
    road_tax_expiry: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlate, setEditingPlate] = useState<string | null>(null);
  const [viewingPlate, setViewingPlate] = useState<string | null>(null);

  useEffect(() => {
    if (activeWindow === 'Αυτοκίνητα') {
      const loadCars = async () => {
        const cars = await fetchCars();
        const mappedCars = cars.map((car: any) => ({
          id: String(car.id),
          plate: car.plate || '',
          category: car.category || '',
          brand: car.brand || '',
          model: car.model || '',
          year: String(car.year || '0'),
          km: String(car.current_km || '0'),
          price: String(car.purchase_price || '€0'),
          vin: car.vin || '',
          fuel: car.fuel || '',
          engine_cc: car.engine_cc || '',
          kteo_expiry: car.kteo_expiry || '',
          insurance_expiry: car.insurance_expiry || '',
          road_tax_expiry: car.road_tax_expiry || '',
        }));
        setVehicles(mappedCars);
      };
      loadCars();
    }
  }, [activeWindow]);

  const handleWindowOpen = (windowId: string) => {
    setActiveWindow(windowId as WindowType);
    setShowAddCar(false);
  };

  const handleWindowClose = () => {
    setActiveWindow(null);
    setShowAddCar(false);
  };

  const openAddCarModal = () => {
    setEditingPlate(null);
    setViewingPlate(null);
    setNewVehicle({
      id: '',
      plate: '',
      category: '',
      brand: '',
      model: '',
      year: '',
      km: '',
      price: '',
      vin: '',
      fuel: '',
      engine_cc: '',
      kteo_expiry: '',
      insurance_expiry: '',
      road_tax_expiry: '',
    });
    setShowAddCar(true);
  };

  const openEditCarModal = (plate: string) => {
    const vehicle = vehicles.find((item) => item.plate === plate);
    if (!vehicle) return;
    setNewVehicle(vehicle);
    setEditingPlate(plate);
    setViewingPlate(null);
    setShowAddCar(true);
  };

  const openViewCarModal = (plate: string) => {
    setViewingPlate(plate);
  };

  const closeViewCarModal = () => {
    setViewingPlate(null);
  };

  const deleteVehicle = async (id: string) => {
  if (!window.confirm('Σίγουρα θέλετε να διαγράψετε αυτό το όχημα;')) return;

  const deleted = await deleteCar(id);

  if (deleted) {
    const updatedCars = await fetchCars();

    setVehicles(
      updatedCars.map((car: any) => ({
        id: String(car.id),
        plate: car.plate || '',
        category: car.category || '',
        brand: car.brand || '',
        model: car.model || '',
        year: String(car.year || ''),
        km: String(car.current_km || ''),
        price: String(car.purchase_price || ''),
        vin: car.vin || '',
        fuel: car.fuel || '',
        engine_cc: car.engine_cc || '',
        kteo_expiry: car.kteo_expiry || '',
        insurance_expiry: car.insurance_expiry || '',
        road_tax_expiry: car.road_tax_expiry || '',
    }))
  );
  }
};
  const closeAddCarModal = () => {
    setShowAddCar(false);
    setEditingPlate(null);
    setNewVehicle({
      id: '',
      plate: '',
      category: '',
      brand: '',
      model: '',
      year: '',
      km: '',
      price: '',
      vin: '',
      fuel: '',
      engine_cc: '',
      kteo_expiry: '',
      insurance_expiry: '',
      road_tax_expiry: '',
    });
  };

  const saveNewVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newVehicle.plate || !newVehicle.brand || !newVehicle.model) {
      return;
    }
    if (editingPlate) {
      setVehicles((current) =>
        current.map((vehicle) => (vehicle.plate === editingPlate ? newVehicle : vehicle))
      );
    } else {
  const insertedCar = await addCar({
    plate: newVehicle.plate,
    category: newVehicle.category,
    brand: newVehicle.brand,
    model: newVehicle.model,
    year: Number(newVehicle.year || 0),
    current_km: Number(newVehicle.km || 0),
    purchase_price: Number(String(newVehicle.price).replace(/[^\d]/g, '')),
    vin: newVehicle.vin,
    fuel: newVehicle.fuel,
    engine_cc: newVehicle.engine_cc,
  kteo_expiry: newVehicle.kteo_expiry || null,
insurance_expiry: newVehicle.insurance_expiry || null,
road_tax_expiry: newVehicle.road_tax_expiry || null,
  });
  if (insertedCar) {
  const updatedCars = await fetchCars();

  setVehicles(
    updatedCars.map((car: any) => ({
      id: String(car.id),
      plate: car.plate || '',
      category: car.category || '',
      brand: car.brand || '',
      model: car.model || '',
      year: String(car.year || ''),
      km: String(car.current_km || ''),
      price: String(car.purchase_price || ''),
      vin: car.vin || '',
      fuel: car.fuel || '',
      engine_cc: car.engine_cc || '',
      kteo_expiry: car.kteo_expiry || '',
      insurance_expiry: car.insurance_expiry || '',
      road_tax_expiry: car.road_tax_expiry || '',
    }))
  );
}  
  }
    setShowAddCar(false);
    setEditingPlate(null);
    setNewVehicle({
      id: '',
      plate: '',
      category: '',
      brand: '',
      model: '',
      year: '',
      km: '',
      price: '',
      vin: '',
      fuel: '',
      engine_cc: '',
      kteo_expiry: '',
      insurance_expiry: '',
      road_tax_expiry: '',
    });
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = searchTerm.toLowerCase();
    return (
      vehicle.plate.toLowerCase().includes(query) ||
      vehicle.category.toLowerCase().includes(query) ||
      vehicle.brand.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query)
    );
  });

  const renderWindowContent = () => {
    switch (activeWindow) {
      case 'Αυτοκίνητα':
        return (
          <div className="space-y-4">
            <div className="w-full max-w-3xl">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Αναζήτηση με πινακίδα, μάρκα, μοντέλο ή κατηγορία"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <VehiclesTable
              vehicles={filteredVehicles}
              onView={openViewCarModal}
              onEdit={openEditCarModal}
              onDelete={deleteVehicle}
            />
          </div>
        );
      case 'Ταμείο':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-zinc-400 text-lg">Τα οικονομικά δεδομένα θα εμφανίζονται εδώ</p>
            </div>
          </div>
        );
      case 'Προμηθευτές':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-zinc-400 text-lg">Οι προμηθευτές θα εμφανίζονται εδώ</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getWindowTitle = () => {
    switch (activeWindow) {
      case 'Αυτοκίνητα':
        return 'Διαχείριση Αυτοκινήτων';
      case 'Ταμείο':
        return 'Ταμείο';
      case 'Προμηθευτές':
        return 'Προμηθευτές';
      default:
        return '';
    }
  };

  const getWindowActions = () => {
    if (activeWindow === 'Αυτοκίνητα') {
      return (
        <button className="add-car-btn" type="button" onClick={openAddCarModal}>
          + Προσθήκη Αυτοκινήτου
        </button>
      );
    }
    return null;
  };

  return (
    <>
      <Sidebar onWindowOpen={handleWindowOpen} />
      <main className="flex-1 relative bg-zinc-950">
        {/* Homepage with centered logo */}
        {!activeWindow && (
          <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
            <div className="w-[500px] h-[500px] flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="AUTOCLUB"
                fill
                priority
                className="object-contain opacity-60 drop-shadow-2xl"
                sizes="500px"
              />
            </div>
          </div>
        )}

        {/* Floating Window */}
        {activeWindow && (
          <Window
            title={getWindowTitle()}
            onClose={handleWindowClose}
            titleActions={getWindowActions()}
          >
            {renderWindowContent()}
          </Window>
        )}

        {showAddCar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-[28px] bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/30 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white">
                  {editingPlate ? 'Επεξεργασία Αυτοκινήτου' : 'Νέο Αυτοκίνητο'}
                </h3>
                <button
                  type="button"
                  onClick={closeAddCarModal}
                  className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <form className="p-6 space-y-5" onSubmit={saveNewVehicle}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Πινακίδα</span>
                    <input
                      value={newVehicle.plate}
                      onChange={(event) => setNewVehicle({ ...newVehicle, plate: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Κατηγορία</span>
                    <select
                      value={newVehicle.category}
                      onChange={(event) => setNewVehicle({ ...newVehicle, category: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="">Επιλέξτε</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                      <option value="H">H</option>
                      <option value="H1">H1</option>
                      <option value="H2">H2</option>
                      <option value="H3">H3</option>
                      <option value="H4">H4</option>
                      <option value="H5">H5</option>
                      <option value="K">K</option>
                      <option value="K1">K1</option>
                      <option value="K2">K2</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Μάρκα</span>
                    <input
                      value={newVehicle.brand}
                      onChange={(event) => setNewVehicle({ ...newVehicle, brand: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Μοντέλο</span>
                    <input
                      value={newVehicle.model}
                      onChange={(event) => setNewVehicle({ ...newVehicle, model: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Έτος</span>
                    <input
                      value={newVehicle.year}
                      onChange={(event) => setNewVehicle({ ...newVehicle, year: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Χλμ</span>
                    <input
                      value={newVehicle.km}
                      onChange={(event) => setNewVehicle({ ...newVehicle, km: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Τιμή Αγοράς</span>
                    <input
                      value={newVehicle.price}
                      onChange={(event) => setNewVehicle({ ...newVehicle, price: event.target.value })}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeAddCarModal}
                    className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    Ακύρωση
                  </button>
                  <button type="submit" className="add-car-btn w-full sm:w-auto">
                    Αποθήκευση
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewingPlate && (
          <VehicleViewModal
            vehicle={vehicles.find((v) => v.plate === viewingPlate)!}
            onClose={closeViewCarModal}
          />
        )}
      </main>
    </>
  );
}
function formatEuro(value: string) {
  const numericValue = Number(String(value).replace(/[^\d.]/g, ''));

  if (!numericValue) {
    return '€0';
  }

  return `€${numericValue.toLocaleString()}`;
}
function VehiclesTable({
  vehicles,
  onView,
  onEdit,
  onDelete,
}: {
  vehicles: Vehicle[];
  onView: (plate: string) => void;
  onEdit: (plate: string) => void;
  onDelete: (plate: string) => void;
}) {
  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Πινακίδα</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Κατηγορία</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Μάρκα</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Μοντέλο</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Έτος</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Χλμ</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Τιμή Αγοράς</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.plate} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                <td className="py-4 px-4 text-sm text-zinc-200 font-mono">{vehicle.plate}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.category}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.brand}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.model}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.year}</td>
                <td className="py-4 px-4 text-sm text-zinc-200">{vehicle.km}</td>
                <td className="py-4 px-4 text-sm text-zinc-200 font-medium">{formatEuro(vehicle.price)}</td>
                <td className="py-4 px-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onView(vehicle.plate)}
                      className="rounded-2xl border border-sky-600 bg-zinc-900 px-3 py-2 text-xs text-sky-300 transition hover:bg-sky-500/10"
                    >
                      Προβολή
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(vehicle.plate)}
                      className="rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white transition hover:bg-zinc-800"
                    >
                      Επεξεργασία
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(vehicle.id)}
                      className="rounded-2xl border border-rose-600 bg-zinc-900 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-500/10"
                    >
                      Διαγραφή
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VehicleViewModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-[28px] bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/30 overflow-hidden max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Φάκελος Αυτοκινήτου</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-6">
            {/* Βασικά Στοιχεία Section */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Βασικά Στοιχεία</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Πινακίδα</p>
                  <p className="text-xs font-mono text-white">{vehicle.plate}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Κατηγορία</p>
                  <p className="text-xs text-white">{vehicle.category}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Μάρκα</p>
                  <p className="text-xs text-white">{vehicle.brand}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Μοντέλο</p>
                  <p className="text-xs text-white">{vehicle.model}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Έτος</p>
                  <p className="text-xs text-white">{vehicle.year}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Χλμ</p>
                  <p className="text-xs text-white">{vehicle.km}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Τιμή Αγοράς</p>
                  <p className="text-xs text-white">{formatEuro(vehicle.price)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">VIN</p>
                  <p className="text-xs text-zinc-400">-</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Κυβικά</p>
                  <p className="text-xs text-zinc-400">-</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Καύσιμο</p>
                  <p className="text-xs text-zinc-400">-</p>
                </div>
              </div>
            </div>

            {/* Έγγραφα Section */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Έγγραφα</h4>
              <div className="space-y-2 bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
                <button className="w-full rounded-2xl border border-zinc-700 bg-zinc-850 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800">
                  Άδεια Κυκλοφορίας
                </button>
                <button className="w-full rounded-2xl border border-zinc-700 bg-zinc-850 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800">
                  ΚΤΕΟ
                </button>
                <div className="pt-2 border-t border-zinc-700">
                  <p className="text-xs text-zinc-400 mb-1">ΚΤΕΟ Λήξη</p>
                  <p className="text-xs text-zinc-400">-</p>
                </div>
              </div>
            </div>

            {/* Ιστορικό Service Section */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Ιστορικό Service</h4>
              <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
                <p className="text-xs text-zinc-400">Δεν υπάρχουν ακόμα καταχωρήσεις service για αυτό το όχημα.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

