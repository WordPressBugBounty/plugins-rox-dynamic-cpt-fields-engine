/**
 * Listings hooks.
 *
 * Wraps `listingsApi` with the same TanStack-Query patterns the Query
 * Builder uses (see `useQueries.ts`) so list pages, the 3-panel builder,
 * and inline preview drawers all share one cache and one invalidation
 * pipeline.
 *
 * Single source of truth for `['listings', ...]` cache keys + the form
 * normalisation helper that fills in every nested key the editor
 * components rely on existing.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listingsApi,
  type ListingComponentDescriptor,
  type ListingComponentNode,
  type ListingComponentType,
  type ListingConfig,
  type ListingConfigData,
  type ListingPreviewResult,
  type ListingType,
  type QueryPreviewContext,
} from '../services/api';
import { __, TEXT_DOMAIN } from '../lib/i18n';

export const LISTINGS_QUERY_KEY = ['listings'] as const;
export const LISTING_COMPONENTS_KEY = ['listings', 'components'] as const;
export const LISTING_DYNAMIC_SOURCES_KEY = ['listings', 'dynamic-sources'] as const;

/**
 * Form-level shape used by the template builder + grid builder. Keeps
 * the title separate from the JSON config so the editor can round-trip
 * both through one piece of state.
 */
export interface ListingFormData {
  title: string;
  status: 'publish' | 'draft';
  data: ListingConfigData;
}

/**
 * Empty/initial template config — every nested key present so editor
 * components never have to null-check.
 */
export function createEmptyTemplateConfig(): ListingConfigData {
  return {
    listing_type: 'template',
    data_source: 'posts',
    post_types: [],
    components: [],
  };
}

/**
 * Empty/initial grid config — sane defaults that match the renderer's
 * own fallbacks so a freshly-created grid renders something even before
 * the author touches the form.
 */
export function createEmptyGridConfig(): ListingConfigData {
  return {
    listing_type: 'grid',
    data_source: 'posts',
    template_id: 0,
    query_id: 0,
    columns: 3,
    layout: 'grid',
    slider_nav: true,
    slider_dots: true,
    slider_autoplay: false,
    slider_loop: false,
    slider_autoplay_delay: 5000,
    gap: '20px',
    pagination: 'none',
    empty_message: __('No items found.', TEXT_DOMAIN),
  };
}

export function createDefaultTemplateFormData(): ListingFormData {
  return {
    title: '',
    status: 'publish',
    data: createEmptyTemplateConfig(),
  };
}

export function createDefaultGridFormData(): ListingFormData {
  return {
    title: '',
    status: 'publish',
    data: createEmptyGridConfig(),
  };
}

export function createEmptySinglePageConfig(): ListingConfigData {
  return {
    listing_type: 'single_page',
    data_source: 'posts',
    post_types: [],
    components: [],
    editor: 'rdcfe',
    override_post_types: [],
    canvas_mode: 'full_width',
    placement: 'template_include',
  };
}

export function createEmptyArchivePageConfig(): ListingConfigData {
  return {
    listing_type: 'archive_page',
    data_source: 'posts',
    post_types: [],
    components: [],
    editor: 'rdcfe',
    override_post_types: [],
    canvas_mode: 'full_width',
    placement: 'template_include',
  };
}

export function createDefaultSinglePageFormData(): ListingFormData {
  return {
    title: '',
    status: 'publish',
    data: createEmptySinglePageConfig(),
  };
}

export function createDefaultArchivePageFormData(): ListingFormData {
  return {
    title: '',
    status: 'publish',
    data: createEmptyArchivePageConfig(),
  };
}

/**
 * Generate a deterministic-ish id for a freshly-dropped component. We
 * keep the prefix human-readable (`comp_`) so the saved JSON is easier
 * to debug in the database, and we suffix with a base-36 timestamp +
 * randomness so two rapid drops never collide.
 */
export function generateComponentId(type: ListingComponentType): string {
  const random = Math.random().toString(36).slice(2, 6);
  const stamp = Date.now().toString(36).slice(-4);
  return `${type}_${stamp}${random}`;
}

/**
 * Build a fresh component node populated with the registry-provided
 * default settings. Falls back to a hand-rolled minimum when the
 * descriptor is missing (rare — only happens if the catalogue endpoint
 * is unreachable).
 */
export function createComponentNode(
  descriptor: ListingComponentDescriptor | undefined,
  type: ListingComponentType
): ListingComponentNode {
  return {
    id: generateComponentId(type),
    type,
    settings: descriptor
      ? structuredClone(descriptor.default_settings)
      : {},
  };
}

/**
 * Normalise a server-side `ListingConfig` into the form shape — fills
 * in any nested keys the component-palette / inspector code path
 * assumes are present.
 */
const EMPTY_CONFIG_FACTORIES: Record<ListingType, () => ListingConfigData> = {
  template: createEmptyTemplateConfig,
  grid: createEmptyGridConfig,
  single_page: createEmptySinglePageConfig,
  archive_page: createEmptyArchivePageConfig,
};

function configToForm(config: ListingConfig): ListingFormData {
  const incoming = (config.data || {}) as Partial<ListingConfigData>;
  const listingType: ListingType = incoming.listing_type ?? 'template';

  const factory = EMPTY_CONFIG_FACTORIES[listingType] ?? createEmptyTemplateConfig;
  const empty = factory();

  return {
    title: config.title || '',
    status: (config.status as 'publish' | 'draft') || 'publish',
    data: {
      ...empty,
      ...incoming,
      components: Array.isArray(incoming.components) ? incoming.components : empty.components ?? [],
      post_types: Array.isArray(incoming.post_types) ? incoming.post_types : empty.post_types ?? [],
      override_post_types: Array.isArray(incoming.override_post_types)
        ? incoming.override_post_types
        : empty.override_post_types ?? [],
    },
  };
}

// =====================================================================
// Queries
// =====================================================================

export function useListings(status: 'all' | 'publish' | 'draft' = 'all') {
  return useQuery({
    queryKey: [...LISTINGS_QUERY_KEY, 'list', status],
    queryFn: async () => {
      const response = await listingsApi.getAll(status);
      return response.data;
    },
  });
}

export function useListing(id: number | null) {
  return useQuery({
    queryKey: [...LISTINGS_QUERY_KEY, 'single', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await listingsApi.get(id);
      return {
        raw: response.data,
        form: configToForm(response.data),
      };
    },
    enabled: !!id,
  });
}

/** Templates only — feeds the Grid builder's template picker. */
export function useListingTemplates() {
  return useQuery({
    queryKey: [...LISTINGS_QUERY_KEY, 'templates'],
    queryFn: async () => {
      const response = await listingsApi.getTemplates();
      return response.data;
    },
  });
}

/**
 * Component palette catalogue. Cached aggressively because the registry
 * only changes when a Pro add-on is activated/deactivated.
 */
export function useListingComponents() {
  return useQuery({
    queryKey: LISTING_COMPONENTS_KEY,
    queryFn: async () => {
      const response = await listingsApi.getComponents();
      return response.data.components;
    },
    staleTime: 60_000,
  });
}

/**
 * dynamic source catalog for hierarchical field pickers.
 */
export function useDynamicSources() {
  return useQuery({
    queryKey: LISTING_DYNAMIC_SOURCES_KEY,
    queryFn: async () => {
      const response = await listingsApi.getDynamicSources();
      return response.data;
    },
    staleTime: 60_000,
  });
}

// =====================================================================
// Mutations
// =====================================================================

function useInvalidateListings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
}

export function useCreateListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async (data: ListingFormData) => {
      const response = await listingsApi.create({
        title: data.title,
        data: data.data,
        status: data.status,
      });
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ListingFormData }) => {
      const response = await listingsApi.update(id, {
        title: data.title,
        data: data.data,
        status: data.status,
      });
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await listingsApi.delete(id);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useDuplicateListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async ({ id, title }: { id: number; title?: string }) => {
      const response = await listingsApi.duplicate(id, title);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useToggleListingStatus() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'publish' | 'draft' }) => {
      const response = await listingsApi.toggleStatus(id, status);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

/**
 * Run a draft (unsaved) preview from the editor.
 *
 * Not invalidated by mutations — preview is a side-effect read and
 * shouldn't poison the saved-listing cache.
 */
export function usePreviewDraftListing() {
  return useMutation<
    ListingPreviewResult,
    Error,
    { config: ListingConfigData; sample_id?: number; context?: QueryPreviewContext }
  >({
    mutationFn: async ({ config, sample_id, context }) => {
      const response = await listingsApi.previewDraft(config, { sample_id, context });
      return response.data;
    },
  });
}
