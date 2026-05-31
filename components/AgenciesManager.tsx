'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Agency {
  id: number;
  name: string;
}

interface Representative {
  id: number;
  name: string;
  agency_id: number;
}

export default function AgenciesManager() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [newAgency, setNewAgency] = useState('');
  const [newRepresentatives, setNewRepresentatives] = useState<Record<number, string>>({});
  const [editingAgencyId, setEditingAgencyId] = useState<number | null>(null);
  const [editingAgencyName, setEditingAgencyName] = useState('');
  const [editingRepresentativeId, setEditingRepresentativeId] = useState<number | null>(null);
  const [editingRepresentativeName, setEditingRepresentativeName] = useState('');

  const loadAgencies = async () => {
    const { data } = await supabase
      .from('agencies')
      .select('*')
      .order('name');

    setAgencies(data || []);
  };

  const loadRepresentatives = async () => {
    const { data } = await supabase
      .from('representatives')
      .select('*')
      .order('name');

    setRepresentatives(data || []);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const [{ data: agencyData }, { data: representativeData }] = await Promise.all([
        supabase.from('agencies').select('*').order('name'),
        supabase.from('representatives').select('*').order('name'),
      ]);

      setAgencies(agencyData || []);
      setRepresentatives(representativeData || []);
    };

    loadInitialData();
  }, []);

  const addAgency = async () => {
    if (!newAgency.trim()) return;

    await supabase.from('agencies').insert({
      name: newAgency,
    });

    setNewAgency('');
    loadAgencies();
  };

  const deleteAgency = async (id: number) => {
    await supabase
      .from('agencies')
      .delete()
      .eq('id', id);

    loadAgencies();
    loadRepresentatives();
  };

  const startEditAgency = (agency: Agency) => {
    setEditingAgencyId(agency.id);
    setEditingAgencyName(agency.name);
  };

  const saveAgency = async () => {
    if (!editingAgencyId || !editingAgencyName.trim()) return;

    await supabase
      .from('agencies')
      .update({ name: editingAgencyName.trim() })
      .eq('id', editingAgencyId);

    setEditingAgencyId(null);
    setEditingAgencyName('');
    loadAgencies();
  };

  const cancelAgencyEdit = () => {
    setEditingAgencyId(null);
    setEditingAgencyName('');
  };

  const addRepresentative = async (agencyId: number) => {
    const name = newRepresentatives[agencyId]?.trim();
    if (!name) return;

    await supabase.from('representatives').insert({
      name,
      agency_id: agencyId,
    });

    setNewRepresentatives((current) => ({
      ...current,
      [agencyId]: '',
    }));
    loadRepresentatives();
  };

  const deleteRepresentative = async (id: number) => {
    await supabase
      .from('representatives')
      .delete()
      .eq('id', id);

    loadRepresentatives();
  };

  const startEditRepresentative = (representative: Representative) => {
    setEditingRepresentativeId(representative.id);
    setEditingRepresentativeName(representative.name);
  };

  const saveRepresentative = async () => {
    if (!editingRepresentativeId || !editingRepresentativeName.trim()) return;

    await supabase
      .from('representatives')
      .update({ name: editingRepresentativeName.trim() })
      .eq('id', editingRepresentativeId);

    setEditingRepresentativeId(null);
    setEditingRepresentativeName('');
    loadRepresentatives();
  };

  const cancelRepresentativeEdit = () => {
    setEditingRepresentativeId(null);
    setEditingRepresentativeName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input
          value={newAgency}
          onChange={(e) => setNewAgency(e.target.value)}
          placeholder="Νέο πρακτορείο"
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white"
        />

        <button
          onClick={addAgency}
          className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-3 rounded-xl font-medium"
        >
          Προσθήκη
        </button>
      </div>

      <div className="space-y-3">
        {agencies.map((agency) => (
          <div
            key={agency.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {editingAgencyId === agency.id ? (
                <div className="flex min-w-0 flex-1 gap-2">
                  <input
                    value={editingAgencyName}
                    onChange={(event) => setEditingAgencyName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveAgency();
                      if (event.key === 'Escape') cancelAgencyEdit();
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-cyan-300/25 bg-zinc-950 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-cyan-300/55"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveAgency}
                    className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/16"
                  >
                    Αποθήκευση
                  </button>
                  <button
                    type="button"
                    onClick={cancelAgencyEdit}
                    className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.04]"
                  >
                    Άκυρο
                  </button>
                </div>
              ) : (
                <span className="text-sm font-semibold text-white">
                  {agency.name}
                </span>
              )}

              {editingAgencyId !== agency.id && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditAgency(agency)}
                    className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-400/16"
                  >
                    Επεξεργασία
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAgency(agency.id)}
                    className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-300/35 hover:bg-red-400/16 hover:text-red-200"
                  >
                    Διαγραφή
                  </button>
                </div>
              )}
            </div>

            <details className="mt-4 border-t border-zinc-800 pt-4">
              <summary className="cursor-pointer text-sm text-zinc-300 hover:text-white">
                Αντιπρόσωποι
              </summary>

              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  {representatives
                    .filter((representative) => representative.agency_id === agency.id)
                    .map((representative) => (
                      <div
                        key={representative.id}
                        className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        {editingRepresentativeId === representative.id ? (
                          <div className="flex min-w-0 flex-1 gap-2">
                            <input
                              value={editingRepresentativeName}
                              onChange={(event) => setEditingRepresentativeName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') saveRepresentative();
                                if (event.key === 'Escape') cancelRepresentativeEdit();
                              }}
                              className="min-w-0 flex-1 rounded-xl border border-cyan-300/25 bg-black/30 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-cyan-300/55"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={saveRepresentative}
                              className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/16"
                            >
                              Αποθήκευση
                            </button>
                            <button
                              type="button"
                              onClick={cancelRepresentativeEdit}
                              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.04]"
                            >
                              Άκυρο
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-zinc-100">
                            {representative.name}
                          </span>
                        )}

                        {editingRepresentativeId !== representative.id && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditRepresentative(representative)}
                              className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-400/16"
                            >
                              Επεξεργασία
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRepresentative(representative.id)}
                              className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-300/35 hover:bg-red-400/16 hover:text-red-200"
                            >
                              Διαγραφή
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                <div className="flex gap-3">
                  <input
                    value={newRepresentatives[agency.id] || ''}
                    onChange={(e) =>
                      setNewRepresentatives((current) => ({
                        ...current,
                        [agency.id]: e.target.value,
                      }))
                    }
                    placeholder="Νέος αντιπρόσωπος"
                    className="min-w-0 flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                  />

                  <button
                    onClick={() => addRepresentative(agency.id)}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-3 rounded-xl font-medium"
                  >
                    Προσθήκη
                  </button>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
