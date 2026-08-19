/**
 * Light/dark theming for the mobile app.
 *
 * The web wallet's `useTheme` keeps its state in `localStorage` and applies it
 * by setting `data-theme` on the document root, letting CSS variables do the
 * restyling (`frontend/wallet/hooks/useTheme.ts`). React Native has neither a
 * document nor cascading variables, so the palette is data: a `ThemeColors`
 * record per theme that components read and style from.
 *
 * The active theme lives in module state rather than a context provider, which
 * keeps the hook's ergonomics the same as the web's — `useTheme()` works
 * anywhere, with nothing to wrap the tree in — while still driving every
 * subscriber from a single source of truth.
 *
 * The storage key matches the web wallet's, so the two clients describe the
 * user's preference the same way.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'dark' | 'light';

/** AsyncStorage key holding the user's theme preference. */
export const THEME_STORAGE_KEY = 'veil_theme';

/**
 * The colour roles every screen styles from. Kept deliberately small — one
 * token per job, not one per screen — so adding a screen does not mean adding
 * tokens, and so a missing light-mode value is impossible rather than merely
 * unlikely.
 */
export type ThemeColors = {
  /** Screen background. */
  background: string;
  /** Cards, inputs, and list containers sitting on the background. */
  surface: string;
  /** Borders, dividers, and secondary button fills. */
  border: string;
  /** Screen and section titles. */
  textStrong: string;
  /** Body text and input contents. */
  textPrimary: string;
  /** Supporting copy under a title. */
  textSecondary: string;
  /** De-emphasised detail text. */
  textMuted: string;
  /** Placeholders and overline labels. */
  textFaint: string;
  /** Primary action colour. */
  accent: string;
  /** Accent used as text on the background (totals, highlights). */
  accentText: string;
  /** Text and spinners drawn on top of `accent`. */
  onAccent: string;
  /** Destructive actions and error text. */
  danger: string;
  /** Fill behind error text. */
  dangerSurface: string;
};

/**
 * Veil brand palette — gold (`#FDDA24`) on near-black (`#0F0F0F`), matching the
 * web wallet's `--gold` / `--near-black` / `--off-white` tokens. Light mode uses
 * the web wallet's darker `#C4A800` gold so the accent keeps contrast on white.
 * (Replaces an earlier indigo/slate palette that had drifted off-brand.)
 */
export const THEMES: Record<Theme, ThemeColors> = {
  dark: {
    background: '#0F0F0F',
    surface: '#171717',
    border: '#262626',
    textStrong: '#FFFFFF',
    textPrimary: '#F6F7F8',
    textSecondary: 'rgba(246,247,248,0.62)',
    textMuted: 'rgba(246,247,248,0.45)',
    textFaint: 'rgba(246,247,248,0.30)',
    accent: '#FDDA24',
    accentText: '#FDDA24',
    onAccent: '#0F0F0F',
    danger: '#F87171',
    dangerSurface: 'rgba(248,113,113,0.14)',
  },
  light: {
    background: '#FFFFFF',
    surface: '#F6F7F8',
    border: '#E5E7EB',
    textStrong: '#0F0F0F',
    textPrimary: '#1A1A1A',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    textFaint: '#9CA3AF',
    accent: '#C4A800',
    accentText: '#8A7600',
    onAccent: '#0F0F0F',
    danger: '#DC2626',
    dangerSurface: '#FEE2E2',
  },
};

/** The theme used before a stored preference has been read. */
export const DEFAULT_THEME: Theme = 'dark';

/** Narrow an arbitrary value to a known theme name. */
export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

// ── Active theme ─────────────────────────────────────────────────────────────────

let activeTheme: Theme = DEFAULT_THEME;
let hydrated = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * Subscribe to theme changes.
 *
 * @returns An unsubscribe function.
 */
export function subscribeToTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The active theme. Cheap enough to call in a render. */
export function getTheme(): Theme {
  return activeTheme;
}

/** The active theme's colours. */
export function getThemeColors(): ThemeColors {
  return THEMES[activeTheme];
}

/** Whether the stored preference has been read yet. */
export function isThemeHydrated(): boolean {
  return hydrated;
}

// ── Hydration ────────────────────────────────────────────────────────────────────

let hydration: Promise<Theme> | null = null;

/**
 * Load the stored preference. Idempotent: repeated calls share one read, so the
 * hook can call it from every mounted component without extra storage hits.
 */
export function hydrateTheme(): Promise<Theme> {
  hydration ??= AsyncStorage.getItem(THEME_STORAGE_KEY)
    .catch(() => null)
    .then((stored) => {
      hydrated = true;
      if (isTheme(stored) && stored !== activeTheme) {
        activeTheme = stored;
      }
      // Notify unconditionally: a component that rendered pre-hydration needs to
      // know the preference has settled even when it settled on the default.
      notify();
      return activeTheme;
    });
  return hydration;
}

// Start reading at import so the stored preference is usually in place by the
// time the first screen paints.
void hydrateTheme();

// ── Switching ────────────────────────────────────────────────────────────────────

/**
 * Set the theme and persist it.
 *
 * The theme is applied immediately and persisted in the background: a user
 * tapping a toggle should see it move, and a failed write costs them the
 * preference on next launch rather than the interaction now.
 */
export async function setTheme(theme: Theme): Promise<void> {
  if (!isTheme(theme)) throw new Error(`Unknown theme: ${theme}`);

  if (theme !== activeTheme) {
    activeTheme = theme;
    notify();
  }
  hydration = Promise.resolve(theme);
  hydrated = true;

  await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
}

/** Flip between light and dark, persisting the result. */
export async function toggleTheme(): Promise<Theme> {
  const next: Theme = activeTheme === 'dark' ? 'light' : 'dark';
  await setTheme(next);
  return next;
}
