/**
 * Inspector panel — Repeater Output component.
 *
 * Mirrors `RepeaterOutput::$defaults`:
 *   - field_name      : meta key of the Repeater field (e.g. `gallery_rows`)
 *   - list_tag        : `ul` | `ol` | `div`
 *   - item_tag        : `li` | `div` | `p` | `span`
 *   - column_template : token-based template (`{title} - {price}`)
 *   - limit           : max rows shown (0 = all)
 *   - separator       : optional joiner when item_tag = span
 *   - class           : extra CSS class
 */

import { Input, Select, Textarea, type SelectOption } from '../../ui';
import { InspectorRow } from '../shared';
import type { ListingComponentNode } from '../../../services/api';

const LIST_TAG_OPTIONS: SelectOption[] = [
  { value: 'ul', label: 'Unordered list (ul)' },
  { value: 'ol', label: 'Ordered list (ol)' },
  { value: 'div', label: 'Block (div)' },
];

const ITEM_TAG_OPTIONS: SelectOption[] = [
  { value: 'li', label: 'List item (li)' },
  { value: 'div', label: 'Block (div)' },
  { value: 'p', label: 'Paragraph (p)' },
  { value: 'span', label: 'Inline (span)' },
];

interface Props {
  component: ListingComponentNode;
  onChange: (patch: Record<string, unknown>) => void;
}

export function RepeaterOutputSettings({ component, onChange }: Props) {
  const settings = component.settings as Record<string, string | number>;

  return (
    <div>
      <InspectorRow
        label="Field Name"
        required
        hint="Meta key of the Repeater field (without the `field:` prefix)."
      >
        <Input
          value={(settings.field_name as string) ?? ''}
          onChange={(e) => onChange({ field_name: e.target.value })}
          placeholder="gallery_rows"
        />
      </InspectorRow>

      <InspectorRow label="List Tag">
        <Select
          value={(settings.list_tag as string) ?? 'ul'}
          onChange={(e) => onChange({ list_tag: e.target.value })}
          options={LIST_TAG_OPTIONS}
        />
      </InspectorRow>

      <InspectorRow label="Item Tag">
        <Select
          value={(settings.item_tag as string) ?? 'li'}
          onChange={(e) => onChange({ item_tag: e.target.value })}
          options={ITEM_TAG_OPTIONS}
        />
      </InspectorRow>

      <InspectorRow
        label="Row Template"
        required
        hint="Use {sub_field} tokens that match your repeater's columns. e.g. {title} — {price}"
      >
        <Textarea
          rows={2}
          value={(settings.column_template as string) ?? '{title}'}
          onChange={(e) => onChange({ column_template: e.target.value })}
          placeholder="{title} — {price}"
        />
      </InspectorRow>

      <InspectorRow label="Limit" hint="Max rows shown. 0 = all rows.">
        <Input
          type="number"
          min={0}
          value={String(settings.limit ?? 0)}
          onChange={(e) => onChange({ limit: Math.max(0, Number(e.target.value) || 0) })}
        />
      </InspectorRow>

      <InspectorRow
        label="Separator"
        hint="Joiner inserted between rows when item_tag = span. Ignored otherwise."
      >
        <Input
          value={(settings.separator as string) ?? ''}
          onChange={(e) => onChange({ separator: e.target.value })}
          placeholder=", "
        />
      </InspectorRow>

      <InspectorRow label="CSS Class">
        <Input
          value={(settings.class as string) ?? ''}
          onChange={(e) => onChange({ class: e.target.value })}
          placeholder="rdcfe-listing__repeater"
        />
      </InspectorRow>
    </div>
  );
}
