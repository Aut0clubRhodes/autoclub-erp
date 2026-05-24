'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { fetchCars } from '@/lib/carsApi';
import {
  deleteCarDocument,
  fetchCarDocuments,
  getCarDocumentPublicUrl,
  uploadCarDocument,
  type CarDocumentRecord,
} from '@/lib/carDocumentsApi';

type DocumentVehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
};

type DocumentRow = {
  document: CarDocumentRecord;
  vehicle: DocumentVehicle;
};

const LICENSE_TYPE = 'Άδεια Κυκλοφορίας';

export default function VehicleDocumentsManager() {
  const [vehicles, setVehicles] = useState<DocumentVehicle[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<DocumentRow | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    const carRows = await fetchCars();
    const mappedVehicles = (carRows || []).map((car: any) => ({
      id: String(car.id),
      plate: String(car.plate || ''),
      brand: String(car.brand || ''),
      model: String(car.model || ''),
    }));

    const documentGroups = await Promise.all(
      mappedVehicles.map(async (vehicle) => {
        const carDocuments = await fetchCarDocuments(Number(vehicle.id));
        return carDocuments
          .filter((document) => document.document_type === LICENSE_TYPE)
          .map((document) => ({ document, vehicle }));
      })
    );

    setVehicles(mappedVehicles);
    setDocuments(documentGroups.flat());
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter(({ vehicle }) => vehicle.plate.toLowerCase().includes(query));
  }, [documents, searchTerm]);

  const handleUpload = async () => {
    if (!selectedVehicleId) {
      alert('Επιλέξτε όχημα πρώτα.');
      return;
    }

    if (!selectedFile) {
      alert('Επιλέξτε αρχείο πρώτα.');
      return;
    }

    setUploading(true);
    const created = await uploadCarDocument({
      carId: Number(selectedVehicleId),
      documentType: LICENSE_TYPE,
      file: selectedFile,
      notes: null,
    });
    setUploading(false);

    if (!created) {
      alert('Η άδεια δεν αποθηκεύτηκε.');
      return;
    }

    setSelectedFile(null);
    await loadDocuments();
  };

  const openDocument = (row: DocumentRow) => {
    setViewer(row);
  };

  const downloadDocument = (row: DocumentRow) => {
    const link = window.document.createElement('a');
    link.href = getCarDocumentPublicUrl(row.document.file_url);
    link.download = row.document.file_name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handleDeleteDocument = async (row: DocumentRow) => {
    if (!window.confirm('Να διαγραφεί αυτό το έγγραφο;')) return;

    const deleted = await deleteCarDocument(row.document);
    if (!deleted) return;

    await loadDocuments();
  };

  return (
    <div className="space-y-5 text-white">
      <div className="rounded-3xl border border-sky-300/10 bg-[linear-gradient(135deg,rgba(56,189,248,0.07),rgba(8,12,18,0.42)_45%,rgba(255,255,255,0.02))] px-5 py-4 shadow-[0_20px_54px_rgba(0,0,0,0.24)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/65">Vehicle documents</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Έγγραφα</h1>
        <p className="mt-2 text-sm text-zinc-400">Ανέβασμα και αναζήτηση αδειών κυκλοφορίας ανά όχημα.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-3xl border border-white/[0.075] bg-white/[0.025] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.24)]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Αναζήτηση με πινακίδα..."
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06]">
            <div className="grid grid-cols-[1.1fr_1.4fr_1.3fr_1fr_1.2fr] bg-zinc-950/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              <span>Πινακίδα</span>
              <span>Όχημα</span>
              <span>Τύπος</span>
              <span>Upload</span>
              <span className="text-right">Ενέργειες</span>
            </div>

            {loading && <p className="px-4 py-6 text-sm text-zinc-500">Φόρτωση εγγράφων...</p>}

            {!loading &&
              filteredDocuments.map((row) => (
                <div
                  key={row.document.id}
                  className="grid grid-cols-[1.1fr_1.4fr_1.3fr_1fr_1.2fr] items-center border-t border-white/[0.055] px-4 py-3 text-sm transition duration-200 hover:bg-white/[0.035]"
                >
                  <span className="font-mono text-white">{row.vehicle.plate}</span>
                  <span className="text-zinc-300">
                    {row.vehicle.brand} {row.vehicle.model}
                  </span>
                  <span className="text-sky-100">{row.document.document_type}</span>
                  <span className="text-zinc-400">
                    {row.document.created_at ? new Date(row.document.created_at).toLocaleDateString('el-GR') : '-'}
                  </span>
                  <span className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openDocument(row)}
                      className="rounded-xl border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-medium text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-400/18"
                    >
                      Προβολή
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDocument(row)}
                      className="rounded-xl border border-zinc-600 bg-zinc-800/30 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700/40"
                    >
                      Λήψη
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(row)}
                      className="rounded-xl border border-rose-600 bg-zinc-900 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10"
                    >
                      Διαγραφή
                    </button>
                  </span>
                </div>
              ))}

            {!loading && filteredDocuments.length === 0 && (
              <p className="border-t border-white/[0.055] px-4 py-6 text-sm text-zinc-500">
                Δεν υπάρχουν καταχωρημένες άδειες κυκλοφορίας.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-300/12 bg-emerald-300/[0.035] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          <p className="text-sm font-semibold text-white">Ανέβασμα Άδειας Κυκλοφορίας</p>
          <div className="mt-4 space-y-3">
            <label className="block space-y-2 text-sm text-zinc-300">
              <span>Όχημα</span>
              <select
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="">Επιλογή οχήματος</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </label>

            <label className="block cursor-pointer rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 transition hover:bg-emerald-500/20">
              <span className="block font-medium">Αρχείο άδειας</span>
              <span className="mt-1 block text-xs text-emerald-100/70">
                {selectedFile ? selectedFile.name : 'PDF ή εικόνα'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !selectedVehicle || !selectedFile}
              className="w-full rounded-2xl border border-emerald-400/25 bg-emerald-400/12 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {uploading ? 'Ανέβασμα...' : 'Ανέβασμα Άδειας Κυκλοφορίας'}
            </button>
          </div>
        </div>
      </div>

      {viewer && <DocumentPreviewModal row={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

function DocumentPreviewModal({ row, onClose }: { row: DocumentRow; onClose: () => void }) {
  const url = getCarDocumentPublicUrl(row.document.file_url);
  const fileName = row.document.file_name || '';
  const isImage = Boolean(fileName.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/));
  const [modalSize, setModalSize] = useState({ width: 1050, height: 620 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
  } | null>(null);
  const panStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    x: number;
    y: number;
  } | null>(null);

  const closeViewer = () => {
    onClose();
  };

  const resetImageView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const startResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizeStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      width: modalSize.width,
      height: modalSize.height,
    };
  };

  const startPan = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isImage) return;

    event.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      x: pan.x,
      y: pan.y,
    };
  };

  const movePan = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isPanning || !panStartRef.current) return;

    setPan({
      x: panStartRef.current.x + event.clientX - panStartRef.current.mouseX,
      y: panStartRef.current.y + event.clientY - panStartRef.current.mouseY,
    });
  };

  const stopPan = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  useEffect(() => {
    resetImageView();
  }, [row.document.id]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeStartRef.current) return;

      const nextWidth = resizeStartRef.current.width + event.clientX - resizeStartRef.current.mouseX;
      const nextHeight = resizeStartRef.current.height + event.clientY - resizeStartRef.current.mouseY;
      const maxWidth = window.innerWidth - 80;
      const maxHeight = window.innerHeight - 80;

      setModalSize({
        width: Math.min(Math.max(nextWidth, 620), maxWidth),
        height: Math.min(Math.max(nextHeight, 420), maxHeight),
      });
    };

    const handleMouseUp = () => {
      resizeStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const controlButtonClass =
    'rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-sky-300/25 hover:bg-sky-300/[0.08] hover:text-white';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-8 backdrop-blur-sm">
      <div
        className="relative flex max-h-[calc(100vh-80px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl"
        style={{ width: modalSize.width, height: modalSize.height }}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/65">ΑΔΕΙΑ ΚΥΚΛΟΦΟΡΙΑΣ</p>
            <h3 className="mt-1 truncate text-xl font-semibold text-white">{row.vehicle.plate}</h3>
            <p className="mt-1 truncate text-sm text-zinc-400">
              {row.vehicle.brand} {row.vehicle.model}
            </p>
          </div>
          <button
            type="button"
            onClick={closeViewer}
            className="rounded-xl border border-transparent p-2 text-zinc-400 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
            aria-label="Κλείσιμο"
          >
            ×
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-6 py-4">
          {isImage && (
            <>
              <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.15))} className={controlButtonClass}>
                Zoom -
              </button>
              <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.15))} className={controlButtonClass}>
                Zoom +
              </button>
              <button type="button" onClick={resetImageView} className={controlButtonClass}>
                Reset view
              </button>
            </>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className={controlButtonClass}>
            Άνοιγμα σε νέα καρτέλα
          </a>
          <a href={url} download={fileName} target="_blank" rel="noopener noreferrer" className={controlButtonClass}>
            Λήψη
          </a>
        </div>

        <div
          className={`mx-6 mb-6 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black/30 ${
            isImage ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
          }`}
          onMouseDown={startPan}
          onMouseMove={movePan}
          onMouseUp={stopPan}
          onMouseLeave={stopPan}
        >
          {isImage ? (
            <img
              src={url}
              alt={row.vehicle.plate}
              draggable={false}
              className="block max-h-full max-w-full select-none rounded-2xl object-contain transition-transform duration-150"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <iframe
              title={fileName || 'Άδεια Κυκλοφορίας'}
              src={url}
              className="h-full w-full border-0 bg-zinc-950"
            />
          )}
        </div>
        <div
          role="presentation"
          onMouseDown={startResize}
          className="absolute bottom-3 right-3 h-4 w-4 cursor-se-resize rounded-sm border-b-2 border-r-2 border-sky-200/70 opacity-50 transition hover:opacity-100"
        />
      </div>
    </div>
  );
}
