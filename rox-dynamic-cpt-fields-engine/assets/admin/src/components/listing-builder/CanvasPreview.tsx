/**
 * Canvas Preview — Interactive Builder Surface.
 *
 * Beyond rendering the server-side preview HTML, this component now:
 *   - **Click-to-select** — clicking any rendered component focuses it
 *     in the inspector. Powered by the `data-rdcfe-node-id` wrapper
 *     emitted in preview mode by `ListingRenderer::render_components`.
 *   - **Link interception** — every `<a>` click inside the canvas is
 *     `preventDefault`'d so authors can't accidentally navigate away
 *     while building. Selection still fires on the link's wrapper.
 *   - **Quick actions on selection** — when a node is selected, a
 *     single purple bar above the node shows a **drag grip** plus
 *     ↑ / ↓ / duplicate / delete (no separate white chip). No
 *     technical type slug (e.g. `DYNAMIC_META`) in the chrome — hover
 *     labels are also hidden in the canvas so the preview stays clean.
 *   - **Drag-and-drop reorder** — wrappers are `draggable="true"` from
 *     the renderer; we delegate dragstart/dragover/drop at the canvas
 *     root and call `reorderComponent` on commit.
 *   - **Viewport switcher** — desktop / tablet / mobile widths so
 *     authors can preview responsive collapse without a real device.
 *   - **Sample-post typeahead** — replaces the V1 numeric ID input
 *     with a `/wp/v2/search` typeahead that lists recent matches as
 *     authors type.
 *
 * Single source of truth for "what's selected" remains the parent
 * form's `selectedComponentId` — this component dispatches setSelected
 * on canvas clicks, listens for the same id to draw its outline.
 *
 * The dangerouslySetInnerHTML usage is safe because the HTML is
 * generated server-side by `ListingRenderer`, which routes every
 * dynamic value through `wp_kses_post` / `esc_html` / `esc_attr` /
 * `esc_url`. We never inject author input directly into the canvas.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  ArrowUp,
  ArrowDown,
  Copy as CopyIcon,
  Trash2,
  Search,
  X,
  GripVertical,
} from 'lucide-react';
import {
  duplicateComponent,
  moveComponent,
  removeComponent,
  reorderComponent,
  type CanvasPanelProps,
} from './shared';
import {
  createComponentNode,
  generateComponentId,
  usePreviewDraftListing,
} from '../../hooks/useListings';
import type {
  ListingComponentDescriptor,
  ListingComponentType,
  ListingConfigData,
} from '../../services/api';

/**
 * Custom MIME types for HTML5 drag-and-drop on the canvas.
 *
 * - `text/rdcfe-node-id`            — moving an existing canvas node.
 * - `application/x-rdcfe-component-type` — adding a new node from the
 *   palette. Carries the component-type slug.
 *
 * Custom MIME types are deliberately distinct so the canvas can tell
 * "reorder" from "insert" in `dragover` (`dataTransfer.types`) without
 * needing to read the payload — most browsers gate `getData()` to the
 * `drop` phase for security.
 */
const MIME_NODE_ID = 'text/rdcfe-node-id';
const MIME_PALETTE_TYPE = 'application/x-rdcfe-component-type';
const PALETTE_DRAG_SENTINEL = '__rdcfe_palette__';

interface CanvasPreviewProps extends CanvasPanelProps {
  /** Optional commit hook — called after each "atomic" canvas mutation
   *  (drag-drop, duplicate, delete) so the parent's history stack can
   *  collapse the change into a single undo step. */
  onCommit?: () => void;
  /**
   * Optional replacement for the empty-canvas hint. Parent renders a
   * preset gallery (or any other onboarding affordance) and we drop
   * it where the "Empty canvas" copy used to live. Keeps preset logic
   * out of this presentational component.
   */
  emptyStateSlot?: React.ReactNode;
  /**
   * Component descriptor catalogue from `/listings/components`.
   * Required to seed default settings when the user drags a *palette*
   * tile onto the canvas (see `MIME_PALETTE_TYPE`). Optional because
   * the move-only DnD path doesn't need it.
   */
  descriptors?: ListingComponentDescriptor[];
}

type Viewport = 'desktop' | 'tablet' | 'mobile';
type DropPosition = 'before' | 'after';

interface DragState {
  sourceId: string;
  targetId: string | null;
  position: DropPosition;
}

/* ===========================================================================
 * Sample post typeahead (inline — only used here)
 * ========================================================================= */

interface PostSearchResult {
  id: number;
  title: string;
  url?: string;
  type?: string;
  subtype?: string;
}

function getWpRestRoot(): string {
  const restUrl = (window.rdcfeSettings?.restUrl ?? '/wp-json/dcfe/v1/') as string;
  // Slice off `<plugin-namespace>/v<version>/` to land on the wp-json
  // root. Works for both absolute and relative restUrl values.
  return restUrl.replace(/[^/]+\/v\d+\/?$/, '');
}

function useDebounced<T>(value: T, delay = 600): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Hit `/wp/v2/search` to power the sample-post typeahead. Single in-flight
 * request at a time — older requests are abandoned via AbortController so
 * fast typists don't get stale results.
 */
function useSamplePostSearch(query: string, postTypes: string[]) {
  const debouncedQuery = useDebounced(query, 250);
  const [results, setResults] = useState<PostSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);

    const params = new URLSearchParams({
      search: debouncedQuery,
      per_page: '8',
      type: 'post',
    });
    if (postTypes.length > 0) {
      params.set('subtype', postTypes.join(','));
    }
    const root = getWpRestRoot();
    const url = `${root}wp/v2/search?${params.toString()}`;

    fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'X-WP-Nonce': window.rdcfeSettings?.nonce ?? '' },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (!Array.isArray(data)) {
          setResults([]);
          return;
        }
        const mapped = data.map((row): PostSearchResult => {
          const r = row as Record<string, unknown>;
          return {
            id: Number(r.id ?? 0),
            title: String(r.title ?? ''),
            url: typeof r.url === 'string' ? r.url : undefined,
            type: typeof r.type === 'string' ? r.type : undefined,
            subtype: typeof r.subtype === 'string' ? r.subtype : undefined,
          };
        });
        setResults(mapped.filter((row) => row.id > 0));
      })
      .catch(() => {
        setResults([]);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedQuery, postTypes.join('|')]);  

  return { results, isLoading };
}

interface SamplePostPickerProps {
  value: number | null;
  postTypes: string[];
  onPick: (id: number, title?: string) => void;
  onClear: () => void;
  /** Anchor the results panel. `end` keeps it inside the viewport when the field sits on the right edge. */
  dropdownAlign?: 'start' | 'end';
}

function SamplePostPicker({
  value,
  postTypes,
  onPick,
  onClear,
  dropdownAlign = 'start',
}: SamplePostPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pickedTitle, setPickedTitle] = useState<string | null>(null);
  const { results, isLoading } = useSamplePostSearch(query, postTypes);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const displayValue = useMemo(() => {
    if (value && pickedTitle) return `${pickedTitle} (#${value})`;
    if (value) return `#${value}`;
    return '';
  }, [value, pickedTitle]);

  return (
    <div
      className="rdcfe-relative rdcfe-w-36 rdcfe-max-w-[9rem] sm:rdcfe-w-40 sm:rdcfe-max-w-[10rem] rdcfe-flex-shrink-0"
      ref={containerRef}
    >
      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-bg-white rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-rounded-md rdcfe-px-2 rdcfe-py-0.5 rdcfe-w-full">
        <Search className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0" />
        <input
          type="text"
          value={open ? query : displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search title..."
          className="rdcfe-flex-1 rdcfe-text-[11px] rdcfe-bg-transparent rdcfe-border-0 rdcfe-outline-none rdcfe-min-w-0"
        />
        {value !== null && value > 0 && (
          <button
            type="button"
            onClick={() => {
              onClear();
              setQuery('');
              setPickedTitle(null);
              setOpen(false);
            }}
            className="rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-md rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex-shrink-0"
            title="Clear sample"
          >
            <X className="rdcfe-w-3 rdcfe-h-3" />
          </button>
        )}
      </div>
      {open && (query.trim().length >= 2 || results.length > 0) && (
        <div
          className={`rdcfe-absolute rdcfe-top-full rdcfe-mt-1 rdcfe-bg-white rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-rounded-md rdcfe-shadow-lg rdcfe-z-50 rdcfe-min-w-[240px] rdcfe-max-h-[260px] rdcfe-overflow-y-auto ${
            dropdownAlign === 'end' ? 'rdcfe-right-0 rdcfe-left-auto' : 'rdcfe-left-0'
          }`}
        >
          {isLoading && (
            <div className="rdcfe-px-3 rdcfe-py-3 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex rdcfe-items-center rdcfe-gap-2">
              <Loader2 className="rdcfe-w-3 rdcfe-h-3 rdcfe-animate-spin" />
              Searching…
            </div>
          )}
          {!isLoading && results.length === 0 && query.trim().length >= 2 && (
            <div className="rdcfe-px-3 rdcfe-py-3 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              No results
            </div>
          )}
          {results.map((row) => (
            <button
              key={`${row.type ?? ''}-${row.id}`}
              type="button"
              onClick={() => {
                onPick(row.id, row.title);
                setPickedTitle(row.title);
                setQuery('');
                setOpen(false);
              }}
              className="rdcfe-w-full rdcfe-text-left rdcfe-px-3 rdcfe-py-2 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-gap-2 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border)/0.4)] last:rdcfe-border-b-0"
            >
              <span className="rdcfe-truncate">{row.title || `#${row.id}`}</span>
              <span className="rdcfe-text-[10px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0">
                {row.subtype ?? row.type ?? ''} · #{row.id}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===========================================================================
 * Canvas Preview proper
 * ========================================================================= */

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export function CanvasPreview({
  data,
  setData,
  selectedComponentId,
  setSelectedComponentId,
  onCommit,
  emptyStateSlot,
  descriptors,
}: CanvasPreviewProps) {
  const [sampleId, setSampleId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const previewMutation = usePreviewDraftListing();
  /** Padded `position:relative` shell — holds preview HTML + floating selection chrome. */
  const previewChromeRef = useRef<HTMLDivElement | null>(null);
  /** Host for `dangerouslySetInnerHTML` only (href strip + node queries). */
  const previewSurfaceRef = useRef<HTMLDivElement | null>(null);
  /** Pixel position of the type badge + action icons, relative to {@link previewChromeRef}. */
  const [selectedToolbarPos, setSelectedToolbarPos] = useState<{ top: number; left: number } | null>(
    null
  );

  // Stringify the data slice for deps — TanStack Query mutations don't
  // play nicely with deep-equality, so we only re-run when the
  // serialised form actually changes. Cheap because the config is
  // small (a few hundred bytes for a typical template).
  const dataSnapshot = useDebounced(JSON.stringify(data), 600);

  // Auto-fire the preview whenever the debounced snapshot changes (or
  // the sample id changes). Skipped when the layout is empty so we
  // don't ping the REST endpoint with no components on every render.
  useEffect(() => {
    if (!autoRefresh) return;
    if ((data.components ?? []).length === 0) return;
    const config = JSON.parse(dataSnapshot) as ListingConfigData;
    previewMutation.mutate({ config, sample_id: sampleId ?? 0 });
    // We intentionally exclude `previewMutation` from the dep list —
    // including it triggers an infinite loop because the mutation
    // object's identity changes on every render. The snapshot is the
    // only signal we care about.
     
  }, [dataSnapshot, sampleId, autoRefresh]);

  const handleManualRefresh = () => {
    if ((data.components ?? []).length === 0) return;
    previewMutation.mutate({ config: data, sample_id: sampleId ?? 0 });
  };

  const result = previewMutation.data;
  const error = previewMutation.error;
  const isLoading = previewMutation.isPending;
  const hasComponents = (data.components ?? []).length > 0;

  /* -------- Canvas event delegation ------------------------------------ */

  // Detect the closest interactive node from a DOM event target. Returns
  // null when the click landed on the empty card area — used for
  // "click outside any node = deselect" UX.
  const findNodeId = useCallback((target: EventTarget | null): string | null => {
    if (!(target instanceof Element)) return null;
    const wrapper = target.closest('[data-rdcfe-node-id]');
    if (!wrapper) return null;
    return wrapper.getAttribute('data-rdcfe-node-id');
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Action buttons inside the floating toolbar handle their own
      // clicks via React handlers below — `data-rdcfe-action` markers
      // tell us "this click was on the toolbar, don't reselect".
      if ((e.target as Element).closest('[data-rdcfe-action]')) {
        return;
      }
      const nodeId = findNodeId(e.target);
      setSelectedComponentId(nodeId);
    },
    [findNodeId, setSelectedComponentId]
  );

  // Bullet-proof link intercept — *two* layers of defence:
  //
  //   1. **Strip every `href` / `target` BEFORE first paint**
  //      (`useLayoutEffect`). The renderer just wrote fresh HTML via
  //      `dangerouslySetInnerHTML`; we walk it synchronously and
  //      remove every navigation hook before the browser even draws,
  //      so there is literally no destination for the click to go to.
  //      Original URLs are stashed on `data-rdcfe-href` so a future
  //      "open the real link" affordance can still recover them.
  //
  //   2. **Capture-phase event guard** (`useEffect`). Belt-and-braces
  //      `preventDefault` on `click` / `auxclick` — covers the
  //      microsecond between unmount-of-old-listener and remount, and
  //      any future renderer change that emits exotic anchor variants.
  //      Crucially we do NOT `stopPropagation` / `stopImmediatePropagation`
  //      — that would also kill React's bubble-phase `onClick`, which
  //      is what runs the inspector-selection logic.
  useLayoutEffect(() => {
    const root = previewSurfaceRef.current;
    if (!root) return;
    // `dangerouslySetInnerHTML` has already replaced the children —
    // walk every anchor and neuter its navigation hooks. Done in
    // `useLayoutEffect` so this completes before the browser commits
    // any frame the user could click on.
    const links = root.querySelectorAll<HTMLAnchorElement>('a');
    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (href !== null && href !== '') {
        link.setAttribute('data-rdcfe-href', href);
      }
      link.removeAttribute('href');
      link.removeAttribute('target');
      // `download` and inline `onclick` would still fire navigation
      // even on an hrefless anchor — strip them too.
      link.removeAttribute('download');
      link.removeAttribute('onclick');
    });
  }, [result?.html]);

  useEffect(() => {
    const root = previewSurfaceRef.current;
    if (!root) return;
    const blockNavigation = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Toolbar action buttons (move/duplicate/delete) sit above the
      // canvas surface — not relevant here, but cheap to short-circuit.
      if (target.closest('[data-rdcfe-action]')) return;
      if (target.closest('a')) {
        event.preventDefault();
      }
    };
    root.addEventListener('click', blockNavigation, { capture: true });
    root.addEventListener('auxclick', blockNavigation, { capture: true });
    return () => {
      root.removeEventListener('click', blockNavigation, { capture: true } as EventListenerOptions);
      root.removeEventListener('auxclick', blockNavigation, { capture: true } as EventListenerOptions);
    };
  }, [result?.html]);

  const handleCanvasMouseOver = useCallback(
    (e: React.MouseEvent) => {
      const nodeId = findNodeId(e.target);
      setHoveredNodeId(nodeId);
    },
    [findNodeId]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  /* -------- Drag-and-drop ---------------------------------------------- */

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // Drag may start from one of two places:
      //   1. The node wrapper itself (PHP renderer emits `draggable="true"`).
      //   2. The grip handle inside the floating toolbar — the toolbar
      //      lives outside the node wrapper, so `findNodeId` can't walk
      //      up to it. Fall back to the currently selected component.
      const fromGrip = (e.target as Element | null)?.closest?.(
        '[data-rdcfe-action="grip"]'
      );
      const sourceId = fromGrip ? selectedComponentId : findNodeId(e.target);
      if (!sourceId) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(MIME_NODE_ID, sourceId);

      // When the user grips the floating handle, the default drag image
      // would be the tiny icon. Use the actual node wrapper so the
      // ghost mirrors what's being moved.
      if (fromGrip) {
        const surface = previewSurfaceRef.current;
        const wrapper = surface?.querySelector(
          `[data-rdcfe-node-id="${sourceId}"]`
        ) as HTMLElement | null;
        if (wrapper) {
          const rect = wrapper.getBoundingClientRect();
          e.dataTransfer.setDragImage(
            wrapper,
            Math.min(rect.width / 2, 40),
            Math.min(rect.height / 2, 20)
          );
        }
      }

      setDragState({ sourceId, targetId: null, position: 'after' });
    },
    [findNodeId, selectedComponentId]
  );

  // Tells us whether the current drag is a palette "insert" without
  // peeking at the payload (browsers restrict `getData()` to `drop`).
  const isPaletteDrag = useCallback(
    (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(MIME_PALETTE_TYPE),
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      const palette = isPaletteDrag(e);
      if (!dragState && !palette) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = palette ? 'copy' : 'move';

      // Lazily kick off the drag state when the user drags a palette
      // tile in from outside this component — the source's
      // `dragstart` happens on the palette, which can't reach into
      // this component's state.
      if (palette && !dragState) {
        setDragState({ sourceId: PALETTE_DRAG_SENTINEL, targetId: null, position: 'after' });
      }

      const sentinelSource = palette ? PALETTE_DRAG_SENTINEL : dragState?.sourceId;

      const targetWrapper = (e.target as Element).closest('[data-rdcfe-node-id]') as HTMLElement | null;
      if (!targetWrapper) {
        setDragState((prev) => (prev ? { ...prev, targetId: null } : prev));
        return;
      }
      const targetId = targetWrapper.getAttribute('data-rdcfe-node-id');
      if (!targetId || targetId === sentinelSource) {
        setDragState((prev) => (prev ? { ...prev, targetId: null } : prev));
        return;
      }

      const rect = targetWrapper.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const position: DropPosition = offsetY < rect.height / 2 ? 'before' : 'after';

      setDragState((prev) =>
        prev && (prev.targetId !== targetId || prev.position !== position)
          ? { ...prev, targetId, position }
          : prev
      );
    },
    [dragState, isPaletteDrag]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      // Palette → canvas insert. Read the type from the payload (now
      // legal because we're in `drop`), build a fresh node from the
      // descriptor's defaults, and splice in at the indicator.
      if (isPaletteDrag(e)) {
        const type = e.dataTransfer.getData(MIME_PALETTE_TYPE) as ListingComponentType;
        if (type && descriptors) {
          const descriptor = descriptors.find((d) => d.type === type);
          const node = createComponentNode(descriptor, type);
          const targetId = dragState?.targetId ?? null;
          const position = dragState?.position ?? 'after';
          setData((prev) => {
            const existing = prev.components ?? [];
            if (!targetId) {
              return { ...prev, components: [...existing, node] };
            }
            const idx = existing.findIndex((c) => c.id === targetId);
            if (idx < 0) {
              return { ...prev, components: [...existing, node] };
            }
            const insertAt = position === 'before' ? idx : idx + 1;
            const next = [...existing];
            next.splice(insertAt, 0, node);
            return { ...prev, components: next };
          });
          setSelectedComponentId(node.id);
          onCommit?.();
        }
        setDragState(null);
        return;
      }

      if (!dragState || !dragState.targetId) {
        setDragState(null);
        return;
      }
      const { sourceId, targetId, position } = dragState;
      setData((prev) => reorderComponent(prev, sourceId, targetId, position));
      onCommit?.();
      setDragState(null);
    },
    [dragState, descriptors, isPaletteDrag, onCommit, setData, setSelectedComponentId]
  );

  const handleDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  /* -------- Apply selection / hover / drop classes + floating toolbar -------- */

  const updateSelectedToolbarPosition = useCallback(() => {
    const chrome = previewChromeRef.current;
    const surface = previewSurfaceRef.current;
    if (!chrome || !surface || !selectedComponentId) {
      setSelectedToolbarPos(null);
      return;
    }
    const el = Array.from(surface.querySelectorAll<HTMLElement>('[data-rdcfe-node-id]')).find(
      (node) => node.getAttribute('data-rdcfe-node-id') === selectedComponentId
    );
    if (!el) {
      setSelectedToolbarPos(null);
      return;
    }
    const chromeRect = chrome.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const top = Math.max(2, elRect.top - chromeRect.top - 26);
    const left = elRect.left - chromeRect.left + elRect.width / 2;
    setSelectedToolbarPos({ top, left });
  }, [selectedComponentId]);

  // `useLayoutEffect` so class toggles run *before* we measure for the
  // floating toolbar (and before paint — avoids a one-frame jump).
  useLayoutEffect(() => {
    const surface = previewSurfaceRef.current;
    if (!surface) return;
    const wrappers = surface.querySelectorAll<HTMLElement>('[data-rdcfe-node-id]');
    wrappers.forEach((wrapper) => {
      const id = wrapper.getAttribute('data-rdcfe-node-id');
      wrapper.classList.toggle('is-selected', id === selectedComponentId);
      wrapper.classList.toggle('is-hovered', id === hoveredNodeId);
      wrapper.classList.toggle('is-drag-source', dragState?.sourceId === id);
      const isDropTarget = dragState?.targetId === id;
      wrapper.classList.toggle('is-drop-before', isDropTarget && dragState?.position === 'before');
      wrapper.classList.toggle('is-drop-after', isDropTarget && dragState?.position === 'after');
    });
    updateSelectedToolbarPosition();
  }, [result?.html, selectedComponentId, hoveredNodeId, dragState, updateSelectedToolbarPosition]);

  useEffect(() => {
    if (!selectedComponentId) return;
    const chrome = previewChromeRef.current;
    const ro = chrome ? new ResizeObserver(() => updateSelectedToolbarPosition()) : null;
    if (chrome && ro) ro.observe(chrome);
    const onMove = () => updateSelectedToolbarPosition();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [selectedComponentId, updateSelectedToolbarPosition]);

  /* -------- Toolbar action handlers ----------------------------------- */

  const components = data.components ?? [];
  const selectedIndex = components.findIndex((node) => node.id === selectedComponentId);
  const selectedNode = selectedIndex >= 0 ? components[selectedIndex] : null;

  const handleMove = (direction: 'up' | 'down') => {
    if (!selectedComponentId) return;
    setData((prev) => moveComponent(prev, selectedComponentId, direction));
    onCommit?.();
  };

  const handleDuplicate = () => {
    if (!selectedComponentId) return;
    let newId: string | null = null;
    setData((prev) => {
      const result = duplicateComponent(prev, selectedComponentId, generateComponentId);
      newId = result.newId;
      return result.data;
    });
    onCommit?.();
    if (newId) {
      window.setTimeout(() => setSelectedComponentId(newId), 0);
    }
  };

  const handleDelete = () => {
    if (!selectedComponentId) return;
    if (!window.confirm('Remove this component from the layout?')) return;
    setData((prev) => removeComponent(prev, selectedComponentId));
    setSelectedComponentId(null);
    onCommit?.();
  };

  /* -------- Render ----------------------------------------------------- */

  return (
    <div className="rdcfe-card rdcfe-overflow-visible">
      {/* Toolbar — single row. Left: title + viewport. Right: sample
          search (compact) + Auto + refresh — `ml-auto` keeps the search
          cluster hugging the right edge so the middle stays empty. */}
      <div className="rdcfe-rounded-t-xl rdcfe-bg-gradient-to-r rdcfe-from-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-to-transparent rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))]">
        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-gap-x-2 rdcfe-gap-y-1.5 rdcfe-px-4 rdcfe-py-2.5">
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-min-w-0 rdcfe-flex-shrink-0">
            <div className="rdcfe-w-7 rdcfe-h-7 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0">
              <Eye className="rdcfe-w-3.5 rdcfe-h-3.5" />
            </div>
            <span className="rdcfe-font-semibold rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-whitespace-nowrap">
              Live Preview
            </span>
            {isLoading && (
              <Loader2 className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0" />
            )}
          </div>

          {/* Viewport switcher */}
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-0.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-md rdcfe-p-0.5 rdcfe-flex-shrink-0">
            {(['desktop', 'tablet', 'mobile'] as const).map((vp) => {
              const VPIcon = vp === 'desktop' ? Monitor : vp === 'tablet' ? Tablet : Smartphone;
              return (
                <button
                  key={vp}
                  type="button"
                  onClick={() => setViewport(vp)}
                  className={`rdcfe-w-6 rdcfe-h-6 rdcfe-rounded rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-transition-colors ${
                    viewport === vp
                      ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-shadow-sm'
                      : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                  }`}
                  title={`${vp.charAt(0).toUpperCase() + vp.slice(1)} preview`}
                >
                  <VPIcon className="rdcfe-w-3 rdcfe-h-3" />
                </button>
              );
            })}
          </div>

          <div className="rdcfe-flex-1 rdcfe-min-w-[8px]" />

          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-flex-shrink-0 rdcfe-ml-auto">
            <label className="rdcfe-text-[10px] rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-whitespace-nowrap">
              Sample
            </label>
            <SamplePostPicker
              value={sampleId}
              postTypes={data.post_types ?? []}
              onPick={(id) => setSampleId(id)}
              onClear={() => setSampleId(null)}
              dropdownAlign="end"
            />

            <button
              type="button"
              onClick={() => setAutoRefresh((auto) => !auto)}
              title={autoRefresh ? 'Auto-refresh on (click to pause)' : 'Auto-refresh paused (click to resume)'}
              className={`rdcfe-px-2 rdcfe-py-1 rdcfe-rounded-md rdcfe-text-[11px] rdcfe-font-semibold rdcfe-transition-colors rdcfe-flex-shrink-0 ${
                autoRefresh
                  ? 'rdcfe-bg-[hsl(var(--rdcfe-success)/0.12)] rdcfe-text-[hsl(var(--rdcfe-success))]'
                  : 'rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
              }`}
            >
              {autoRefresh ? 'Auto' : 'Paused'}
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoading || !hasComponents}
              title="Refresh preview"
              className="rdcfe-w-7 rdcfe-h-7 rdcfe-rounded-md rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] disabled:rdcfe-opacity-30 disabled:rdcfe-cursor-not-allowed rdcfe-transition-colors rdcfe-flex-shrink-0 rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
            >
              {isLoading ? (
                <Loader2 className="rdcfe-w-3 rdcfe-h-3 rdcfe-animate-spin" />
              ) : (
                <RefreshCw className="rdcfe-w-3 rdcfe-h-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="rdcfe-p-6 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-min-h-[420px]">
        {!hasComponents &&
          (emptyStateSlot ?? (
            <EmptyState
              title="Empty canvas"
              description="Add a component from the Components panel on the left, or pick one of the quick-start presets."
            />
          ))}

        {hasComponents && error && (
          <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(0_84%_88%)] rdcfe-bg-[hsl(0_84%_98%)] rdcfe-p-4">
            <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
              <AlertCircle className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
              <div>
                <div className="rdcfe-font-semibold rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                  Preview failed
                </div>
                <div className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
                  {error instanceof Error ? error.message : 'Unknown error'}
                </div>
              </div>
            </div>
          </div>
        )}

        {hasComponents && !error && result && (
          <div
            className="rdcfe-mx-auto rdcfe-transition-[max-width] rdcfe-duration-300"
            style={{ maxWidth: VIEWPORT_WIDTHS[viewport] }}
          >
            <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-shadow-sm rdcfe-overflow-visible">
              {result.message && (
                <div className="rdcfe-px-5 rdcfe-py-3 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)] rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))]">
                  {result.message}
                </div>
              )}
              {result.html ? (
                <div
                  ref={previewChromeRef}
                  className={`rdcfe-listing-canvas-preview rdcfe-p-6 rdcfe-relative ${
                    dragState ? 'is-dragging' : ''
                  }`}
                  onClick={handleCanvasClick}
                  onMouseOver={handleCanvasMouseOver}
                  onMouseLeave={handleCanvasMouseLeave}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                >
                  <div
                    ref={previewSurfaceRef}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: result.html }}
                  />
                  {selectedNode && selectedToolbarPos && (
                    <div
                      className={`rdcfe-pointer-events-auto rdcfe-absolute rdcfe-z-[35] rdcfe-inline-flex rdcfe-items-center rdcfe-gap-0.5 rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-primary)/0.62)] rdcfe-px-0.5 rdcfe-py-0.5 rdcfe-text-white rdcfe-shadow-sm rdcfe-transition-opacity ${
                        dragState ? 'rdcfe-opacity-0 rdcfe-pointer-events-none' : 'rdcfe-opacity-100'
                      }`}
                      style={{
                        top: selectedToolbarPos.top,
                        left: selectedToolbarPos.left,
                        transform: 'translateX(-50%)',
                      }}
                      data-rdcfe-action="container"
                    >
                      <span
                        className="rdcfe-inline-flex rdcfe-items-center rdcfe-justify-center rdcfe-rounded rdcfe-px-1 rdcfe-py-0.5 rdcfe-cursor-grab active:rdcfe-cursor-grabbing"
                        title="Drag this block to reorder"
                        aria-label="Drag to reorder"
                        data-rdcfe-action="grip"
                        draggable
                      >
                        <GripVertical className="rdcfe-w-3.5 rdcfe-h-3.5" aria-hidden />
                      </span>
                        <span
                          className="rdcfe-mx-0.5 rdcfe-h-4 rdcfe-w-px rdcfe-shrink-0 rdcfe-bg-white/25"
                          aria-hidden
                        />
                        <button
                          type="button"
                          data-rdcfe-action="up"
                          onClick={() => handleMove('up')}
                          disabled={selectedIndex === 0}
                          title="Move up"
                          className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-white/90 hover:rdcfe-bg-white/15 hover:rdcfe-text-white disabled:rdcfe-opacity-30 disabled:rdcfe-cursor-not-allowed rdcfe-transition-colors"
                        >
                          <ArrowUp className="rdcfe-w-3.5 rdcfe-h-3.5" />
                        </button>
                        <button
                          type="button"
                          data-rdcfe-action="down"
                          onClick={() => handleMove('down')}
                          disabled={selectedIndex === components.length - 1}
                          title="Move down"
                          className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-white/90 hover:rdcfe-bg-white/15 hover:rdcfe-text-white disabled:rdcfe-opacity-30 disabled:rdcfe-cursor-not-allowed rdcfe-transition-colors"
                        >
                          <ArrowDown className="rdcfe-w-3.5 rdcfe-h-3.5" />
                        </button>
                        <button
                          type="button"
                          data-rdcfe-action="duplicate"
                          onClick={handleDuplicate}
                          title="Duplicate (⌘D)"
                          className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-white/90 hover:rdcfe-bg-white/15 hover:rdcfe-text-white rdcfe-transition-colors"
                        >
                          <CopyIcon className="rdcfe-w-3.5 rdcfe-h-3.5" />
                        </button>
                        <button
                          type="button"
                          data-rdcfe-action="delete"
                          onClick={handleDelete}
                          title="Delete (Del)"
                          className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-white/90 hover:rdcfe-bg-red-500/35 hover:rdcfe-text-white rdcfe-transition-colors"
                        >
                          <Trash2 className="rdcfe-w-3.5 rdcfe-h-3.5" />
                        </button>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="Nothing to render"
                  description="Every component on the canvas resolved to an empty value. Pick a different sample post or check your bindings."
                  inset
                />
              )}
            </div>
          </div>
        )}

        {hasComponents && !error && !result && !isLoading && (
          <EmptyState
            title="Tap Refresh"
            description="Auto-refresh is paused. Click Refresh in the toolbar to render the current configuration."
          />
        )}

        {hasComponents && !error && !result && isLoading && (
          <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-py-20">
            <Loader2 className="rdcfe-w-6 rdcfe-h-6 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-primary))]" />
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="rdcfe-px-5 rdcfe-py-3 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-rounded-b-xl rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
        <Play className="rdcfe-w-3.5 rdcfe-h-3.5" />
        <span>
          Click any component on the canvas to edit it. Drag to reorder. Links are disabled inside
          the builder.
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  inset,
}: {
  title: string;
  description: string;
  inset?: boolean;
}) {
  return (
    <div
      className={`rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-text-center ${
        inset ? 'rdcfe-px-6 rdcfe-py-10' : 'rdcfe-px-6 rdcfe-py-16'
      }`}
    >
      <div className="rdcfe-w-12 rdcfe-h-12 rdcfe-mx-auto rdcfe-mb-3 rdcfe-rounded-xl rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
        <Eye className="rdcfe-w-5 rdcfe-h-5" />
      </div>
      <div className="rdcfe-text-[15px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1">
        {title}
      </div>
      <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-max-w-sm rdcfe-mx-auto">
        {description}
      </p>
    </div>
  );
}
