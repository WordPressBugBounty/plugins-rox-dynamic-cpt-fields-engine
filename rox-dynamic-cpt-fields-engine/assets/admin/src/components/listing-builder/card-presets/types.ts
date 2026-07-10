/**
 * Card preset (a.k.a. "Quick-start template") types.
 *
 * A *card preset* is a frozen layout — an ordered list of component
 * nodes with sensible default settings and styles wired in — that an
 * author can drop onto an empty canvas (or replace an existing one
 * with). Presets ship `bind` recipes alongside the saved settings so
 * the data wiring (e.g. "title source = post.title") happens for free
 * even though every site's custom post types are different.
 *
 * The preset itself is *render-mode agnostic* — it knows what it
 * needs (a title, a meta line, a link…) and the `applyPreset` step is
 * what turns those abstract pieces into concrete node settings using
 * the live `ListingComponentDescriptor` defaults from the API. Two
 * payoffs:
 *
 *   1. New components added to the registry don't break old presets.
 *   2. The preset author doesn't need to keep every default setting
 *      key in sync with PHP — `default_settings` from the descriptor
 *      seeds anything the recipe doesn't override.
 */

import type {
  ListingComponentType,
  ListingComponentNode,
} from '../../../services/api';
import type { ListingComponentStyle } from '../components/StyleControls';

/**
 * One node in a card-preset recipe. `settings` is shallow-merged on
 * top of the descriptor's `default_settings` (with `style` deep-merged
 * one level so authors can override individual style keys without
 * blowing away the whole block).
 */
export interface CardPresetNode {
  type: ListingComponentType;
  /**
   * Settings overrides — same shape as the runtime `settings` blob the
   * inspector edits. Keys not provided here fall back to the
   * descriptor's defaults.
   */
  settings?: Record<string, unknown> & { style?: ListingComponentStyle };
}

/**
 * A complete card preset.
 *
 * `id` is stable; the gallery uses it for the picker keyboard
 * shortcut and for "active" highlighting. `tags` aren't shown in the
 * UI yet but are reserved for future filtering — keep them lowercase
 * + hyphenated to match the listing-type slugs.
 */
export interface CardPreset {
  id: string;
  /** Display label in the gallery card. */
  label: string;
  /** Short pitch shown under the label (1 line). */
  description: string;
  /**
   * Listing types this preset is designed for. The gallery still
   * shows everything but uses this to surface "Recommended" callouts.
   */
  audience: Array<'blog' | 'product' | 'real-estate' | 'people' | 'event' | 'general'>;
  /** Free-form tags (future filter chips). */
  tags?: string[];
  /** Frozen layout. Order matters — it maps directly to canvas order. */
  nodes: CardPresetNode[];
}

/**
 * Output of `applyPreset` — the freshly-built component list ready to
 * be stuffed into `ListingConfigData.components`. Returning the array
 * (rather than mutating in place) keeps the helper unit-testable and
 * lets the caller decide whether to replace or append.
 */
export type AppliedPresetNodes = ListingComponentNode[];
