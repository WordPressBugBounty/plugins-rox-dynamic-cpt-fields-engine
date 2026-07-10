import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Database,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  AlertCircle,
  Users,
  Tag as TagIcon,
  FileText,
} from 'lucide-react';
import {
  useQueries,
  useDeleteQuery,
  useToggleQueryStatus,
  useDuplicateQuery,
} from '../hooks/useQueries';
import { useNotificationToast } from '../components/ui/notification-toast';
import { ProModuleGate } from '../components/ui/pro-feature-gate';
import { useProContext } from '../contexts/ProContext';
import type { QueryConfig } from '../services/api';

const QUERY_TYPE_META: Record<
  QueryConfig['data']['query_type'],
  { label: string; icon: typeof FileText; tone: string }
> = {
  posts: { label: 'Posts', icon: FileText, tone: 'hsl(217 91% 60%)' },
  terms: { label: 'Terms', icon: TagIcon, tone: 'hsl(38 92% 50%)' },
  users: { label: 'Users', icon: Users, tone: 'hsl(262 83% 58%)' },
};

function summariseQuery(query: QueryConfig): string {
  const data = query.data;
  if (!data) return 'Empty query';

  const type = data.query_type ?? 'posts';
  if (type === 'posts') {
    const types = (data.source?.post_types ?? []).join(', ') || 'post';
    const filters: string[] = [];
    if (data.tax_query?.queries?.length) {
      filters.push(`${data.tax_query.queries.length} tax`);
    }
    if (data.meta_query?.queries?.length) {
      filters.push(`${data.meta_query.queries.length} meta`);
    }
    return filters.length ? `${types} • ${filters.join(', ')}` : types;
  }
  if (type === 'terms') {
    const taxes = (data.source?.taxonomies ?? []).join(', ') || '—';
    return `taxonomies: ${taxes}`;
  }
  return (data.source?.roles ?? []).join(', ') || 'all users';
}

export function Queries() {
  const navigate = useNavigate();
  const { isPro } = useProContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const { showToast } = useNotificationToast();

  // Free users still hit this hook so the empty-state behaviour is
  // identical, but the actual API call returns 403 → empty list.
  const { data: queries, isLoading, error } = useQueries('all');
  const deleteMutation = useDeleteQuery();
  const toggleMutation = useToggleQueryStatus();
  const duplicateMutation = useDuplicateQuery();

  const filteredQueries = queries?.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'active') return matchesSearch && q.status === 'publish';
    if (filterStatus === 'inactive') return matchesSearch && q.status === 'draft';
    return matchesSearch;
  });

  const queryCount = queries?.length || 0;
  const activeCount = queries?.filter((q) => q.status === 'publish').length || 0;
  const inactiveCount = queries?.filter((q) => q.status === 'draft').length || 0;

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this saved query? This cannot be undone.')) {
      setDeleteId(id);
      try {
        await deleteMutation.mutateAsync(id);
        showToast('success', 'Query deleted.');
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'Failed to delete query.');
      } finally {
        setDeleteId(null);
      }
    }
  };

  const handleToggle = async (id: number, currentStatus: string) => {
    setTogglingId(id);
    const next = currentStatus === 'publish' ? 'draft' : 'publish';
    try {
      await toggleMutation.mutateAsync({ id, status: next });
      showToast('success', `Query ${next === 'publish' ? 'activated' : 'deactivated'}.`);
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
        navigate(`/queries/${result.id}`);
      }
      showToast('success', 'Query duplicated.');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to duplicate query.');
    } finally {
      setDuplicatingId(null);
    }
  };

  // Free users see the entire module behind a ProModuleGate (blurred
  // content + upgrade overlay). Matches the existing pattern other Pro
  // modules will follow once they ship.
  if (!isPro) {
    return (
      <ProModuleGate module="query_builder" moduleName="Query Builder">
        <QueriesEmptyShell />
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
            <div className="rdcfe-font-semibold">Error loading queries</div>
            <div className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasQueries = filteredQueries && filteredQueries.length > 0;

  return (
    <div className="rdcfe-animate-fade-in">
      {/* Page Header */}
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Query Builder</h1>
          <p className="rdcfe-page-description">
            Create reusable, dynamic queries for posts, terms, and users — with macros, preview, and health checks.
          </p>
        </div>
        <Link to="/queries/new" className="rdcfe-btn rdcfe-btn-primary" style={{ marginTop: '25px' }}>
          <Plus className="rdcfe-h-4 rdcfe-w-4" />
          Add Query
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
                {status === 'all' && `All (${queryCount})`}
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
              placeholder="Search queries..."
              className="rdcfe-flex-1"
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasQueries && (
        <div className="rdcfe-card">
          <div className="rdcfe-empty-state">
            <div className="rdcfe-empty-state-icon">
              <Database className="rdcfe-w-full rdcfe-h-full" />
            </div>
            <h3 className="rdcfe-empty-state-title">
              {searchQuery || filterStatus !== 'all' ? 'No Results Found' : 'No Saved Queries Yet'}
            </h3>
            <p className="rdcfe-empty-state-description">
              {searchQuery
                ? `No queries match "${searchQuery}". Try a different search term.`
                : filterStatus !== 'all'
                ? `No ${filterStatus} queries found.`
                : 'Build queries once and reuse them across listings, related posts, and dynamic content.'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Link to="/queries/new" className="rdcfe-btn rdcfe-btn-primary">
                <Plus className="rdcfe-h-4 rdcfe-w-4" />
                Create Query
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {hasQueries && (
        <div className="rdcfe-card">
          <div className="rdcfe-table-wrapper">
            <table className="rdcfe-table">
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Name</th>
                  <th style={{ width: '12%' }}>Type</th>
                  <th style={{ width: '28%' }}>Source</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '18%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueries?.map((query) => {
                  const meta = QUERY_TYPE_META[query.data?.query_type ?? 'posts'];
                  const Icon = meta.icon;
                  return (
                    <tr key={query.id} className="rdcfe-group">
                      <td>
                        <div className="rdcfe-data-row">
                          <div
                            className="rdcfe-data-row-icon"
                            style={{ background: `${meta.tone.replace(')', ' / 0.12)')}` }}
                          >
                            <Icon className="rdcfe-w-4 rdcfe-h-4" style={{ color: meta.tone }} />
                          </div>
                          <div className="rdcfe-data-row-content">
                            <Link
                              to={`/queries/${query.id}`}
                              className="rdcfe-data-row-title hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors"
                            >
                              {query.title || '(untitled)'}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[12px] rdcfe-rounded-md rdcfe-font-medium"
                          style={{
                            background: `${meta.tone.replace(')', ' / 0.10)')}`,
                            color: meta.tone,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                          {summariseQuery(query)}
                        </span>
                      </td>
                      <td>
                        <div className="rdcfe-flex rdcfe-justify-center">
                          <button
                            onClick={() => handleToggle(query.id, query.status)}
                            disabled={togglingId === query.id}
                            className={`rdcfe-relative rdcfe-inline-flex rdcfe-h-6 rdcfe-w-11 rdcfe-flex-shrink-0 rdcfe-cursor-pointer rdcfe-rounded-full rdcfe-transition-colors rdcfe-duration-200 rdcfe-ease-in-out focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-2 disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed ${
                              query.status === 'publish'
                                ? 'rdcfe-bg-[hsl(var(--rdcfe-success))]'
                                : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                            }`}
                            title={query.status === 'publish' ? 'Click to disable' : 'Click to enable'}
                          >
                            <span
                              className={`rdcfe-pointer-events-none rdcfe-inline-block rdcfe-h-5 rdcfe-w-5 rdcfe-transform rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-ring-0 rdcfe-transition rdcfe-duration-200 rdcfe-ease-in-out ${
                                query.status === 'publish' ? 'rdcfe-translate-x-5' : 'rdcfe-translate-x-0'
                              }`}
                              style={{ marginTop: '2px', marginLeft: '2px' }}
                            >
                              {togglingId === query.id && (
                                <Loader2 className="rdcfe-h-5 rdcfe-w-5 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                              )}
                            </span>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-end rdcfe-gap-1">
                          <Link
                            to={`/queries/${query.id}`}
                            className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                            title="Edit"
                          >
                            <Pencil className="rdcfe-h-4 rdcfe-w-4" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(query.id, query.title)}
                            disabled={duplicatingId === query.id}
                            className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                            title="Duplicate"
                          >
                            {duplicatingId === query.id ? (
                              <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                            ) : (
                              <Copy className="rdcfe-h-4 rdcfe-w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(query.id)}
                            disabled={deleteId === query.id}
                            className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                            title="Delete"
                          >
                            {deleteId === query.id ? (
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
              Showing {filteredQueries?.length} of {queryCount} queries
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
function QueriesEmptyShell() {
  return (
    <div>
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Query Builder</h1>
          <p className="rdcfe-page-description">
            Create reusable, dynamic queries for posts, terms, and users.
          </p>
        </div>
      </div>
      <div className="rdcfe-card">
        <div className="rdcfe-table-wrapper">
          <table className="rdcfe-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Source</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td>Featured Properties</td>
                  <td>Posts</td>
                  <td>property • 1 meta</td>
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
