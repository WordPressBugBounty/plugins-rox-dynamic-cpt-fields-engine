import { useState } from 'react';
import { Database, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Input, Select, type SelectOption } from '../ui';
import { CollapsibleSection, type TabContentProps } from './shared';
import { createEmptyMetaRow, useQueryMetaKeys } from '../../hooks/useQueries';
import type { QueryMetaQueryRow } from '../../services/api';

const COMPARE: SelectOption[] = [
  { value: '=', label: '= (equals)' },
  { value: '!=', label: '!= (not equals)' },
  { value: '>', label: '> (greater than)' },
  { value: '>=', label: '>= (greater or equal)' },
  { value: '<', label: '< (less than)' },
  { value: '<=', label: '<= (less or equal)' },
  { value: 'LIKE', label: 'LIKE (contains)' },
  { value: 'NOT LIKE', label: 'NOT LIKE' },
  { value: 'IN', label: 'IN (any of)' },
  { value: 'NOT IN', label: 'NOT IN' },
  { value: 'BETWEEN', label: 'BETWEEN (range)' },
  { value: 'NOT BETWEEN', label: 'NOT BETWEEN' },
  { value: 'EXISTS', label: 'EXISTS (key set)' },
  { value: 'NOT EXISTS', label: 'NOT EXISTS' },
  { value: 'REGEXP', label: 'REGEXP' },
  { value: 'NOT REGEXP', label: 'NOT REGEXP' },
];

const TYPES: SelectOption[] = [
  { value: 'CHAR', label: 'CHAR (string)' },
  { value: 'NUMERIC', label: 'NUMERIC' },
  { value: 'DATE', label: 'DATE' },
  { value: 'DATETIME', label: 'DATETIME' },
  { value: 'TIME', label: 'TIME' },
  { value: 'DECIMAL', label: 'DECIMAL' },
  { value: 'SIGNED', label: 'SIGNED' },
  { value: 'UNSIGNED', label: 'UNSIGNED' },
  { value: 'BINARY', label: 'BINARY' },
];

const RELATIONS: SelectOption[] = [
  { value: 'AND', label: 'AND (match all rows)' },
  { value: 'OR', label: 'OR (match any row)' },
];

function valueToString(value: QueryMetaQueryRow['value']): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function stringToValue(input: string, compare: string): QueryMetaQueryRow['value'] {
  const op = compare.toUpperCase();
  // Multi-value operators take an array.
  if (['IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN'].includes(op)) {
    return input
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return input;
}

export function MetaQueryTab({ data, setData }: TabContentProps) {
  const { data: metaKeysPayload, isLoading: keysLoading } = useQueryMetaKeys();
  const knownMetaKeys = metaKeysPayload?.meta_keys;
  const queries = data.meta_query?.queries ?? [];
  const relation = data.meta_query?.relation ?? 'AND';

  // Per-row "use custom key" toggle — when off, the key dropdown shows
  // field-group meta keys; when on, the row uses a free-text input.
  // Keyed off the row index so adding/removing rows doesn't shift state.
  const [customKeyRows, setCustomKeyRows] = useState<Set<number>>(new Set());

  const setMeta = (patch: Partial<NonNullable<typeof data.meta_query>>) => {
    setData((prev) => ({
      ...prev,
      meta_query: { ...prev.meta_query, queries: prev.meta_query?.queries ?? [], ...patch },
    }));
  };

  const updateRow = (index: number, patch: Partial<QueryMetaQueryRow>) => {
    const next = queries.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setMeta({ queries: next });
  };

  const addRow = () => setMeta({ queries: [...queries, createEmptyMetaRow()] });

  const removeRow = (index: number) => {
    setMeta({ queries: queries.filter((_, i) => i !== index) });
    setCustomKeyRows((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const toggleCustomKey = (index: number) => {
    setCustomKeyRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const keyOptions: SelectOption[] = [
    { value: '', label: 'Select a meta key...' },
    ...((knownMetaKeys ?? []).map((k) => ({ value: k, label: k }))),
  ];

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="Meta Query"
        icon={<Database className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
        badge={queries.length ? `${queries.length} row${queries.length === 1 ? '' : 's'}` : undefined}
      >
        <div className="rdcfe-mb-4 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-3 rdcfe-py-2.5 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-primary)/0.08)] rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
          <Sparkles className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0" />
          <span>
            <strong>Field-aware:</strong> the Meta Key dropdown auto-completes from your registered field
            groups so you don&apos;t need to remember keys by hand.
          </span>
        </div>

        {queries.length > 1 && (
          <div className="rdcfe-mb-4 rdcfe-flex rdcfe-items-center rdcfe-gap-3">
            <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide">
              Combine rows with
            </span>
            <Select
              options={RELATIONS}
              value={relation}
              onChange={(e) => setMeta({ relation: e.target.value as 'AND' | 'OR' })}
              className="rdcfe-w-56"
            />
          </div>
        )}

        {queries.length === 0 && (
          <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-p-8 rdcfe-text-center rdcfe-mb-4">
            <Database className="rdcfe-w-8 rdcfe-h-8 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mx-auto rdcfe-mb-3" />
            <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              No meta filters yet. Add one to query custom field values like price, featured, or
              event_date.
            </p>
          </div>
        )}

        <div className="rdcfe-space-y-3">
          {queries.map((row, index) => {
            const compare = (row.compare ?? '=').toUpperCase();
            const skipsValue = compare === 'EXISTS' || compare === 'NOT EXISTS';
            const useCustomKey = customKeyRows.has(index);

            return (
              <div
                key={index}
                className="rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-p-4"
              >
                <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-3">
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
                    <span className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wide rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      Rule #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCustomKey(index)}
                      className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline"
                    >
                      {useCustomKey ? 'Use known key' : 'Use custom key'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                    title="Remove rule"
                  >
                    <Trash2 className="rdcfe-h-4 rdcfe-w-4" />
                  </button>
                </div>

                <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-12 rdcfe-gap-3">
                  <div className="md:rdcfe-col-span-4">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
                      Meta Key
                      {keysLoading && !useCustomKey && (
                        <Loader2 className="rdcfe-w-3 rdcfe-h-3 rdcfe-animate-spin" />
                      )}
                    </label>
                    {useCustomKey ? (
                      <Input
                        value={row.key}
                        onChange={(e) => updateRow(index, { key: e.target.value })}
                        placeholder="e.g. _custom_meta_key"
                      />
                    ) : (
                      <Select
                        options={keyOptions}
                        value={row.key}
                        onChange={(e) => updateRow(index, { key: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="md:rdcfe-col-span-3">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Compare
                    </label>
                    <Select
                      options={COMPARE}
                      value={compare}
                      onChange={(e) =>
                        updateRow(index, {
                          compare: e.target.value as QueryMetaQueryRow['compare'],
                        })
                      }
                    />
                  </div>

                  <div className="md:rdcfe-col-span-2">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Type
                    </label>
                    <Select
                      options={TYPES}
                      value={(row.type ?? 'CHAR').toUpperCase()}
                      onChange={(e) =>
                        updateRow(index, {
                          type: e.target.value as QueryMetaQueryRow['type'],
                        })
                      }
                    />
                  </div>

                  <div className="md:rdcfe-col-span-3">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Value
                    </label>
                    {skipsValue ? (
                      <Input value="—" disabled className="rdcfe-text-center" />
                    ) : (
                      <Input
                        value={valueToString(row.value)}
                        onChange={(e) =>
                          updateRow(index, { value: stringToValue(e.target.value, compare) })
                        }
                        placeholder={
                          ['BETWEEN', 'NOT BETWEEN'].includes(compare)
                            ? 'min, max'
                            : ['IN', 'NOT IN'].includes(compare)
                            ? 'a, b, c'
                            : 'value or {{macro}}'
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="rdcfe-btn rdcfe-btn-secondary rdcfe-mt-4"
        >
          <Plus className="rdcfe-h-4 rdcfe-w-4" />
          Add Meta Rule
        </button>
      </CollapsibleSection>
    </div>
  );
}
