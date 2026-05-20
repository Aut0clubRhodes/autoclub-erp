'use client';

import { useState } from 'react';

type DebtImportVehicle = {
  id: string | number;
  plate: string;
  brand?: string | null;
  model?: string | null;
};

type DebtImportModalProps = {
  vehicles: DebtImportVehicle[];
  onClose: () => void;
};

export default function DebtImportModal({ vehicles, onClose }: DebtImportModalProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    console.log('analysis started');
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-[min(720px,92vw)] flex-col overflow-hidden rounded-[28px] border border-sky-300/15 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(8,12,18,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/70">OCR Import</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Import Δοσολογίου Δανείου</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <label className="block space-y-2 text-sm text-zinc-300">
            <span>Αυτοκίνητο</span>
            <select
              value={selectedVehicleId}
              onChange={(event) => setSelectedVehicleId(event.target.value)}
              className="input"
            >
              <option value="">Επιλογή αυτοκινήτου</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {[vehicle.plate, `${vehicle.brand || ''} ${vehicle.model || ''}`.trim()].filter(Boolean).join(' - ')}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm text-zinc-300">
            <span>Αρχείο Δοσολογίου</span>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-sky-400"
            />
          </label>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300">
            {selectedFile ? `Επιλεγμένο αρχείο: ${selectedFile.name}` : 'Δεν έχει επιλεγεί αρχείο.'}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/[0.08] bg-black/20 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]"
          >
            Ακύρωση
          </button>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!selectedVehicleId || !selectedFile || isAnalyzing}
            className="rounded-2xl border border-sky-400/30 bg-sky-400/10 px-5 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAnalyzing ? 'Ανάλυση...' : 'Ανάλυση Αρχείου'}
          </button>
        </div>
      </div>
    </div>
  );
}
