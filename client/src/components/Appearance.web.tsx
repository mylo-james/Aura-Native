import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Preference = 'system' | 'light' | 'dark';
type Scheme = 'light' | 'dark';
const storageKey = 'aura.appearance.v1';
const mediaQuery = '(prefers-color-scheme: dark)';
const preferenceOf = (value: string | null | undefined): Preference =>
  value === 'light' || value === 'dark' ? value : 'system';
const ThemeContext = createContext<{
  preference: Preference;
  scheme: Scheme;
  persistent: boolean;
  choose: (value: Preference) => void;
} | null>(null);

export function ThemeProvider({children}: {children: ReactNode}) {
  const [preference, setPreference] = useState<Preference>(() =>
    typeof document === 'undefined'
      ? 'system'
      : preferenceOf(document.documentElement.dataset.appearance),
  );
  const [system, setSystem] = useState<Scheme>(() =>
    typeof window !== 'undefined' && window.matchMedia(mediaQuery).matches
      ? 'dark'
      : 'light',
  );
  const [persistent, setPersistent] = useState(true);
  const scheme = preference === 'system' ? system : preference;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = scheme;
    document.documentElement.dataset.appearance = preference;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', scheme === 'dark' ? '#191b2b' : '#f8f7f4');
  }, [preference, scheme]);

  useEffect(() => {
    const media = window.matchMedia(mediaQuery);
    const updateSystem = () => setSystem(media.matches ? 'dark' : 'light');
    const updateStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        setPreference(preferenceOf(event.newValue));
        setPersistent(true);
      }
    };
    updateSystem();
    media.addEventListener('change', updateSystem);
    window.addEventListener('storage', updateStorage);
    return () => {
      media.removeEventListener('change', updateSystem);
      window.removeEventListener('storage', updateStorage);
    };
  }, []);

  const value = useMemo(
    () => ({
      preference,
      scheme,
      persistent,
      choose(next: Preference) {
        setPreference(next);
        try {
          if (next === 'system') window.localStorage.removeItem(storageKey);
          else window.localStorage.setItem(storageKey, next);
          setPersistent(true);
        } catch {
          setPersistent(false);
        }
      },
    }),
    [preference, scheme, persistent],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('Appearance requires ThemeProvider');
  return context;
}

export function ThemeToggle() {
  const {scheme, choose} = useTheme();
  const next = scheme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="icon-link theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => choose(next)}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true">
        {scheme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20.5 14.3A8.8 8.8 0 0 1 9.7 3.5a8.8 8.8 0 1 0 10.8 10.8Z" />
        )}
      </svg>
    </button>
  );
}

export function AppearanceSettings() {
  const {preference, persistent, choose} = useTheme();
  return (
    <fieldset
      className="appearance-settings"
      aria-describedby="appearance-hint">
      <legend className="heading heading-2">Appearance</legend>
      <div className="appearance-options">
        {(['light', 'dark', 'system'] as const).map((option) => (
          <label className="appearance-option" key={option}>
            <input
              type="radio"
              name="appearance"
              value={option}
              checked={preference === option}
              onChange={() => choose(option)}
            />
            <span>
              {option === 'system'
                ? 'System'
                : option === 'dark'
                  ? 'Dark'
                  : 'Light'}
            </span>
          </label>
        ))}
      </div>
      <p
        id="appearance-hint"
        className="text text-small text-muted"
        role="status">
        {!persistent
          ? 'This browser couldn’t remember your choice. It will last until you reload.'
          : preference === 'system'
            ? 'Follows your device’s light or dark appearance.'
            : 'Remembered in this browser. Choose System to follow your device.'}
      </p>
    </fieldset>
  );
}
