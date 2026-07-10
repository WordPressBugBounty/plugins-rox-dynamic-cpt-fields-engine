/**
 * Component Palette.
 *
 * Left-rail tile picker — author clicks (or drags) a tile and a fresh
 * component node lands at the bottom of the canvas. Categorised per
 * the registry payload (`core` / `media` / `taxonomy` / `repeater`).
 *
 * V1 is click-to-add — drag-and-drop reorder lives in `LayersTree.tsx`
 * to keep this component pure presentation. The HTML5 drag API is
 * notoriously fiddly inside scrollable containers and a click-to-add
 * pattern + arrow-button reorder gives every user (including keyboard
 * users) a working path on day one.
 */

import { useMemo } from 'react';
import {
  Type as TypeIcon,
  Image as ImageIcon,
  Link2,
  Calendar,
  Tag as TagIcon,
  List,
  Plus,
  Sparkles,
  FileText,
  Navigation,
  ArrowLeftRight,
  MessageSquare,
  UserCircle,
  Share2,
  LayoutGrid,
  Heading,
  AlignLeft,
  ChevronRight as ChevronRightIcon,
  Hash,
  ListOrdered,
  type LucideIcon,
} from 'lucide-react';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  CollapsibleSection,
  appendComponent,
  type BuilderProps,
} from './shared';
import { createComponentNode } from '../../hooks/useListings';
import type {
  ListingComponentContext,
  ListingComponentDescriptor,
  ListingComponentType,
  ListingType,
} from '../../services/api';

/**
 * Map component type slugs to Lucide icons. Anything missing falls
 * back to a generic Plus icon.
 */
const TYPE_ICON_MAP: Partial<Record<ListingComponentType, LucideIcon>> = {
  dynamic_text: TypeIcon,
  dynamic_image: ImageIcon,
  dynamic_link: Link2,
  dynamic_meta: Calendar,
  dynamic_fields_inline: ListOrdered,
  term_badges: TagIcon,
  repeater_output: List,
  post_content: FileText,
  breadcrumbs: Navigation,
  post_nav: ArrowLeftRight,
  comments: MessageSquare,
  author_box: UserCircle,
  share_buttons: Share2,
  related_posts: LayoutGrid,
  archive_title: Heading,
  archive_description: AlignLeft,
  pagination: ChevronRightIcon,
  posts_count: Hash,
};

/** Per-category tone — drives the pill chip at the top of each section. */
const CATEGORY_TONE: Record<ListingComponentDescriptor['category'], string> = {
  core: 'hsl(217 91% 60%)',
  media: 'hsl(38 92% 50%)',
  taxonomy: 'hsl(262 83% 58%)',
  repeater: 'hsl(142 71% 45%)',
  page_structure: 'hsl(142 71% 45%)',
};

/** Page-mode section labels for the palette. */
const PAGE_SECTION_LABELS: Record<string, string> = {
  page_structure: 'Page Structure',
  dynamic_content: 'Dynamic Content',
  advanced: 'Advanced',
};

const PAGE_SECTION_TONES: Record<string, string> = {
  page_structure: 'hsl(142 71% 45%)',
  dynamic_content: 'hsl(217 91% 60%)',
  advanced: 'hsl(262 83% 58%)',
};

const DYNAMIC_CONTENT_TYPES = new Set<ListingComponentType>([
  'dynamic_text',
  'dynamic_image',
  'dynamic_link',
  'dynamic_meta',
  'dynamic_fields_inline',
  'term_badges',
]);

const ADVANCED_TYPES = new Set<ListingComponentType>([
  'repeater_output',
]);

interface ComponentPaletteProps extends BuilderProps {
  listingType?: ListingType;
}

/**
 * Filter components by listing context. Components with `context: ['all']`
 * are always shown. Components with `context: ['single_page']` only appear
 * in single page mode, etc.
 */
function filterByContext(
  components: ListingComponentDescriptor[],
  listingType: ListingType
): ListingComponentDescriptor[] {
  return components.filter((c) => {
    const ctx = c.context ?? ['all'];
    if (ctx.includes('all')) return true;
    return ctx.includes(listingType as ListingComponentContext);
  });
}

export function ComponentPalette({
  data,
  setData,
  components,
  setSelectedComponentId,
  listingType,
}: ComponentPaletteProps) {
  const effectiveType = listingType ?? data.listing_type ?? 'template';
  const isPageMode = effectiveType === 'single_page' || effectiveType === 'archive_page';

  const visibleComponents = useMemo(
    () => filterByContext(components, effectiveType),
    [components, effectiveType]
  );

  const handleAdd = (descriptor: ListingComponentDescriptor) => {
    const node = createComponentNode(descriptor, descriptor.type);
    setData((prev) => appendComponent(prev, node));
    setSelectedComponentId(node.id);
  };

  if (isPageMode) {
    return (
      <PageModePalette
        components={visibleComponents}
        onAdd={handleAdd}
        emptyCanvas={(data.components ?? []).length === 0}
      />
    );
  }

  // Card mode — original grouping by category.
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: visibleComponents.filter((c) => c.category === category),
  })).filter((g) => g.items.length > 0);

  const knownCategories = new Set(CATEGORY_ORDER);
  const unknown = visibleComponents.filter((c) => !knownCategories.has(c.category));

  return (
    <CollapsibleSection
      title="Components"
      icon={<Sparkles className="rdcfe-w-4 rdcfe-h-4" />}
      badge={`${visibleComponents.length}`}
    >
      <div className="rdcfe-space-y-5">
        {grouped.map(({ category, items }) => (
          <PaletteSection
            key={category}
            label={CATEGORY_LABEL[category] ?? category}
            tone={CATEGORY_TONE[category] ?? 'hsl(var(--rdcfe-primary))'}
            items={items}
            onAdd={handleAdd}
          />
        ))}
        {unknown.length > 0 && (
          <PaletteSection
            label="More"
            tone="hsl(var(--rdcfe-primary))"
            items={unknown}
            onAdd={handleAdd}
          />
        )}
      </div>

      {data.components && data.components.length === 0 && (
        <div className="rdcfe-mt-5 rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)] rdcfe-p-3 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
          Click any tile to add it to the canvas. The order on the canvas matches the order
          rendered on the front-end.
        </div>
      )}
    </CollapsibleSection>
  );
}

/**
 * Page-mode palette — groups components into three sections:
 * Page Structure, Dynamic Content, and Advanced.
 */
function PageModePalette({
  components,
  onAdd,
  emptyCanvas,
}: {
  components: ListingComponentDescriptor[];
  onAdd: (descriptor: ListingComponentDescriptor) => void;
  emptyCanvas: boolean;
}) {
  const sections = useMemo(() => {
    const pageStructure = components.filter((c) => c.category === 'page_structure');
    const dynamicContent = components.filter((c) => DYNAMIC_CONTENT_TYPES.has(c.type));
    const advanced = components.filter((c) => ADVANCED_TYPES.has(c.type));

    const categorized = new Set([
      ...pageStructure.map((c) => c.type),
      ...dynamicContent.map((c) => c.type),
      ...advanced.map((c) => c.type),
    ]);
    const other = components.filter((c) => !categorized.has(c.type));

    return [
      { key: 'page_structure', items: pageStructure },
      { key: 'dynamic_content', items: dynamicContent },
      { key: 'advanced', items: [...advanced, ...other] },
    ].filter((s) => s.items.length > 0);
  }, [components]);

  return (
    <CollapsibleSection
      title="Components"
      icon={<Sparkles className="rdcfe-w-4 rdcfe-h-4" />}
      badge={`${components.length}`}
    >
      <div className="rdcfe-space-y-5">
        {sections.map(({ key, items }) => (
          <PaletteSection
            key={key}
            label={PAGE_SECTION_LABELS[key] ?? key}
            tone={PAGE_SECTION_TONES[key] ?? 'hsl(var(--rdcfe-primary))'}
            items={items}
            onAdd={onAdd}
          />
        ))}
      </div>

      {emptyCanvas && (
        <div className="rdcfe-mt-5 rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)] rdcfe-p-3 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
          Click any tile to add it to the canvas. Page Structure components are specific to this
          template type.
        </div>
      )}
    </CollapsibleSection>
  );
}

function PaletteSection({
  label,
  tone,
  items,
  onAdd,
}: {
  label: string;
  tone: string;
  items: ListingComponentDescriptor[];
  onAdd: (descriptor: ListingComponentDescriptor) => void;
}) {
  return (
    <div>
      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-2">
        <span
          className="rdcfe-px-2 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[10px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider"
          style={{
            background: tone.replace(')', ' / 0.12)'),
            color: tone,
          }}
        >
          {label}
        </span>
        <div className="rdcfe-flex-1 rdcfe-h-px rdcfe-bg-[hsl(var(--rdcfe-border))]" />
      </div>
      <div className="rdcfe-grid rdcfe-grid-cols-2 rdcfe-gap-2">
        {items.map((descriptor) => (
          <PaletteTile key={descriptor.type} descriptor={descriptor} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}

/**
 * MIME type that signals a palette → canvas insert.
 *
 * Mirrored as a constant inside `CanvasPreview` (`MIME_PALETTE_TYPE`).
 * Kept duplicated rather than shared because the two components own
 * their respective DnD lifecycles independently — the palette only
 * needs to *write* the type, the canvas only needs to *read* it. A
 * shared module would couple them for one constant.
 */
const PALETTE_DRAG_MIME = 'application/x-rdcfe-component-type';

function PaletteTile({
  descriptor,
  onAdd,
}: {
  descriptor: ListingComponentDescriptor;
  onAdd: (descriptor: ListingComponentDescriptor) => void;
}) {
  const Icon = TYPE_ICON_MAP[descriptor.type] ?? Plus;

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(PALETTE_DRAG_MIME, descriptor.type);
    // Many browsers refuse to start a drag without text/plain content
    // — set a human-readable fallback so the gesture works everywhere.
    e.dataTransfer.setData('text/plain', descriptor.label);
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAdd(descriptor)}
      title={`Add ${descriptor.label} — click to append, or drag onto the canvas to insert.`}
      className="rdcfe-group rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-justify-center rdcfe-gap-2 rdcfe-px-2 rdcfe-py-3 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-bg-[hsl(var(--rdcfe-primary)/0.04)] hover:rdcfe-shadow-sm rdcfe-transition-all rdcfe-cursor-grab active:rdcfe-cursor-grabbing"
    >
      <span className="rdcfe-w-8 rdcfe-h-8 rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-muted))] group-hover:rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] group-hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors">
        <Icon className="rdcfe-w-4 rdcfe-h-4" />
      </span>
      <span className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-text-center rdcfe-leading-tight">
        {descriptor.label}
      </span>
    </button>
  );
}
