/** Small, dependency-free formatting + helper utilities for the mobile app. */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatMoney(cents?: number | null, currency = 'USD'): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function formatNumber(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

export function formatDate(iso?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatRelative(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return formatDate(iso);
}

/** Format a per-km or per-mile pace, e.g. `5:23 /km`. */
export function paceLabel(secondsPerKm: number | null | undefined, unit: 'metric' | 'imperial' = 'metric'): string {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '—';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  const suffix = unit === 'imperial' ? '/mi' : '/km';
  return `${m}:${s.toString().padStart(2, '0')} ${suffix}`;
}

/** Convert seconds to mm:ss (for rest timers and session clocks). */
export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

/** Convert a distance in meters to the user's preferred unit value. */
export function convertDistance(meters: number, unit: 'metric' | 'imperial'): { value: number; label: string } {
  if (unit === 'imperial') {
    return { value: meters / 1609.344, label: 'mi' };
  }
  return { value: meters / 1000, label: 'km' };
}

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

/** Clamp helper used by progress rings and bars. */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/** Deterministic accent color pick for lists (chips, avatars). */
export function pickAccent(seed: string, palette: readonly string[]): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10);
