/**
 * Inspector panel — Dynamic Meta component.
 *
 * Mirrors `DynamicMeta::$defaults`:
 *   - meta_type   : date | modified | author | comment_count | time_ago | reading_time
 *   - date_format : PHP-style format (date / modified only)
 *   - link_author : author name links to author archive (author only)
 *   - iconType / icon / iconMediaId : optional dashicon or media image
 *   - class       : extra CSS class
 */

import { Input, Select, Toggle, type SelectOption } from '../../ui';
import { InspectorRow } from '../shared';
import { FieldIconPicker } from './FieldIconPicker';
import type { ListingComponentNode } from '../../../services/api';

const META_TYPE_OPTIONS: SelectOption[] = [
  { value: 'date', label: 'Publish Date' },
  { value: 'modified', label: 'Modified Date' },
  { value: 'time_ago', label: 'Time Ago (e.g. "2 days ago")' },
  { value: 'author', label: 'Author Name' },
  { value: 'comment_count', label: 'Comment Count' },
  { value: 'reading_time', label: 'Reading Time' },
];

interface Props {
  component: ListingComponentNode;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicMetaSettings({ component, onChange }: Props) {
  const settings = component.settings as Record<string, string | boolean | number>;

  const metaType = (settings.meta_type as string) ?? 'date';

  return (
    <div>
      <InspectorRow label="Type" required>
        <Select
          value={metaType}
          onChange={(e) => onChange({ meta_type: e.target.value })}
          options={META_TYPE_OPTIONS}
        />
      </InspectorRow>

      {(metaType === 'date' || metaType === 'modified') && (
        <InspectorRow
          label="Date Format"
          hint="PHP date format. Leave empty to use the WP site default."
        >
          <Input
            value={(settings.date_format as string) ?? ''}
            onChange={(e) => onChange({ date_format: e.target.value })}
            placeholder="F j, Y"
          />
        </InspectorRow>
      )}

      {metaType === 'author' && (
        <InspectorRow label="Link Author Name" hint="Wrap the author name in a link to their archive.">
          <Toggle
            checked={(settings.link_author as boolean) ?? true}
            onChange={(checked) => onChange({ link_author: checked })}
            label={settings.link_author === false ? 'Disabled' : 'Enabled'}
          />
        </InspectorRow>
      )}

      <FieldIconPicker
        value={{
          iconType: settings.iconType as string | undefined,
          icon: settings.icon as string | undefined,
          iconMediaId: settings.iconMediaId as number | undefined,
          iconMediaUrl: settings.iconMediaUrl as string | undefined,
        }}
        onChange={onChange}
      />

      <InspectorRow label="CSS Class">
        <Input
          value={(settings.class as string) ?? ''}
          onChange={(e) => onChange({ class: e.target.value })}
          placeholder="rdcfe-listing__meta"
        />
      </InspectorRow>
    </div>
  );
}
