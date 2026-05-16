'use client';

import { useEffect, useState } from 'react';
import {
  addSupplier,
  deleteSupplier,
  fetchSuppliers,
  type SupplierRecord,
} from '@/lib/suppliersApi';

export default function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [newSupplier, setNewSupplier] = useState('');

  const loadSuppliers = async () => {
    setSuppliers(await fetchSuppliers());
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleAddSupplier = async () => {
    const name = newSupplier.trim();
    if (!name) return;

    const created = await addSupplier(name);
    if (!created) return;

    setNewSupplier('');
    loadSuppliers();
  };

  const handleDeleteSupplier = async (id: number) => {
    const deleted = await deleteSupplier(id);
    if (!deleted) return;

    loadSuppliers();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input
          value={newSupplier}
          onChange={(event) => setNewSupplier(event.target.value)}
          placeholder="Νέος προμηθευτής"
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white"
        />
        <button
          type="button"
          onClick={handleAddSupplier}
          className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-3 rounded-xl font-medium"
        >
          Προσθήκη
        </button>
      </div>

      <div className="space-y-3">
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3"
          >
            <div>
              <div className="text-white">{supplier.name}</div>
              {(supplier.phone || supplier.email || supplier.notes) && (
                <div className="mt-1 text-sm text-zinc-400">
                  {[supplier.phone, supplier.email, supplier.notes].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDeleteSupplier(supplier.id)}
              className="text-red-500 hover:text-red-400"
            >
              Διαγραφή
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
