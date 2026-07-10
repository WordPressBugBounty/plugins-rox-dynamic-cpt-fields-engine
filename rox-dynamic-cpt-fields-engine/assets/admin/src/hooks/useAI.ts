/**
 * AI Assistant hooks.
 *
 * Wraps `aiApi` with the same TanStack-Query patterns the rest of the
 * admin uses (`useQueries`, `useListings`, `useRelations`, …) so the
 * AI Assistant page, per-module "Generate with AI" buttons, and any
 * future AI-driven flows share one cache + invalidation pipeline.
 *
 * The AI workflow inherently mutates *every* config type (post types,
 * taxonomies, field groups, queries, listings, relations, options pages)
 * on a successful Apply, so we invalidate every public cache key —
 * matching what Tools → Import does for the same reason.
 *
 * @package DynamicCPTFieldsEngine
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  aiApi,
  type AIApplyResponse,
  type AIGenerateRequest,
  type AIGenerateResponse,
  type AISchemaPayload,
  type AISettingsPublic,
  type AITemplate,
  type AIValidateResponse,
} from '../services/api';
import { POST_TYPES_QUERY_KEY } from './usePostTypes';
import { TAXONOMIES_QUERY_KEY } from './useTaxonomies';
import { METABOXES_QUERY_KEY } from './useMetaboxes';
import { OPTIONS_PAGES_QUERY_KEY } from './useOptionsPages';
import { QUERIES_QUERY_KEY } from './useQueries';
import { LISTINGS_QUERY_KEY } from './useListings';
import { RELATIONS_QUERY_KEY } from './useRelations';

/** Top-level cache namespace for AI Assistant queries. */
export const AI_QUERY_KEY = ['ai'] as const;
export const AI_TEMPLATES_KEY = [...AI_QUERY_KEY, 'templates'] as const;
export const AI_SETTINGS_KEY = [...AI_QUERY_KEY, 'settings'] as const;

/**
 * List the preset Quick Start templates the backend exposes.
 *
 * Templates rarely change in a session (they're hard-coded PHP classes
 * + the `rdcfe_ai_register_templates` extension hook), so we cache for
 * a long time and let the user manually refresh by visiting the page.
 */
export function useAITemplates(enabled = true) {
  return useQuery({
    queryKey: AI_TEMPLATES_KEY,
    queryFn: async (): Promise<AITemplate[]> => {
      const response = await aiApi.listTemplates();
      return response.data.templates ?? [];
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Read the current AI settings (masked API key, model, etc.).
 *
 * Same data the Settings → AI Assistant tab loads — exposed here so
 * the AI Assistant page can pre-flight check `enabled + has_api_key`
 * before letting the user hit "Generate".
 */
export function useAISettings(enabled = true) {
  return useQuery({
    queryKey: AI_SETTINGS_KEY,
    queryFn: async (): Promise<AISettingsPublic> => {
      const response = await aiApi.getSettings();
      return response.data;
    },
    enabled,
  });
}

/**
 * Invalidate every cache an Apply / Rollback could
 * have touched. Centralised so adding a new module's cache key in
 * the future doesn't silently leave stale data on the AI page.
 */
function useInvalidateAllConfigCaches() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: POST_TYPES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: TAXONOMIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: METABOXES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: OPTIONS_PAGES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: QUERIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: RELATIONS_QUERY_KEY });
  };
}

/**
 * Generate a schema from a free-text prompt. Generation is a pure
 * read from the OpenAI side (it doesn't write to the DB until the
 * Apply step), so we don't invalidate any caches on success.
 */
export function useGenerateAI() {
  return useMutation<AIGenerateResponse, Error, AIGenerateRequest>({
    mutationFn: async (payload) => {
      const response = await aiApi.generate(payload);
      return response.data;
    },
  });
}

/**
 * Re-validate a (possibly user-edited) schema before Apply.
 *
 * Used when the user tweaks the JSON in the inline editor and we want
 * to refresh the warning/error panel without burning OpenAI credits.
 */
export function useValidateAI() {
  return useMutation<AIValidateResponse, Error, Partial<AISchemaPayload>>({
    mutationFn: async (schema) => {
      const response = await aiApi.validate(schema);
      return response.data;
    },
  });
}

/**
 * Apply a validated schema to the database.
 *
 * On success the backend creates a snapshot for one-click rollback
 * and returns lists of created/updated/failed items per type. We
 * blast the public config caches so the rest of the admin
 * (PostTypes, Listings, Relations, …) shows the freshly-applied
 * state immediately.
 */
export function useApplyAI() {
  const invalidate = useInvalidateAllConfigCaches();
  return useMutation<
    AIApplyResponse,
    Error,
    { schema: Partial<AISchemaPayload>; confirmedWarnings?: string[] }
  >({
    mutationFn: async ({ schema, confirmedWarnings = [] }) => {
      const response = await aiApi.apply(schema, confirmedWarnings);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

/**
 * Roll back a previous Apply by snapshot ID.
 *
 * Same invalidation as Apply because the rollback restores the
 * previous state of every affected config row.
 */
export function useRollbackAI() {
  const invalidate = useInvalidateAllConfigCaches();
  return useMutation<{ restored: number; missing: number }, Error, string>({
    mutationFn: async (snapshotId) => {
      const response = await aiApi.rollback(snapshotId);
      return response.data;
    },
    onSuccess: invalidate,
  });
}

// =====================================================================
// Helpers
// =====================================================================

/**
 * Empty schema payload — every typed slice present so JSON-editor
 * components don't have to null-check before iterating.
 */
export function createEmptyAISchema(): AISchemaPayload {
  return {
    post_types: [],
    taxonomies: [],
    field_groups: [],
    options_pages: [],
    queries: [],
    listings: [],
    relations: [],
  };
}

/**
 * Count items across every slice of a schema — used by `DiffSummary`
 * and `ApplyButton` to show "creates 5 items" / disable when empty.
 */
export function countSchemaItems(schema: Partial<AISchemaPayload> | null | undefined): number {
  if (!schema) return 0;
  return (
    (schema.post_types?.length ?? 0) +
    (schema.taxonomies?.length ?? 0) +
    (schema.field_groups?.length ?? 0) +
    (schema.options_pages?.length ?? 0) +
    (schema.queries?.length ?? 0) +
    (schema.listings?.length ?? 0) +
    (schema.relations?.length ?? 0)
  );
}
