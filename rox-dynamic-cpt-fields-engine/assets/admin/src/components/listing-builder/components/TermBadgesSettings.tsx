/**
 * Inspector panel — Term Badges component.
 *
 * Mirrors `TermBadges::$defaults`:
 *   - taxonomy    : taxonomy slug to read terms from
 *   - link_terms  : whether to wrap each term in its archive link
 *   - limit       : max term count (0 = unlimited)
 *   - separator   : string used in inline mode (e.g. ', ')
 *   - render_mode : `chip` (badges) | `inline` (joined string)
 *                   — renamed from `style` so the new typography blob
 *                   under `settings.style` doesn't clash with it.
 *   - class       : extra CSS class
 */

import { useMemo } from 'react';
import { Input, Select, Toggle, type SelectOption } from '../../ui';
import { InspectorRow } from '../shared';
import { useTaxonomies } from '../../../hooks/useTaxonomies';
import type { ListingComponentNode } from '../../../services/api';

const STYLE_OPTIONS: SelectOption[] = [
  { value: 'chip', label: 'Chips / Badges' },
  { value: 'inline', label: 'Inline (joined)' },
];

const CORE_TAXONOMIES: SelectOption[] = [
  { value: 'category', label: 'Categories (category)' },
  { value: 'post_tag', label: 'Tags (post_tag)' },
];

interface Props {
  component: ListingComponentNode;
  onChange: (patch: Record<string, unknown>) => void;
}

export function TermBadgesSettings({ component, onChange }: Props) {
  const settings = component.settings as Record<string, string | number | boolean>;
  // Legacy compat — older saved configs stored the chip/inline
  // toggle under `style`. The PHP renderer migrates the same way.
  const renderMode =
    (settings.render_mode as string) ??
    (typeof settings.style === 'string' ? settings.style : 'chip');
  const { data: rdcfeTaxes } = useTaxonomies();

  // Merge core WP taxonomies with RDCFE-managed ones, deduped on slug.
  const taxonomyOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set(CORE_TAXONOMIES.map((opt) => opt.value));
    const merged: SelectOption[] = [...CORE_TAXONOMIES];
    (rdcfeTaxes ?? []).forEach((tax) => {
      const slug = (tax.data?.slug as string | undefined) || tax.slug;
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        merged.push({ value: slug, label: `${tax.title} (${slug})` });
      }
    });
    return merged;
  }, [rdcfeTaxes]);

  return (
    <div>
      <InspectorRow label="Taxonomy" required>
        <Select
          value={(settings.taxonomy as string) ?? 'category'}
          onChange={(e) => onChange({ taxonomy: e.target.value })}
          options={taxonomyOptions}
        />
      </InspectorRow>

      <InspectorRow label="Render As">
        <Select
          value={renderMode}
          onChange={(e) => onChange({ render_mode: e.target.value })}
          options={STYLE_OPTIONS}
        />
      </InspectorRow>

      <InspectorRow label="Link Terms" hint="Wrap each term in its taxonomy archive link.">
        <Toggle
          checked={(settings.link_terms as boolean) ?? true}
          onChange={(checked) => onChange({ link_terms: checked })}
          label={settings.link_terms === false ? 'Disabled' : 'Enabled'}
        />
      </InspectorRow>

      <InspectorRow label="Limit" hint="Maximum terms shown. 0 = unlimited.">
        <Input
          type="number"
          min={0}
          value={String(settings.limit ?? 0)}
          onChange={(e) => onChange({ limit: Math.max(0, Number(e.target.value) || 0) })}
        />
      </InspectorRow>

      {renderMode === 'inline' && (
        <InspectorRow label="Separator" hint="Joiner used between terms.">
          <Input
            value={(settings.separator as string) ?? ', '}
            onChange={(e) => onChange({ separator: e.target.value })}
            placeholder=", "
          />
        </InspectorRow>
      )}

      <InspectorRow label="CSS Class">
        <Input
          value={(settings.class as string) ?? ''}
          onChange={(e) => onChange({ class: e.target.value })}
          placeholder="rdcfe-listing__terms"
        />
      </InspectorRow>
    </div>
  );
}
