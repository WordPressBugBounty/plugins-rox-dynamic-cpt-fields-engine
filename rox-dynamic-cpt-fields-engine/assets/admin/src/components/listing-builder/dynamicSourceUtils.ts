/**
 * Client-side mirror of `DynamicSourceCatalog` token grammar.
 *
 * Keeps the listing builder's hierarchical Source picker in sync with
 * Gutenberg / Elementor dynamic field blocks without storing separate
 * `source_type` + `object_field` keys on each component — the composed
 * token is written straight into `settings.source`.
 */

export type DynamicSourceType = 'object' | 'meta' | 'query_var' | 'options' | 'relations';

export interface DynamicSourceFieldKey {
  value: string;
  label: string;
}

export interface DynamicSourceFieldGroup {
  group: string;
  scope?: string;
  keys: DynamicSourceFieldKey[];
}

export interface DynamicSourceCatalogEntry {
  value: DynamicSourceType;
  label: string;
  groups: DynamicSourceFieldGroup[];
}

export const FIELD_LABELS: Record<DynamicSourceType, string> = {
  object: 'Object Field',
  meta: 'Meta Field',
  query_var: 'Query Variable',
  options: 'Options Field',
  relations: 'Relation Field',
};

const OBJECT_SCOPE_BY_DATA_SOURCE: Record<
  'posts' | 'terms' | 'users' | 'relation_children',
  string
> = {
  posts: 'post',
  terms: 'term',
  users: 'user',
  relation_children: 'post',
};

/** Infer source family from a stored binding token. */
export function inferSourceType(token: string): DynamicSourceType {
  const trimmed = token.trim();
  if (!trimmed) return 'object';
  if (trimmed.startsWith('field:')) return 'meta';
  if (trimmed.startsWith('query_var:')) return 'query_var';
  if (trimmed.startsWith('option:')) return 'options';
  if (trimmed.startsWith('related_posts:') || trimmed.startsWith('pair_meta:')) {
    return 'relations';
  }
  return 'object';
}

/** Strip type prefix so the field `<select>` can pre-select. */
export function fieldFromToken(sourceType: DynamicSourceType, token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';

  switch (sourceType) {
    case 'meta':
      return trimmed.startsWith('field:') ? trimmed.slice('field:'.length) : trimmed;
    case 'query_var':
      return trimmed.startsWith('query_var:') ? trimmed.slice('query_var:'.length) : trimmed;
    default:
      return trimmed;
  }
}

/** Compose the resolver token written into component settings. */
export function composeSourceToken(
  sourceType: DynamicSourceType,
  field: string,
  customSource = ''
): string {
  const custom = customSource.trim();
  if (custom) return custom;

  const trimmedField = field.trim();
  if (!trimmedField) return '';

  switch (sourceType) {
    case 'meta':
      return trimmedField.startsWith('field:') ? trimmedField : `field:${trimmedField}`;
    case 'query_var':
      return trimmedField.startsWith('query_var:')
        ? trimmedField
        : `query_var:${trimmedField}`;
    default:
      return trimmedField;
  }
}

/** Filter object-field groups to the listing's data source. */
export function filterGroupsForDataSource(
  sourceType: DynamicSourceType,
  groups: DynamicSourceFieldGroup[],
  dataSource: 'posts' | 'terms' | 'users' | 'relation_children'
): DynamicSourceFieldGroup[] {
  if (sourceType !== 'object') {
    return groups;
  }

  const scope = OBJECT_SCOPE_BY_DATA_SOURCE[dataSource];
  const scoped = groups.filter((group) => !group.scope || group.scope === scope);
  return scoped.length > 0 ? scoped : groups;
}

/** Flatten grouped keys into `<select>` options (disabled rows = headers). */
export function buildFieldSelectOptions(
  groups: DynamicSourceFieldGroup[]
): Array<{ value: string; label: string; disabled?: boolean }> {
  const options: Array<{ value: string; label: string; disabled?: boolean }> = [
    { value: '', label: '— Select field —' },
  ];

  groups.forEach((group, groupIndex) => {
    const keys = group.keys ?? [];
    if (!keys.length) return;

    const headerLabel = group.group || '';
    if (headerLabel) {
      options.push({
        value: `__rdcfe_hdr_${groupIndex}__`,
        label: headerLabel,
        disabled: true,
      });
    }

    keys.forEach((key) => {
      if (!key.value) return;
      options.push({
        value: key.value,
        label: key.label || key.value,
      });
    });
  });

  return options;
}

/** Resolve the `<select>` value for a stored token against the catalog. */
export function resolveFieldSelectValue(
  sourceType: DynamicSourceType,
  token: string,
  groups: DynamicSourceFieldGroup[]
): string {
  const rawField = fieldFromToken(sourceType, token);
  if (!rawField) return '';

  for (const group of groups) {
    for (const key of group.keys ?? []) {
      if (key.value === token) return key.value;
      if (sourceType === 'meta' && key.value === `field:${rawField}`) return key.value;
      if (sourceType === 'query_var' && key.value === `query_var:${rawField}`) {
        return key.value;
      }
      if (key.value === rawField) return key.value;
    }
  }

  return rawField;
}

/** True when the token is not represented in the current catalog. */
export function isCustomToken(
  token: string,
  sourceType: DynamicSourceType,
  groups: DynamicSourceFieldGroup[]
): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;

  const allValues = groups.flatMap((group) => (group.keys ?? []).map((key) => key.value));
  if (allValues.includes(trimmed)) return false;

  const resolved = resolveFieldSelectValue(sourceType, trimmed, groups);
  return resolved === trimmed && !allValues.includes(trimmed);
}
