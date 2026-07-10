/**
 * Inspector panel — Dynamic Fields Inline component.
 *
 * Repeater of arbitrary dynamic field bindings rendered in one horizontal
 * row, separated by a configurable string (default " · "). Mirrors the
 * Gutenberg block and Elementor widget field-item schema.
 */

import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { Input, Select, type SelectOption } from '../../ui';
import { DynamicSourcePicker } from '../DynamicSourcePicker';
import { InspectorRow } from '../shared';
import { inferSourceType, type DynamicSourceType } from '../dynamicSourceUtils';
import {
  FieldIconPicker,
  getEffectiveFieldIconMode,
  type FieldIconValue,
} from './FieldIconPicker';
import type { ListingComponentNode, ListingConfigData } from '../../../services/api';

export interface InlineFieldItem extends FieldIconValue {
  source_type?: DynamicSourceType;
  object_field?: string;
  meta_field?: string;
  query_var_field?: string;
  options_field?: string;
  relations_field?: string;
  custom_source?: string;
  source?: string;
  before?: string;
  after?: string;
  format?: string;
  decimals?: number;
  fallback?: string;
}

const FORMAT_OPTIONS: SelectOption[] = [
  { value: 'text', label: 'Plain Text' },
  { value: 'html', label: 'Allow HTML (kses)' },
  { value: 'number', label: 'Number (1,234.56)' },
  { value: 'currency', label: 'Currency ($1,234.56)' },
];

export function createDefaultInlineFieldItem(): InlineFieldItem {
  return {
    source_type: 'object',
    object_field: 'title',
    meta_field: '',
    query_var_field: '',
    options_field: '',
    relations_field: '',
    custom_source: '',
    source: 'title',
    before: '',
    after: '',
    format: 'text',
    decimals: 0,
    fallback: '',
    iconType: '',
    icon: '',
    iconMediaId: 0,
    iconMediaUrl: '',
  };
}

function summariseFieldItem(item: InlineFieldItem): string {
  const source = String(item.source ?? '').trim();
  let label = source || 'Pick a field';
  if (source === 'title') label = 'Title';
  else if (source === 'excerpt') label = 'Excerpt';
  else if (source.startsWith('field:')) label = source.slice('field:'.length);
  else if (source.startsWith('meta:')) label = source.slice('meta:'.length);

  const iconMode = getEffectiveFieldIconMode(item);
  if (iconMode === 'dashicon') {
    return `${label} · icon`;
  }
  if (iconMode === 'media') {
    return `${label} · image`;
  }
  return label;
}

function remapExpandedSet(
  expanded: Set<number>,
  fromIndex: number,
  toIndex: number
): Set<number> {
  const next = new Set<number>();
  expanded.forEach((i) => {
    if (i === fromIndex) {
      next.add(toIndex);
    } else if (i === toIndex) {
      next.add(fromIndex);
    } else {
      next.add(i);
    }
  });
  return next;
}

function shiftExpandedAfterRemove(expanded: Set<number>, removedIndex: number): Set<number> {
  const next = new Set<number>();
  expanded.forEach((i) => {
    if (i < removedIndex) {
      next.add(i);
    } else if (i > removedIndex) {
      next.add(i - 1);
    }
  });
  return next;
}

interface Props {
  component: ListingComponentNode;
  data: ListingConfigData;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicFieldsInlineSettings({ component, data, onChange }: Props) {
  const settings = component.settings as Record<string, unknown>;
  const items = (Array.isArray(settings.items) ? settings.items : []) as InlineFieldItem[];
  const separator = (settings.separator as string) ?? ' · ';

  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));
  const [fieldsSectionOpen, setFieldsSectionOpen] = useState(true);

  const updateItems = (next: InlineFieldItem[]) => {
    onChange({ items: next });
  };

  const updateItem = (index: number, patch: Partial<InlineFieldItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    updateItems(next);
  };

  const toggleExpanded = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addItem = () => {
    const nextIndex = items.length;
    updateItems([...items, createDefaultInlineFieldItem()]);
    setExpanded((prev) => new Set([...prev, nextIndex]));
    setFieldsSectionOpen(true);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    updateItems(items.filter((_, i) => i !== index));
    setExpanded((prev) => {
      const shifted = shiftExpandedAfterRemove(prev, index);
      if (shifted.size === 0) {
        shifted.add(Math.max(0, index - 1));
      }
      return shifted;
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const swap = next[index];
    next[index] = next[target];
    next[target] = swap;
    updateItems(next);
    setExpanded((prev) => remapExpandedSet(prev, index, target));
  };

  return (
    <div>
      <InspectorRow
        label="Separator"
        hint='Shown between fields — e.g. " · " or " | ". Leave empty for no separator.'
      >
        <Input
          value={separator}
          onChange={(e) => onChange({ separator: e.target.value })}
          placeholder=" · "
        />
      </InspectorRow>

      <div className="rdcfe-mt-4">
        <button
          type="button"
          onClick={() => setFieldsSectionOpen((open) => !open)}
          className="rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-gap-2 rdcfe-py-1.5 rdcfe-text-left"
        >
          <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-min-w-0">
            <ChevronRight
              className={`rdcfe-w-4 rdcfe-h-4 rdcfe-shrink-0 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200 ${
                fieldsSectionOpen ? 'rdcfe-rotate-90' : ''
              }`}
            />
            <span className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
              Fields
            </span>
            {!fieldsSectionOpen && items.length > 0 && (
              <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-truncate">
                {items.length} field{items.length === 1 ? '' : 's'}
              </span>
            )}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              addItem();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                addItem();
              }
            }}
            className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-px-2 rdcfe-py-1 rdcfe-text-[11px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-bg-[hsl(var(--rdcfe-primary)/0.08)] rdcfe-transition-colors rdcfe-shrink-0"
          >
            <Plus className="rdcfe-w-3.5 rdcfe-h-3.5" />
            Add field
          </span>
        </button>

        {fieldsSectionOpen && (
          <div className="rdcfe-mt-2 rdcfe-space-y-2">
            {items.map((item, index) => {
              const source = (item.source as string) ?? '';
              const sourceType =
                (item.source_type as DynamicSourceType | undefined) ??
                inferSourceType(source || 'title');
              const format = (item.format as string) ?? 'text';
              const isOpen = expanded.has(index);
              const summary = summariseFieldItem(item);

              return (
                <div
                  key={index}
                  className="rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.25)]"
                >
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-px-2 rdcfe-py-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(index)}
                      className="rdcfe-flex rdcfe-flex-1 rdcfe-items-center rdcfe-gap-1.5 rdcfe-min-w-0 rdcfe-text-left hover:rdcfe-opacity-80 rdcfe-transition-opacity"
                    >
                      <ChevronRight
                        className={`rdcfe-w-4 rdcfe-h-4 rdcfe-shrink-0 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200 ${
                          isOpen ? 'rdcfe-rotate-90' : ''
                        }`}
                      />
                      <span className="rdcfe-text-[11px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wide rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-shrink-0">
                        Field {index + 1}
                      </span>
                      {!isOpen && (
                        <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-truncate">
                          {summary}
                        </span>
                      )}
                    </button>
                    <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-0.5 rdcfe-shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        title="Move up"
                        className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-white disabled:rdcfe-opacity-30"
                      >
                        <ChevronUp className="rdcfe-w-3.5 rdcfe-h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === items.length - 1}
                        title="Move down"
                        className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-white disabled:rdcfe-opacity-30"
                      >
                        <ChevronDown className="rdcfe-w-3.5 rdcfe-h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        title="Remove field"
                        className="rdcfe-w-6 rdcfe-h-6 rdcfe-rounded rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)] disabled:rdcfe-opacity-30"
                      >
                        <Trash2 className="rdcfe-w-3.5 rdcfe-h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="rdcfe-px-3 rdcfe-pb-3 rdcfe-pt-1 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border)/0.6)]">
                      <DynamicSourcePicker
                        value={source}
                        sourceType={sourceType}
                        onChange={(value) => updateItem(index, { source: value })}
                        onSourceTypeChange={(nextType) =>
                          updateItem(index, {
                            source_type: nextType,
                            source: nextType === 'object' ? 'title' : '',
                          })
                        }
                        dataSource={data.data_source}
                      />

                      <FieldIconPicker
                        value={item}
                        onChange={(patch) => updateItem(index, patch)}
                      />

                      <InspectorRow label="Format">
                        <Select
                          value={format}
                          onChange={(e) => updateItem(index, { format: e.target.value })}
                          options={FORMAT_OPTIONS}
                        />
                      </InspectorRow>

                      {(format === 'number' || format === 'currency') && (
                        <InspectorRow label="Decimals">
                          <Input
                            type="number"
                            min={0}
                            max={6}
                            value={String(item.decimals ?? 0)}
                            onChange={(e) =>
                              updateItem(index, {
                                decimals: Math.max(0, Math.min(6, Number(e.target.value) || 0)),
                              })
                            }
                          />
                        </InspectorRow>
                      )}

                      <InspectorRow label="Before">
                        <Input
                          value={(item.before as string) ?? ''}
                          onChange={(e) => updateItem(index, { before: e.target.value })}
                          placeholder="(none)"
                        />
                      </InspectorRow>

                      <InspectorRow label="After">
                        <Input
                          value={(item.after as string) ?? ''}
                          onChange={(e) => updateItem(index, { after: e.target.value })}
                          placeholder="(none)"
                        />
                      </InspectorRow>

                      <InspectorRow label="Fallback" hint="Shown when the field value is empty.">
                        <Input
                          value={(item.fallback as string) ?? ''}
                          onChange={(e) => updateItem(index, { fallback: e.target.value })}
                          placeholder="—"
                        />
                      </InspectorRow>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <InspectorRow label="CSS Class">
        <Input
          value={(settings.class as string) ?? ''}
          onChange={(e) => onChange({ class: e.target.value })}
          placeholder="rdcfe-listing__fields-inline"
        />
      </InspectorRow>
    </div>
  );
}
