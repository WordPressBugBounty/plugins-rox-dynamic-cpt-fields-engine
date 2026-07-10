/**
 *  hierarchical source picker.
 *
 * Step 1 — pick a source family (Object, Meta, Query Var, …).
 * Step 2 — pick the field within that family.
 * Optional custom token overrides both (power-users / third-party keys).
 *
 * Writes the composed binding token back through `onChange` so existing
 * PHP renderers keep reading `settings.source` unchanged.
 */

import { useMemo } from 'react';
import { Input, Select, type SelectOption } from '../ui';
import { InspectorRow } from './shared';
import { useDynamicSources } from '../../hooks/useListings';
import {
  FIELD_LABELS,
  buildFieldSelectOptions,
  composeSourceToken,
  filterGroupsForDataSource,
  inferSourceType,
  isCustomToken,
  resolveFieldSelectValue,
  type DynamicSourceType,
} from './dynamicSourceUtils';

interface DynamicSourcePickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Persisted source family — required so empty tokens don't fall back to `object`. */
  sourceType?: DynamicSourceType;
  onSourceTypeChange?: (sourceType: DynamicSourceType) => void;
  dataSource?: 'posts' | 'terms' | 'users' | 'relation_children';
  /** Optional custom token stored separately (falls back to inferring from `value`). */
  customSource?: string;
  onCustomSourceChange?: (value: string) => void;
  showCustomToken?: boolean;
}

export function DynamicSourcePicker({
  value,
  onChange,
  sourceType: sourceTypeProp,
  onSourceTypeChange,
  dataSource = 'posts',
  customSource,
  onCustomSourceChange,
  showCustomToken = true,
}: DynamicSourcePickerProps) {
  const { data: catalog, isLoading } = useDynamicSources();

  const sourceType = sourceTypeProp ?? inferSourceType(value);

  const sourceTypeOptions: SelectOption[] = useMemo(() => {
    if (!catalog?.sources?.length) {
      return [
        { value: 'object', label: 'Post/Term/User/Object Data' },
        { value: 'meta', label: 'Meta Data' },
      ];
    }
    return catalog.sources.map((row) => ({
      value: row.value,
      label: row.label,
    }));
  }, [catalog]);

  const activeSource = useMemo(
    () => catalog?.sources?.find((row) => row.value === sourceType),
    [catalog, sourceType]
  );

  const filteredGroups = useMemo(
    () =>
      filterGroupsForDataSource(
        sourceType,
        activeSource?.groups ?? [],
        dataSource
      ),
    [activeSource, dataSource, sourceType]
  );

  const fieldOptions = useMemo(
    () => buildFieldSelectOptions(filteredGroups),
    [filteredGroups]
  );

  const fieldValue = useMemo(
    () => resolveFieldSelectValue(sourceType, value, filteredGroups),
    [filteredGroups, sourceType, value]
  );

  const inferredCustom =
    customSource ??
    (isCustomToken(value, sourceType, filteredGroups) ? value : '');

  const handleSourceTypeChange = (nextType: string) => {
    const typed = nextType as DynamicSourceType;
    onCustomSourceChange?.('');

    if (onSourceTypeChange) {
      onSourceTypeChange(typed);
      return;
    }

    onChange(typed === 'object' ? 'title' : '');
  };

  const handleFieldChange = (nextField: string) => {
    onChange(composeSourceToken(sourceType, nextField));
    onCustomSourceChange?.('');
  };

  const handleCustomChange = (nextCustom: string) => {
    onCustomSourceChange?.(nextCustom);
    const trimmed = nextCustom.trim();
    if (trimmed) {
      onChange(trimmed);
    } else if (fieldValue) {
      onChange(composeSourceToken(sourceType, fieldValue));
    }
  };

  return (
    <>
      <InspectorRow
        label="Source"
        required
        hint="Pick where the value comes from — object data, meta, query vars, etc."
      >
        <Select
          value={sourceType}
          onChange={(e) => handleSourceTypeChange(e.target.value)}
          options={sourceTypeOptions}
          disabled={isLoading}
        />
      </InspectorRow>

      <InspectorRow
        label={FIELD_LABELS[sourceType]}
        required
        hint="Choose the specific field within the selected source."
      >
        <Select
          value={fieldValue}
          onChange={(e) => handleFieldChange(e.target.value)}
          options={fieldOptions}
          disabled={isLoading || fieldOptions.length <= 1}
        />
      </InspectorRow>

      {showCustomToken && (
        <InspectorRow
          label="Custom token"
          hint="Optional. Overrides the field selected above."
        >
          <Input
            value={inferredCustom}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="e.g. field:my_meta_key"
          />
        </InspectorRow>
      )}
    </>
  );
}
