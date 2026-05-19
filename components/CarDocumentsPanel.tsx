'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  deleteCarDocument,
  fetchCarDocuments,
  uploadCarDocument,
  type CarDocumentRecord,
} from '@/lib/carDocumentsApi';

type VehicleDocumentTarget = {
  id: string;
  plate: string;
};

type CarDocumentsPanelProps = {
  vehicle: VehicleDocumentTarget;
  onClose: () => void;
};

const documentTypes = ['Άδεια Κυκλοφορίας', 'Ασφάλεια', 'ΚΤΕΟ', 'Leasing', 'Άλλο'];

export default function CarDocumentsPanel({ vehicle, onClose }: CarDocumentsPanelProps) {
  const [documents, setDocuments] = useState<CarDocumentRecord[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documentType, setDocumentType] = useState(documentTypes[0]);
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadDocuments = async () => {
    setDocuments(await fetchCarDocuments(Number(vehicle.id)));
  };

  useEffect(() => {
    loadDocuments();
  }, [vehicle.id]);

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setDocumentType(documentTypes[0]);
    setNotes('');
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Επιλέξτε αρχείο.');
      return;
    }

    setUploading(true);
    const created = await uploadCarDocument({
      carId: Number(vehicle.id),
      documentType,
      file: selectedFile,
      notes,
    });
    setUploading(false);

    if (!created) {
      alert('Το έγγραφο δεν αποθηκεύτηκε.');
      return;
    }

    closeUploadModal();
    await loadDocuments();
  };

  const handleDelete = async (document: CarDocumentRecord) => {
    if (!window.confirm(`Να διαγραφεί το έγγραφο "${document.file_name}";`)) return;

    const deleted = await deleteCarDocument(document);

    if (!deleted) {
      alert('Το έγγραφο δεν διαγράφηκε.');
      return;
    }

    setDocuments((current) => current.filter((item) => item.id !== document.id));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[84vh] w-[min(920px,94vw)] flex-col overflow-hidden rounded-[28px] border border-sky-300/15 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Έγγραφα Οχήματος</h3>
            <p className="mt-1 text-sm text-zinc-500">{vehicle.plate}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/[0.05] hover:text-white">
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="rounded-2xl border border-sky-400/25 bg-sky-400/10 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/20"
            >
              + Upload Εγγράφου
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-zinc-900/90">
                <tr>
                  {['Τύπος', 'Ημ/νία Upload', 'Αρχείο', 'Ενέργειες'].map((label) => (
                    <th key={label} className="px-4 py-3 text-sm font-medium text-zinc-400">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-sm text-zinc-200">{document.document_type}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                      {document.created_at?.slice(0, 10) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{document.file_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => window.open(document.file_url, '_blank', 'noopener,noreferrer')}
                          className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100 transition hover:bg-sky-500/20"
                        >
                          Προβολή
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(document)}
                          className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 transition hover:bg-rose-500/20"
                        >
                          Διαγραφή
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {documents.length === 0 && <p className="p-6 text-sm text-zinc-500">Δεν υπάρχουν καταχωρημένα έγγραφα.</p>}
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-[min(560px,92vw)] overflow-hidden rounded-[28px] border border-sky-300/15 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
              <h3 className="text-lg font-semibold text-white">Upload Εγγράφου</h3>
              <button type="button" onClick={closeUploadModal} className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/[0.05] hover:text-white">
                ×
              </button>
            </div>
            <div className="space-y-4 p-6">
              <Field label="Τύπος Εγγράφου">
                <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="input">
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Σημειώσεις">
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="input min-h-24" />
              </Field>
              <Field label="Upload file">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-sky-400"
                />
              </Field>
              {selectedFile && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300">
                  {selectedFile.name}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-zinc-800 bg-black/20 px-6 py-4">
              <button type="button" onClick={closeUploadModal} className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2 text-sm text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
