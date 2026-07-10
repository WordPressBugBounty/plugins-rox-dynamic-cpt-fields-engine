import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxonomiesApi, TaxonomyConfig } from '../services/api';
import { MetaField, normalizeMetaFields } from './usePostTypes';
import { transformMetaFieldsForApi } from '../lib/meta-field-api';

export const TAXONOMIES_QUERY_KEY = ['taxonomies'];

export interface TaxonomyLabels {
  singular_name?: string;
  name?: string;
  search_items?: string;
  popular_items?: string;
  all_items?: string;
  parent_item?: string;
  parent_item_colon?: string;
  edit_item?: string;
  view_item?: string;
  update_item?: string;
  add_new_item?: string;
  new_item_name?: string;
  menu_name?: string;
  back_to_items?: string;
  not_found?: string;
}

export interface TaxonomyFormData {
  title: string;
  slug: string;
  singular_label: string;
  plural_label: string;
  description?: string;
  object_type: string[];
  // Basic settings
  public?: boolean;
  hierarchical?: boolean;
  show_in_rest?: boolean;
  show_admin_column?: boolean;
  show_tagcloud?: boolean;
  // Advanced settings
  show_ui?: boolean;
  show_in_nav_menus?: boolean;
  show_in_quick_edit?: boolean;
  rewrite?: boolean;
  rewrite_slug?: string;
  query_var?: boolean;
  // Labels
  labels?: TaxonomyLabels;
  // Meta fields
  meta_fields?: MetaField[];
}

// Convert form data to API format (what backend expects)
function formDataToApiData(data: TaxonomyFormData): Record<string, unknown> {
  return {
    slug: data.slug,
    label: data.plural_label,
    singular_label: data.singular_label,
    description: data.description || '',
    post_types: data.object_type || [],
    public: data.public ?? true,
    hierarchical: data.hierarchical ?? true,
    show_in_rest: data.show_in_rest ?? true,
    show_admin_column: data.show_admin_column ?? true,
    show_tagcloud: data.show_tagcloud ?? true,
    show_ui: data.show_ui ?? true,
    show_in_nav_menus: data.show_in_nav_menus ?? true,
    show_in_quick_edit: data.show_in_quick_edit ?? true,
    rewrite: data.rewrite ?? true,
    rewrite_slug: data.rewrite_slug || '',
    query_var: data.query_var ?? true,
    labels: data.labels || {},
    meta_fields: transformMetaFieldsForApi(data.meta_fields || []),
  };
}

// Convert API response to form data
function apiDataToFormData(config: TaxonomyConfig): TaxonomyFormData {
  // Handle both data format (new) and schema format (old)
  const configData = (config.data || config.schema || {}) as Record<string, unknown>;
  const labels = (configData.labels || {}) as TaxonomyLabels;
  const args = (configData.args || {}) as Record<string, unknown>;
  
  return {
    title: config.title,
    slug: (configData.slug as string) || '',
    singular_label: labels.singular_name || (configData.singular_label as string) || config.title,
    plural_label: labels.name || (configData.label as string) || config.title,
    description: (args.description as string) || (configData.description as string) || '',
    object_type: (configData.object_type as string[]) || (configData.post_types as string[]) || [],
    // Basic settings
    public: (args.public as boolean) ?? (configData.public as boolean) ?? true,
    hierarchical: (args.hierarchical as boolean) ?? (configData.hierarchical as boolean) ?? true,
    show_in_rest: (args.show_in_rest as boolean) ?? (configData.show_in_rest as boolean) ?? true,
    show_admin_column: (args.show_admin_column as boolean) ?? (configData.show_admin_column as boolean) ?? true,
    show_tagcloud: (args.show_tagcloud as boolean) ?? (configData.show_tagcloud as boolean) ?? true,
    // Advanced settings
    show_ui: (args.show_ui as boolean) ?? (configData.show_ui as boolean) ?? true,
    show_in_nav_menus: (args.show_in_nav_menus as boolean) ?? (configData.show_in_nav_menus as boolean) ?? true,
    show_in_quick_edit: (args.show_in_quick_edit as boolean) ?? (configData.show_in_quick_edit as boolean) ?? true,
    rewrite: (args.rewrite as boolean) ?? (configData.rewrite as boolean) ?? true,
    rewrite_slug: (args.rewrite_slug as string) || (configData.rewrite_slug as string) || '',
    query_var: (args.query_var as boolean) ?? (configData.query_var as boolean) ?? true,
    // Labels
    labels: labels,
    // Meta fields (normalized to ensure options are in correct format)
    meta_fields: normalizeMetaFields(configData.meta_fields),
  };
}

// Get all taxonomies
export function useTaxonomies() {
  return useQuery({
    queryKey: TAXONOMIES_QUERY_KEY,
    queryFn: async () => {
      const response = await taxonomiesApi.getAll();
      return response.data;
    },
  });
}

// Get single taxonomy
export function useTaxonomy(id: number | null) {
  return useQuery({
    queryKey: [...TAXONOMIES_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await taxonomiesApi.get(id);
      return apiDataToFormData(response.data);
    },
    enabled: !!id,
  });
}

// Create taxonomy
export function useCreateTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TaxonomyFormData) => {
      const response = await taxonomiesApi.create({
        title: data.plural_label || data.title,
        data: formDataToApiData(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAXONOMIES_QUERY_KEY });
    },
  });
}

// Update taxonomy
export function useUpdateTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TaxonomyFormData }) => {
      const response = await taxonomiesApi.update(id, {
        title: data.plural_label || data.title,
        data: formDataToApiData(data),
        status: 'publish', // Always publish when saving from form
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAXONOMIES_QUERY_KEY });
    },
  });
}

// Delete taxonomy
export function useDeleteTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await taxonomiesApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAXONOMIES_QUERY_KEY });
    },
  });
}

// Duplicate taxonomy
export function useDuplicateTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const response = await taxonomiesApi.duplicate(id, title);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAXONOMIES_QUERY_KEY });
    },
  });
}

// Toggle taxonomy status (enable/disable)
export function useToggleTaxonomyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'publish' | 'draft' }) => {
      const response = await taxonomiesApi.toggleStatus(id, status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAXONOMIES_QUERY_KEY });
    },
  });
}
