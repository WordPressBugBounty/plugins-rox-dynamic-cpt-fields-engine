/**
 * Style clipboard — survives a tab reload but not a session, by design.
 *
 * Backed by `sessionStorage`: copy persists across page navigations
 * inside the builder (Default ⇄ Style tab, Listing Templates index
 * round-trip) but doesn't leak into a fresh authoring session in
 * another tab. Type-namespaced so a *Dynamic Text* style can't be
 * pasted onto a *Dynamic Link* — they share key names but not
 * meanings (e.g. `padding` only affects buttons on links).
 *
 * Empty values in the copied blob are preserved as `''` so paste
 * deterministically clears any conflicting field on the target;
 * authors expect "paste style" to mean "make it look exactly like the
 * source", including resets.
 */

import type { ListingComponentType } from '../../../services/api';
import type { ListingComponentStyle } from '../components/StyleControls';

const STORAGE_KEY = 'rdcfe.listing.styleClipboard.v1';

interface ClipboardPayload {
  type: ListingComponentType;
  style: ListingComponentStyle;
}

function read(): ClipboardPayload | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClipboardPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.type !== 'string' || typeof parsed.style !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(payload: ClipboardPayload | null): void {
  try {
    if (payload === null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be disabled (privacy mode); copy/paste just
    // becomes a no-op rather than breaking the inspector.
  }
}

export function copyStyle(type: ListingComponentType, style: ListingComponentStyle): void {
  write({ type, style: { ...style } });
}

/**
 * Returns the stored style only when the source type matches; otherwise
 * `null`. The inspector uses this to decide whether the Paste button
 * is enabled at all.
 */
export function getPastableStyle(type: ListingComponentType): ListingComponentStyle | null {
  const payload = read();
  if (!payload) return null;
  if (payload.type !== type) return null;
  return { ...payload.style };
}

export function hasAnyClipboard(): boolean {
  return read() !== null;
}

export function getClipboardType(): ListingComponentType | null {
  const payload = read();
  return payload ? payload.type : null;
}
