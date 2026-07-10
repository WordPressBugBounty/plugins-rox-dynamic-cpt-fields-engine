import { useMemo } from 'react';
import { Tag as TagIcon, Plus, Trash2 } from 'lucide-react';
import { Input, Select, type SelectOption } from '../ui';
import { CollapsibleSection, type TabContentProps } from './shared';
import { createEmptyTaxRow } from '../../hooks/useQueries';
import { useTaxonomies } from '../../hooks/useTaxonomies';
import type { QueryTaxQueryRow } from '../../services/api';

const OPERATORS: SelectOption[] = [
  { value: 'IN', label: 'IN (any of)' },
  { value: 'NOT IN', label: 'NOT IN (none of)' },
  { value: 'AND', label: 'AND (all of)' },
  { value: 'EXISTS', label: 'EXISTS (has any term)' },
  { value: 'NOT EXISTS', label: 'NOT EXISTS (no term)' },
];

const FIELDS: SelectOption[] = [
  { value: 'term_id', label: 'Term ID' },
  { value: 'slug', label: 'Slug' },
  { value: 'name', label: 'Name' },
  { value: 'term_taxonomy_id', label: 'Term Taxonomy ID' },
];

const RELATIONS: SelectOption[] = [
  { value: 'AND', label: 'AND (match all rows)' },
  { value: 'OR', label: 'OR (match any row)' },
];

const CORE_TAXONOMIES: SelectOption[] = [
  { value: 'category', label: 'Categories (category)' },
  { value: 'post_tag', label: 'Tags (post_tag)' },
];

function termsToString(terms: QueryTaxQueryRow['terms']): string {
  if (Array.isArray(terms)) return terms.join(', ');
  if (terms === null || terms === undefined) return '';
  return String(terms);
}

function stringToTerms(input: string): QueryTaxQueryRow['terms'] {
  const parts = input
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((p) => {
    const n = Number(p);
    return Number.isFinite(n) && /^\d+$/.test(p) ? n : p;
  });
}

export function TaxQueryTab({ data, setData }: TabContentProps) {
  const { data: rdcfeTaxes } = useTaxonomies();

  const taxonomyOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set(CORE_TAXONOMIES.map((opt) => opt.value));
    const merged = [...CORE_TAXONOMIES];
    (rdcfeTaxes ?? []).forEach((tax) => {
      const slug = (tax.data?.slug as string | undefined) || tax.slug;
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        merged.push({ value: slug, label: `${tax.title} (${slug})` });
      }
    });
    return merged;
  }, [rdcfeTaxes]);

  const queries = data.tax_query?.queries ?? [];
  const relation = data.tax_query?.relation ?? 'AND';

  const setTax = (patch: Partial<NonNullable<typeof data.tax_query>>) => {
    setData((prev) => ({
      ...prev,
      tax_query: { ...prev.tax_query, queries: prev.tax_query?.queries ?? [], ...patch },
    }));
  };

  const updateRow = (index: number, patch: Partial<QueryTaxQueryRow>) => {
    const next = queries.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setTax({ queries: next });
  };

  const addRow = () => setTax({ queries: [...queries, createEmptyTaxRow()] });

  const removeRow = (index: number) => {
    setTax({ queries: queries.filter((_, i) => i !== index) });
  };

  const isAvailable = data.query_type === 'posts' || data.query_type === 'terms';

  if (!isAvailable) {
    return (
      <div className="rdcfe-card rdcfe-p-6">
        <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
          Taxonomy queries are only meaningful for <strong>Posts</strong> queries (and term-meta
          relationships on <strong>Terms</strong>). Switch the query type on the Source tab.
        </p>
      </div>
    );
  }

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="Taxonomy Query"
        icon={<TagIcon className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
        badge={queries.length ? `${queries.length} row${queries.length === 1 ? '' : 's'}` : undefined}
      >
        {queries.length > 1 && (
          <div className="rdcfe-mb-4 rdcfe-flex rdcfe-items-center rdcfe-gap-3">
            <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide">
              Combine rows with
            </span>
            <Select
              options={RELATIONS}
              value={relation}
              onChange={(e) => setTax({ relation: e.target.value as 'AND' | 'OR' })}
              className="rdcfe-w-56"
            />
          </div>
        )}

        {queries.length === 0 && (
          <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-p-8 rdcfe-text-center rdcfe-mb-4">
            <TagIcon className="rdcfe-w-8 rdcfe-h-8 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mx-auto rdcfe-mb-3" />
            <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              No taxonomy filters yet. Add one to narrow results by terms.
            </p>
          </div>
        )}

        <div className="rdcfe-space-y-3">
          {queries.map((row, index) => {
            const operator = (row.operator ?? 'IN').toUpperCase();
            const skipsTerms = operator === 'EXISTS' || operator === 'NOT EXISTS';
            return (
              <div
                key={index}
                className="rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-p-4"
              >
                <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-3">
                  <span className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wide rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    Rule #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                    title="Remove rule"
                  >
                    <Trash2 className="rdcfe-h-4 rdcfe-w-4" />
                  </button>
                </div>

                <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-12 rdcfe-gap-3">
                  <div className="md:rdcfe-col-span-4">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Taxonomy
                    </label>
                    <Select
                      options={[{ value: '', label: 'Select taxonomy...' }, ...taxonomyOptions]}
                      value={row.taxonomy}
                      onChange={(e) => updateRow(index, { taxonomy: e.target.value })}
                    />
                  </div>

                  <div className="md:rdcfe-col-span-3">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Field
                    </label>
                    <Select
                      options={FIELDS}
                      value={row.field ?? 'term_id'}
                      onChange={(e) =>
                        updateRow(index, {
                          field: e.target.value as QueryTaxQueryRow['field'],
                        })
                      }
                    />
                  </div>

                  <div className="md:rdcfe-col-span-3">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Operator
                    </label>
                    <Select
                      options={OPERATORS}
                      value={operator}
                      onChange={(e) =>
                        updateRow(index, {
                          operator: e.target.value as QueryTaxQueryRow['operator'],
                        })
                      }
                    />
                  </div>

                  <div className="md:rdcfe-col-span-2">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Terms
                    </label>
                    {skipsTerms ? (
                      <Input value="—" disabled className="rdcfe-text-center" />
                    ) : (
                      <Input
                        value={termsToString(row.terms)}
                        onChange={(e) => updateRow(index, { terms: stringToTerms(e.target.value) })}
                        placeholder={(row.field ?? 'term_id') === 'slug' ? 'news, featured' : '12, 34'}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="rdcfe-btn rdcfe-btn-secondary rdcfe-mt-4"
        >
          <Plus className="rdcfe-h-4 rdcfe-w-4" />
          Add Taxonomy Rule
        </button>
      </CollapsibleSection>
    </div>
  );
}
