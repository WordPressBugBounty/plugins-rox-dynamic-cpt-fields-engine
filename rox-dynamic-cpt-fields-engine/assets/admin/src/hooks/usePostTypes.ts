import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postTypesApi, PostTypeConfig } from '../services/api';
import { coerceMetaFieldsArray, transformMetaFieldsForApi } from '../lib/meta-field-api';

export const POST_TYPES_QUERY_KEY = ['post-types'];

export interface PostTypeLabels {
  singular_name?: string;
  name?: string;
  add_new?: string;
  add_new_item?: string;
  edit_item?: string;
  new_item?: string;
  view_item?: string;
  view_items?: string;
  search_items?: string;
  not_found?: string;
  not_found_in_trash?: string;
  parent_item_colon?: string;
  all_items?: string;
  archives?: string;
  attributes?: string;
  insert_into_item?: string;
  uploaded_to_this_item?: string;
  featured_image?: string;
  set_featured_image?: string;
  remove_featured_image?: string;
  use_featured_image?: string;
  filter_items_list?: string;
  items_list_navigation?: string;
  items_list?: string;
  item_published?: string;
  item_published_privately?: string;
  item_reverted_to_draft?: string;
  item_scheduled?: string;
  item_updated?: string;
}

export interface AdminColumn {
  id: string;
  title: string;
  type: string;
  field_name: string;
  taxonomy?: string;
  callback?: string;
  column_order: number;
  prefix: string;
  suffix: string;
  sortable: boolean;
  sort_by_field?: string;
  is_numeric?: boolean;
}

export interface AdminFilterRangeOption {
  label: string;
  min: string;
  max: string;
}

export interface AdminFilter {
  id: string;
  name: string;
  use_name_as_placeholder: boolean;
  type: 'taxonomy' | 'meta' | 'meta_range';
  taxonomy?: string;
  show_counts?: boolean;
  order_by?: string;
  order?: 'ASC' | 'DESC';
  meta_field?: string;
  custom_meta_field?: string;
  options_source?: string;
  range_options?: AdminFilterRangeOption[];
}

export interface MetaFieldOption {
  value: string;
  label: string;
  checked?: boolean;
}

export interface MetaField {
  id: string;
  label: string;
  name: string;
  object_type: 'field' | 'tab' | 'accordion' | 'endpoint';
  type: string;
  description: string;
  placeholder: string;
  default_value: string;
  field_width: '100%' | '75%' | '66.6%' | '50%' | '33.3%' | '25%';
  character_limit: number | null;
  required: boolean;
  quick_edit: boolean;
  revision_support: boolean;
  show_in_rest: boolean;
  conditional_logic: ConditionalLogic | null;
  // Regex validation (Pro). Both keys are optional; the Pro server-side
  // validator skips fields whose `validation_pattern` is empty/missing.
  validation_pattern?: string;
  validation_message?: string;
  // Tab specific ('horizontal' | 'vertical') and Group/Repeater specific
  // ('block' | 'row' | 'table'). Repeater accepts all three (table is its
  // default), Group accepts 'block' (default) | 'row'. PHP renderers fall
  // back to safe defaults if the value doesn't match the field type, so
  // sharing a single key across these three field types is safe.
  layout?: 'horizontal' | 'vertical' | 'block' | 'row' | 'table';
  // Select/Checkbox/Radio specific
  options_source?: 'manual' | 'query_builder';
  options?: MetaFieldOption[];
  // Select specific
  multiple?: boolean;
  min_search_characters?: number;
  // Checkbox/Radio specific
  options_layout?: 'vertical' | 'horizontal';
  // Image/Relational specific
  return_format?: 'array' | 'url' | 'id' | 'object';
  // Group/Repeater specific
  sub_fields?: MetaField[];
  min?: number;
  max?: number;
  button_label?: string;
  // Repeater specific
  collapsed?: boolean;
  // Relationship specific (Pro)
  post_type?: string | string[];
  // Taxonomy Picker specific (Pro)
  taxonomy?: string;
  add_new?: boolean;
  // User Picker specific (Pro)
  roles?: string | string[];
  // HTML field specific (Pro) — display-only block, no postmeta storage.
  // Stored as raw HTML and filtered server-side through wp_kses_post.
  html_content?: string;
  show_label?: boolean;
  // Temp UI state (not saved to backend)
  _bulkOptionsText?: string;
  _expanded?: boolean;
}

export interface ConditionalLogic {
  enabled: boolean;
  relation: 'and' | 'or';
  rules: ConditionalRule[];
}

/**
 * Helper function to normalize meta fields from API response.
 * Ensures options are always in array format (converts choices object if needed).
 * Excludes UI-only properties like _bulkOptionsText and _expanded.
 */
export function normalizeMetaFields(fields: unknown): MetaField[] {
  const fieldList = coerceMetaFieldsArray(fields);
  if (fieldList.length === 0) {
    return [];
  }

  return fieldList.map((field: unknown) => {
    const f = field as Record<string, unknown>;
    
    // Normalize options - could be array or choices object
    let options: MetaFieldOption[] | undefined;
    if (f.options && Array.isArray(f.options)) {
      options = f.options as MetaFieldOption[];
    } else if (f.choices && typeof f.choices === 'object' && !Array.isArray(f.choices)) {
      // Convert choices object { 'value': 'label' } to options array
      options = Object.entries(f.choices as Record<string, string>).map(([value, label]) => ({
        value,
        label: typeof label === 'string' ? label : value,
      }));
    } else if (f.options && typeof f.options === 'object' && !Array.isArray(f.options)) {
      // Options stored as object format
      options = Object.entries(f.options as Record<string, string>).map(([value, label]) => ({
        value,
        label: typeof label === 'string' ? label : value,
      }));
    }
    
    // Recursively normalize sub_fields
    const subFields = f.sub_fields ? normalizeMetaFields(f.sub_fields as unknown[]) : undefined;
    
    // Omit transient UI-only keys before save.
    const { _bulkOptionsText, _expanded, ...cleanField } = f as Record<string, unknown> & { _bulkOptionsText?: string; _expanded?: boolean };
    
    return {
      ...cleanField,
      options,
      sub_fields: subFields,
    } as MetaField;
  });
}

export interface ConditionalRule {
  id: string;
  field: string;
  operator: 'equal' | 'not_equal' | 'empty' | 'not_empty' | 'contains' | 'not_contains' | 'greater' | 'less';
  value: string;
}

export interface PostTypeFormData {
  title: string;
  slug: string;
  singular_label: string;
  plural_label: string;
  description?: string;
  // Basic settings
  public?: boolean;
  hierarchical?: boolean;
  has_archive?: boolean;
  show_in_rest?: boolean;
  supports?: string[];
  menu_icon?: string;
  menu_position?: number;
  // Advanced settings
  exclude_from_search?: boolean;
  publicly_queryable?: boolean;
  show_ui?: boolean;
  show_in_menu?: boolean;
  show_in_nav_menus?: boolean;
  show_in_admin_bar?: boolean;
  rest_base?: string;
  capability_type?: string;
  map_meta_cap?: boolean;
  rewrite?: boolean;
  rewrite_slug?: string;
  rewrite_with_front?: boolean;
  query_var?: boolean;
  // Labels
  labels?: PostTypeLabels;
  // Admin columns
  admin_columns?: AdminColumn[];
  // Admin filters
  admin_filters?: AdminFilter[];
  // Meta fields (embedded in CPT)
  meta_fields?: MetaField[];
}

// Convert form data to API format (what backend expects)
function formDataToApiData(data: PostTypeFormData): Record<string, unknown> {
  return {
    slug: data.slug,
    label: data.plural_label,
    singular_label: data.singular_label,
    description: data.description || '',
    public: data.public ?? true,
    hierarchical: data.hierarchical ?? false,
    has_archive: data.has_archive ?? true,
    show_in_rest: data.show_in_rest ?? true,
    supports: data.supports || ['title', 'editor', 'thumbnail'],
    menu_icon: data.menu_icon || 'dashicons-admin-post',
    menu_position: data.menu_position || 25,
    // Advanced settings
    exclude_from_search: data.exclude_from_search ?? false,
    publicly_queryable: data.publicly_queryable ?? true,
    show_ui: data.show_ui ?? true,
    show_in_menu: data.show_in_menu ?? true,
    show_in_nav_menus: data.show_in_nav_menus ?? true,
    show_in_admin_bar: data.show_in_admin_bar ?? (data.show_in_menu ?? true),
    rest_base: data.rest_base || '',
    capability_type: data.capability_type || 'post',
    map_meta_cap: data.map_meta_cap ?? true,
    rewrite: data.rewrite ?? true,
    rewrite_slug: data.rewrite_slug || '',
    rewrite_with_front: data.rewrite_with_front ?? true,
    query_var: data.query_var ?? true,
    // Labels
    labels: data.labels || {},
    // Admin columns
    admin_columns: data.admin_columns || [],
    // Admin filters
    admin_filters: data.admin_filters || [],
    // Meta fields
    meta_fields: transformMetaFieldsForApi(data.meta_fields || []),
  };
}

// Convert API response to form data
function apiDataToFormData(config: PostTypeConfig): PostTypeFormData {
  // Handle both data format (new) and schema format (old)
  const configData = (config.data || config.schema || {}) as Record<string, unknown>;
  const labels = (configData.labels || {}) as PostTypeLabels;
  const args = (configData.args || {}) as Record<string, unknown>;
  const adminColumns = (configData.admin_columns || []) as AdminColumn[];
  const adminFilters = (configData.admin_filters || []) as AdminFilter[];
  // Normalize meta fields to ensure options are in correct format
  const metaFields = normalizeMetaFields(configData.meta_fields);
  
  return {
    title: config.title,
    slug: (configData.slug as string) || '',
    singular_label: labels.singular_name || (configData.singular_label as string) || config.title,
    plural_label: labels.name || (configData.label as string) || config.title,
    description: (args.description as string) || (configData.description as string) || '',
    // Basic settings
    public: (args.public as boolean) ?? (configData.public as boolean) ?? true,
    hierarchical: (args.hierarchical as boolean) ?? (configData.hierarchical as boolean) ?? false,
    has_archive: (args.has_archive as boolean) ?? (configData.has_archive as boolean) ?? true,
    show_in_rest: (args.show_in_rest as boolean) ?? (configData.show_in_rest as boolean) ?? true,
    supports: (args.supports as string[]) || (configData.supports as string[]) || ['title', 'editor', 'thumbnail'],
    menu_icon: (args.menu_icon as string) || (configData.menu_icon as string) || 'dashicons-admin-post',
    menu_position: (args.menu_position as number) || (configData.menu_position as number) || 25,
    // Advanced settings
    exclude_from_search: (args.exclude_from_search as boolean) ?? (configData.exclude_from_search as boolean) ?? false,
    publicly_queryable: (args.publicly_queryable as boolean) ?? (configData.publicly_queryable as boolean) ?? true,
    show_ui: (args.show_ui as boolean) ?? (configData.show_ui as boolean) ?? true,
    show_in_menu: (args.show_in_menu as boolean) ?? (configData.show_in_menu as boolean) ?? true,
    show_in_nav_menus: (args.show_in_nav_menus as boolean) ?? (configData.show_in_nav_menus as boolean) ?? true,
    show_in_admin_bar: (args.show_in_admin_bar as boolean) ?? (configData.show_in_admin_bar as boolean) ?? true,
    rest_base: (args.rest_base as string) || (configData.rest_base as string) || '',
    capability_type: (args.capability_type as string) || (configData.capability_type as string) || 'post',
    map_meta_cap: (args.map_meta_cap as boolean) ?? (configData.map_meta_cap as boolean) ?? true,
    rewrite: (args.rewrite as boolean) ?? (configData.rewrite as boolean) ?? true,
    rewrite_slug: (args.rewrite_slug as string) || (configData.rewrite_slug as string) || '',
    rewrite_with_front: (args.rewrite_with_front as boolean) ?? (configData.rewrite_with_front as boolean) ?? true,
    query_var: (args.query_var as boolean) ?? (configData.query_var as boolean) ?? true,
    // Labels
    labels: labels,
    // Admin columns
    admin_columns: adminColumns,
    // Admin filters
    admin_filters: adminFilters,
    // Meta fields
    meta_fields: metaFields,
  };
}

// Get all post types
export function usePostTypes() {
  return useQuery({
    queryKey: POST_TYPES_QUERY_KEY,
    queryFn: async () => {
      const response = await postTypesApi.getAll();
      return response.data;
    },
  });
}

// Get single post type
export function usePostType(id: number | null) {
  return useQuery({
    queryKey: [...POST_TYPES_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await postTypesApi.get(id);
      return apiDataToFormData(response.data);
    },
    enabled: !!id,
  });
}

// Create post type
export function useCreatePostType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PostTypeFormData) => {
      const response = await postTypesApi.create({
        title: data.plural_label || data.title,
        data: formDataToApiData(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_TYPES_QUERY_KEY });
    },
  });
}

// Update post type
export function useUpdatePostType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PostTypeFormData }) => {
      const response = await postTypesApi.update(id, {
        title: data.plural_label || data.title,
        data: formDataToApiData(data),
        status: 'publish', // Always publish when saving from form
      });
      return apiDataToFormData(response.data);
    },
    onSuccess: (formData, { id }) => {
      queryClient.setQueryData([...POST_TYPES_QUERY_KEY, id], formData);
      queryClient.invalidateQueries({ queryKey: POST_TYPES_QUERY_KEY });
    },
  });
}

// Delete post type
export function useDeletePostType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await postTypesApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_TYPES_QUERY_KEY });
    },
  });
}

// Toggle post type status (enable/disable)
export function useTogglePostTypeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'publish' | 'draft' }) => {
      const response = await postTypesApi.toggleStatus(id, status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_TYPES_QUERY_KEY });
    },
  });
}

// Duplicate post type
export function useDuplicatePostType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const response = await postTypesApi.duplicate(id, title);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_TYPES_QUERY_KEY });
    },
  });
}
