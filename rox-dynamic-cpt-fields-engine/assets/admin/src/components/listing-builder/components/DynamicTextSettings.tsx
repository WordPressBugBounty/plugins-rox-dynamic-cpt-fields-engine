/**
 * Inspector panel — Dynamic Text component.
 *
 * The PHP renderer (`DynamicText::render`) accepts:
 *   - source   : binding token (`title`, `excerpt`, `field:meta_key`)
 *   - tag      : wrapper tag (whitelisted)
 *   - before   : prefix decorator (e.g. "$")
 *   - after    : suffix decorator (e.g. "/mo")
 *   - format          : text | html | number | currency
 *   - decimals        : 0–6 (number / currency only)
 *   - link_to         : none | post | custom
 *   - link_url_source : meta key (when link_to=custom)
 *   - class           : extra CSS class
 */

import { Input, Select, Textarea, type SelectOption } from '../../ui';
import { DynamicSourcePicker } from '../DynamicSourcePicker';
import { FieldBindingPicker } from '../FieldBindingPicker';
import { inferSourceType, type DynamicSourceType } from '../dynamicSourceUtils';
import { InspectorRow } from '../shared';
import type { ListingComponentNode, ListingConfigData } from '../../../services/api';

const TAG_OPTIONS: SelectOption[] = [
  { value: 'p', label: 'Paragraph (p)' },
  { value: 'span', label: 'Inline (span)' },
  { value: 'div', label: 'Block (div)' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
  { value: 'strong', label: 'Strong' },
  { value: 'em', label: 'Emphasis' },
];

const FORMAT_OPTIONS: SelectOption[] = [
  { value: 'text', label: 'Plain Text' },
  { value: 'html', label: 'Allow HTML (kses)' },
  { value: 'number', label: 'Number (1,234.56)' },
  { value: 'currency', label: 'Currency ($1,234.56)' },
];

const LINK_TO_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'No Link' },
  { value: 'post', label: 'Post Permalink' },
  { value: 'custom', label: 'Custom URL Field' },
];

interface Props {
  component: ListingComponentNode;
  data: ListingConfigData;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicTextSettings({ component, data, onChange }: Props) {
  const settings = component.settings as Record<string, string | number>;
  const source = (settings.source as string) ?? '';
  const sourceType =
    (settings.source_type as DynamicSourceType | undefined) ??
    inferSourceType(source || 'title');
  const format = (settings.format as string) ?? 'text';
  const linkTo = (settings.link_to as string) ?? 'none';

  return (
    <div>
      <DynamicSourcePicker
        value={source}
        sourceType={sourceType}
        onChange={(value) => onChange({ source: value })}
        onSourceTypeChange={(nextType) =>
          onChange({
            source_type: nextType,
            source: nextType === 'object' ? 'title' : '',
          })
        }
        dataSource={data.data_source}
      />

      <InspectorRow label="HTML Tag" hint="Use h2/h3 for titles, p for paragraphs, span for inline.">
        <Select
          value={(settings.tag as string) ?? 'p'}
          onChange={(e) => onChange({ tag: e.target.value })}
          options={TAG_OPTIONS}
        />
      </InspectorRow>

      <InspectorRow label="Format">
        <Select
          value={format}
          onChange={(e) => onChange({ format: e.target.value })}
          options={FORMAT_OPTIONS}
        />
      </InspectorRow>

      {(format === 'number' || format === 'currency') && (
        <InspectorRow label="Decimals" hint="0–6 — applies to number/currency formats only.">
          <Input
            type="number"
            min={0}
            max={6}
            value={String(settings.decimals ?? 0)}
            onChange={(e) =>
              onChange({ decimals: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })
            }
          />
        </InspectorRow>
      )}

      <InspectorRow label="Before" hint="Prefix shown before the value, e.g. '$'.">
        <Input
          value={(settings.before as string) ?? ''}
          onChange={(e) => onChange({ before: e.target.value })}
          placeholder="(none)"
        />
      </InspectorRow>

      <InspectorRow label="After" hint="Suffix shown after the value, e.g. ' /mo'.">
        <Input
          value={(settings.after as string) ?? ''}
          onChange={(e) => onChange({ after: e.target.value })}
          placeholder="(none)"
        />
      </InspectorRow>

      <InspectorRow label="Link To" hint="Wrap the text in a link. Great for making titles clickable.">
        <Select
          value={linkTo}
          onChange={(e) => onChange({ link_to: e.target.value })}
          options={LINK_TO_OPTIONS}
        />
      </InspectorRow>

      {linkTo === 'custom' && (
        <InspectorRow label="URL Field" required hint="Meta key holding the URL to link to.">
          <FieldBindingPicker
            value={(settings.link_url_source as string) ?? ''}
            onChange={(value) => onChange({ link_url_source: value })}
            dataSource={data.data_source}
          />
        </InspectorRow>
      )}

      <InspectorRow label="CSS Class" hint="Additional class applied to the wrapper tag.">
        <Textarea
          rows={2}
          value={(settings.class as string) ?? ''}
          onChange={(e) => onChange({ class: e.target.value })}
          placeholder="rdcfe-listing__title"
        />
      </InspectorRow>
    </div>
  );
}
