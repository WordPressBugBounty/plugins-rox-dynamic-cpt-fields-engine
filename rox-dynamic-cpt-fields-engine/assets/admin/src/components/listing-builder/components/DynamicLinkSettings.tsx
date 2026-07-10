/**
 * Inspector panel — Dynamic Link component.
 *
 * Mirrors `DynamicLink::$defaults`:
 *   - url_source   : `permalink` | `field:<key>` | etc.
 *   - label_source : binding token used for the visible text (empty = use label_text)
 *   - label_text   : fallback text when label_source is empty
 *   - target       : `_self` | `_blank`
 *   - rel          : extra rel value (noopener noreferrer auto-added for _blank)
 *   - class        : extra CSS class
 */

import { Input, Select, type SelectOption } from '../../ui';
import { FieldBindingPicker } from '../FieldBindingPicker';
import { InspectorRow } from '../shared';
import type { ListingComponentNode, ListingConfigData } from '../../../services/api';

const TARGET_OPTIONS: SelectOption[] = [
  { value: '_self', label: 'Same tab (_self)' },
  { value: '_blank', label: 'New tab (_blank)' },
];

interface Props {
  component: ListingComponentNode;
  data: ListingConfigData;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicLinkSettings({ component, data, onChange }: Props) {
  const settings = component.settings as Record<string, string>;

  return (
    <div>
      <InspectorRow
        label="URL Source"
        required
        hint="Pick the field that resolves to a URL — permalink, custom URL meta, etc."
      >
        <FieldBindingPicker
          value={settings.url_source ?? 'permalink'}
          onChange={(value) => onChange({ url_source: value })}
          dataSource={data.data_source}
        />
      </InspectorRow>

      <InspectorRow
        label="Label Source"
        hint="Optional — pick a field for the link text. Leave empty to use the static text below."
      >
        <FieldBindingPicker
          value={settings.label_source ?? ''}
          onChange={(value) => onChange({ label_source: value })}
          dataSource={data.data_source}
          placeholder="(use static text)"
        />
      </InspectorRow>

      <InspectorRow label="Label Text" hint="Used when no label source is set.">
        <Input
          value={settings.label_text ?? ''}
          onChange={(e) => onChange({ label_text: e.target.value })}
          placeholder="Read More"
        />
      </InspectorRow>

      <InspectorRow label="Target">
        <Select
          value={settings.target ?? '_self'}
          onChange={(e) => onChange({ target: e.target.value })}
          options={TARGET_OPTIONS}
        />
      </InspectorRow>

      <InspectorRow
        label="Rel"
        hint="Extra rel value — noopener noreferrer is auto-added for new-tab links."
      >
        <Input
          value={settings.rel ?? ''}
          onChange={(e) => onChange({ rel: e.target.value })}
          placeholder="(none)"
        />
      </InspectorRow>

      <InspectorRow label="CSS Class">
        <Input
          value={settings.class ?? ''}
          onChange={(e) => onChange({ class: e.target.value })}
          placeholder="rdcfe-listing__link"
        />
      </InspectorRow>
    </div>
  );
}
