/**
 * Shared building blocks for the Listings template builder.
 *
 * Mirrors the Query Builder's `shared.tsx` (CollapsibleSection +
 * FieldRow) so every Pro module's editor reads the same structurally:
 * gradient-headed cards, chevron toggles, two-column 220px-label rows.
 *
 * `BuilderProps` is the contract every panel (palette, layers,
 * inspector, canvas) consumes — the parent `ListingTemplateForm` owns
 * the entire `ListingConfigData` blob and pushes mutations down through
 * `setData` so we keep one piece of state regardless of how many panels
 * mount at once.
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type {
  ListingComponentDescriptor,
  ListingComponentNode,
  ListingComponentType,
  ListingConfigData,
} from '../../services/api';

export interface BuilderProps {
  data: ListingConfigData;
  setData: (updater: (prev: ListingConfigData) => ListingConfigData) => void;
  /** Component palette catalogue from `/listings/components` (memoised by parent). */
  components: ListingComponentDescriptor[];
  /** Currently-selected component id (drives the inspector panel). */
  selectedComponentId: string | null;
  /** Setter for `selectedComponentId`. */
  setSelectedComponentId: (id: string | null) => void;
}

/** Subset of {@link BuilderProps} for panels that don't need component metadata. */
export type CanvasPanelProps = Omit<BuilderProps, 'components'>;

/**
 * Find a component node by id (ListingConfig.components is the only
 * place we look — we don't recurse into nested groups in V1).
 */
export function findComponent(
  data: ListingConfigData,
  id: string
): ListingComponentNode | undefined {
  return (data.components ?? []).find((node) => node.id === id);
}

/**
 * Replace one component's settings without rebuilding the entire array.
 * Used by every per-type settings panel inside the Inspector.
 */
export function updateComponentSettings(
  prev: ListingConfigData,
  id: string,
  patch: Record<string, unknown>
): ListingConfigData {
  const components = (prev.components ?? []).map((node) =>
    node.id === id
      ? { ...node, settings: { ...node.settings, ...patch } }
      : node
  );
  return { ...prev, components };
}

/**
 * Replace visibility rules on a single component node (Pro Step 38).
 * Pass `undefined` to strip the optional `visibility` key entirely.
 */
export function updateComponentVisibility(
  prev: ListingConfigData,
  id: string,
  visibility: ListingComponentNode['visibility']
): ListingConfigData {
  const components = (prev.components ?? []).map((node) => {
    if (node.id !== id) {
      return node;
    }
    if (visibility === undefined) {
      const { visibility: _removed, ...rest } = node;
      return rest as ListingComponentNode;
    }
    return { ...node, visibility };
  });
  return { ...prev, components };
}

/**
 * Move a component up or down in the canvas order. Layers tree uses
 * this for the up/down arrow buttons; clamps automatically when the
 * caller asks to move past either end.
 */
export function moveComponent(
  prev: ListingConfigData,
  id: string,
  direction: 'up' | 'down'
): ListingConfigData {
  const components = [...(prev.components ?? [])];
  const idx = components.findIndex((node) => node.id === id);
  if (idx < 0) {
    return prev;
  }
  const target = direction === 'up' ? idx - 1 : idx + 1;
  if (target < 0 || target >= components.length) {
    return prev;
  }
  const swap = components[idx];
  components[idx] = components[target];
  components[target] = swap;
  return { ...prev, components };
}

/** Remove a component by id. */
export function removeComponent(prev: ListingConfigData, id: string): ListingConfigData {
  return {
    ...prev,
    components: (prev.components ?? []).filter((node) => node.id !== id),
  };
}

/** Append a freshly-built node to the canvas. */
export function appendComponent(
  prev: ListingConfigData,
  node: ListingComponentNode
): ListingConfigData {
  return {
    ...prev,
    components: [...(prev.components ?? []), node],
  };
}

/**
 * Duplicate a component by id — clones its settings and inserts a fresh
 * copy directly after the source. Powers the canvas hover overlay's
 * "Duplicate" button and the `Cmd+D` keyboard shortcut.
 *
 * Returns the new id alongside the updated config so the caller can
 * select the freshly-cloned node automatically (matching Elementor's
 * "duplicate-then-select" UX).
 */
export function duplicateComponent(
  prev: ListingConfigData,
  id: string,
  generateId: (type: ListingComponentType) => string
): { data: ListingConfigData; newId: string | null } {
  const components = prev.components ?? [];
  const idx = components.findIndex((node) => node.id === id);
  if (idx < 0) {
    return { data: prev, newId: null };
  }
  const source = components[idx];
  const clone: ListingComponentNode = {
    id: generateId(source.type),
    type: source.type,
    settings: structuredClone(source.settings),
    ...(source.visibility ? { visibility: structuredClone(source.visibility) } : {}),
  };
  const next = [...components.slice(0, idx + 1), clone, ...components.slice(idx + 1)];
  return { data: { ...prev, components: next }, newId: clone.id };
}

/**
 * Drag-and-drop reorder helper. Removes the source from its current
 * position and re-inserts it relative to the target. `position`
 * mirrors HTML5 drop semantics — `before` lands the source above the
 * target, `after` below it. No-ops when source === target so authors
 * can drop on their own row safely.
 *
 * Used by both `LayersTree` (sidebar reorder) and `CanvasPreview`
 * (visual reorder) — sharing one helper guarantees the two surfaces
 * stay in lockstep.
 */
export function reorderComponent(
  prev: ListingConfigData,
  sourceId: string,
  targetId: string,
  position: 'before' | 'after'
): ListingConfigData {
  if (sourceId === targetId) {
    return prev;
  }
  const components = [...(prev.components ?? [])];
  const sourceIdx = components.findIndex((node) => node.id === sourceId);
  const targetIdx = components.findIndex((node) => node.id === targetId);
  if (sourceIdx < 0 || targetIdx < 0) {
    return prev;
  }
  const [moved] = components.splice(sourceIdx, 1);
  const adjustedTarget = sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
  const insertAt = position === 'before' ? adjustedTarget : adjustedTarget + 1;
  components.splice(insertAt, 0, moved);
  return { ...prev, components };
}

/**
 * Resolve a dashicon name (e.g. `dashicons-format-image`) into the
 * matching Lucide icon — keeps the palette tiles visually consistent
 * with the rest of the React admin even though the Pro PHP registry
 * uses dashicons.
 *
 * Falls back to a generic block icon when the dashicon isn't mapped —
 * the palette still works, just with a less specific glyph.
 */
export function dashiconHumanLabel(dashicon: string): string {
  return dashicon.replace(/^dashicons-/, '').replace(/-/g, ' ');
}

/** Friendly category label used in the palette section header. */
export const CATEGORY_LABEL: Record<ListingComponentDescriptor['category'], string> = {
  core: 'Core',
  media: 'Media',
  taxonomy: 'Taxonomy',
  repeater: 'Repeater',
  page_structure: 'Page Structure',
};

/**
 * Order categories appear in the palette. Anything not in this list
 * falls to the bottom in alphabetical order.
 */
export const CATEGORY_ORDER: ListingComponentDescriptor['category'][] = [
  'core',
  'media',
  'taxonomy',
  'repeater',
  'page_structure',
];

/** Quick lookup helper used by the inspector. */
export function findDescriptor(
  components: ListingComponentDescriptor[],
  type: ListingComponentType
): ListingComponentDescriptor | undefined {
  return components.find((descriptor) => descriptor.type === type);
}

/**
 * Generic collapsible section card — same look as the Query Builder
 * tabs so the two builders feel like one product.
 */
export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rdcfe-card rdcfe-overflow-visible">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rdcfe-w-full rdcfe-px-5 rdcfe-py-3 rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-bg-gradient-to-r rdcfe-from-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-to-transparent hover:rdcfe-from-[hsl(var(--rdcfe-muted)/0.7)] rdcfe-transition-all rdcfe-rounded-t-xl"
      >
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
          <div className="rdcfe-w-8 rdcfe-h-8 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))]">
            {icon}
          </div>
          <span className="rdcfe-font-semibold rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
            {title}
          </span>
          {badge && (
            <span className="rdcfe-px-2 rdcfe-py-0.5 rdcfe-text-[11px] rdcfe-font-semibold rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight
          className={`rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200 ${
            isOpen ? 'rdcfe-rotate-90' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="rdcfe-p-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Two-column form row — 180px label / fluid input. Slightly tighter
 * than the Query Builder's `FieldRow` because the inspector lives in a
 * 320-340px sidebar rather than the full content area.
 */
export function InspectorRow({
  label,
  hint,
  required,
  children,
  error,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="rdcfe-py-3 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border)/0.5)] last:rdcfe-border-b-0 last:rdcfe-pb-0 first:rdcfe-pt-0">
      <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-mb-1.5">
        {label}
        {required && <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>}
      </label>
      {children}
      {hint && (
        <p className="rdcfe-mt-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
          {hint}
        </p>
      )}
      {error && (
        <p className="rdcfe-mt-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
          {error}
        </p>
      )}
    </div>
  );
}
