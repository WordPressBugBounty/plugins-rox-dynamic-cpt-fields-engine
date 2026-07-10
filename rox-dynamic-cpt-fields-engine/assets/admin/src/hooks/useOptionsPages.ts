import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { optionsPagesApi, OptionsPageConfig } from '../services/api';
import type { MetaField } from './usePostTypes';
import { normalizeMetaFields } from './usePostTypes';

export const OPTIONS_PAGES_QUERY_KEY = ['options-pages'];

// Labels interface for options page
export interface OptionsPageLabels {
  update_button?: string;
  updated_message?: string;
}

export interface OptionsPageFormData {
  title: string;
  menu_title: string;
  menu_slug: string;
  capability: string;
  position?: number;
  icon?: string;
  parent_slug?: string;
  redirect?: boolean;
  meta_fields?: MetaField[];
  description?: string;
  labels?: OptionsPageLabels;
  storage?: 'options' | 'custom';
  custom_storage?: string;
  autoload?: boolean;
}

// Convert form data to API format (what backend expects)
function formDataToApiData(data: OptionsPageFormData): Record<string, unknown> {
  return {
    page_title: data.title,
    menu_title: data.menu_title,
    menu_slug: data.menu_slug,
    capability: data.capability || 'manage_options',
    position: data.position,
    icon_url: data.icon,
    parent_slug: data.parent_slug,
    redirect: data.redirect ?? true,
    meta_fields: data.meta_fields || [],
    description: data.description || '',
    labels: data.labels || {
      update_button: 'Save Settings',
      updated_message: 'Settings saved successfully.',
    },
    storage: data.storage || 'options',
    custom_storage: data.custom_storage || '',
    autoload: data.autoload ?? false,
  };
}

// Convert API response to form data
function apiDataToFormData(config: OptionsPageConfig): OptionsPageFormData {
  // Handle both data format (new) and schema format (old)
  const configData = (config.data || config.schema || {}) as Record<string, unknown>;
  
  return {
    title: config.title || (configData.page_title as string) || '',
    menu_title: (configData.menu_title as string) || config.title || '',
    menu_slug: (configData.menu_slug as string) || '',
    capability: (configData.capability as string) || 'manage_options',
    position: configData.position as number,
    icon: (configData.icon as string) || (configData.icon_url as string),
    parent_slug: configData.parent_slug as string,
    redirect: configData.redirect as boolean,
    meta_fields: normalizeMetaFields(configData.meta_fields as unknown[] || []),
    description: (configData.description as string) || '',
    labels: (configData.labels as OptionsPageLabels) || {
      update_button: 'Save Settings',
      updated_message: 'Settings saved successfully.',
    },
    storage: (configData.storage as 'options' | 'custom') || 'options',
    custom_storage: (configData.custom_storage as string) || '',
    autoload: (configData.autoload as boolean) ?? false,
  };
}

// Get all options pages
export function useOptionsPages() {
  return useQuery({
    queryKey: OPTIONS_PAGES_QUERY_KEY,
    queryFn: async () => {
      const response = await optionsPagesApi.getAll();
      return response.data;
    },
  });
}

// Get single options page
export function useOptionsPage(id: number | null) {
  return useQuery({
    queryKey: [...OPTIONS_PAGES_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await optionsPagesApi.get(id);
      return apiDataToFormData(response.data);
    },
    enabled: !!id,
  });
}

// Create options page
export function useCreateOptionsPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OptionsPageFormData) => {
      const response = await optionsPagesApi.create({
        title: data.title,
        data: formDataToApiData(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OPTIONS_PAGES_QUERY_KEY });
    },
  });
}

// Update options page
export function useUpdateOptionsPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: OptionsPageFormData }) => {
      const response = await optionsPagesApi.update(id, {
        title: data.title,
        data: formDataToApiData(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OPTIONS_PAGES_QUERY_KEY });
    },
  });
}

// Delete options page
export function useDeleteOptionsPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await optionsPagesApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OPTIONS_PAGES_QUERY_KEY });
    },
  });
}

// Toggle options page status (enable/disable)
export function useToggleOptionsPageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'publish' | 'draft' }) => {
      const response = await optionsPagesApi.toggleStatus(id, status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OPTIONS_PAGES_QUERY_KEY });
    },
  });
}

// Duplicate options page
export function useDuplicateOptionsPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const response = await optionsPagesApi.duplicate(id, title);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OPTIONS_PAGES_QUERY_KEY });
    },
  });
}
