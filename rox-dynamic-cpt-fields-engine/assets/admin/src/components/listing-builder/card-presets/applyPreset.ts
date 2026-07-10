/**
 * Card preset → ListingComponentNode[] applier.
 *
 * The frozen recipe in a {@link CardPreset} only describes *intent*
 * (a title, a meta line, a CTA link…). Every site has its own field
 * schema, so we hydrate each node by:
 *
 *   1. Looking up the live descriptor for that component type and
 *      cloning its `default_settings` — guarantees every setting key
 *      the renderer expects is present.
 *   2. Shallow-merging the recipe's `settings` on top.
 *   3. Deep-merging `settings.style` one level so a recipe can
 *      override (e.g.) `font_size` without wiping `font_weight`.
 *   4. Generating a fresh node id so the new layout can sit beside
 *      the previous one (the canvas keys components by id).
 *
 * If a descriptor isn't available for a recipe's type — e.g. the user
 * has the Pro plugin disabled mid-session — that node is skipped
 * rather than crashing the gallery. This matches the renderer's
 * "unknown type → render nothing" forgiveness.
 */

import type {
  ListingComponentDescriptor,
  ListingComponentNode,
  ListingComponentType,
} from '../../../services/api';
import type { CardPreset, AppliedPresetNodes } from './types';
import { generateComponentId } from '../../../hooks/useListings';

export function applyPreset(
  preset: CardPreset,
  descriptors: ListingComponentDescriptor[]
): AppliedPresetNodes {
  const byType = new Map<ListingComponentType, ListingComponentDescriptor>();
  for (const descriptor of descriptors) {
    byType.set(descriptor.type, descriptor);
  }

  const out: ListingComponentNode[] = [];

  for (const recipe of preset.nodes) {
    const descriptor = byType.get(recipe.type);
    if (!descriptor) {
      continue;
    }

    const baseSettings = structuredClone(descriptor.default_settings) as Record<
      string,
      unknown
    >;

    const recipeSettings = (recipe.settings ?? {}) as Record<string, unknown>;
    const recipeStyle = (recipeSettings.style ?? {}) as Record<string, unknown>;
    const baseStyle = (baseSettings.style ?? {}) as Record<string, unknown>;

    // Deep-merge style one level so recipes can override individual
    // typography keys without nuking the descriptor's defaults.
    const mergedStyle = { ...baseStyle, ...recipeStyle };

    out.push({
      id: generateComponentId(recipe.type),
      type: recipe.type,
      settings: {
        ...baseSettings,
        ...recipeSettings,
        style: mergedStyle,
      },
    });
  }

  return out;
}

/**
 * Replace the canvas layout with a fresh preset-applied node list.
 * Wraps the immutable update so call sites read like English:
 *
 *   `setData((prev) => replaceComponents(prev, applyPreset(p, d)));`
 */
export function replaceComponents<T extends { components?: ListingComponentNode[] }>(
  prev: T,
  components: ListingComponentNode[]
): T {
  return { ...prev, components };
}

/**
 * Hydrate raw AI-suggested component rows into canvas-ready nodes.
 *
 * Mirrors {@link applyPreset}: clone descriptor defaults, shallow-merge
 * AI settings, deep-merge `style`, and assign fresh ids.
 */
export function applyAIComponents(
  rawComponents: unknown[],
  descriptors: ListingComponentDescriptor[]
): ListingComponentNode[] {
  const byType = new Map<ListingComponentType, ListingComponentDescriptor>();
  for (const descriptor of descriptors) {
    byType.set(descriptor.type, descriptor);
  }

  const out: ListingComponentNode[] = [];

  for (const raw of rawComponents) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const item = raw as Record<string, unknown>;
    const type = String(item.type ?? '') as ListingComponentType;
    const descriptor = byType.get(type);
    if (!descriptor) {
      continue;
    }

    const baseSettings = structuredClone(descriptor.default_settings) as Record<
      string,
      unknown
    >;
    const aiSettings = (item.settings ?? {}) as Record<string, unknown>;
    const aiStyle = (aiSettings.style ?? {}) as Record<string, unknown>;
    const baseStyle = (baseSettings.style ?? {}) as Record<string, unknown>;

    out.push({
      id: generateComponentId(type),
      type,
      settings: {
        ...baseSettings,
        ...aiSettings,
        style: { ...baseStyle, ...aiStyle },
      },
    });
  }

  return out;
}
