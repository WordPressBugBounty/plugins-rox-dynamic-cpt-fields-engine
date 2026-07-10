/**
 * Relations hooks for the admin app.
 *
 * Wraps `relationsApi` with the same TanStack-Query patterns the rest
 * of the admin uses (`useMetaboxes`, `useQueries`, `useListings`, …)
 * so the list page, form editor, and the future Pro picker field all
 * share one cache + invalidation pipeline.
 *
 * Cache key contract:
 *   ['relations']                   — every relation query lives under this prefix
 *   ['relations', 'list', status]   — filtered list for the table
 *   ['relations', 'single', id]     — single-resource fetch
 *   ['relations', 'related', slug, parent_id, direction]
 *                                   — hydrated WP_Post rows for a parent
 *
 * Mutations always invalidate the top-level prefix so the list +
 * pair-count badges refresh in lockstep.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  relationsApi,
  type RelationConfig,
  type RelationConfigData,
  type RelationDirection,
  type RelationRelatedResponse,
} from '../services/api';

export const RELATIONS_QUERY_KEY = ['relations'] as const;

/**
 * Form-level shape used by `RelationForm.tsx` — splits the title (top-level
 * post field) from the data blob (post_meta JSON) so the editor can
 * round-trip both through one piece of state. Mirrors `QueryFormData`.
 */
export interface RelationFormData {
  title: string;
  status: 'publish' | 'draft';
  data: RelationConfigData;
}

/** Empty / initial relation config. Keeps every typed slice present.
 * `from_object` / `to_object` default to `post` so newly created
 * relations behave like single-kind post↔post relations unless the
 * author picks a term/user kind explicitly. */
export function createEmptyRelationConfig(): RelationConfigData {
  return {
    slug: '',
    name: '',
    from_object: 'post',
    from_cpt: '',
    to_object: 'post',
    to_cpt: '',
    type: 'many-to-many',
    from_label: '',
    to_label: '',
    bidirectional: true,
    from_max: 0,
    to_max: 0,
    meta_fields: [],
  };
}

/** Default form data (used by RelationForm when creating a new relation). */
export function createDefaultRelationFormData(): RelationFormData {
  return {
    title: '',
    status: 'publish',
    data: createEmptyRelationConfig(),
  };
}

/**
 * Normalise a raw API config into the form shape — defensively fills
 * in missing nested keys so editor components never have to null-check.
 *
 * The free `ConfigRepository::format_config()` returns `data: {}` when
 * a row was created via REST without the JSON meta yet (rare, but it
 * happens on import). Treating that as a partial overlay on the empty
 * template means the form always sees a complete shape.
 */
function configToForm(config: RelationConfig): RelationFormData {
  const empty = createEmptyRelationConfig();
  const incoming = (config.data || {}) as Partial<RelationConfigData>;
  return {
    title: config.title || '',
    status: (config.status as 'publish' | 'draft') || 'publish',
    data: {
      ...empty,
      ...incoming,
      // Coerce types defensively — ConfigRepository hands us whatever
      // sat in the JSON meta; older drafts may ship `from_max` /
      // `to_max` as numeric strings.
      from_object: incoming.from_object ?? 'post',
      to_object: incoming.to_object ?? 'post',
      from_max: Number(incoming.from_max ?? 0) || 0,
      to_max: Number(incoming.to_max ?? 0) || 0,
      bidirectional: Boolean(incoming.bidirectional ?? true),
      meta_fields: Array.isArray(incoming.meta_fields) ? incoming.meta_fields : [],
    },
  };
}

// =====================================================================
// Queries
// =====================================================================

export function useRelations(status: 'all' | 'publish' | 'draft' = 'all') {
  return useQuery({
    queryKey: [...RELATIONS_QUERY_KEY, 'list', status],
    queryFn: async () => {
      const response = await relationsApi.getAll(status);
      return response.data;
    },
  });
}

export function useRelation(id: number | null) {
  return useQuery({
    queryKey: [...RELATIONS_QUERY_KEY, 'single', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await relationsApi.get(id);
      return {
        raw: response.data,
        form: configToForm(response.data),
      };
    },
    enabled: !!id,
  });
}

/**
 * Hydrated post rows for one parent + relation slug. Powers the future
 * React picker field; the meta box still reads directly from PHP.
 */
export function useRelatedItems(
  slug: string | null,
  parentId: number | null,
  direction: RelationDirection = 'from'
) {
  return useQuery<RelationRelatedResponse>({
    queryKey: [...RELATIONS_QUERY_KEY, 'related', slug, parentId, direction],
    queryFn: async () => {
      if (!slug || !parentId) {
        return { items: [], total: 0, direction };
      }
      const response = await relationsApi.getRelated(slug, {
        from_id: parentId,
        direction,
      });
      return response.data;
    },
    enabled: !!slug && !!parentId,
  });
}

// =====================================================================
// Mutations
// =====================================================================

function useInvalidateRelations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: RELATIONS_QUERY_KEY });
}

export function useCreateRelation() {
  const invalidate = useInvalidateRelations();
  return useMutation({
    mutationFn: async (data: RelationFormData) => {
      const response = await relationsApi.create({
        title: data.title,
        data: data.data,
        status: data.status,
      });
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateRelation() {
  const invalidate = useInvalidateRelations();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RelationFormData }) => {
      const response = await relationsApi.update(id, {
        title: data.title,
        data: data.data,
        status: data.status,
      });
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRelation() {
  const invalidate = useInvalidateRelations();
  return useMutation({
    mutationFn: async ({ id, purge }: { id: number; purge?: boolean }) => {
      const response = await relationsApi.delete(id, purge);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useDuplicateRelation() {
  const invalidate = useInvalidateRelations();
  return useMutation({
    mutationFn: async ({ id, title }: { id: number; title?: string }) => {
      const response = await relationsApi.duplicate(id, title);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

export function useToggleRelationStatus() {
  const invalidate = useInvalidateRelations();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'publish' | 'draft' }) => {
      const response = await relationsApi.toggleStatus(id, status);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

/**
 * Replace-all-pairs flow used by the React picker. Returns `synced`
 * (the new total) plus `added` / `removed` so the UI can show a toast
 * like "3 added, 1 removed".
 */
export function useSyncRelationPairs() {
  const invalidate = useInvalidateRelations();
  return useMutation({
    mutationFn: async ({
      slug,
      parentId,
      childIds,
      direction,
    }: {
      slug: string;
      parentId: number;
      childIds: number[];
      direction?: RelationDirection;
    }) => {
      const response = await relationsApi.sync(slug, {
        parent_id: parentId,
        child_ids: childIds,
        direction,
      });
      return response.data;
    },
    onSuccess: invalidate,
  });
}

// =====================================================================
// Helpers
// =====================================================================

/**
 * Sanitise a free-text label into a relation slug. Mirrors
 * `RelationValidator::validate_slug` so the form can preflight without
 * an extra REST round-trip.
 */
export function suggestRelationSlug(name: string, fromCpt = '', toCpt = ''): string {
  const seed =
    name.trim() ||
    [fromCpt, toCpt].filter(Boolean).join('_to_') ||
    '';

  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, 'rel_$1') // must start with a letter
    .slice(0, 64);

  return slug;
}
