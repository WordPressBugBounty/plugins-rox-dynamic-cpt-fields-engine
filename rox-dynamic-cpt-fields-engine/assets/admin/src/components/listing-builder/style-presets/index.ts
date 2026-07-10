/**
 * Per-component style presets.
 *
 * A "style preset" is a frozen `style` blob (the same shape PHP's
 * `AbstractComponent::build_inline_style()` consumes) shipped under a
 * memorable name — *Title H2*, *Body*, *Pill*, etc. Authors click a
 * chip in the inspector's Style tab and the preset patches
 * `settings.style`. One undo step per pick.
 *
 * Presets are keyed by component type; the inspector only renders the
 * strip for types that have one or more presets registered. Adding a
 * new component-type strip is a matter of dropping a `<type>.ts` file
 * next to this index and exporting it.
 *
 * Why one frozen blob per preset (vs delta-on-top): authors expect a
 * preset to *replace* the relevant style fields, not stack on top of
 * whatever they already had. Keeping each preset complete (every
 * styling key the preset owns is set, others stay untouched via
 * `Object.assign`) makes the behaviour predictable.
 */

import type { ListingComponentType } from '../../../services/api';
import type { ListingComponentStyle } from '../components/StyleControls';
import { DYNAMIC_TEXT_STYLE_PRESETS } from './dynamicText';
import { DYNAMIC_LINK_STYLE_PRESETS } from './dynamicLink';
import { DYNAMIC_META_STYLE_PRESETS } from './dynamicMeta';
import { TERM_BADGES_STYLE_PRESETS } from './termBadges';

export interface StylePreset {
  /** Stable id — also used for the "active" indicator. */
  id: string;
  /** Short label shown on the chip. */
  label: string;
  /** Optional one-line tooltip. */
  description?: string;
  /** The style patch applied when the preset is picked. */
  style: ListingComponentStyle;
}

export const STYLE_PRESETS: Partial<Record<ListingComponentType, StylePreset[]>> = {
  dynamic_text: DYNAMIC_TEXT_STYLE_PRESETS,
  dynamic_link: DYNAMIC_LINK_STYLE_PRESETS,
  dynamic_meta: DYNAMIC_META_STYLE_PRESETS,
  dynamic_fields_inline: DYNAMIC_META_STYLE_PRESETS,
  term_badges: TERM_BADGES_STYLE_PRESETS,
};

/**
 * Detect whether the live `style` matches a registered preset for this
 * type. Used by the strip to highlight the active chip. Returns the
 * preset id, or `null` when nothing matches (custom user state).
 */
export function detectActiveStylePreset(
  type: ListingComponentType,
  current: ListingComponentStyle | undefined
): string | null {
  const presets = STYLE_PRESETS[type];
  if (!presets || !current) return null;
  for (const preset of presets) {
    if (matchesPreset(preset.style, current)) {
      return preset.id;
    }
  }
  return null;
}

/**
 * A preset is considered "applied" when every key it sets matches the
 * current style verbatim. Extra keys in `current` (e.g. layout-only
 * `meta_flow` for Dynamic Meta) are ignored — presets don't try to
 * own those.
 */
function matchesPreset(
  preset: ListingComponentStyle,
  current: ListingComponentStyle
): boolean {
  for (const [key, value] of Object.entries(preset) as Array<
    [keyof ListingComponentStyle, ListingComponentStyle[keyof ListingComponentStyle]]
  >) {
    if (current[key] !== value) {
      return false;
    }
  }
  return true;
}
