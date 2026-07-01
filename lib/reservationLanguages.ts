export type ReservationLanguageOption = {
  id: string;
  label: string;
  value: string;
  active: boolean;
  builtIn?: boolean;
};

export const RESERVATION_LANGUAGES_STORAGE_KEY = 'autoclub_reservation_languages';
export const RESERVATION_LANGUAGES_CHANGED_EVENT = 'autoclub-reservation-languages-changed';

export const defaultReservationLanguages: ReservationLanguageOption[] = [
  { id: 'lang-en', label: 'English', value: 'en', active: true, builtIn: true },
  { id: 'lang-el', label: 'Greek', value: 'el', active: true, builtIn: true },
  { id: 'lang-fr', label: 'French', value: 'fr', active: true, builtIn: true },
  { id: 'lang-it', label: 'Italian', value: 'it', active: true, builtIn: true },
  { id: 'lang-de', label: 'German', value: 'de', active: true, builtIn: true },
  { id: 'lang-cs', label: 'Czech', value: 'cs', active: true, builtIn: true },
  { id: 'lang-pl', label: 'Polish', value: 'pl', active: true, builtIn: true },
];

const legacyLanguageValueMap: Record<string, string> = {
  English: 'en',
  Greek: 'el',
  French: 'fr',
  Italian: 'it',
  German: 'de',
  Czech: 'cs',
  Polish: 'pl',
};

export const normalizeReservationLanguageValue = (value: unknown) => {
  const text = String(value || '').trim();
  return legacyLanguageValueMap[text] || text || 'en';
};

export const getReservationLanguageLabel = (
  value: string,
  languages: ReservationLanguageOption[] = defaultReservationLanguages,
) => {
  const normalizedValue = normalizeReservationLanguageValue(value);
  return (
    languages.find((language) => language.value === value || language.value === normalizedValue)?.label ||
    defaultReservationLanguages.find((language) => language.value === normalizedValue)?.label ||
    value ||
    'English'
  );
};

const normalizeStoredLanguages = (value: unknown): ReservationLanguageOption[] => {
  if (!Array.isArray(value)) return defaultReservationLanguages;

  const storedLanguages = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const language = item as Partial<ReservationLanguageOption>;
      const label = String(language.label || '').trim();
      const code = String(language.value || '').trim();
      if (!label || !code) return null;

      return {
        id: String(language.id || `lang-${code}-${Date.now()}`),
        label,
        value: code,
        active: language.active !== false,
        builtIn: Boolean(language.builtIn),
      };
    })
    .filter(Boolean) as ReservationLanguageOption[];

  const byValue = new Map<string, ReservationLanguageOption>();
  defaultReservationLanguages.forEach((language) => byValue.set(language.value, language));
  storedLanguages.forEach((language) => byValue.set(language.value, language));

  return Array.from(byValue.values());
};

export const loadReservationLanguages = () => {
  if (typeof window === 'undefined') return defaultReservationLanguages;

  try {
    const stored = window.localStorage.getItem(RESERVATION_LANGUAGES_STORAGE_KEY);
    return stored ? normalizeStoredLanguages(JSON.parse(stored)) : defaultReservationLanguages;
  } catch {
    return defaultReservationLanguages;
  }
};

export const saveReservationLanguages = (languages: ReservationLanguageOption[]) => {
  if (typeof window === 'undefined') return;

  const normalizedLanguages = normalizeStoredLanguages(languages);
  window.localStorage.setItem(RESERVATION_LANGUAGES_STORAGE_KEY, JSON.stringify(normalizedLanguages));
  window.dispatchEvent(new CustomEvent(RESERVATION_LANGUAGES_CHANGED_EVENT, { detail: normalizedLanguages }));
};
