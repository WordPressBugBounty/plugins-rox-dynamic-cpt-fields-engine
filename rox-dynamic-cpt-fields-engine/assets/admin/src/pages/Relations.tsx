import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Link2,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  AlertCircle,
  ArrowRight,
  ArrowLeftRight,
  FileText,
  Folder,
  Users,
} from 'lucide-react';
import {
  useRelations,
  useDeleteRelation,
  useToggleRelationStatus,
  useDuplicateRelation,
} from '../hooks/useRelations';
import { useNotificationToast } from '../components/ui/notification-toast';
import { ProModuleGate } from '../components/ui/pro-feature-gate';
import { useProContext } from '../contexts/ProContext';
import type { RelationConfig, RelationType } from '../services/api';

const RELATION_TYPE_META: Record<
  RelationType,
  { label: string; tone: string; short: string }
> = {
  'one-to-one': {
    label: 'One to One',
    short: '1 ↔ 1',
    tone: 'hsl(217 91% 60%)',
  },
  'one-to-many': {
    label: 'One to Many',
    short: '1 ↔ N',
    tone: 'hsl(38 92% 50%)',
  },
  'many-to-many': {
    label: 'Many to Many',
    short: 'N ↔ N',
    tone: 'hsl(262 83% 58%)',
  },
};

/** Matches RelationValidator::canonical_relation_type — avoids crash when meta lookup misses. */
function canonicalRelationListType(type: string | undefined): RelationType {
  const t = type ?? 'many-to-many';
  return (t === 'many-to-one' ? 'one-to-many' : t) as RelationType;
}

/**
 * Connection chip with a small kind icon. Posts get the file icon,
 * terms the folder, users the people glyph; the slug itself reads
 * as before. The chip's tooltip exposes the kind so power users can
 * confirm the source/target type at a glance.
 */
function ConnectionChip({ kind, slug }: { kind: 'post' | 'term' | 'user'; slug: string }) {
  const Icon = kind === 'term' ? Folder : kind === 'user' ? Users : FileText;
  return (
    <span
      className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-2 rdcfe-py-1 rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-foreground))]"
      title={`${kind}: ${slug}`}
    >
      <Icon className="rdcfe-h-3 rdcfe-w-3 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
      <code className="rdcfe-font-mono rdcfe-text-[12px]">{slug}</code>
    </span>
  );
}

function summariseConnection(relation: RelationConfig): {
  from: string;
  to: string;
  fromKind: 'post' | 'term' | 'user';
  toKind: 'post' | 'term' | 'user';
  bidirectional: boolean;
} {
  const data = relation.data;
  const fromKind = (data?.from_object ?? 'post') as 'post' | 'term' | 'user';
  const toKind = (data?.to_object ?? 'post') as 'post' | 'term' | 'user';
  // For user-kind sides the empty-string slug is the "any role"
  // sentinel — surface it as "any" in the table so authors don't
  // mistake it for a misconfig.
  const renderSlug = (kind: 'post' | 'term' | 'user', slug: string | undefined): string => {
    if (slug && slug !== '') return slug;
    return kind === 'user' ? 'any' : '—';
  };
  return {
    from: renderSlug(fromKind, data?.from_cpt),
    to: renderSlug(toKind, data?.to_cpt),
    fromKind,
    toKind,
    bidirectional: !!data?.bidirectional,
  };
}

export function Relations() {
  const navigate = useNavigate();
  const { isPro } = useProContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const { showToast } = useNotificationToast();

  // Free users still hit this hook so the empty-state behaviour is
  // identical to other Pro modules — the request fails with 403 and
  // we render the blurred shell behind ProModuleGate.
  const { data: relations, isLoading, error } = useRelations('all');
  const deleteMutation = useDeleteRelation();
  const toggleMutation = useToggleRelationStatus();
  const duplicateMutation = useDuplicateRelation();

  const filteredRelations = relations?.filter((r) => {
    const haystack =
      `${r.title} ${r.data?.slug ?? ''} ${r.data?.from_cpt ?? ''} ${r.data?.to_cpt ?? ''}`.toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.toLowerCase());
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'active') return matchesSearch && r.status === 'publish';
    if (filterStatus === 'inactive') return matchesSearch && r.status === 'draft';
    return matchesSearch;
  });

  const totalCount = relations?.length || 0;
  const activeCount = relations?.filter((r) => r.status === 'publish').length || 0;
  const inactiveCount = relations?.filter((r) => r.status === 'draft').length || 0;

  const handleDelete = async (id: number, pairCount: number) => {
    // Two-step UX: if the relation has live pairs we ask whether to
    // also nuke the rows from `wp_rdcfe_relations` (DELETE ?purge=1).
    const purge =
      pairCount > 0 &&
      window.confirm(
        `This relation has ${pairCount} attached pair${pairCount === 1 ? '' : 's'}.\n\n` +
          'Click OK to delete the definition AND all attached pairs.\n' +
          'Click Cancel to delete just the definition (orphans the pair rows).'
      );

    if (
      !window.confirm(
        purge
          ? 'Are you sure? This will permanently delete the definition and every attached pair.'
          : 'Are you sure you want to delete this relation definition? This cannot be undone.'
      )
    ) {
      return;
    }

    setDeleteId(id);
    try {
      await deleteMutation.mutateAsync({ id, purge });
      showToast('success', purge ? 'Relation deleted with all pairs.' : 'Relation deleted.');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to delete relation.');
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggle = async (id: number, currentStatus: string) => {
    setTogglingId(id);
    const next = currentStatus === 'publish' ? 'draft' : 'publish';
    try {
      await toggleMutation.mutateAsync({ id, status: next });
      showToast('success', `Relation ${next === 'publish' ? 'activated' : 'deactivated'}.`);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDuplicate = async (id: number, title: string) => {
    setDuplicatingId(id);
    try {
      const result = await duplicateMutation.mutateAsync({ id, title: `${title} (Copy)` });
      if (result?.id) {
        navigate(`/relations/${result.id}`);
      }
      showToast('success', 'Relation duplicated.');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to duplicate relation.');
    } finally {
      setDuplicatingId(null);
    }
  };

  // Free users see the entire module behind a ProModuleGate (blurred
  // content + upgrade overlay). Same pattern as Query Builder /
  // Listings so the upgrade journey feels uniform across modules.
  if (!isPro) {
    return (
      <ProModuleGate module="relations" moduleName="Relations">
        <RelationsEmptyShell />
      </ProModuleGate>
    );
  }

  if (isLoading) {
    return (
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-py-20">
        <Loader2 className="rdcfe-h-8 rdcfe-w-8 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-primary))]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rdcfe-card rdcfe-p-6">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-text-[hsl(var(--rdcfe-destructive))]">
          <AlertCircle className="rdcfe-w-6 rdcfe-h-6" />
          <div>
            <div className="rdcfe-font-semibold">Error loading relations</div>
            <div className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasRelations = filteredRelations && filteredRelations.length > 0;

  return (
    <div className="rdcfe-animate-fade-in">
      {/* Page Header */}
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Relations</h1>
          <p className="rdcfe-page-description">
            Connect post types to each other — agents to properties, courses to
            modules, products to authors. Manage cardinality (1:1, 1:N, N:N) and
            pick attachments straight from the post edit screen.
          </p>
        </div>
        <Link to="/relations/new" className="rdcfe-btn rdcfe-btn-primary" style={{ marginTop: '25px' }}>
          <Plus className="rdcfe-h-4 rdcfe-w-4" />
          Add Relation
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="rdcfe-card rdcfe-p-4 rdcfe-mb-6">
        <div className="rdcfe-flex rdcfe-flex-col sm:rdcfe-flex-row rdcfe-items-start sm:rdcfe-items-center rdcfe-gap-4">
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-medium rdcfe-rounded-md rdcfe-transition-all ${
                  filterStatus === status
                    ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                    : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                }`}
              >
                {status === 'all' && `All (${totalCount})`}
                {status === 'active' && `Active (${activeCount})`}
                {status === 'inactive' && `Inactive (${inactiveCount})`}
              </button>
            ))}
          </div>

          <div className="rdcfe-search-box rdcfe-flex-1 rdcfe-w-full sm:rdcfe-w-auto">
            <Search className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, slug, or post type..."
              className="rdcfe-flex-1"
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasRelations && (
        <div className="rdcfe-card">
          <div className="rdcfe-empty-state">
            <div className="rdcfe-empty-state-icon">
              <Link2 className="rdcfe-w-full rdcfe-h-full" />
            </div>
            <h3 className="rdcfe-empty-state-title">
              {searchQuery || filterStatus !== 'all' ? 'No Results Found' : 'No Relations Yet'}
            </h3>
            <p className="rdcfe-empty-state-description">
              {searchQuery
                ? `No relations match "${searchQuery}". Try a different search term.`
                : filterStatus !== 'all'
                ? `No ${filterStatus} relations found.`
                : 'Define a connection between two post types and a meta box appears on every matching edit screen — no fields, no shortcodes.'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Link to="/relations/new" className="rdcfe-btn rdcfe-btn-primary">
                <Plus className="rdcfe-h-4 rdcfe-w-4" />
                Create Relation
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {hasRelations && (
        <div className="rdcfe-card">
          <div className="rdcfe-table-wrapper">
            <table className="rdcfe-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Name</th>
                  <th style={{ width: '28%' }}>Connection</th>
                  <th style={{ width: '14%' }}>Type</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Pairs</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRelations?.map((relation) => {
                  const canonicalType = canonicalRelationListType(relation.data?.type);
                  const meta =
                    RELATION_TYPE_META[canonicalType] ?? RELATION_TYPE_META['many-to-many'];
                  const conn = summariseConnection(relation);
                  const pairCount = relation.pair_count ?? 0;
                  return (
                    <tr key={relation.id} className="rdcfe-group">
                      <td>
                        <div className="rdcfe-data-row">
                          <div
                            className="rdcfe-data-row-icon"
                            style={{ background: `${meta.tone.replace(')', ' / 0.12)')}` }}
                          >
                            <Link2 className="rdcfe-w-4 rdcfe-h-4" style={{ color: meta.tone }} />
                          </div>
                          <div className="rdcfe-data-row-content">
                            <Link
                              to={`/relations/${relation.id}`}
                              className="rdcfe-data-row-title hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors"
                            >
                              {relation.title || '(untitled)'}
                            </Link>
                            <div className="rdcfe-mt-0.5">
                              <code className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-font-mono">
                                {relation.data?.slug || '—'}
                              </code>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px]">
                          <ConnectionChip kind={conn.fromKind} slug={conn.from} />
                          {conn.bidirectional ? (
                            <ArrowLeftRight
                              className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]"
                              aria-label="Bidirectional"
                            />
                          ) : (
                            <ArrowRight
                              className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]"
                              aria-label="One-way"
                            />
                          )}
                          <ConnectionChip kind={conn.toKind} slug={conn.to} />
                        </div>
                      </td>
                      <td>
                        <span
                          className="rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[12px] rdcfe-rounded-md rdcfe-font-medium"
                          style={{
                            background: `${meta.tone.replace(')', ' / 0.10)')}`,
                            color: meta.tone,
                          }}
                          title={meta.label}
                        >
                          {meta.short}
                        </span>
                      </td>
                      <td>
                        <div className="rdcfe-flex rdcfe-justify-center">
                          <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                            {pairCount.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="rdcfe-flex rdcfe-justify-center">
                          <button
                            onClick={() => handleToggle(relation.id, relation.status)}
                            disabled={togglingId === relation.id}
                            className={`rdcfe-relative rdcfe-inline-flex rdcfe-h-6 rdcfe-w-11 rdcfe-flex-shrink-0 rdcfe-cursor-pointer rdcfe-rounded-full rdcfe-transition-colors rdcfe-duration-200 rdcfe-ease-in-out focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-2 disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed ${
                              relation.status === 'publish'
                                ? 'rdcfe-bg-[hsl(var(--rdcfe-success))]'
                                : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                            }`}
                            title={relation.status === 'publish' ? 'Click to disable' : 'Click to enable'}
                          >
                            <span
                              className={`rdcfe-pointer-events-none rdcfe-inline-block rdcfe-h-5 rdcfe-w-5 rdcfe-transform rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-ring-0 rdcfe-transition rdcfe-duration-200 rdcfe-ease-in-out ${
                                relation.status === 'publish' ? 'rdcfe-translate-x-5' : 'rdcfe-translate-x-0'
                              }`}
                              style={{ marginTop: '2px', marginLeft: '2px' }}
                            >
                              {togglingId === relation.id && (
                                <Loader2 className="rdcfe-h-5 rdcfe-w-5 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                              )}
                            </span>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-end rdcfe-gap-1">
                          <Link
                            to={`/relations/${relation.id}`}
                            className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                            title="Edit"
                          >
                            <Pencil className="rdcfe-h-4 rdcfe-w-4" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(relation.id, relation.title)}
                            disabled={duplicatingId === relation.id}
                            className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                            title="Duplicate"
                          >
                            {duplicatingId === relation.id ? (
                              <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                            ) : (
                              <Copy className="rdcfe-h-4 rdcfe-w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(relation.id, pairCount)}
                            disabled={deleteId === relation.id}
                            className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                            title="Delete"
                          >
                            {deleteId === relation.id ? (
                              <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                            ) : (
                              <Trash2 className="rdcfe-h-4 rdcfe-w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rdcfe-px-6 rdcfe-py-4 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center rdcfe-justify-between">
            <div className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              Showing {filteredRelations?.length} of {totalCount} relation
              {totalCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Static, blurred shell rendered behind `ProModuleGate` for Free users.
 * Mirrors the table layout above so the upgrade overlay sits on top of
 * a believable preview rather than a blank page.
 */
function RelationsEmptyShell() {
  const sample = [
    { name: 'Property → Agent', from: 'property', to: 'agent', type: 'N ↔ N', pairs: 24 },
    { name: 'Course → Module', from: 'course', to: 'module', type: '1 ↔ N', pairs: 12 },
    { name: 'Product → Author', from: 'product', to: 'author', type: '1 ↔ 1', pairs: 8 },
  ];
  return (
    <div>
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Relations</h1>
          <p className="rdcfe-page-description">
            Connect post types to each other — agents to properties, courses to
            modules, products to authors.
          </p>
        </div>
      </div>
      <div className="rdcfe-card">
        <div className="rdcfe-table-wrapper">
          <table className="rdcfe-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Connection</th>
                <th>Type</th>
                <th>Pairs</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((row, i) => (
                <tr key={i}>
                  <td>{row.name}</td>
                  <td>
                    {row.from} → {row.to}
                  </td>
                  <td>{row.type}</td>
                  <td>{row.pairs}</td>
                  <td>Active</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
