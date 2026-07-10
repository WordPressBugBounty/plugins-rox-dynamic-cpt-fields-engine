/**
 * Inspector panel — Dynamic Image component.
 *
 * Mirrors `DynamicImage::$defaults`:
 *   - source           : `featured_image` | `field:<meta_key>`
 *   - size             : registered WP image size
 *   - link_to          : `post` | `media` | `custom` | `none`
 *   - link_url_source  : meta key (when link_to=custom)
 *   - fallback_id      : attachment ID used when source resolves empty
 *   - alt_text_source  : meta key for alt text (defaults to alt attribute on attachment)
 *   - class            : extra CSS class
 */

import { Input, Select, type SelectOption } from '../../ui';
import { FieldBindingPicker } from '../FieldBindingPicker';
import { InspectorRow } from '../shared';
import type { ListingComponentNode, ListingConfigData } from '../../../services/api';

/**
 * Standard WordPress image sizes — the safe set that ships with core
 * and that themes almost always register. Authors can also paste a
 * custom size slug into the "Custom size" field for sizes registered
 * by the theme.
 */
const SIZE_OPTIONS: SelectOption[] = [
  { value: 'thumbnail', label: 'Thumbnail (150×150)' },
  { value: 'medium', label: 'Medium (300×300)' },
  { value: 'medium_large', label: 'Medium Large (768×–)' },
  { value: 'large', label: 'Large (1024×1024)' },
  { value: 'full', label: 'Full (original)' },
];

const LINK_TO_OPTIONS: SelectOption[] = [
  { value: 'post', label: 'Post Permalink' },
  { value: 'media', label: 'Attachment Page' },
  { value: 'custom', label: 'Custom URL Field' },
  { value: 'none', label: 'No Link' },
];

interface Props {
  component: ListingComponentNode;
  data: ListingConfigData;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicImageSettings({ component, data, onChange }: Props) {
  const settings = component.settings as Record<string, string | number>;
  const linkTo = (settings.link_to as string) ?? 'post';

  return (
    <div>
      <InspectorRow
        label="Source"
        required
        hint="Featured image or any meta-key holding an attachment ID / URL."
      >
        <FieldBindingPicker
          value={(settings.source as string) ?? 'featured_image'}
          onChange={(value) => onChange({ source: value })}
          groups={['media', 'meta']}
          dataSource={data.data_source}
        />
      </InspectorRow>

      <InspectorRow label="Image Size">
        <Select
          value={(settings.size as string) ?? 'medium'}
          onChange={(e) => onChange({ size: e.target.value })}
          options={SIZE_OPTIONS}
        />
      </InspectorRow>

      <InspectorRow label="Link To">
        <Select
          value={linkTo}
          onChange={(e) => onChange({ link_to: e.target.value })}
          options={LINK_TO_OPTIONS}
        />
      </InspectorRow>

      {linkTo === 'custom' && (
        <InspectorRow
          label="URL Source"
          hint="Pick a meta field that stores the URL to link to."
          required
        >
          <FieldBindingPicker
            value={(settings.link_url_source as string) ?? ''}
            onChange={(value) => onChange({ link_url_source: value })}
            groups={['meta']}
            dataSource={data.data_source}
          />
        </InspectorRow>
      )}

      <InspectorRow label="Alt Text Source" hint="Optional — fall back to the attachment alt by default.">
        <FieldBindingPicker
          value={(settings.alt_text_source as string) ?? ''}
          onChange={(value) => onChange({ alt_text_source: value })}
          groups={['core', 'meta']}
          dataSource={data.data_source}
          placeholder="(use attachment alt)"
        />
      </InspectorRow>

      <InspectorRow
        label="Fallback Image ID"
        hint="Attachment ID rendered when the source resolves empty. 0 = none."
      >
        <Input
          type="number"
          min={0}
          value={String(settings.fallback_id ?? 0)}
          onChange={(e) => onChange({ fallback_id: Math.max(0, Number(e.target.value) || 0) })}
        />
      </InspectorRow>

      <InspectorRow label="CSS Class">
        <Input
          value={(settings.class as string) ?? ''}
          onChange={(e) => onChange({ class: e.target.value })}
          placeholder="rdcfe-listing__image"
        />
      </InspectorRow>
    </div>
  );
}
