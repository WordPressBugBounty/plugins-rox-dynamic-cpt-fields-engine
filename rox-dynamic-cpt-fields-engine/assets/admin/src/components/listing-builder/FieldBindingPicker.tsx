/**
 * Field Binding Picker.
 *
 * Plugin's USP — every "Source" inspector control routes through this
 * picker so authors get one consistent dropdown that knows about both
 * Core WordPress fields *and* every meta key harvested from their Field
 * Groups + saved metabox CPT meta.
 *
 * The token grammar is shared with the PHP `AbstractComponent` resolver
 *   - `title`, `excerpt`, `content`, `permalink`, `featured_image`,
 *     `author`, `date`, `modified`, `comment_count` → core WP fields.
 *   - `field:<meta_key>` → custom field bound by meta key.
 *
 * The Picker also accepts an arbitrary string via the "Custom token"
 * tab at the bottom for power-users who want to reach a meta key the
 * harvester missed (e.g. a key written by a third-party plugin).
 */

import { useMemo, useState } from 'react';
import { ChevronDown, Search, Check, Tag, Plus } from 'lucide-react';
import { useQueryMetaKeys } from '../../hooks/useQueries';

export interface FieldBindingOption {
  /** The token written into component settings (e.g. `title`, `field:price`). */
  value: string;
  /** Human-readable label used in the dropdown + selected chip. */
  label: string;
  /** Optional description rendered under the label. */
  description?: string;
}

interface FieldBindingPickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Picker-style hint shown when nothing is selected. */
  placeholder?: string;
  /**
   * Restrict which token families show up. Defaults to all groups —
   * the Image inspector for example should narrow this to
   * `['featured_image', 'meta']` to keep irrelevant tokens out of the
   * dropdown.
   */
  groups?: Array<'core' | 'media' | 'meta'>;
  /**
   * For data sources other than `posts` we hide the Core WP tokens
   * that don't apply (terms have no excerpt; users have no permalink
   * the way posts do). Defaults to `posts`.
   *
   * `relation_children` shows the Posts token list by default (most
   * relations are post↔post) and also surfaces the `pair_meta:<key>`
   * custom-token hint so authors can wire per-pair fields without
   * hunting through documentation.
   */
  dataSource?: 'posts' | 'terms' | 'users' | 'relation_children';
}

/** Core WP token catalogue — keyed by the data source it applies to. */
const CORE_TOKENS_BY_SOURCE: Record<
  NonNullable<FieldBindingPickerProps['dataSource']>,
  FieldBindingOption[]
> = {
  posts: [
    { value: 'title', label: 'Post Title', description: 'The post.title column' },
    { value: 'excerpt', label: 'Post Excerpt', description: 'Hand-written or auto-generated' },
    { value: 'content', label: 'Post Content', description: 'Full post content (HTML)' },
    { value: 'permalink', label: 'Post Permalink', description: 'Single post URL' },
    { value: 'date', label: 'Publish Date', description: 'post_date column' },
    { value: 'modified', label: 'Modified Date', description: 'post_modified column' },
    { value: 'author', label: 'Author Name', description: 'display_name of post_author' },
    { value: 'comment_count', label: 'Comment Count', description: 'Approved comments' },
  ],
  terms: [
    { value: 'title', label: 'Term Name', description: 'term.name column' },
    { value: 'description', label: 'Term Description' },
    { value: 'permalink', label: 'Term Archive URL' },
    { value: 'count', label: 'Post Count' },
  ],
  users: [
    { value: 'title', label: 'Display Name' },
    { value: 'description', label: 'Bio / description' },
    { value: 'permalink', label: 'Author Archive URL' },
    { value: 'date', label: 'Registered Date' },
  ],
  // Same token list as `posts` — most relations are post↔post and
  // the custom-token escape hatch handles `pair_meta:<key>` (and
  // `field:<key>`) on every other shape.
  relation_children: [
    { value: 'title', label: 'Pair Title', description: 'Title of the related object' },
    { value: 'excerpt', label: 'Pair Excerpt', description: 'Excerpt / description' },
    { value: 'content', label: 'Pair Content', description: 'Full content (HTML)' },
    { value: 'permalink', label: 'Pair Permalink', description: 'Single URL' },
    { value: 'date', label: 'Publish Date' },
    { value: 'modified', label: 'Modified Date' },
    { value: 'author', label: 'Author Name' },
    { value: 'comment_count', label: 'Comment Count' },
  ],
};

/** Featured-image token shown in the Media group. */
const MEDIA_TOKENS: FieldBindingOption[] = [
  {
    value: 'featured_image',
    label: 'Featured Image',
    description: 'WP post thumbnail attachment',
  },
];

export function FieldBindingPicker({
  value,
  onChange,
  placeholder = 'Pick a field…',
  groups,
  dataSource = 'posts',
}: FieldBindingPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const { data: metaKeysPayload, isLoading } = useQueryMetaKeys();

  const enabledGroups = new Set<'core' | 'media' | 'meta'>(groups ?? ['core', 'media', 'meta']);

  const metaKeys = metaKeysPayload?.meta_keys ?? [];
  const metaKeyGroups = metaKeysPayload?.meta_key_groups ?? [];

  // Resolve the selected token back into a label so the trigger button
  // shows something readable when collapsed.
  const selectedLabel = useMemo(() => {
    if (!value) return '';
    if (value === 'featured_image') return 'Featured Image';
    if (value.startsWith('field:')) {
      const key = value.slice('field:'.length);
      return key ? `Field: ${key}` : 'Field';
    }
    const match = CORE_TOKENS_BY_SOURCE[dataSource].find((opt) => opt.value === value);
    return match?.label ?? value;
  }, [value, dataSource]);

  // Filter helpers — keyed off the current search input.
  const matches = (option: FieldBindingOption) => {
    if (!search.trim()) return true;
    const haystack = `${option.label} ${option.value} ${option.description ?? ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  };

  const coreOptions = enabledGroups.has('core')
    ? CORE_TOKENS_BY_SOURCE[dataSource].filter(matches)
    : [];
  const mediaOptions =
    enabledGroups.has('media') && (dataSource === 'posts' || dataSource === 'relation_children')
      ? MEDIA_TOKENS.filter(matches)
      : [];

  const metaSections = useMemo(() => {
    if (!enabledGroups.has('meta')) {
      return [] as Array<{ key: string; label: string; options: FieldBindingOption[] }>;
    }

    const hasServerGroups = metaKeyGroups.some((g) => Array.isArray(g.keys) && g.keys.length > 0);
    if (hasServerGroups) {
      return metaKeyGroups
        .filter((g) => g.keys?.length)
        .map((g) => {
          const options = g.keys
            .map((key) => ({
              value: `field:${key}`,
              label: key,
              description: 'Custom field meta key',
            }))
            .filter(matches);
          return {
            key: `${g.source}-${g.id}`,
            label: g.label,
            options,
          };
        })
        .filter((s) => s.options.length > 0);
    }

    const flat = metaKeys
      .map((key) => ({
        value: `field:${key}`,
        label: key,
        description: 'Custom field meta key',
      }))
      .filter(matches);
    if (flat.length === 0) return [];
    return [{ key: 'meta-flat', label: 'Custom fields', options: flat }];
  }, [enabledGroups, metaKeyGroups, metaKeys, search]);

  const totalMetaPickerOptions = useMemo(
    () => metaSections.reduce((n, s) => n + s.options.length, 0),
    [metaSections]
  );

  const handleSelect = (next: string) => {
    onChange(next);
    setIsOpen(false);
    setSearch('');
    setCustomMode(false);
  };

  const handleCustomSubmit = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    handleSelect(trimmed);
    setCustomValue('');
  };

  return (
    <div className="rdcfe-relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-gap-2 rdcfe-px-3 rdcfe-py-2 rdcfe-text-[13px] rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors"
      >
        <span
          className={`rdcfe-truncate ${
            selectedLabel
              ? 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'
              : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
          }`}
        >
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className={`rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform ${
            isOpen ? 'rdcfe-rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="rdcfe-absolute rdcfe-z-50 rdcfe-top-full rdcfe-left-0 rdcfe-right-0 rdcfe-mt-1 rdcfe-bg-white rdcfe-rounded-xl rdcfe-shadow-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-overflow-hidden rdcfe-animate-fade-in">
          {/* Search input */}
          <div className="rdcfe-px-3 rdcfe-py-2 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-flex rdcfe-items-center rdcfe-gap-2">
            <Search className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fields…"
              autoFocus
              className="rdcfe-flex-1 rdcfe-bg-transparent rdcfe-text-[13px] rdcfe-outline-none"
            />
          </div>

          <div className="rdcfe-max-h-[280px] rdcfe-overflow-y-auto rdcfe-py-1">
            {coreOptions.length > 0 && (
              <PickerGroup label="Core WordPress">
                {coreOptions.map((option) => (
                  <PickerItem
                    key={option.value}
                    option={option}
                    selected={option.value === value}
                    onSelect={() => handleSelect(option.value)}
                  />
                ))}
              </PickerGroup>
            )}

            {mediaOptions.length > 0 && (
              <PickerGroup label="Media" separatorBefore={coreOptions.length > 0}>
                {mediaOptions.map((option) => (
                  <PickerItem
                    key={option.value}
                    option={option}
                    selected={option.value === value}
                    onSelect={() => handleSelect(option.value)}
                  />
                ))}
              </PickerGroup>
            )}

            {enabledGroups.has('meta') && (
              <>
                {isLoading && (
                  <div className="rdcfe-px-4 rdcfe-py-3 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    Loading meta keys…
                  </div>
                )}
                {!isLoading && totalMetaPickerOptions === 0 && !search.trim() && (
                  <div className="rdcfe-px-4 rdcfe-py-3 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    No meta keys harvested yet — add meta fields to a post type or metabox, or use the custom token below.
                  </div>
                )}
                {!isLoading && totalMetaPickerOptions === 0 && !!search.trim() && (
                  <div className="rdcfe-px-4 rdcfe-py-3 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    No fields match "{search}".
                  </div>
                )}
                {!isLoading &&
                  metaSections.map((section, sIdx) => (
                    <PickerGroup
                      key={section.key}
                      label={section.label}
                      separatorBefore={
                        sIdx > 0 ||
                        (sIdx === 0 &&
                          (coreOptions.length > 0 || mediaOptions.length > 0))
                      }
                    >
                      {section.options.map((option) => (
                        <PickerItem
                          key={option.value}
                          option={option}
                          selected={option.value === value}
                          onSelect={() => handleSelect(option.value)}
                          icon={<Tag className="rdcfe-w-3 rdcfe-h-3" />}
                        />
                      ))}
                    </PickerGroup>
                  ))}
              </>
            )}

            {/* Custom token escape hatch */}
            <div className="rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-mt-1 rdcfe-pt-1">
              {!customMode ? (
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-transition-colors"
                >
                  <Plus className="rdcfe-w-3.5 rdcfe-h-3.5" />
                  Custom token (advanced)
                </button>
              ) : (
                <div className="rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomSubmit();
                      }
                    }}
                    placeholder={
                      dataSource === 'relation_children'
                        ? 'e.g. pair_meta:status or field:price'
                        : 'e.g. field:my_meta_key'
                    }
                    autoFocus
                    className="rdcfe-flex-1 rdcfe-px-2 rdcfe-py-1.5 rdcfe-text-[12px] rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-outline-none focus:rdcfe-border-[hsl(var(--rdcfe-primary))]"
                  />
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    className="rdcfe-px-2 rdcfe-py-1 rdcfe-text-[11px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-text-white hover:rdcfe-opacity-90 rdcfe-transition-opacity"
                  >
                    Use
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PickerGroup({
  label,
  children,
  separatorBefore = false,
}: {
  label: string;
  children: React.ReactNode;
  /** Divider above this block — next section starts cleanly after the previous one. */
  separatorBefore?: boolean;
}) {
  return (
    <div
      className={`rdcfe-mb-1 ${
        separatorBefore
          ? 'rdcfe-mt-2 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-pt-2'
          : ''
      }`}
    >
      <div className="rdcfe-px-4 rdcfe-pt-1 rdcfe-pb-1.5 rdcfe-text-[10px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border)/0.45)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function PickerItem({
  option,
  selected,
  onSelect,
  icon,
}: {
  option: FieldBindingOption;
  selected: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rdcfe-w-full rdcfe-flex rdcfe-items-start rdcfe-justify-between rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2 rdcfe-text-left rdcfe-transition-colors ${
        selected
          ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.08)]'
          : 'hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]'
      }`}
    >
      <div className="rdcfe-flex rdcfe-flex-col rdcfe-min-w-0">
        <span
          className={`rdcfe-text-[13px] rdcfe-font-medium rdcfe-truncate rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 ${
            selected
              ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
              : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'
          }`}
        >
          {icon}
          {option.label}
        </span>
        {option.description && (
          <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-truncate">
            {option.description}
          </span>
        )}
      </div>
      {selected && (
        <Check className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
      )}
    </button>
  );
}
