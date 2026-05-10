'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import Window from '@/components/Window';

type WindowType = 'Αυτοκίνητα' | 'Ταμείο' | 'Προμηθευτές' | null;

export default function Home() {
  const [activeWindow, setActiveWindow] = useState<WindowType>(null);
  const [showAddCar, setShowAddCar] = useState(false);
  const [vehicles, setVehicles] = useState([
    { plate: 'PKA1815', category: 'A', brand: 'Peugeot', model: '108', year: '2019', km: '85,240', price: '€18,500' },
    { plate: 'PKA4421', category: 'B', brand: 'Fiat', model: 'Panda', year: '2020', km: '62,100', price: '€14,200' },
    { plate: 'PKA7712', category: 'A', brand: 'Toyota', model: 'Aygo', year: '2021', km: '41,650', price: '€16,800' },
  ]);
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    category: '',
    brand: '',
    model: '',
    year: '',
    km: '',
    price: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlate, setEditingPlate] = useState<string | null>(null);

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
    setNewVehicle({ plate: '', category: '', brand: '', model: '', year: '', km: '', price: '' });
    setShowAddCar(true);
  };

  const openEditCarModal = (plate: string) => {
    const vehicle = vehicles.find((item) => item.plate === plate);
    if (!vehicle) return;
    setNewVehicle(vehicle);
    setEditingPlate(plate);
    setShowAddCar(true);
  };

  const deleteVehicle = (plate: string) => {
    if (!window.confirm('Σίγουρα θέλετε να διαγράψετε αυτό το όχημα;')) return;
    setVehicles((current) => current.filter((vehicle) => vehicle.plate !== plate));
  };

  const closeAddCarModal = () => {
    setShowAddCar(false);
    setEditingPlate(null);
    setNewVehicle({ plate: '', category: '', brand: '', model: '', year: '', km: '', price: '' });
  };

  const saveNewVehicle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newVehicle.plate || !newVehicle.brand || !newVehicle.model) {
      return;
    }
    if (editingPlate) {
      setVehicles((current) =>
        current.map((vehicle) => (vehicle.plate === editingPlate ? newVehicle : vehicle))
      );
    } else {
      setVehicles((current) => [...current, newVehicle]);
    }
    setShowAddCar(false);
    setEditingPlate(null);
    setNewVehicle({ plate: '', category: '', brand: '', model: '', year: '', km: '', price: '' });
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
      </main>
    </>
  );
}

function VehiclesTable({
  vehicles,
  onEdit,
  onDelete,
}: {
  vehicles: { plate: string; category: string; brand: string; model: string; year: string; km: string; price: string; }[];
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
                <td className="py-4 px-4 text-sm text-zinc-200 font-medium">{vehicle.price}</td>
                <td className="py-4 px-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="service-history-btn">
                      Ιστορικό Service
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
                      onClick={() => onDelete(vehicle.plate)}
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

