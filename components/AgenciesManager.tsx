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
            <div className="flex items-center justify-between gap-4">
              <span className="text-white">
                {agency.name}
              </span>

              <button
                onClick={() => deleteAgency(agency.id)}
                className="text-red-500 hover:text-red-400"
              >
                Διαγραφή
              </button>
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
                        className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
                      >
                        <span className="text-sm text-zinc-100">
                          {representative.name}
                        </span>

                        <button
                          onClick={() => deleteRepresentative(representative.id)}
                          className="text-sm text-red-500 hover:text-red-400"
                        >
                          Διαγραφή
                        </button>
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
