/**
 * Query Builder hooks.
 *
 * Wraps `queriesApi` with the same TanStack-Query patterns the rest of
 * the admin uses (`useMetaboxes`, `usePostTypes`, …) so list pages, form
 * editors, and inline preview drawers all share one cache + invalidation
 * pipeline. Single source of truth for `['queries', ...]` cache keys.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  queriesApi,
  type MetaKeysResponse,
  type QueryConfig,
  type QueryConfigData,
  type QueryPreviewContext,
  type QueryPreviewResult,
  type RelationQueryRow,
} from '../services/api';

export const QUERIES_QUERY_KEY = ['queries'] as const;
export const QUERY_META_KEYS_KEY = ['queries', 'meta-keys'] as const;

/**
 * Form-level shape used by `QueryForm.tsx` — splits the title (top-level
 * post field) from the data blob (post_meta JSON) so the editor can
 * round-trip both through one piece of state.
 */
export interface QueryFormData {
  title: string;
  status: 'publish' | 'draft';
  data: QueryConfigData;
}

/** Empty / initial query config. Keeps every typed slice present. */
export function createEmptyQueryConfig(): QueryConfigData {
  return {
    query_type: 'posts',
    source: {
      post_types: [],
      status: ['publish'],
    },
    filters: {
      include_ids: [],
      exclude_ids: [],
      author: '',
      date_after: '',
      date_before: '',
    },
    tax_query: {
      relation: 'AND',
      queries: [],
    },
    meta_query: {
      relation: 'AND',
      queries: [],
    },
    relation_query: {
      relation: 'AND',
      queries: [],
    },
    orderby: 'date',
    order: 'DESC',
    orderby_meta_key: '',
    posts_per_page: 10,
    offset: 0,
    ignore_sticky_posts: true,
    macros: {},
  };
}

/** Default form data (used by QueryForm when creating a new query). */
export function createDefaultQueryFormData(): QueryFormData {
  return {
    title: '',
    status: 'publish',
    data: createEmptyQueryConfig(),
  };
}

/**
 * Normalise a raw API config into the form shape — defensively fills in
 * missing nested keys so editor components never have to null-check.
 */
function configToForm(config: QueryConfig): QueryFormData {
  const empty = createEmptyQueryConfig();
  const incoming = (config.data || {}) as Partial<QueryConfigData>;
  return {
    title: config.title || '',
    status: (config.status as 'publish' | 'draft') || 'publish',
    data: {
      ...empty,
      ...incoming,
      source: { ...empty.source, ...(incoming.source || {}) },
      filters: { ...empty.filters, ...(incoming.filters || {}) },
      tax_query: {
        relation: incoming.tax_query?.relation ?? 'AND',
        queries: incoming.tax_query?.queries ?? [],
      },
      meta_query: {
        relation: incoming.meta_query?.relation ?? 'AND',
        queries: incoming.meta_query?.queries ?? [],
      },
      relation_query: {
        relation: incoming.relation_query?.relation ?? 'AND',
        queries: incoming.relation_query?.queries ?? [],
      },
    },
  };
}

// =====================================================================
// Queries
// =====================================================================

export function useQueries(status: 'all' | 'publish' | 'draft' = 'all') {
  return useQuery({
    queryKey: [...QUERIES_QUERY_KEY, 'list', status],
    queryFn: async () => {
      const response = await queriesApi.getAll(status);
      return response.data;
    },
  });
}

export function useQueryConfig(id: number | null) {
  return useQuery({
    queryKey: [...QUERIES_QUERY_KEY, 'single', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await queriesApi.get(id);
      return {
        raw: response.data,
        form: configToForm(response.data),
      };
    },
    enabled: !!id,
  });
}

export function useQueryMetaKeys() {
  return useQuery({
    queryKey: QUERY_META_KEYS_KEY,
    queryFn: async (): Promise<MetaKeysResponse> => {
      const response = await queriesApi.getMetaKeys();
      const raw = response.data;
      return {
        meta_keys: raw.meta_keys ?? [],
        meta_key_groups: Array.isArray(raw.meta_key_groups) ? raw.meta_key_groups : [],
        count: typeof raw.count === 'number' ? raw.count : (raw.meta_keys?.length ?? 0),
      };
    },
    // Meta-key list rarely changes mid-session — cache aggressively so
    // the dropdown opens instantly on every meta-query row.
    staleTime: 60_000,
  });
}

// =====================================================================
// Mutations
// =====================================================================

function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERIES_QUERY_KEY });
}

export function useCreateQuery() {
  const invalidate = useInvalidateQueries();
  return useMutation({
    mutationFn: async (data: QueryFormData) => {
      const response = await queriesApi.create({
        title: data.title,
        data: data.data,
        status: data.status,
      });
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateQuery() {
  const invalidate = useInvalidateQueries();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: QueryFormData }) => {
      const response = await queriesApi.update(id, {
        title: data.title,
        data: data.data,
        status: data.status,
      });
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteQuery() {
  const invalidate = useInvalidateQueries();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await queriesApi.delete(id);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useDuplicateQuery() {
  const invalidate = useInvalidateQueries();
  return useMutation({
    mutationFn: async ({ id, title }: { id: number; title?: string }) => {
      const response = await queriesApi.duplicate(id, title);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useToggleQueryStatus() {
  const invalidate = useInvalidateQueries();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'publish' | 'draft' }) => {
      const response = await queriesApi.toggleStatus(id, status);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

/**
 * Run a draft (unsaved) preview from the editor.
 *
 * Not invalidated by mutations — preview is a side-effect read and
 * shouldn't poison the saved-query cache.
 */
export function usePreviewDraftQuery() {
  return useMutation<
    QueryPreviewResult,
    Error,
    { config: QueryConfigData; limit?: number; context?: QueryPreviewContext }
  >({
    mutationFn: async ({ config, limit, context }) => {
      const response = await queriesApi.previewDraft(config, { limit, context });
      return response.data;
    },
  });
}

/** Run a saved query preview (id-based). */
export function usePreviewSavedQuery() {
  return useMutation<
    QueryPreviewResult,
    Error,
    { id: number; limit?: number; context?: QueryPreviewContext }
  >({
    mutationFn: async ({ id, limit, context }) => {
      const response = await queriesApi.previewSaved(id, { limit, context });
      return response.data;
    },
  });
}

// =====================================================================
// Helpers
// =====================================================================

export function createEmptyTaxRow() {
  return {
    taxonomy: '',
    terms: [] as Array<string | number>,
    operator: 'IN' as const,
    field: 'term_id' as const,
  };
}

export function createEmptyMetaRow() {
  return {
    key: '',
    value: '',
    compare: '=' as const,
    type: 'CHAR' as const,
  };
}

/** Empty `relation_query` row — sane defaults match what backend expects. */
export function createEmptyRelationRow(): RelationQueryRow {
  return {
    relation_slug: '',
    direction: 'from',
    compare: 'IN',
    object_id: '{{current_post_id}}',
    meta: [],
  };
}
