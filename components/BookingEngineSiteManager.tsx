'use client';

import { useEffect, useState } from 'react';
import { Copy, Globe2, Pencil, Plus, Power, RefreshCw, Trash2 } from 'lucide-react';
import {
  BOOKING_ENGINE_SITES_CHANGED_EVENT,
  BOOKING_ENGINE_SELECTED_SITE_CHANGED_EVENT,
  createBookingEngineSite,
  deleteBookingEngineSiteIfSafe,
  duplicateBookingEngineSite,
  emptyBookingEngineSiteInput,
  fetchBookingEngineSiteForEdit,
  fetchBookingEngineSites,
  getSelectedBookingEngineSiteId,
  setSelectedBookingEngineSiteId,
  updateBookingEngineSite,
  updateBookingEngineSiteStatus,
  type BookingEngineSiteInput,
  type BookingEngineSiteSummary,
} from '@/lib/bookingEngineSites';

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
};

export default function BookingEngineSiteManager() {
  const [sites, setSites] = useState<BookingEngineSiteSummary[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState(() => getSelectedBookingEngineSiteId());
  const [draft, setDraft] = useState<BookingEngineSiteInput>(() => emptyBookingEngineSiteInput());
  const [showCreate, setShowCreate] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSites = async () => {
    setLoading(true);
    setError('');
    try {
      const nextSites = await fetchBookingEngineSites();
      setSites(nextSites);
      const storedSiteId = getSelectedBookingEngineSiteId();
      const nextSelectedSiteId =
        nextSites.find((site) => site.id === storedSiteId)?.id || nextSites[0]?.id || '';
      setSelectedSiteId(nextSelectedSiteId);
      if (nextSelectedSiteId && nextSelectedSiteId !== storedSiteId) {
        setSelectedBookingEngineSiteId(nextSelectedSiteId);
      }
    } catch (loadError) {
      console.error('SITE MANAGER LOAD FAILED', loadError);
      setError('Failed to load Booking Engine sites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSites();
    const handleSitesChanged = () => void loadSites();
    const handleSelectedSiteChanged = (event: Event) => {
      const siteId = (event as CustomEvent<{ siteId?: string }>).detail?.siteId || getSelectedBookingEngineSiteId();
      setSelectedSiteId(siteId);
    };
    window.addEventListener(BOOKING_ENGINE_SITES_CHANGED_EVENT, handleSitesChanged);
    window.addEventListener(BOOKING_ENGINE_SELECTED_SITE_CHANGED_EVENT, handleSelectedSiteChanged);
    return () => {
      window.removeEventListener(BOOKING_ENGINE_SITES_CHANGED_EVENT, handleSitesChanged);
      window.removeEventListener(BOOKING_ENGINE_SELECTED_SITE_CHANGED_EVENT, handleSelectedSiteChanged);
    };
  }, []);

  const updateDraft = (patch: Partial<BookingEngineSiteInput>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const createSite = async () => {
    if (!draft.siteName.trim() && !draft.companyName.trim()) {
      setError('Site Name or Company Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await createBookingEngineSite(draft);
      setMessage(
        result.skippedColumns.length
          ? `Site created and defaults seeded. Apply SQL for optional columns: ${result.skippedColumns.join(', ')}.`
          : 'Site created and default Booking Engine configuration seeded.',
      );
      setDraft(emptyBookingEngineSiteInput());
      setShowCreate(false);
      setEditingSiteId('');
      await loadSites();
    } catch (createError) {
      console.error('SITE MANAGER CREATE FAILED', createError);
      setError(createError instanceof Error ? createError.message : 'Failed to create site.');
    } finally {
      setSaving(false);
    }
  };

  const openEditSite = async (site: BookingEngineSiteSummary) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const nextDraft = await fetchBookingEngineSiteForEdit(site.id);
      setDraft(nextDraft);
      setEditingSiteId(site.id);
      setShowCreate(true);
      setSelectedBookingEngineSiteId(site.id);
    } catch (editError) {
      console.error('SITE MANAGER EDIT LOAD FAILED', editError);
      setError('Failed to load site details for editing.');
    } finally {
      setSaving(false);
    }
  };

  const saveEditedSite = async () => {
    if (!editingSiteId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await updateBookingEngineSite(editingSiteId, draft);
      setMessage(
        result.skippedColumns.length
          ? `Site updated. Apply SQL for optional columns: ${result.skippedColumns.join(', ')}.`
          : 'Site updated.',
      );
      setDraft(emptyBookingEngineSiteInput());
      setEditingSiteId('');
      setShowCreate(false);
      await loadSites();
    } catch (saveError) {
      console.error('SITE MANAGER EDIT SAVE FAILED', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to update site.');
    } finally {
      setSaving(false);
    }
  };

  const duplicateSite = async (siteId: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await duplicateBookingEngineSite(siteId);
      setMessage('Site duplicated. Reservations, prices and cars were not copied.');
      await loadSites();
    } catch (duplicateError) {
      console.error('SITE MANAGER DUPLICATE FAILED', duplicateError);
      setError(duplicateError instanceof Error ? duplicateError.message : 'Failed to duplicate site.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSiteStatus = async (site: BookingEngineSiteSummary) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateBookingEngineSiteStatus(site.id, site.status === 'Inactive' ? 'Active' : 'Inactive');
      setMessage(site.status === 'Inactive' ? 'Site enabled.' : 'Site disabled.');
      await loadSites();
    } catch (statusError) {
      console.error('SITE MANAGER STATUS FAILED', statusError);
      setError('Failed to update site status.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSite = async (site: BookingEngineSiteSummary) => {
    if (!window.confirm(`Delete ${site.name}? This is only allowed when the site has no reservations.`)) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await deleteBookingEngineSiteIfSafe(site.id);
      setMessage('Site deleted safely.');
      await loadSites();
    } catch (deleteError) {
      console.error('SITE MANAGER DELETE FAILED', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete site.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100 text-slate-900">
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
            <Globe2 className="h-4 w-4" />
            SaaS Foundation
          </div>
          <h2 className="mt-1 text-xl font-black text-slate-950">Site Manager</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Master list of Booking Engine websites. All configuration remains isolated by site_id.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadSites()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingSiteId('');
              setDraft(emptyBookingEngineSiteInput());
              setShowCreate((current) => !current);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-3 text-xs font-black text-white transition hover:bg-emerald-800"
          >
            <Plus className="h-3.5 w-3.5" />
            New Site
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-4">
        {message && (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            {error}
          </div>
        )}

        {showCreate && (
          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">{editingSiteId ? 'Edit Site' : 'Create Site'}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {editingSiteId
                    ? 'Update the selected site identity and contact settings.'
                    : 'Default Booking Engine settings are seeded automatically. Prices and cars stay empty.'}
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <SiteInput label="Site Name" value={draft.siteName} onChange={(siteName) => updateDraft({ siteName })} />
              <SiteInput label="Domain" value={draft.domain} onChange={(domain) => updateDraft({ domain })} />
              <SiteInput label="Company Name" value={draft.companyName} onChange={(companyName) => updateDraft({ companyName })} />
              <SiteInput label="Support Email" value={draft.supportEmail} onChange={(supportEmail) => updateDraft({ supportEmail })} />
              <SiteInput label="Phone" value={draft.phone} onChange={(phone) => updateDraft({ phone })} />
              <SiteInput label="WhatsApp" value={draft.whatsapp} onChange={(whatsapp) => updateDraft({ whatsapp })} />
              <SiteInput label="Primary Color" value={draft.primaryColor} onChange={(primaryColor) => updateDraft({ primaryColor })} />
              <SiteInput label="Secondary Color" value={draft.secondaryColor} onChange={(secondaryColor) => updateDraft({ secondaryColor })} />
              <SiteInput label="Google Review URL" value={draft.googleReviewUrl} onChange={(googleReviewUrl) => updateDraft({ googleReviewUrl })} />
              <SiteInput label="Default Currency" value={draft.currency} onChange={(currency) => updateDraft({ currency })} />
              <SiteInput label="Timezone" value={draft.timezone} onChange={(timezone) => updateDraft({ timezone })} />
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Status</span>
                <select
                  value={draft.status || 'Active'}
                  onChange={(event) => updateDraft({ status: event.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setEditingSiteId('');
                  setDraft(emptyBookingEngineSiteInput());
                }}
                className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-black text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void (editingSiteId ? saveEditedSite() : createSite())}
                className="h-9 rounded-lg border border-emerald-700 bg-emerald-700 px-4 text-xs font-black text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingSiteId ? 'Update Site' : 'Save Site'}
              </button>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[220px_260px_1fr_110px_120px_310px] border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
            <span>Site Name</span>
            <span>Site Code</span>
            <span>Domain</span>
            <span>Status</span>
            <span>Created</span>
            <span className="text-right">Actions</span>
          </div>
          {loading ? (
            <div className="px-4 py-6 text-sm font-bold text-slate-500">Loading sites...</div>
          ) : sites.length ? (
            sites.map((site) => (
              <div
                key={site.id}
                className={`grid grid-cols-[220px_260px_1fr_110px_120px_310px] items-center border-b border-slate-100 px-4 py-2 text-sm last:border-b-0 ${
                  selectedSiteId === site.id ? 'bg-cyan-50/70' : 'bg-white'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900">{site.name}</p>
                  {selectedSiteId === site.id && <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-700">Selected</p>}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[12px] font-black text-cyan-800">{site.siteCode}</p>
                  <p className="truncate font-mono text-[9px] font-semibold text-slate-400">{site.id}</p>
                </div>
                <span className="truncate font-bold text-slate-700">{site.domain || '-'}</span>
                <span className={`inline-flex w-fit rounded-full border px-2 py-1 text-[10px] font-black uppercase ${
                  site.status === 'Inactive'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  {site.status}
                </span>
                <span className="text-xs font-bold text-slate-500">{formatDate(site.createdAt)}</span>
                <div className="flex justify-end gap-1.5">
                  <SmallAction label="Edit" icon={Pencil} onClick={() => void openEditSite(site)} />
                  <SmallAction label="Duplicate" icon={Copy} onClick={() => void duplicateSite(site.id)} />
                  <SmallAction label={site.status === 'Inactive' ? 'Enable' : 'Disable'} icon={Power} onClick={() => void toggleSiteStatus(site)} />
                  <SmallAction label="Delete" icon={Trash2} tone="danger" onClick={() => void deleteSite(site)} />
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-sm font-bold text-slate-500">No Booking Engine sites found.</div>
          )}
        </section>
      </main>
    </div>
  );
}

function SiteInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function SmallAction({
  label,
  icon: Icon,
  tone = 'default',
  onClick,
}: {
  label: string;
  icon: typeof Pencil;
  tone?: 'default' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[10px] font-black transition ${
        tone === 'danger'
          ? 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
