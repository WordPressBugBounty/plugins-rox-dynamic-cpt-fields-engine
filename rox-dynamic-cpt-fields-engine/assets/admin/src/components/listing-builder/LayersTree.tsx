/**
 * Layers Tree.
 *
 * Lists every component on the canvas in render order. Clicking a row
 * selects it (drives the inspector); HTML5 drag-and-drop reorders the
 * components without leaving the panel. Trash button removes.
 *
 * The DnD payload is shared with the canvas drag surface — both
 * surfaces emit `text/rdcfe-node-id` on dragstart, so authors can drag
 * a row from the layers tree and drop it onto the canvas (or
 * vice-versa, once the canvas accepts external drags).
 *
 * Component icons mirror `ComponentPalette.tsx` so a row in the tree
 * matches the tile that spawned it visually.
 */

import { useState } from 'react';
import {
  Type as TypeIcon,
  Image as ImageIcon,
  Link2,
  Calendar,
  Tag as TagIcon,
  List,
  Layers,
  Trash2,
  GripVertical,
  ListOrdered,
  type LucideIcon,
} from 'lucide-react';
import {
  CollapsibleSection,
  removeComponent,
  reorderComponent,
  type CanvasPanelProps,
} from './shared';
import type { ListingComponentType } from '../../services/api';

type DropPosition = 'before' | 'after';

const TYPE_ICON_MAP: Partial<Record<ListingComponentType, LucideIcon>> = {
  dynamic_text: TypeIcon,
  dynamic_image: ImageIcon,
  dynamic_link: Link2,
  dynamic_meta: Calendar,
  dynamic_fields_inline: ListOrdered,
  term_badges: TagIcon,
  repeater_output: List,
};

const TYPE_LABEL_MAP: Partial<Record<ListingComponentType, string>> = {
  dynamic_text: 'Dynamic Text',
  dynamic_image: 'Dynamic Image',
  dynamic_link: 'Dynamic Link',
  dynamic_meta: 'Dynamic Meta',
  dynamic_fields_inline: 'Inline Fields',
  term_badges: 'Term Badges',
  repeater_output: 'Repeater Output',
  post_content: 'Post Content',
  breadcrumbs: 'Breadcrumbs',
  post_nav: 'Post Navigation',
  comments: 'Comments Section',
  author_box: 'Author Box',
  share_buttons: 'Share Buttons',
  related_posts: 'Related Posts',
  archive_title: 'Archive Title',
  archive_description: 'Archive Description',
  pagination: 'Pagination',
  posts_count: 'Posts Count',
};

/**
 * Build a one-line preview string per component so the tree row tells
 * authors something useful at a glance — `Title` rather than the
 * generic "Dynamic Text".
 */
function summariseNode(type: ListingComponentType, settings: Record<string, unknown>): string {
  switch (type) {
    case 'dynamic_text': {
      const source = String(settings.source ?? '');
      if (source === 'title') return 'Title';
      if (source === 'excerpt') return 'Excerpt';
      if (source === 'content') return 'Content';
      if (source.startsWith('field:')) return source.slice('field:'.length);
      return source || 'Text';
    }
    case 'dynamic_image': {
      const source = String(settings.source ?? '');
      if (source === 'featured_image') return 'Featured Image';
      if (source.startsWith('field:')) return source.slice('field:'.length);
      return source || 'Image';
    }
    case 'dynamic_link': {
      const labelText = String(settings.label_text ?? '');
      const labelSource = String(settings.label_source ?? '');
      return labelSource || labelText || 'Link';
    }
    case 'dynamic_meta':
      return String(settings.meta_type ?? 'meta');
    case 'dynamic_fields_inline': {
      const items = Array.isArray(settings.items) ? settings.items : [];
      const count = items.length;
      return count > 0 ? `${count} field${count === 1 ? '' : 's'}` : 'inline fields';
    }
    case 'term_badges':
      return String(settings.taxonomy ?? 'category');
    case 'repeater_output':
      return String(settings.field_name ?? 'repeater');
    default:
      return TYPE_LABEL_MAP[type] ?? 'Component';
  }
}

export interface LayersTreeProps extends CanvasPanelProps {
  /** Optional history-commit hook — called after each reorder/delete. */
  onCommit?: () => void;
}

export function LayersTree({
  data,
  setData,
  selectedComponentId,
  setSelectedComponentId,
  onCommit,
}: LayersTreeProps) {
  const components = data.components ?? [];
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{ id: string; position: DropPosition } | null>(null);

  const handleRemove = (id: string) => {
    setData((prev) => removeComponent(prev, id));
    if (selectedComponentId === id) {
      setSelectedComponentId(null);
    }
    onCommit?.();
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/rdcfe-node-id', id);
    setDragSourceId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    if (!dragSourceId || dragSourceId === targetId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const position: DropPosition = offsetY < rect.height / 2 ? 'before' : 'after';
    setDragTarget((prev) =>
      !prev || prev.id !== targetId || prev.position !== position
        ? { id: targetId, position }
        : prev
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragSourceId || !dragTarget) {
      setDragSourceId(null);
      setDragTarget(null);
      return;
    }
    setData((prev) => reorderComponent(prev, dragSourceId, dragTarget.id, dragTarget.position));
    onCommit?.();
    setDragSourceId(null);
    setDragTarget(null);
  };

  const handleDragEnd = () => {
    setDragSourceId(null);
    setDragTarget(null);
  };

  return (
    <CollapsibleSection
      title="Layers"
      icon={<Layers className="rdcfe-w-4 rdcfe-h-4" />}
      badge={`${components.length}`}
    >
      {components.length === 0 ? (
        <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)] rdcfe-p-3 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
          Pick a tile from the Components panel above to add it here.
        </div>
      ) : (
        <ul className="rdcfe-space-y-1" onDragEnd={handleDragEnd}>
          {components.map((node) => {
            const Icon = TYPE_ICON_MAP[node.type] ?? Layers;
            const isSelected = node.id === selectedComponentId;
            const summary = summariseNode(node.type, node.settings);
            const isDragSource = dragSourceId === node.id;
            const isDropTarget = dragTarget?.id === node.id;
            const dropClass = isDropTarget
              ? dragTarget?.position === 'before'
                ? 'rdcfe-border-t-2 rdcfe-border-t-[hsl(var(--rdcfe-primary))]'
                : 'rdcfe-border-b-2 rdcfe-border-b-[hsl(var(--rdcfe-primary))]'
              : '';
            return (
              <li
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragOver={(e) => handleDragOver(e, node.id)}
                onDrop={handleDrop}
              >
                <div
                  className={`rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-2 rdcfe-py-1.5 rdcfe-rounded-lg rdcfe-border rdcfe-transition-all rdcfe-cursor-pointer ${
                    isSelected
                      ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.08)]'
                      : 'rdcfe-border-transparent hover:rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)]'
                  } ${isDragSource ? 'rdcfe-opacity-40' : ''} ${dropClass}`}
                  onClick={() => setSelectedComponentId(node.id)}
                >
                  <GripVertical
                    className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0 rdcfe-cursor-grab active:rdcfe-cursor-grabbing"
                    aria-hidden="true"
                  />
                  <span className="rdcfe-w-7 rdcfe-h-7 rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0">
                    <Icon className="rdcfe-w-3.5 rdcfe-h-3.5" />
                  </span>
                  <div className="rdcfe-flex-1 rdcfe-min-w-0">
                    <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-truncate">
                      {summary}
                    </div>
                    <div className="rdcfe-text-[10px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-truncate">
                      {TYPE_LABEL_MAP[node.type] ?? node.type}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Remove this component from the layout?')) {
                        handleRemove(node.id);
                      }
                    }}
                    className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded-md rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)] rdcfe-transition-colors rdcfe-flex-shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="rdcfe-w-3.5 rdcfe-h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {components.length > 0 && (
        <p className="rdcfe-mt-2 rdcfe-text-[10px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-italic">
          Tip — drag a row to reorder, or drag directly on the canvas.
        </p>
      )}
    </CollapsibleSection>
  );
}
