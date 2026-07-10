/**
 * ContextSelector - Pick an existing CPT or Field Group to modify.
 *
 * Only shown when ModeSelector is set to `modify_existing`. Loads
 * the live config lists from the public REST endpoints so the user
 * can target precisely the item they want the AI to patch — and the
 * server-side `PromptBuilder.modify_existing` mode receives the slug
 * for context grounding.
 *
 * @package DynamicCPTFieldsEngine
 */

import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { metaboxesApi, postTypesApi } from '@/services/api';
import { POST_TYPES_QUERY_KEY } from '@/hooks/usePostTypes';
import { METABOXES_QUERY_KEY } from '@/hooks/useMetaboxes';

interface ContextSelectorProps {
  selectedCpt: string;
  selectedFieldGroup: string | number;
  onChange: (next: { selectedCpt: string; selectedFieldGroup: string | number }) => void;
  disabled?: boolean;
}

export function ContextSelector({
  selectedCpt,
  selectedFieldGroup,
  onChange,
  disabled,
}: ContextSelectorProps) {
  const { data: postTypes, isLoading: loadingCpts } = useQuery({
    queryKey: POST_TYPES_QUERY_KEY,
    queryFn: async () => (await postTypesApi.getAll()).data,
  });

  const { data: fieldGroups, isLoading: loadingFieldGroups } = useQuery({
    queryKey: METABOXES_QUERY_KEY,
    queryFn: async () => (await metaboxesApi.getAll()).data,
  });

  return (
    <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-2 rdcfe-gap-3">
      <div>
        <label className="rdcfe-mb-1.5 rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-text-xs rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-gray-600">
          <span>Target Post Type</span>
          {loadingCpts && <Loader2 className="rdcfe-h-3 rdcfe-w-3 rdcfe-animate-spin rdcfe-text-gray-400" />}
        </label>
        <select
          value={selectedCpt}
          onChange={(e) =>
            onChange({ selectedCpt: e.target.value, selectedFieldGroup })
          }
          disabled={disabled || loadingCpts}
          className="rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-3 rdcfe-py-2 rdcfe-text-sm focus:rdcfe-border-indigo-300 focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-indigo-500/20 disabled:rdcfe-bg-gray-50 disabled:rdcfe-text-gray-400"
        >
          <option value="">— Any (no specific CPT) —</option>
          {(postTypes ?? []).map((pt) => (
            <option key={pt.id} value={pt.slug}>
              {pt.title} ({pt.slug})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="rdcfe-mb-1.5 rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-text-xs rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-gray-600">
          <span>Target Field Group</span>
          {loadingFieldGroups && <Loader2 className="rdcfe-h-3 rdcfe-w-3 rdcfe-animate-spin rdcfe-text-gray-400" />}
        </label>
        <select
          value={String(selectedFieldGroup)}
          onChange={(e) =>
            onChange({
              selectedCpt,
              selectedFieldGroup: e.target.value ? Number(e.target.value) : '',
            })
          }
          disabled={disabled || loadingFieldGroups}
          className="rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-3 rdcfe-py-2 rdcfe-text-sm focus:rdcfe-border-indigo-300 focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-indigo-500/20 disabled:rdcfe-bg-gray-50 disabled:rdcfe-text-gray-400"
        >
          <option value="">— Any (no specific field group) —</option>
          {(fieldGroups ?? []).map((fg) => (
            <option key={fg.id} value={fg.id}>
              {fg.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ContextSelector;
