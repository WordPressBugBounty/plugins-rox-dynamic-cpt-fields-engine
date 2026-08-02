import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metaboxesApi, MetaboxConfig } from '../services/api';
import type { MetaField, MetaFieldOption, ConditionalLogic, ConditionalRule } from './usePostTypes';
import { normalizeMetaFields } from './usePostTypes';
import { transformMetaFieldForApi } from '../lib/meta-field-api';
import { __ } from '../lib/i18n';

export const METABOXES_QUERY_KEY = ['metaboxes'];

// Re-export types from usePostTypes for convenience
export type { MetaField, MetaFieldOption, ConditionalLogic, ConditionalRule };

// Location rule types
export interface LocationRule {
  param: string;
  operator: '==' | '!=' | string;
  value: string;
}

// Location rule group (AND logic within group)
export type LocationRuleGroup = LocationRule[];

// Metabox form data
export interface MetaboxFormData {
  title: string;
  fields: MetaField[];
  locations: LocationRuleGroup[];
  active?: boolean;
  position?: 'acf_after_title' | 'normal' | 'side';
  style?: 'default' | 'seamless';
  label_placement?: 'top' | 'left';
  instruction_placement?: 'label' | 'field';
  description?: string;
  /**
   * Step 25 metabox priority — numeric 0-100, default 10.
   * Higher values load first when multiple field groups match the same
   * screen. Distinct from `position` (WP context) and from the WP
   * `add_meta_box()` priority arg (`high|core|default|low`).
   */
  match_priority?: number;
}

/** Default match_priority used when none is set. */
export const DEFAULT_MATCH_PRIORITY = 10;

// Location param options for Free version. Keep this list in sync with
// `LocationRulesBuilder.tsx` — the builder reads its own copy because it
// also tags entries with isPro flags, but anything consuming the param
// catalogue elsewhere uses this export.
export const FREE_LOCATION_PARAMS = [
  { value: 'post_type', label: __('Post Type', 'rox-dynamic-cpt-fields-engine'), group: __('Post', 'rox-dynamic-cpt-fields-engine') },
  { value: 'post', label: __('Post', 'rox-dynamic-cpt-fields-engine'), group: __('Post', 'rox-dynamic-cpt-fields-engine') },
  { value: 'post_status', label: __('Post Status', 'rox-dynamic-cpt-fields-engine'), group: __('Post', 'rox-dynamic-cpt-fields-engine') },
  { value: 'taxonomy', label: __('Taxonomy', 'rox-dynamic-cpt-fields-engine'), group: __('Term', 'rox-dynamic-cpt-fields-engine') },
  { value: 'term', label: __('Term', 'rox-dynamic-cpt-fields-engine'), group: __('Term', 'rox-dynamic-cpt-fields-engine') },
  { value: 'user_form', label: __('User Form', 'rox-dynamic-cpt-fields-engine'), group: __('User', 'rox-dynamic-cpt-fields-engine') },
  { value: 'user_role', label: __('User Role', 'rox-dynamic-cpt-fields-engine'), group: __('User', 'rox-dynamic-cpt-fields-engine') },
  { value: 'options_page', label: __('Options Page', 'rox-dynamic-cpt-fields-engine'), group: __('Options', 'rox-dynamic-cpt-fields-engine') },
] as const;

// Pro location params (shown with PRO badge)
export const PRO_LOCATION_PARAMS = [
  { value: 'page_template', label: __('Page Template', 'rox-dynamic-cpt-fields-engine'), group: __('Post', 'rox-dynamic-cpt-fields-engine') },
  { value: 'post_parent', label: __('Post Parent', 'rox-dynamic-cpt-fields-engine'), group: __('Post', 'rox-dynamic-cpt-fields-engine') },
  { value: 'post_author', label: __('Post Author', 'rox-dynamic-cpt-fields-engine'), group: __('Post', 'rox-dynamic-cpt-fields-engine') },
  { value: 'post_format', label: __('Post Format', 'rox-dynamic-cpt-fields-engine'), group: __('Post', 'rox-dynamic-cpt-fields-engine') },
  { value: 'post_taxonomy', label: __('Post Taxonomy Term', 'rox-dynamic-cpt-fields-engine'), group: __('Post', 'rox-dynamic-cpt-fields-engine') },
  { value: 'current_user_role', label: __('Current User Role', 'rox-dynamic-cpt-fields-engine'), group: __('User', 'rox-dynamic-cpt-fields-engine') },
  { value: 'current_user_capability', label: __('Current User Capability', 'rox-dynamic-cpt-fields-engine'), group: __('User', 'rox-dynamic-cpt-fields-engine') },
] as const;

// All location params combined
export const ALL_LOCATION_PARAMS = [...FREE_LOCATION_PARAMS, ...PRO_LOCATION_PARAMS];

// Location operators
export const LOCATION_OPERATORS = [
  { value: '==', label: __('is equal to', 'rox-dynamic-cpt-fields-engine') },
  { value: '!=', label: __('is not equal to', 'rox-dynamic-cpt-fields-engine') },
] as const;

// Convert form data to API format (what backend expects)
function formDataToApiData(data: MetaboxFormData): Record<string, unknown> {
  // Clamp match_priority to the validator's accepted 0-100 range so a
  // hand-edited URL or stale form state never round-trips an invalid
  // payload through the REST API. The PHP validator rejects out-of-range
  // values, but failing fast on the client gives the user a clean save
  // path instead of an opaque 400.
  const rawPriority =
    typeof data.match_priority === 'number' ? data.match_priority : DEFAULT_MATCH_PRIORITY;
  const matchPriority = Math.max(0, Math.min(100, Math.round(rawPriority)));

  return {
    title: data.title,
    description: data.description || '',
    location: data.locations || [[{ param: 'post_type', operator: '==', value: 'post' }]],
    fields: data.fields.map(field => transformMetaFieldForApi(field)),
    position: data.position || 'normal',
    style: data.style || 'default',
    label_placement: data.label_placement || 'top',
    instruction_placement: data.instruction_placement || 'field',
    active: data.active ?? true,
    match_priority: matchPriority,
  };
}

// Helper function to convert choices object to options array
function choicesToOptions(choices: unknown): MetaFieldOption[] | undefined {
  // If it's already an array, return it
  if (Array.isArray(choices)) {
    return choices as MetaFieldOption[];
  }
  
  // If it's an object like { 'value1': 'Label 1', 'value2': 'Label 2' }, convert to array
  if (choices && typeof choices === 'object') {
    const choicesObj = choices as Record<string, string>;
    return Object.entries(choicesObj).map(([value, label]) => ({
      value,
      label: typeof label === 'string' ? label : value,
    }));
  }
  
  return undefined;
}

/**
 * Ensure locations is always LocationRuleGroup[] (array-of-arrays).
 * AI-generated or legacy data may store a flat array of rule objects
 * instead of the expected nested format.
 */
function normalizeLocations(raw: unknown): LocationRuleGroup[] {
  const fallback: LocationRuleGroup[] = [[{ param: 'post_type', operator: '==', value: 'post' }]];

  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    return fallback;
  }

  // Flat array of rule objects: [{param, operator, value}, ...]
  if (raw[0] && typeof raw[0] === 'object' && !Array.isArray(raw[0]) && 'param' in raw[0]) {
    return [raw as LocationRule[]];
  }

  // Already nested but inner items might not be arrays — normalise each group
  return (raw as unknown[]).map((group) => {
    if (Array.isArray(group)) return group as LocationRule[];
    if (group && typeof group === 'object' && 'param' in group) return [group as LocationRule];
    return [{ param: 'post_type', operator: '==', value: 'post' }];
  });
}

// Convert API response to form data
function apiDataToFormData(config: MetaboxConfig): MetaboxFormData {
  const configData = (config.data || config.schema || {}) as Record<string, unknown>;
  const fields = (configData.fields || []) as Array<Record<string, unknown>>;
  
  return {
    title: config.title,
    description: (configData.description as string) || '',
    fields: fields.map((field, index) => {
      const fieldArgs = (field.args || {}) as Record<string, unknown>;
      
      // Handle options - could be array or choices object
      let options: MetaFieldOption[] | undefined;
      if (field.options) {
        options = choicesToOptions(field.options);
      } else if (field.choices) {
        options = choicesToOptions(field.choices);
      }
      
      return {
        id: (field.id as string) || (field.key as string) || `field_${index}`,
        name: (field.name as string) || '',
        type: (field.type as string) || 'text',
        label: (field.label as string) || '',
        object_type: ((field.object_type as string) || 'field') as 'field' | 'tab' | 'accordion' | 'endpoint',
        description: (field.description as string) || (fieldArgs.instructions as string) || '',
        placeholder: (field.placeholder as string) || (fieldArgs.placeholder as string) || '',
        default_value: (field.default_value as string) || (fieldArgs.default_value as string) || '',
        field_width: ((field.field_width as string) || '100%') as MetaField['field_width'],
        character_limit: (field.character_limit as number | null) || null,
        required: (field.required as boolean) || (fieldArgs.required as boolean) || false,
        quick_edit: (field.quick_edit as boolean) || false,
        revision_support: (field.revision_support as boolean) || false,
        show_in_rest: (field.show_in_rest as boolean) || false,
        conditional_logic: (field.conditional_logic as ConditionalLogic | null) || null,
        validation_pattern: (field.validation_pattern as string) || undefined,
        validation_message: (field.validation_message as string) || undefined,
        layout: (field.layout as MetaField['layout']) || undefined,
        options_source: (field.options_source as 'manual' | 'query_builder') || undefined,
        options: options,
        multiple: (field.multiple as boolean) || undefined,
        min_search_characters: (field.min_search_characters as number) || undefined,
        options_layout: (field.options_layout as 'vertical' | 'horizontal') || undefined,
        return_format: (field.return_format as 'array' | 'url' | 'id' | 'object') || undefined,
        // Group/Repeater sub-fields (recursively normalized)
        sub_fields: field.sub_fields ? normalizeMetaFields(field.sub_fields as unknown[]) : undefined,
        // Repeater/Gallery min/max
        min: (field.min as number) || undefined,
        max: (field.max as number) || undefined,
        button_label: (field.button_label as string) || undefined,
        collapsed: (field.collapsed as boolean) || undefined,
        // Relationship field (Pro)
        post_type: (field.post_type as string | string[]) || undefined,
        // Taxonomy Picker field (Pro)
        taxonomy: (field.taxonomy as string) || undefined,
        add_new: (field.add_new as boolean) || undefined,
        // User Picker field (Pro)
        roles: (field.roles as string | string[]) || undefined,
      };
    }),
    locations: normalizeLocations(
      (configData.location as unknown) || (configData.locations as unknown)
    ),
    active: config.status === 'publish',
    position: (configData.position as MetaboxFormData['position']) || 'normal',
    style: (configData.style as MetaboxFormData['style']) || 'default',
    label_placement: (configData.label_placement as MetaboxFormData['label_placement']) || 'top',
    instruction_placement: (configData.instruction_placement as MetaboxFormData['instruction_placement']) || 'field',
    match_priority:
      typeof configData.match_priority === 'number'
        ? (configData.match_priority as number)
        : DEFAULT_MATCH_PRIORITY,
  };
}

// Get all metaboxes
export function useMetaboxes() {
  return useQuery({
    queryKey: METABOXES_QUERY_KEY,
    queryFn: async () => {
      const response = await metaboxesApi.getAll();
      return response.data;
    },
  });
}

// Get single metabox
export function useMetabox(id: number | null) {
  return useQuery({
    queryKey: [...METABOXES_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await metaboxesApi.get(id);
      return apiDataToFormData(response.data);
    },
    enabled: !!id,
  });
}

// Create metabox
export function useCreateMetabox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MetaboxFormData) => {
      const response = await metaboxesApi.create({
        title: data.title,
        data: formDataToApiData(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METABOXES_QUERY_KEY });
    },
  });
}

// Update metabox
export function useUpdateMetabox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MetaboxFormData }) => {
      const response = await metaboxesApi.update(id, {
        title: data.title,
        data: formDataToApiData(data),
        status: 'publish', // Always publish when saving from form
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METABOXES_QUERY_KEY });
    },
  });
}

// Delete metabox
export function useDeleteMetabox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await metaboxesApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METABOXES_QUERY_KEY });
    },
  });
}

// Toggle metabox status (enable/disable)
export function useToggleMetaboxStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'publish' | 'draft' }) => {
      const response = await metaboxesApi.toggleStatus(id, status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METABOXES_QUERY_KEY });
    },
  });
}

// Duplicate metabox
export function useDuplicateMetabox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const response = await metaboxesApi.duplicate(id, title);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METABOXES_QUERY_KEY });
    },
  });
}

// Helper to create a new empty metafield
export function createEmptyMetaField(): MetaField {
  return {
    id: `field_${Date.now()}`,
    label: '',
    name: '',
    object_type: 'field',
    type: 'text',
    description: '',
    placeholder: '',
    default_value: '',
    field_width: '100%',
    character_limit: null,
    required: false,
    quick_edit: false,
    revision_support: false,
    show_in_rest: false,
    conditional_logic: null,
    validation_pattern: '',
    validation_message: '',
    options_source: 'manual',
    options: [],
    multiple: false,
    min_search_characters: 3,
    options_layout: 'vertical',
    return_format: 'array',
  };
}

// Helper to create a default location rule
export function createDefaultLocationRule(): LocationRule {
  return {
    param: 'post_type',
    operator: '==',
    value: 'post',
  };
}
