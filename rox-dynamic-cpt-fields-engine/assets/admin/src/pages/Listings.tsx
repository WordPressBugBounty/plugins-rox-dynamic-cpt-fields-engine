import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Layers,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  AlertCircle,
  AlertTriangle,
  LayoutTemplate,
  Grid3x3,
  FileText,
  Archive,
} from 'lucide-react';
import {
  useListings,
  useDeleteListing,
  useToggleListingStatus,
  useDuplicateListing,
} from '../hooks/useListings';
import { useNotificationToast } from '../components/ui/notification-toast';
import { ProModuleGate } from '../components/ui/pro-feature-gate';
import { useProContext } from '../contexts/ProContext';
import { CreateTemplateModal } from '../components/listings/CreateTemplateModal';
import { ExternalEditorLink } from '../components/listings/ExternalEditorLink';
import { getListingEditPath } from '../utils/listingPaths';
import type { ListingConfig, ListingType } from '../services/api';

const LISTING_TYPE_META: Record<
  ListingType,
  { label: string; icon: typeof LayoutTemplate; tone: string; description: string }
> = {
  template: {
    label: 'Card',
    icon: LayoutTemplate,
    tone: 'hsl(217 91% 60%)',
    description: 'Single card layout',
  },
  grid: {
    label: 'Grid',
    icon: Grid3x3,
    tone: 'hsl(262 83% 58%)',
    description: 'Multi-card listing grid',
  },
  single_page: {
    label: 'Single Page',
    icon: FileText,
    tone: 'hsl(142 71% 45%)',
    description: 'Single post template override',
  },
  archive_page: {
    label: 'Archive',
    icon: Archive,
    tone: 'hsl(25 95% 53%)',
    description: 'Archive page template override',
  },
};

const TYPE_FILTER_TABS: Array<{ key: ListingType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'template', label: 'Cards' },
  { key: 'grid', label: 'Grids' },
  { key: 'single_page', label: 'Single Pages' },
  { key: 'archive_page', label: 'Archives' },
];

function summariseListing(listing: ListingConfig): string {
  const data = listing.data;
  if (!data) return 'Empty listing';

  if (data.listing_type === 'single_page' || data.listing_type === 'archive_page') {
    const overrides = (data.override_post_types ?? data.post_types ?? []).filter(Boolean);
    const kind = data.listing_type === 'single_page' ? 'single' : 'archive';
    const parts: string[] = [];
    if (overrides.length) {
      parts.push(`Overrides: ${overrides.join(', ')} (${kind})`);
    }
    if (data.editor && data.editor !== 'rdcfe') {
      parts.push(data.editor === 'gutenberg' ? 'Gutenberg' : 'Elementor');
    } else {
      parts.push('RDCFE Builder');
    }
    if (data.canvas_mode && data.canvas_mode !== 'default') {
      parts.push(data.canvas_mode === 'full_width' ? 'Full Width' : 'Canvas');
    }
    return parts.join(' • ');
  }

  if (data.listing_type === 'template') {
    const types = (data.post_types ?? []).filter(Boolean);
    const componentCount = (data.components ?? []).length;
    const parts: string[] = [];
    if (types.length) {
      parts.push(types.join(', '));
    } else {
      parts.push(data.data_source ?? 'posts');
    }
    parts.push(`${componentCount} ${componentCount === 1 ? 'component' : 'components'}`);
    return parts.join(' • ');
  }

  // Grid summary.
  const cols = data.columns ?? 3;
  const tplRef = data.template_id ? `template #${data.template_id}` : 'no template';
  const queryRef = data.query_id ? `query #${data.query_id}` : 'default loop';
  return `${cols} cols • ${tplRef} • ${queryRef}`;
}

/**
 * Detect conflict: two published listings targeting the same CPT + listing_type.
 * Returns the id of the conflicting listing if one exists.
 */
function findConflict(listing: ListingConfig, allListings: ListingConfig[]): number | null {
  const type = listing.data?.listing_type;
  if (type !== 'single_page' && type !== 'archive_page') return null;
  if (listing.status !== 'publish') return null;

  const overrides = listing.data?.override_post_types ?? listing.data?.post_types ?? [];
  if (!overrides.length) return null;

  for (const other of allListings) {
    if (other.id === listing.id) continue;
    if (other.status !== 'publish') continue;
    if (other.data?.listing_type !== type) continue;

    const otherOverrides = other.data?.override_post_types ?? other.data?.post_types ?? [];
    const overlap = overrides.some((pt: string) => otherOverrides.includes(pt));
    if (overlap) return other.id;
  }

  return null;
}

export function Listings() {
  const navigate = useNavigate();
  const { isPro } = useProContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterType, setFilterType] = useState<ListingType | 'all'>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { showToast } = useNotificationToast();

  const { data: listings, isLoading, error } = useListings('all');
  const deleteMutation = useDeleteListing();
  const toggleMutation = useToggleListingStatus();
  const duplicateMutation = useDuplicateListing();

  const filteredListings = listings?.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
    const type = l.data?.listing_type ?? 'template';
    const matchesType = filterType === 'all' || type === filterType;
    if (!matchesSearch || !matchesType) return false;
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return l.status === 'publish';
    return l.status === 'draft';
  });

  const listingCount = listings?.length || 0;
  const activeCount = listings?.filter((l) => l.status === 'publish').length || 0;
  const inactiveCount = listings?.filter((l) => l.status === 'draft').length || 0;

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listingCount };
    for (const tab of TYPE_FILTER_TABS) {
      if (tab.key === 'all') continue;
      counts[tab.key] = listings?.filter((l) => (l.data?.listing_type ?? 'template') === tab.key).length ?? 0;
    }
    return counts;
  }, [listings, listingCount]);

  const editPath = (listing: ListingConfig) => getListingEditPath(listing);

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this listing? This cannot be undone.')) {
      setDeleteId(id);
      try {
        await deleteMutation.mutateAsync(id);
        showToast('success', 'Listing deleted.');
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'Failed to delete listing.');
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
      showToast('success', `Listing ${next === 'publish' ? 'activated' : 'deactivated'}.`);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDuplicate = async (listing: ListingConfig) => {
    setDuplicatingId(listing.id);
    try {
      const result = await duplicateMutation.mutateAsync({
        id: listing.id,
        title: `${listing.title} (Copy)`,
      });
      if (result?.id) {
        navigate(editPath(result));
      }
      showToast('success', 'Listing duplicated.');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to duplicate listing.');
    } finally {
      setDuplicatingId(null);
    }
  };

  // Free users see the entire module behind a ProModuleGate (blurred
  // content + upgrade overlay). Matches the Query Builder pattern.
  if (!isPro) {
    return (
      <ProModuleGate module="listings" moduleName="Listings">
        <ListingsEmptyShell />
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
            <div className="rdcfe-font-semibold">Error loading listings</div>
            <div className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasListings = filteredListings && filteredListings.length > 0;

  return (
    <div className="rdcfe-animate-fade-in">
      {/* Page Header */}
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Listings</h1>
          <p className="rdcfe-page-description">
            Build reusable templates and override single/archive pages.
          </p>
        </div>
        <div className="rdcfe-flex rdcfe-gap-2" style={{ marginTop: '25px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rdcfe-btn rdcfe-btn-primary"
          >
            <Plus className="rdcfe-h-4 rdcfe-w-4" />
            Add New
          </button>
        </div>
      </div>

      <CreateTemplateModal open={showCreateModal} onOpenChange={setShowCreateModal} />

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
                {status === 'all' && `All (${listingCount})`}
                {status === 'active' && `Active (${activeCount})`}
                {status === 'inactive' && `Inactive (${inactiveCount})`}
              </button>
            ))}
          </div>

          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg rdcfe-flex-wrap">
            {TYPE_FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-medium rdcfe-rounded-md rdcfe-transition-all ${
                  filterType === tab.key
                    ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                    : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                }`}
              >
                {tab.label} ({typeCounts[tab.key] ?? 0})
              </button>
            ))}
          </div>

          <div className="rdcfe-search-box rdcfe-flex-1 rdcfe-w-full sm:rdcfe-w-auto">
            <Search className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search listings..."
              className="rdcfe-flex-1"
            />
          </div>

          {/* Future: more filter options */}
        </div>
      </div>

      {/* Empty State */}
      {!hasListings && (
        <div className="rdcfe-card">
          <div className="rdcfe-empty-state">
            <div className="rdcfe-empty-state-icon">
              <Layers className="rdcfe-w-full rdcfe-h-full" />
            </div>
            <h3 className="rdcfe-empty-state-title">
              {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                ? 'No Results Found'
                : 'No Listings Yet'}
            </h3>
            <p className="rdcfe-empty-state-description">
              {searchQuery
                ? `No listings match "${searchQuery}". Try a different search term.`
                : filterStatus !== 'all' || filterType !== 'all'
                ? 'No listings match the current filters.'
                : 'Start by building a template — it defines the look of one card. Then drop it inside a grid to display many at once.'}
            </p>
            {!searchQuery && filterStatus === 'all' && filterType === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="rdcfe-btn rdcfe-btn-primary"
              >
                <Plus className="rdcfe-h-4 rdcfe-w-4" />
                Create Template
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {hasListings && (
        <div className="rdcfe-card">
          <div className="rdcfe-table-wrapper">
            <table className="rdcfe-table">
              <thead>
                <tr>
                  <th style={{ width: '36%' }}>Name</th>
                  <th style={{ width: '12%' }}>Type</th>
                  <th style={{ width: '30%' }}>Summary</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings?.map((listing) => {
                  const listingType = listing.data?.listing_type ?? 'template';
                  const meta = LISTING_TYPE_META[listingType] ?? LISTING_TYPE_META.template;
                  const Icon = meta.icon;
                  const conflictId = listings ? findConflict(listing, listings) : null;
                  return (
                    <tr key={listing.id} className="rdcfe-group">
                      <td>
                        <div className="rdcfe-data-row">
                          <div
                            className="rdcfe-data-row-icon"
                            style={{ background: `${meta.tone.replace(')', ' / 0.12)')}` }}
                          >
                            <Icon className="rdcfe-w-4 rdcfe-h-4" style={{ color: meta.tone }} />
                          </div>
                          <div className="rdcfe-data-row-content">
                            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                              <Link
                                to={editPath(listing)}
                                className="rdcfe-data-row-title hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors"
                              >
                                {listing.title || '(untitled)'}
                              </Link>
                              {conflictId && (
                                <span
                                  title={`Another template (#${conflictId}) also overrides this post type. Only the most recently updated one will be active.`}
                                  className="rdcfe-inline-flex rdcfe-items-center rdcfe-text-[hsl(45_93%_47%)]"
                                >
                                  <AlertTriangle className="rdcfe-w-3.5 rdcfe-h-3.5" />
                                </span>
                              )}
                            </div>
                            <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                              {meta.description}
                            </div>
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
                          {summariseListing(listing)}
                        </span>
                      </td>
                      <td>
                        <div className="rdcfe-flex rdcfe-justify-center">
                          <button
                            onClick={() => handleToggle(listing.id, listing.status)}
                            disabled={togglingId === listing.id}
                            className={`rdcfe-relative rdcfe-inline-flex rdcfe-h-6 rdcfe-w-11 rdcfe-flex-shrink-0 rdcfe-cursor-pointer rdcfe-rounded-full rdcfe-transition-colors rdcfe-duration-200 rdcfe-ease-in-out focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-2 disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed ${
                              listing.status === 'publish'
                                ? 'rdcfe-bg-[hsl(var(--rdcfe-success))]'
                                : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                            }`}
                            title={
                              listing.status === 'publish'
                                ? 'Click to disable'
                                : 'Click to enable'
                            }
                          >
                            <span
                              className={`rdcfe-pointer-events-none rdcfe-inline-block rdcfe-h-5 rdcfe-w-5 rdcfe-transform rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-ring-0 rdcfe-transition rdcfe-duration-200 rdcfe-ease-in-out ${
                                listing.status === 'publish'
                                  ? 'rdcfe-translate-x-5'
                                  : 'rdcfe-translate-x-0'
                              }`}
                              style={{ marginTop: '2px', marginLeft: '2px' }}
                            >
                              {togglingId === listing.id && (
                                <Loader2 className="rdcfe-h-5 rdcfe-w-5 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                              )}
                            </span>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-end rdcfe-gap-1">
                          {listing.data?.editor && listing.data.editor !== 'rdcfe' && listing.data.page_id && (
                            <ExternalEditorLink
                              pageId={listing.data.page_id}
                              editor={listing.data.editor}
                              pageStatus={listing.page_status}
                            />
                          )}
                          <Link
                            to={editPath(listing)}
                            className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                            title={
                              listing.data?.editor && listing.data.editor !== 'rdcfe'
                                ? 'Edit settings'
                                : 'Edit'
                            }
                          >
                            <Pencil className="rdcfe-h-4 rdcfe-w-4" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(listing)}
                            disabled={duplicatingId === listing.id}
                            className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                            title="Duplicate"
                          >
                            {duplicatingId === listing.id ? (
                              <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                            ) : (
                              <Copy className="rdcfe-h-4 rdcfe-w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(listing.id)}
                            disabled={deleteId === listing.id}
                            className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                            title="Delete"
                          >
                            {deleteId === listing.id ? (
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
              Showing {filteredListings?.length} of {listingCount} listings
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
function ListingsEmptyShell() {
  return (
    <div>
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Listings</h1>
          <p className="rdcfe-page-description">
            Build reusable templates and override single/archive pages.
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
                <th>Summary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Property Card', type: 'Card', summary: 'property • 4 components' },
                { name: 'Property Single', type: 'Single Page', summary: 'Overrides: property (single) • RDCFE Builder' },
                { name: 'Featured Properties', type: 'Grid', summary: '3 cols • template #1' },
                { name: 'Author Spotlight', type: 'Card', summary: 'users • 3 components' },
              ].map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.type}</td>
                  <td>{row.summary}</td>
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
