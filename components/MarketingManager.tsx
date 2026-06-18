'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Eye, Save, Search, Send, X } from 'lucide-react';
import {
  fetchReservations,
  type ReservationRequestRecord,
} from '@/lib/reservationsApi';

const languageGroups = ['English', 'French', 'Italian', 'German', 'Czech'] as const;
const DRAFTS_STORAGE_KEY = 'autoclub_marketing_campaign_drafts_v1';
const campaignInputClass =
  'w-full rounded-xl border border-white/[0.08] bg-zinc-950/80 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-sky-300/35';

type MarketingLanguage = (typeof languageGroups)[number];
type ConsentAwareReservation = ReservationRequestRecord & {
  marketing_consent?: boolean | null;
};

type MarketingContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  language: MarketingLanguage;
  languageKey: string;
  agency: string;
  bookingDate: string;
};

type CampaignDraft = {
  couponCode: string;
  subject: string;
  message: string;
  link: string;
};

const emptyDraft: CampaignDraft = {
  couponCode: '',
  subject: '',
  message: '',
  link: '',
};

const normalizeLanguageKey = (value: string | null | undefined) =>
  String(value || '').trim().toLowerCase();

const normalizeLanguage = (value: string | null | undefined): MarketingLanguage | null =>
  languageGroups.find((language) => normalizeLanguageKey(language) === normalizeLanguageKey(value)) || null;

const csvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

export default function MarketingManager() {
  const [reservations, setReservations] = useState<ConsentAwareReservation[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<MarketingLanguage>('English');
  const [searchTerm, setSearchTerm] = useState('');
  const [drafts, setDrafts] = useState<Partial<Record<MarketingLanguage, CampaignDraft>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadContacts = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const rows = await fetchReservations();
        if (mounted) setReservations(rows as ConsentAwareReservation[]);
      } catch (error) {
        console.error('Marketing contacts load error:', error);
        if (mounted) setLoadError('Δεν ήταν δυνατή η φόρτωση των marketing επαφών.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    const savedDrafts = window.localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (savedDrafts) {
      try {
        setDrafts(JSON.parse(savedDrafts) as Partial<Record<MarketingLanguage, CampaignDraft>>);
      } catch (error) {
        console.warn('Marketing drafts load warning:', error);
      }
    }

    void loadContacts();

    return () => {
      mounted = false;
    };
  }, []);

  const contacts = useMemo(() => {
    const byEmail = new Map<string, MarketingContact>();

    reservations.forEach((reservation) => {
      if (reservation.marketing_consent !== true) return;

      const email = String(reservation.email || '').trim();
      const language = normalizeLanguage(reservation.language);
      if (!email || !language) return;

      const normalizedEmail = email.toLowerCase();
      const contact: MarketingContact = {
        id: String(reservation.id),
        name: String(reservation.customer_name || '').trim() || '-',
        email,
        phone: String(reservation.phone || '').trim() || '-',
        language,
        languageKey: normalizeLanguageKey(reservation.language),
        agency: String(reservation.agency || '').trim() || 'Direct',
        bookingDate: reservation.created_at || reservation.pickup_date || '',
      };
      const existing = byEmail.get(normalizedEmail);

      if (!existing || contact.bookingDate > existing.bookingDate) {
        byEmail.set(normalizedEmail, contact);
      }
    });

    return Array.from(byEmail.values()).sort((left, right) =>
      right.bookingDate.localeCompare(left.bookingDate)
    );
  }, [reservations]);

  const contactsByLanguage = useMemo(
    () =>
      contacts.reduce<Record<MarketingLanguage, MarketingContact[]>>(
        (result, contact) => {
          const language = languageGroups.find(
            (group) => normalizeLanguageKey(group) === contact.languageKey
          );

          if (language) result[language].push(contact);
          return result;
        },
        {
          English: [],
          French: [],
          Italian: [],
          German: [],
          Czech: [],
        }
      ),
    [contacts]
  );

  const counts = useMemo(
    () =>
      languageGroups.reduce<Record<MarketingLanguage, number>>(
        (result, language) => {
          result[language] = contactsByLanguage[language].length;
          return result;
        },
        {
          English: 0,
          French: 0,
          Italian: 0,
          German: 0,
          Czech: 0,
        }
      ),
    [contactsByLanguage]
  );

  const selectedContacts = contactsByLanguage[selectedLanguage];

  const visibleContacts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return selectedContacts;

    return selectedContacts.filter((contact) =>
      [contact.name, contact.email, contact.phone].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [searchTerm, selectedContacts]);

  const currentDraft = drafts[selectedLanguage] || emptyDraft;
  const consentFieldAvailable = reservations.some(
    (reservation) => reservation.marketing_consent !== undefined
  );

  const updateDraft = (updates: Partial<CampaignDraft>) => {
    setDrafts((current) => ({
      ...current,
      [selectedLanguage]: {
        ...(current[selectedLanguage] || emptyDraft),
        ...updates,
      },
    }));
    setActionMessage('');
  };

  const handleSaveDraft = () => {
    const nextDrafts = {
      ...drafts,
      [selectedLanguage]: currentDraft,
    };

    setDrafts(nextDrafts);
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
    setActionMessage(`Το draft για ${selectedLanguage} αποθηκεύτηκε τοπικά.`);
  };

  const handleCopyEmails = async () => {
    const emails = selectedContacts.map((contact) => contact.email);
    if (emails.length === 0) {
      setActionMessage('Δεν υπάρχουν consented emails για αντιγραφή.');
      return;
    }

    try {
      await navigator.clipboard.writeText(emails.join(', '));
      setActionMessage(`Αντιγράφηκαν ${emails.length} μοναδικά emails.`);
    } catch (error) {
      console.error('Copy marketing emails error:', error);
      setActionMessage('Η αντιγραφή δεν ολοκληρώθηκε.');
    }
  };

  const handleExportCsv = () => {
    if (selectedContacts.length === 0) {
      setActionMessage('Δεν υπάρχουν consented emails για εξαγωγή.');
      return;
    }

    const rows = [
      ['Name', 'Email', 'Phone', 'Language', 'Agency'],
      ...selectedContacts.map((contact) => [
        contact.name,
        contact.email,
        contact.phone,
        contact.language,
        contact.agency,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvValue).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `marketing-consent-${selectedLanguage.toLowerCase()}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setActionMessage(`Εξήχθησαν ${selectedContacts.length} μοναδικές επαφές.`);
  };

  return (
    <>
      <div className="grid min-h-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-2 pb-3 text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">
            Languages
          </p>
          <div className="space-y-1.5">
            {languageGroups.map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => {
                  setSelectedLanguage(language);
                  setSearchTerm('');
                  setActionMessage('');
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                  selectedLanguage === language
                    ? 'border-rose-300 bg-rose-50 text-rose-950 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-950'
                }`}
              >
                <span className="text-sm font-bold">{language}</span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-black ${
                    selectedLanguage === language
                      ? 'border-rose-300 bg-white text-rose-900'
                      : 'border-slate-300 bg-slate-100 text-slate-900'
                  }`}
                >
                  {counts[language]}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-200/60">
                  {selectedLanguage}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">Consented contacts</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyEmails}
                  className="erp-action-primary inline-flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[0.08] px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/[0.14]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy all emails
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="erp-action-success inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/[0.14]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            <label className="relative mt-4 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, email or phone"
                className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/80 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-300/35"
              />
            </label>

            <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07]">
              <div className="max-h-[260px] overflow-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead className="sticky top-0 bg-zinc-950">
                    <tr>
                      {['Name', 'Email', 'Phone', 'Agency'].map((column) => (
                        <th
                          key={column}
                          className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleContacts.map((contact) => (
                      <tr key={contact.email.toLowerCase()} className="border-t border-white/[0.05]">
                        <td className="px-3 py-2.5 text-sm font-medium text-white">{contact.name}</td>
                        <td className="px-3 py-2.5 text-sm text-sky-200">{contact.email}</td>
                        <td className="px-3 py-2.5 text-sm text-zinc-300">{contact.phone}</td>
                        <td className="px-3 py-2.5 text-sm text-zinc-300">{contact.agency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isLoading && <p className="p-5 text-sm text-zinc-500">Loading consented customers...</p>}
              {!isLoading && loadError && <p className="p-5 text-sm text-rose-200">{loadError}</p>}
              {!isLoading && !loadError && visibleContacts.length === 0 && (
                <div className="space-y-2 p-5">
                  <p className="text-sm text-zinc-400">No consented customers found.</p>
                  {!consentFieldAvailable && (
                    <p className="text-xs text-amber-200/80">
                      Πρέπει πρώτα να προστεθεί marketing consent στη φόρμα κρατήσεων.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/60">
                Campaign composer
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">{selectedLanguage} campaign</h3>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <CampaignField label="Coupon code">
                <input
                  value={currentDraft.couponCode}
                  onChange={(event) => updateDraft({ couponCode: event.target.value })}
                  className={campaignInputClass}
                  placeholder="SUMMER20"
                />
              </CampaignField>
              <CampaignField label="Button / link">
                <input
                  value={currentDraft.link}
                  onChange={(event) => updateDraft({ link: event.target.value })}
                  className={campaignInputClass}
                  placeholder="https://..."
                />
              </CampaignField>
              <CampaignField label="Email subject" fullWidth>
                <input
                  value={currentDraft.subject}
                  onChange={(event) => updateDraft({ subject: event.target.value })}
                  className={campaignInputClass}
                  placeholder="Your AutoClub offer"
                />
              </CampaignField>
              <CampaignField label="Email message" fullWidth>
                <textarea
                  value={currentDraft.message}
                  onChange={(event) => updateDraft({ message: event.target.value })}
                  className={`${campaignInputClass} min-h-28 resize-y`}
                  placeholder="Write the campaign message..."
                />
              </CampaignField>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="erp-action-success inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/[0.14]"
                >
                  <Save className="h-4 w-4" />
                  Save draft locally
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="erp-action-primary inline-flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[0.08] px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-300/[0.14]"
                >
                  <Eye className="h-4 w-4" />
                  Preview email
                </button>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-500"
                >
                  <Send className="h-4 w-4" />
                  Send Campaign
                </button>
                <p className="mt-1 text-[11px] text-zinc-600">Email provider integration required.</p>
              </div>
            </div>

            {actionMessage && (
              <p className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm text-zinc-300">
                {actionMessage}
              </p>
            )}
          </section>
        </main>
      </div>

      {showPreview && (
        <EmailPreview
          language={selectedLanguage}
          draft={currentDraft}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

function CampaignField({
  label,
  fullWidth = false,
  children,
}: {
  label: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`space-y-1.5 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <span className="block text-xs font-semibold text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function EmailPreview({
  language,
  draft,
  onClose,
}: {
  language: MarketingLanguage;
  draft: CampaignDraft;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#080d14] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/60">
              {language} preview
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {draft.subject || 'Email subject'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-5 p-6">
          {draft.couponCode && (
            <div className="w-fit rounded-xl border border-rose-300/25 bg-rose-300/[0.08] px-4 py-2 font-mono text-lg font-bold tracking-[0.12em] text-rose-100">
              {draft.couponCode}
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
            {draft.message || 'Campaign message preview.'}
          </p>
          {draft.link && (
            <span className="inline-flex rounded-xl border border-sky-300/25 bg-sky-300/[0.1] px-5 py-2.5 text-sm font-semibold text-sky-100">
              {draft.link}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
