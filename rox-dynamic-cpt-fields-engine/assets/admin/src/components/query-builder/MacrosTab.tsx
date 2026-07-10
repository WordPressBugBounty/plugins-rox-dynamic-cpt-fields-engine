import { useMemo, useState } from 'react';
import { Zap, Copy, Check, Link2 } from 'lucide-react';
import { Input, Select } from '../ui';
import { CollapsibleSection } from './shared';
import { useRelations } from '../../hooks/useRelations';

interface MacroDef {
  token: string;
  label: string;
  description: string;
  example: string;
  group?: 'context' | 'relations';
}

const MACROS: MacroDef[] = [
  {
    token: '{{current_post_id}}',
    label: 'Current Post ID',
    description:
      'Resolves to the post being viewed (front-end singular, in-loop archives, admin post-edit screens).',
    example: 'Use as filters.author or in meta_query.value to build "related posts" listings.',
    group: 'context',
  },
  {
    token: '{{current_term_id}}',
    label: 'Current Term ID',
    description:
      'Resolves on taxonomy archives (category/tag/custom). Useful for "more from this category" lists.',
    example: 'Pair with a tax_query rule like field=term_id, terms={{current_term_id}}.',
    group: 'context',
  },
  {
    token: '{{current_user_id}}',
    label: 'Current User ID',
    description: 'Logged-in user ID (0 for anonymous visitors).',
    example: 'Build "my posts" or "my favourites" listings — set filters.author to this macro.',
    group: 'context',
  },
  {
    token: '{{related:<slug>}}',
    label: 'Related Permalink',
    description:
      'First related item\'s permalink for the named relation. Anchor defaults to the current post; use inside Listing Grid components or DynamicText `before` / `after` decorators.',
    example:
      'Drop {{related:property_to_agent}} into a DynamicText before/after to link straight to the primary agent.',
    group: 'relations',
  },
  {
    token: '{{related:<slug>:title}}',
    label: 'Related Title',
    description:
      'Display title (or term name / user display name) of the first related item. Pair with `:id`, `:permalink`, or `:field:<meta_key>` for other facets.',
    example:
      '{{related:property_to_agent:title}} renders as the lead agent\'s name without iterating the pair list.',
    group: 'relations',
  },
  {
    token: '{{related:<slug>.<index>}}',
    label: 'Related by Index',
    description:
      'Zero-based index variant. `.0` is the first pair (same as omitting the suffix), `.1` is the second, and so on.',
    example: '{{related:property_to_agent.1:title}} → the second agent\'s name.',
    group: 'relations',
  },
  {
    token: '{{related:<slug>:field:<meta_key>}}',
    label: 'Related Meta Field',
    description:
      'Fetch a meta value from the first related item (or the indexed one when combined with `.N`). Routes through `get_*_meta()` per object kind.',
    example: '{{related:property_to_agent:field:phone}} → the lead agent\'s phone meta.',
    group: 'relations',
  },
  {
    token: '{{related_count:<slug>}}',
    label: 'Related Count',
    description:
      'Number of pairs the current anchor has under the relation. Default direction is `from` (children); pass `:to` to count parent pairs.',
    example:
      'Place "View all {{related_count:property_to_agent}} agents" on a single property template.',
    group: 'relations',
  },
];

const SAFE_KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const SAFE_SLUG = /^[a-z][a-z0-9_]*$/;

export function MacrosTab() {
  const [copied, setCopied] = useState<string | null>(null);
  const [paramKey, setParamKey] = useState('');

  // Relation builder state — gives authors a typed slug + facet
  // helper instead of forcing them to remember the macro grammar.
  const { data: relations, isLoading: relationsLoading } = useRelations('publish');
  const [relSlug, setRelSlug] = useState('');
  const [relFacet, setRelFacet] = useState<'permalink' | 'title' | 'id' | 'field' | 'count' | 'count_to'>('permalink');
  const [relIndex, setRelIndex] = useState('0');
  const [relMetaKey, setRelMetaKey] = useState('');

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(token);
      window.setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
    } catch {
      // Clipboard blocked (HTTP staging? sandbox?) — silently swallow.
    }
  };

  const urlMacro = paramKey && SAFE_KEY.test(paramKey) ? `{{url_param:${paramKey}}}` : '';

  const relationOptions = useMemo(() => {
    const base = [{ value: '', label: relationsLoading ? 'Loading relations...' : 'Select a relation...' }];
    const list = (relations ?? [])
      .map((rel) => {
        const cfg = (rel.data ?? {}) as { slug?: string; name?: string };
        const slug = cfg.slug || rel.slug || '';
        if (!slug) return null;
        const niceName = cfg.name || rel.title || slug;
        return { value: slug, label: `${niceName} (${slug})` };
      })
      .filter((opt): opt is { value: string; label: string } => opt !== null);
    return [...base, ...list];
  }, [relations, relationsLoading]);

  const relMacro = useMemo(() => {
    if (!relSlug || !SAFE_SLUG.test(relSlug)) return '';
    const idx = Math.max(0, parseInt(relIndex || '0', 10) || 0);
    const indexSuffix = idx > 0 ? `.${idx}` : '';
    switch (relFacet) {
      case 'count':
        return `{{related_count:${relSlug}}}`;
      case 'count_to':
        return `{{related_count:${relSlug}:to}}`;
      case 'field':
        if (!relMetaKey || !SAFE_KEY.test(relMetaKey)) return '';
        return `{{related:${relSlug}${indexSuffix}:field:${relMetaKey}}}`;
      case 'permalink':
        return idx > 0 ? `{{related:${relSlug}${indexSuffix}}}` : `{{related:${relSlug}}}`;
      case 'title':
      case 'id':
        return `{{related:${relSlug}${indexSuffix}:${relFacet}}}`;
    }
  }, [relSlug, relFacet, relIndex, relMetaKey]);

  const contextMacros = MACROS.filter((m) => m.group !== 'relations');
  const relationMacros = MACROS.filter((m) => m.group === 'relations');

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="Macros"
        icon={<Zap className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
      >
        <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-5 rdcfe-leading-relaxed">
          Macros are placeholder tokens that the executor resolves at runtime. Drop them into any
          value field across the editor — author IDs, meta values, tax_query terms — and they&apos;ll be
          replaced with real values just before the query runs.
        </p>

        <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-3">
          {contextMacros.map((macro) => (
            <div
              key={macro.token}
              className="rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-p-4"
            >
              <div className="rdcfe-flex rdcfe-items-start rdcfe-justify-between rdcfe-gap-2 rdcfe-mb-2">
                <div>
                  <div className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    {macro.label}
                  </div>
                  <code className="rdcfe-text-[12px] rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.08)] rdcfe-px-2 rdcfe-py-0.5 rdcfe-rounded rdcfe-mt-1 rdcfe-inline-block">
                    {macro.token}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copy(macro.token)}
                  className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                  title="Copy to clipboard"
                >
                  {copied === macro.token ? (
                    <Check className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-success))]" />
                  ) : (
                    <Copy className="rdcfe-h-4 rdcfe-w-4" />
                  )}
                </button>
              </div>
              <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed rdcfe-mb-2">
                {macro.description}
              </p>
              <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-italic">
                {macro.example}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="URL Parameter Builder"
        icon={<Zap className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
      >
        <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4 rdcfe-leading-relaxed">
          Build a <code className="rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-primary))]">{`{{url_param:key}}`}</code>{' '}
          token for a specific query-string key — handy for filter pages like{' '}
          <code className="rdcfe-font-mono">?city=dhaka</code> driving a tax_query.
        </p>

        <div className="rdcfe-flex rdcfe-flex-col sm:rdcfe-flex-row rdcfe-items-stretch sm:rdcfe-items-center rdcfe-gap-3">
          <div className="rdcfe-flex-1">
            <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
              URL Parameter Key
            </label>
            <Input
              value={paramKey}
              onChange={(e) => setParamKey(e.target.value)}
              placeholder="e.g. city, min_price, tag"
            />
          </div>
          <div className="rdcfe-flex-1">
            <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
              Generated Macro
            </label>
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
              <Input
                value={urlMacro}
                placeholder="{{url_param:...}}"
                readOnly
                className="rdcfe-font-mono"
              />
              <button
                type="button"
                onClick={() => urlMacro && copy(urlMacro)}
                disabled={!urlMacro}
                className="rdcfe-btn rdcfe-btn-secondary rdcfe-btn-icon"
                title={urlMacro ? 'Copy macro' : 'Enter a key first'}
              >
                {copied === urlMacro && urlMacro ? (
                  <Check className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-success))]" />
                ) : (
                  <Copy className="rdcfe-h-4 rdcfe-w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        {paramKey && !SAFE_KEY.test(paramKey) && (
          <p className="rdcfe-mt-2 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
            Use letters, numbers, and underscores only (e.g. <code>my_filter</code>).
          </p>
        )}
      </CollapsibleSection>

      {/* Relation macros — surfaced after the basic macros so authors
          working on a single template see the simple ones first. The
          builder beneath provides a typed slug + facet picker so
          authors don't need to remember the grammar. */}
      <CollapsibleSection
        title="Relation Macros"
        icon={<Link2 className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
      >
        <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-5 rdcfe-leading-relaxed">
          Pull data from a relation pair without setting up a Listing
          Grid. The anchor defaults to the current post; drop these
          into Dynamic Text components or any value field where you
          want a single related fact (price, agent name, count) to
          appear inline.
        </p>

        <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-3">
          {relationMacros.map((macro) => (
            <div
              key={macro.token}
              className="rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-p-4"
            >
              <div className="rdcfe-flex rdcfe-items-start rdcfe-justify-between rdcfe-gap-2 rdcfe-mb-2">
                <div>
                  <div className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    {macro.label}
                  </div>
                  <code className="rdcfe-text-[12px] rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.08)] rdcfe-px-2 rdcfe-py-0.5 rdcfe-rounded rdcfe-mt-1 rdcfe-inline-block">
                    {macro.token}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copy(macro.token)}
                  className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                  title="Copy to clipboard"
                >
                  {copied === macro.token ? (
                    <Check className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-success))]" />
                  ) : (
                    <Copy className="rdcfe-h-4 rdcfe-w-4" />
                  )}
                </button>
              </div>
              <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed rdcfe-mb-2">
                {macro.description}
              </p>
              <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-italic">
                {macro.example}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Relation Macro Builder"
        icon={<Link2 className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
      >
        <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4 rdcfe-leading-relaxed">
          Pick a relation, choose what you want pulled, and copy the
          generated macro. Perfect for the bits of the editor where
          autocomplete is missing — Dynamic Text decorators, custom
          link URLs, REST preview values.
        </p>

        <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-12 rdcfe-gap-3">
          <div className="md:rdcfe-col-span-5">
            <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
              Relation
            </label>
            <Select
              options={relationOptions}
              value={relSlug}
              onChange={(e) => setRelSlug(e.target.value)}
            />
          </div>
          <div className="md:rdcfe-col-span-4">
            <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
              What to fetch
            </label>
            <Select
              options={[
                { value: 'permalink', label: 'Permalink (default)' },
                { value: 'title', label: 'Title' },
                { value: 'id', label: 'ID' },
                { value: 'field', label: 'Meta field…' },
                { value: 'count', label: 'Pair count (children)' },
                { value: 'count_to', label: 'Pair count (parents)' },
              ]}
              value={relFacet}
              onChange={(e) => setRelFacet(e.target.value as typeof relFacet)}
            />
          </div>
          <div className="md:rdcfe-col-span-3">
            <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
              Index
            </label>
            <Input
              type="number"
              min={0}
              step={1}
              value={relIndex}
              onChange={(e) => setRelIndex(e.target.value)}
              disabled={relFacet === 'count' || relFacet === 'count_to'}
            />
          </div>

          {relFacet === 'field' && (
            <div className="md:rdcfe-col-span-12">
              <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                Meta key
              </label>
              <Input
                value={relMetaKey}
                onChange={(e) => setRelMetaKey(e.target.value)}
                placeholder="e.g. phone, listing_price"
              />
              {relMetaKey && !SAFE_KEY.test(relMetaKey) && (
                <p className="rdcfe-mt-1 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                  Use letters, numbers, and underscores only.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rdcfe-mt-4">
          <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
            Generated Macro
          </label>
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
            <Input
              value={relMacro}
              placeholder="{{related:...}}"
              readOnly
              className="rdcfe-font-mono"
            />
            <button
              type="button"
              onClick={() => relMacro && copy(relMacro)}
              disabled={!relMacro}
              className="rdcfe-btn rdcfe-btn-secondary rdcfe-btn-icon"
              title={relMacro ? 'Copy macro' : 'Pick a relation first'}
            >
              {copied === relMacro && relMacro ? (
                <Check className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-success))]" />
              ) : (
                <Copy className="rdcfe-h-4 rdcfe-w-4" />
              )}
            </button>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
