'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Agency {
  id: number;
  name: string;
}

export default function AgenciesManager() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [newAgency, setNewAgency] = useState('');

  const loadAgencies = async () => {
    const { data } = await supabase
      .from('agencies')
      .select('*')
      .order('name');

    setAgencies(data || []);
  };

  useEffect(() => {
    loadAgencies();
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

      <div className="space-y-2">
        {agencies.map((agency) => (
          <div
            key={agency.id}
            className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3"
          >
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
        ))}
      </div>
    </div>
  );
}