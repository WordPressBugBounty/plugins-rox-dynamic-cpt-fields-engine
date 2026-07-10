import { useEffect, useMemo } from 'react';
import { Database, FileText, Tag as TagIcon, Users } from 'lucide-react';
import { type SelectOption, MultiSelect, Checkbox } from '../ui';
import { CollapsibleSection, FieldRow, type TabContentProps } from './shared';
import { usePostTypes } from '../../hooks/usePostTypes';
import { useTaxonomies } from '../../hooks/useTaxonomies';

const QUERY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'posts', label: 'Posts (WP_Query)' },
  { value: 'terms', label: 'Terms (WP_Term_Query)' },
  { value: 'users', label: 'Users (WP_User_Query)' },
];

const STATUS_OPTIONS = [
  { value: 'publish', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'private', label: 'Private' },
  { value: 'future', label: 'Scheduled' },
  { value: 'trash', label: 'Trash' },
];

const CORE_POST_TYPES: SelectOption[] = [
  { value: 'post', label: 'Posts (post)' },
  { value: 'page', label: 'Pages (page)' },
  { value: 'attachment', label: 'Media (attachment)' },
];

const CORE_TAXONOMIES: SelectOption[] = [
  { value: 'category', label: 'Categories (category)' },
  { value: 'post_tag', label: 'Tags (post_tag)' },
];

// Default WP roles — populated dynamically when window.rdcfeSettings.userRoles
// is set, falls back to the core list otherwise.
//
// Important: the localised `userRoles` payload is shared with the Location
// Rules "User Role" param, which prepends a synthetic `{ value: 'all' }`
// entry meaning "any logged-in user". That option is meaningless for the
// Query Builder — `WP_User_Query` with `role__in: ['all']` returns zero
// users because no role literally exists with the slug "all". An empty
// roles selection already maps to "all roles" here (and the helper text
// says exactly that), so we strip the synthetic entry to avoid the
// silent-zero-results trap.
function getDefaultRoles(): SelectOption[] {
  type SettingsWithRoles = { userRoles?: Array<{ value: string; label: string }> };
  const settings = (window as { rdcfeSettings?: SettingsWithRoles }).rdcfeSettings;
  if (settings?.userRoles && Array.isArray(settings.userRoles)) {
    return settings.userRoles.filter((role) => role.value !== 'all' && role.value !== '');
  }
  return [
    { value: 'administrator', label: 'Administrator' },
    { value: 'editor', label: 'Editor' },
    { value: 'author', label: 'Author' },
    { value: 'contributor', label: 'Contributor' },
    { value: 'subscriber', label: 'Subscriber' },
  ];
}

export function SourceTab({ data, setData }: TabContentProps) {
  const { data: rdcfeCpts } = usePostTypes();
  const { data: rdcfeTaxes } = useTaxonomies();

  // Merge core WP types with RDCFE-managed CPTs, deduped on slug.
  const postTypeOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set(CORE_POST_TYPES.map((opt) => opt.value));
    const merged: SelectOption[] = [...CORE_POST_TYPES];
    (rdcfeCpts ?? []).forEach((cpt) => {
      const slug = (cpt.data?.slug as string | undefined) || cpt.slug;
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        merged.push({ value: slug, label: `${cpt.title} (${slug})` });
      }
    });
    return merged;
  }, [rdcfeCpts]);

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

  const roleOptions = useMemo(() => getDefaultRoles(), []);
  const queryType = data.query_type;

  /**
   * When the user switches query_type we have to reset two slices the
   * backend validator is strict about:
   *
   *   1. `orderby` — the whitelist is per-type. `date` is valid for
   *      posts but invalid for terms/users (validator rejects with
   *      `invalid_value`), and similarly `name` is valid for terms but
   *      not the canonical default for posts. Without this reset, a
   *      user who creates a fresh query, switches to Terms, and hits
   *      Preview gets an opaque "Validation failed." toast.
   *
   *   2. `source.*` — slices belonging to the *previous* type
   *      (post_types/status when leaving posts, taxonomies/hide_empty
   *      when leaving terms, roles when leaving users) get cleared so
   *      they don't quietly survive in the saved JSON and confuse
   *      future readers / health-check warnings. We keep the relevant
   *      slices intact so a user toggling between types accidentally
   *      doesn't lose their current selection.
   */
  const TYPE_DEFAULTS: Record<
    'posts' | 'terms' | 'users',
    { orderby: string; order: 'ASC' | 'DESC' }
  > = {
    posts: { orderby: 'date', order: 'DESC' },
    terms: { orderby: 'name', order: 'ASC' },
    users: { orderby: 'registered', order: 'DESC' },
  };

  const setQueryType = (next: 'posts' | 'terms' | 'users') => {
    setData((prev) => {
      if (prev.query_type === next) return prev;
      const defaults = TYPE_DEFAULTS[next];
      const prevSource = prev.source ?? {};
      const nextSource: typeof prev.source = {};
      if (next === 'posts') {
        nextSource.post_types = prevSource.post_types ?? [];
        nextSource.status = prevSource.status ?? ['publish'];
      } else if (next === 'terms') {
        nextSource.taxonomies = prevSource.taxonomies ?? [];
        if (typeof prevSource.hide_empty === 'boolean') {
          nextSource.hide_empty = prevSource.hide_empty;
        }
      } else if (next === 'users') {
        nextSource.roles = prevSource.roles ?? [];
      }
      return {
        ...prev,
        query_type: next,
        source: nextSource,
        orderby: defaults.orderby,
        order: defaults.order,
        // Term and user queries have no concept of "tax_query" the way
        // posts do; clear the rows so the validator doesn't try to
        // walk an irrelevant block. Meta query is shared across all
        // three types so we leave it alone.
        tax_query: next === 'posts' ? prev.tax_query : { relation: 'AND', queries: [] },
      };
    });
  };

  const setSource = (patch: Partial<typeof data.source>) => {
    setData((prev) => ({ ...prev, source: { ...prev.source, ...patch } }));
  };

  /**
   * Defensive cleanup — if the form was hydrated with a stale `'all'`
   * roles entry (selected before this build shipped, or imported from
   * an older config), strip it. The localised role list shared with
   * Location Rules includes a synthetic "all" option that resolves to
   * zero users when `WP_User_Query` sees `role__in: ['all']`. Empty
   * selection already means "all roles" here, so dropping the token
   * gives the UX the user expected without any extra clicks.
   */
  useEffect(() => {
    if (queryType !== 'users') return;
    const roles = data.source.roles ?? [];
    if (!roles.includes('all') && !roles.includes('')) return;
    const cleaned = roles.filter((r) => r !== 'all' && r !== '');
    setSource({ roles: cleaned });
    // setSource is stable enough for this one-shot effect; we don't
    // want it in deps because that would re-fire on every render.
     
  }, [queryType, data.source.roles]);

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="Source"
        icon={<Database className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
      >
        <FieldRow
          label="Query Type"
          hint="What this query returns. Each type maps to a WordPress query primitive."
          required
        >
          <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-3 rdcfe-gap-2">
            {QUERY_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.value === 'posts' ? FileText : opt.value === 'terms' ? TagIcon : Users;
              const active = queryType === opt.value;
              return (
                <label key={opt.value} className="rdcfe-cursor-pointer">
                  <input
                    type="radio"
                    name="query_type"
                    value={opt.value}
                    checked={active}
                    onChange={() => setQueryType(opt.value as 'posts' | 'terms' | 'users')}
                    className="rdcfe-sr-only"
                  />
                  <div
                    className={`rdcfe-p-4 rdcfe-rounded-xl rdcfe-border-2 rdcfe-text-center rdcfe-transition-all rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-gap-2 ${
                      active
                        ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]'
                        : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                    }`}
                  >
                    <Icon
                      className={`rdcfe-w-5 rdcfe-h-5 ${
                        active
                          ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
                          : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
                      }`}
                    />
                    <span
                      className={`rdcfe-text-[13px] rdcfe-font-medium ${
                        active
                          ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
                          : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </FieldRow>

        {queryType === 'posts' && (
          <>
            <FieldRow
              label="Post Types"
              hint="Limit results to these post types. Empty = all WordPress defaults to 'post'."
              required
            >
              <MultiSelect
                options={postTypeOptions}
                value={data.source.post_types ?? []}
                onChange={(next) => setSource({ post_types: next })}
                placeholder="Select post types..."
              />
            </FieldRow>

            <FieldRow label="Status" hint="Post statuses to include in the query.">
              <div className="rdcfe-grid rdcfe-grid-cols-2 sm:rdcfe-grid-cols-3 rdcfe-gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const checked = (data.source.status ?? []).includes(opt.value);
                  return (
                    <Checkbox
                      key={opt.value}
                      label={opt.label}
                      checked={checked}
                      onChange={(next) => {
                        const current = data.source.status ?? [];
                        setSource({
                          status: next
                            ? [...current, opt.value]
                            : current.filter((s) => s !== opt.value),
                        });
                      }}
                    />
                  );
                })}
              </div>
            </FieldRow>

            <FieldRow
              label="Sticky posts"
              hint="WordPress “sticky” posts normally jump to the top of blog listings. Turn this on for strict date/order behavior (WP_Query ignore_sticky_posts)."
            >
              <Checkbox
                label="Ignore sticky posts (recommended for latest / archive-style lists)"
                checked={data.ignore_sticky_posts !== false}
                onChange={(next) => setData((prev) => ({ ...prev, ignore_sticky_posts: next }))}
              />
            </FieldRow>
          </>
        )}

        {queryType === 'terms' && (
          <>
            <FieldRow
              label="Taxonomies"
              hint="At least one taxonomy is required for term queries."
              required
            >
              <MultiSelect
                options={taxonomyOptions}
                value={data.source.taxonomies ?? []}
                onChange={(next) => setSource({ taxonomies: next })}
                placeholder="Select taxonomies..."
              />
            </FieldRow>

            <FieldRow
              label="Hide Empty Terms"
              hint="When on, only terms attached to at least one post are returned."
            >
              <Checkbox
                label="Skip terms with zero posts"
                checked={!!data.source.hide_empty}
                onChange={(next) => setSource({ hide_empty: next })}
              />
            </FieldRow>
          </>
        )}

        {queryType === 'users' && (
          <FieldRow
            label="Roles"
            hint="Limit results to users with at least one of these roles. Empty = all roles."
          >
            <MultiSelect
              options={roleOptions}
              value={data.source.roles ?? []}
              onChange={(next) => setSource({ roles: next })}
              placeholder="Select roles..."
            />
          </FieldRow>
        )}
      </CollapsibleSection>
    </div>
  );
}

