/**
 * Query Builder — Relations tab.
 *
 * UI for the `relation_query` slice of `QueryConfigData`. Mirrors
 * `MetaQueryTab` visually so authors who already know the meta-query
 * pattern read the relation-query rows the same way.
 *
 * Shape produced:
 *
 *   relation_query: {
 *     relation: "AND" | "OR",
 *     queries: [
 *       {
 *         relation_slug: "property_to_agent",
 *         direction:     "from" | "to",
 *         compare:       "IN" | "NOT IN" | "EXISTS" | "NOT EXISTS",
 *         object_id:     123 | "{{current_post_id}}",
 *         meta:          [{ key, compare, value }]
 *       }
 *     ]
 *   }
 *
 * Resolved by `RelationQueryFilter::inject_relation_filter()` on the
 * server.
 */

import { Link2, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Input, Select, type SelectOption } from '../ui';
import { CollapsibleSection, type TabContentProps } from './shared';
import { createEmptyRelationRow } from '../../hooks/useQueries';
import { useRelations } from '../../hooks/useRelations';
import type { RelationQueryMetaClause, RelationQueryRow } from '../../services/api';

const DIRECTIONS: SelectOption[] = [
  { value: 'from', label: 'Source side (forward)' },
  { value: 'to', label: 'Target side (reverse)' },
];

const COMPARES: SelectOption[] = [
  { value: 'IN', label: 'IN (related to anchor)' },
  { value: 'NOT IN', label: 'NOT IN (excluded from anchor)' },
  { value: 'INHERITED IN', label: 'INHERITED IN (anchor + ancestors)' },
  { value: 'INHERITED NOT IN', label: 'INHERITED NOT IN (anchor + ancestors)' },
  { value: 'EXISTS', label: 'EXISTS (has any pair)' },
  { value: 'NOT EXISTS', label: 'NOT EXISTS (orphans)' },
];

const META_COMPARES: SelectOption[] = [
  { value: '=', label: '= (equals)' },
  { value: '!=', label: '!= (not equals)' },
  { value: 'IN', label: 'IN (any of)' },
  { value: 'NOT IN', label: 'NOT IN' },
  { value: 'LIKE', label: 'LIKE (contains)' },
  { value: 'NOT LIKE', label: 'NOT LIKE' },
  { value: 'EXISTS', label: 'EXISTS (key set)' },
  { value: 'NOT EXISTS', label: 'NOT EXISTS' },
];

const RELATIONS_OP: SelectOption[] = [
  { value: 'AND', label: 'AND (match all rows)' },
  { value: 'OR', label: 'OR (match any row)' },
];

function metaValueToString(value: RelationQueryMetaClause['value']): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value);
}

function stringToMetaValue(input: string, compare: string): RelationQueryMetaClause['value'] {
  const op = compare.toUpperCase();
  if (op === 'IN' || op === 'NOT IN') {
    return input
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return input;
}

export function RelationsTab({ data, setData }: TabContentProps) {
  const { data: relations, isLoading: relationsLoading } = useRelations('publish');
  const queries = data.relation_query?.queries ?? [];
  const relation = data.relation_query?.relation ?? 'AND';

  const setRel = (patch: Partial<NonNullable<typeof data.relation_query>>) => {
    setData((prev) => ({
      ...prev,
      relation_query: {
        ...prev.relation_query,
        queries: prev.relation_query?.queries ?? [],
        ...patch,
      },
    }));
  };

  const updateRow = (index: number, patch: Partial<RelationQueryRow>) => {
    const next = queries.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setRel({ queries: next });
  };

  const addRow = () => setRel({ queries: [...queries, createEmptyRelationRow()] });

  const removeRow = (index: number) => {
    setRel({ queries: queries.filter((_, i) => i !== index) });
  };

  const slugOptions: SelectOption[] = [
    { value: '', label: relationsLoading ? 'Loading relations...' : 'Select a relation...' },
    ...((relations ?? [])
      .map((rel) => {
        const cfg = (rel.data ?? {}) as { slug?: string; name?: string };
        const slug = cfg.slug || rel.slug;
        if (!slug) return null;
        const niceName = cfg.name || rel.title || slug;
        return { value: slug, label: `${niceName} (${slug})` };
      })
      .filter((opt): opt is SelectOption => opt !== null)),
  ];

  // Per-row meta sub-editor
  const updateMetaClause = (
    rowIndex: number,
    clauseIndex: number,
    patch: Partial<RelationQueryMetaClause>
  ) => {
    const row = queries[rowIndex];
    if (!row) return;
    const nextMeta = (row.meta ?? []).map((c, i) =>
      i === clauseIndex ? { ...c, ...patch } : c
    );
    updateRow(rowIndex, { meta: nextMeta });
  };

  const addMetaClause = (rowIndex: number) => {
    const row = queries[rowIndex];
    if (!row) return;
    updateRow(rowIndex, {
      meta: [...(row.meta ?? []), { key: '', compare: '=', value: '' }],
    });
  };

  const removeMetaClause = (rowIndex: number, clauseIndex: number) => {
    const row = queries[rowIndex];
    if (!row) return;
    updateRow(rowIndex, {
      meta: (row.meta ?? []).filter((_, i) => i !== clauseIndex),
    });
  };

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="Relation Query"
        icon={<Link2 className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
        badge={queries.length ? `${queries.length} row${queries.length === 1 ? '' : 's'}` : undefined}
      >
        <div className="rdcfe-mb-4 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-3 rdcfe-py-2.5 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-primary)/0.08)] rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
          <Sparkles className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0" />
          <span>
            <strong>Relation-aware:</strong> filter posts/terms/users by their
            relations. Use <code className="rdcfe-px-1 rdcfe-py-0.5 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-muted))]">{'{{current_post_id}}'}</code>{' '}
            as the anchor on single templates so each card shows its own
            related items.
          </span>
        </div>

        {queries.length > 1 && (
          <div className="rdcfe-mb-4 rdcfe-flex rdcfe-items-center rdcfe-gap-3">
            <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide">
              Combine rows with
            </span>
            <Select
              options={RELATIONS_OP}
              value={relation}
              onChange={(e) => setRel({ relation: e.target.value as 'AND' | 'OR' })}
              className="rdcfe-w-56"
            />
          </div>
        )}

        {queries.length === 0 && (
          <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-p-8 rdcfe-text-center rdcfe-mb-4">
            <Link2 className="rdcfe-w-8 rdcfe-h-8 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mx-auto rdcfe-mb-3" />
            <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              No relation filters yet. Add one to query posts that are
              connected to a specific anchor — or that simply have any pair.
            </p>
          </div>
        )}

        <div className="rdcfe-space-y-3">
          {queries.map((row, index) => {
            const compare = (row.compare ?? 'IN').toUpperCase();
            const skipsAnchor = compare === 'EXISTS' || compare === 'NOT EXISTS';
            const isInherited = compare === 'INHERITED IN' || compare === 'INHERITED NOT IN';
            const metaClauses = row.meta ?? [];

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
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
                      Relation
                      {relationsLoading && <Loader2 className="rdcfe-w-3 rdcfe-h-3 rdcfe-animate-spin" />}
                    </label>
                    <Select
                      options={slugOptions}
                      value={row.relation_slug}
                      onChange={(e) => updateRow(index, { relation_slug: e.target.value })}
                    />
                  </div>

                  <div className="md:rdcfe-col-span-3">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Direction
                    </label>
                    <Select
                      options={DIRECTIONS}
                      value={row.direction ?? 'from'}
                      onChange={(e) =>
                        updateRow(index, {
                          direction: e.target.value as RelationQueryRow['direction'],
                        })
                      }
                    />
                  </div>

                  <div className="md:rdcfe-col-span-2">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Compare
                    </label>
                    <Select
                      options={COMPARES}
                      value={compare}
                      onChange={(e) =>
                        updateRow(index, {
                          compare: e.target.value as RelationQueryRow['compare'],
                        })
                      }
                    />
                  </div>

                  <div className="md:rdcfe-col-span-3">
                    <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                      Anchor
                    </label>
                    {skipsAnchor ? (
                      <Input value="—" disabled className="rdcfe-text-center" />
                    ) : (
                      <Input
                        value={String(row.object_id ?? '')}
                        onChange={(e) => updateRow(index, { object_id: e.target.value })}
                        placeholder="123 or {{current_post_id}}"
                      />
                    )}
                  </div>
                </div>

                {/* Optional pair-meta filters — collapsed when there
                    are none, opens via "Add pair-meta filter". The
                    INHERITED IN / NOT IN compare ops ignore them at
                    runtime; surfacing that inline keeps authors from
                    silently expecting filters that won't fire. */}
                <div className="rdcfe-mt-4 rdcfe-pt-4 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-2">
                    <span className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide">
                      Pair meta filters{' '}
                      {metaClauses.length > 0 && (
                        <span className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]">
                          {metaClauses.length}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => addMetaClause(index)}
                      className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline rdcfe-flex rdcfe-items-center rdcfe-gap-1"
                      disabled={isInherited}
                      title={isInherited ? 'Pair-meta filters are ignored for INHERITED compare ops.' : undefined}
                    >
                      <Plus className="rdcfe-w-3 rdcfe-h-3" />
                      Add pair-meta filter
                    </button>
                  </div>

                  {isInherited && metaClauses.length > 0 && (
                    <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-mb-2">
                      Pair-meta filters are ignored when compare is set to{' '}
                      <code className="rdcfe-px-1 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-muted))]">{compare}</code>.
                      Switch back to <code className="rdcfe-px-1 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-muted))]">IN</code> /
                      {' '}<code className="rdcfe-px-1 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-muted))]">NOT IN</code> to use them.
                    </p>
                  )}

                  {metaClauses.length === 0 ? (
                    <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      No pair-meta filters. Add one to narrow by per-pair
                      values like <code className="rdcfe-px-1 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-muted))]">status = active</code>.
                    </p>
                  ) : (
                    <div className="rdcfe-space-y-2">
                      {metaClauses.map((clause, cidx) => {
                        const cmp = (clause.compare ?? '=').toUpperCase();
                        const skipsValue = cmp === 'EXISTS' || cmp === 'NOT EXISTS';
                        return (
                          <div
                            key={cidx}
                            className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-12 rdcfe-gap-2 rdcfe-items-end"
                          >
                            <div className="md:rdcfe-col-span-4">
                              <label className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-block rdcfe-mb-1">
                                Key
                              </label>
                              <Input
                                value={clause.key}
                                onChange={(e) =>
                                  updateMetaClause(index, cidx, { key: e.target.value })
                                }
                                placeholder="e.g. status"
                                className="rdcfe-text-[13px] rdcfe-font-mono"
                              />
                            </div>
                            <div className="md:rdcfe-col-span-3">
                              <label className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-block rdcfe-mb-1">
                                Compare
                              </label>
                              <Select
                                options={META_COMPARES}
                                value={cmp}
                                onChange={(e) =>
                                  updateMetaClause(index, cidx, {
                                    compare: e.target
                                      .value as RelationQueryMetaClause['compare'],
                                  })
                                }
                              />
                            </div>
                            <div className="md:rdcfe-col-span-4">
                              <label className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-block rdcfe-mb-1">
                                Value
                              </label>
                              {skipsValue ? (
                                <Input value="—" disabled className="rdcfe-text-center" />
                              ) : (
                                <Input
                                  value={metaValueToString(clause.value)}
                                  onChange={(e) =>
                                    updateMetaClause(index, cidx, {
                                      value: stringToMetaValue(e.target.value, cmp),
                                    })
                                  }
                                  placeholder={
                                    cmp === 'IN' || cmp === 'NOT IN' ? 'a, b, c' : 'value'
                                  }
                                  className="rdcfe-text-[13px]"
                                />
                              )}
                            </div>
                            <div className="md:rdcfe-col-span-1 rdcfe-flex rdcfe-justify-end">
                              <button
                                type="button"
                                onClick={() => removeMetaClause(index, cidx)}
                                className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                                title="Remove pair-meta filter"
                              >
                                <Trash2 className="rdcfe-h-3.5 rdcfe-w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={addRow} className="rdcfe-btn rdcfe-btn-secondary rdcfe-mt-4">
          <Plus className="rdcfe-h-4 rdcfe-w-4" />
          Add Relation Rule
        </button>
      </CollapsibleSection>
    </div>
  );
}
