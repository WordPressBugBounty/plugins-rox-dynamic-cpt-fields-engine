import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Layers, Search, Pencil, Trash2, Loader2, Copy, AlertCircle } from 'lucide-react';
import { useMetaboxes, useDeleteMetabox, useToggleMetaboxStatus, useDuplicateMetabox } from '../hooks/useMetaboxes';
import { useNotificationToast } from '../components/ui/notification-toast';

export function Metaboxes() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const { showToast } = useNotificationToast();
  
  const { data: metaboxes, isLoading, error } = useMetaboxes();
  const deleteMutation = useDeleteMetabox();
  const toggleStatusMutation = useToggleMetaboxStatus();
  const duplicateMutation = useDuplicateMetabox();

  // Filter metaboxes by search and status
  const filteredMetaboxes = metaboxes?.filter(mb => {
    const matchesSearch = mb.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'active') return matchesSearch && mb.status === 'publish';
    if (filterStatus === 'inactive') return matchesSearch && mb.status === 'draft';
    return matchesSearch;
  });

  const metaboxCount = metaboxes?.length || 0;
  const activeCount = metaboxes?.filter(mb => mb.status === 'publish').length || 0;
  const inactiveCount = metaboxes?.filter(mb => mb.status === 'draft').length || 0;

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this metabox? This action cannot be undone.')) {
      setDeleteId(id);
      try {
        await deleteMutation.mutateAsync(id);
      } finally {
        setDeleteId(null);
      }
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    setTogglingId(id);
    const newStatus = currentStatus === 'publish' ? 'draft' : 'publish';
    try {
      await toggleStatusMutation.mutateAsync({ id, status: newStatus });
      showToast('success', `Metabox ${newStatus === 'publish' ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDuplicate = async (id: number, title: string) => {
    setDuplicatingId(id);
    try {
      const result = await duplicateMutation.mutateAsync({ id, title: `${title} (Copy)` });
      if (result?.id) {
        // Redirect to edit the duplicated metabox
        navigate(`/metaboxes/${result.id}`);
      }
      showToast('success', 'Metabox duplicated successfully!');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to duplicate metabox');
    } finally {
      setDuplicatingId(null);
    }
  };

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
            <div className="rdcfe-font-semibold">Error loading metaboxes</div>
            <div className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasMetaboxes = filteredMetaboxes && filteredMetaboxes.length > 0;

  return (
    <div className="rdcfe-animate-fade-in">
      {/* Page Header */}
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Metabox</h1>
          <p className="rdcfe-page-description">
            Create and manage custom meta fields with location rules for your content.
          </p>
        </div>
        <Link
          to="/metaboxes/new"
          className="rdcfe-btn rdcfe-btn-primary"
          style={{ marginTop: '25px' }}
        >
          <Plus className="rdcfe-h-4 rdcfe-w-4" />
          Add Metabox
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="rdcfe-card rdcfe-p-4 rdcfe-mb-6">
        <div className="rdcfe-flex rdcfe-flex-col sm:rdcfe-flex-row rdcfe-items-start sm:rdcfe-items-center rdcfe-gap-4">
          {/* Filter Tabs - First */}
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg">
            <button
              onClick={() => setFilterStatus('all')}
              className={`rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-medium rdcfe-rounded-md rdcfe-transition-all ${
                filterStatus === 'all'
                  ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                  : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
              }`}
            >
              All ({metaboxCount})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-medium rdcfe-rounded-md rdcfe-transition-all ${
                filterStatus === 'active'
                  ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                  : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-medium rdcfe-rounded-md rdcfe-transition-all ${
                filterStatus === 'inactive'
                  ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                  : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          {/* Search - Second */}
          <div className="rdcfe-search-box rdcfe-flex-1 rdcfe-w-full sm:rdcfe-w-auto">
            <Search className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search metaboxes..."
              className="rdcfe-flex-1"
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasMetaboxes && (
        <div className="rdcfe-card">
          <div className="rdcfe-empty-state">
            <div className="rdcfe-empty-state-icon">
              <Layers className="rdcfe-w-full rdcfe-h-full" />
            </div>
            <h3 className="rdcfe-empty-state-title">
              {searchQuery || filterStatus !== 'all' ? 'No Results Found' : 'No Metaboxes Yet'}
            </h3>
            <p className="rdcfe-empty-state-description">
              {searchQuery 
                ? `No metaboxes match "${searchQuery}". Try a different search term.`
                : filterStatus !== 'all'
                ? `No ${filterStatus} metaboxes found.`
                : 'Create metaboxes to add custom fields to your posts, pages, and custom post types with flexible location rules.'
              }
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Link
                to="/metaboxes/new"
                className="rdcfe-btn rdcfe-btn-primary"
              >
                <Plus className="rdcfe-h-4 rdcfe-w-4" />
                Create Metabox
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Metaboxes Table */}
      {hasMetaboxes && (
        <div className="rdcfe-card">
          <div className="rdcfe-table-wrapper">
            <table className="rdcfe-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Name</th>
                  <th style={{ width: '12%' }}>Fields</th>
                  <th style={{ width: '20%' }}>Location</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '30%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetaboxes?.map((metabox) => (
                  <tr key={metabox.id} className="rdcfe-group">
                    <td>
                      <div className="rdcfe-data-row">
                        <div className="rdcfe-data-row-icon rdcfe-bg-[hsl(262_83%_96%)]">
                          <Layers className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(262_83%_58%)]" />
                        </div>
                        <div className="rdcfe-data-row-content">
                          <Link
                            to={`/metaboxes/${metabox.id}`}
                            className="rdcfe-data-row-title hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors"
                          >
                            {metabox.title}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-rounded-lg">
                        {(metabox.schema?.fields || metabox.data?.fields || []).length} field{(metabox.schema?.fields || metabox.data?.fields || []).length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-1">
                        {(() => {
                          const rawLocations = metabox.schema?.locations?.[0] || (Array.isArray(metabox.data?.location) ? metabox.data?.location?.[0] : undefined) || [];
                          const locations = Array.isArray(rawLocations) ? rawLocations : [rawLocations];
                          return (locations as Array<{ param: string; operator: string; value: string }>).slice(0, 2).map((loc, idx) => (
                            <span key={idx} className="rdcfe-px-2 rdcfe-py-1 rdcfe-text-[12px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-rounded-md">
                              {loc.value}
                            </span>
                          ));
                        })()}
                      </div>
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-justify-center">
                        <button
                        onClick={() => handleToggleStatus(metabox.id, metabox.status)}
                        disabled={togglingId === metabox.id}
                        className={`rdcfe-relative rdcfe-inline-flex rdcfe-h-6 rdcfe-w-11 rdcfe-flex-shrink-0 rdcfe-cursor-pointer rdcfe-rounded-full rdcfe-transition-colors rdcfe-duration-200 rdcfe-ease-in-out focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-2 disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed ${
                          metabox.status === 'publish' 
                            ? 'rdcfe-bg-[hsl(var(--rdcfe-success))]' 
                            : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                        }`}
                        title={metabox.status === 'publish' ? 'Click to disable' : 'Click to enable'}
                      >
                        <span
                          className={`rdcfe-pointer-events-none rdcfe-inline-block rdcfe-h-5 rdcfe-w-5 rdcfe-transform rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-ring-0 rdcfe-transition rdcfe-duration-200 rdcfe-ease-in-out ${
                            metabox.status === 'publish' ? 'rdcfe-translate-x-5' : 'rdcfe-translate-x-0'
                          }`}
                          style={{ marginTop: '2px', marginLeft: '2px' }}
                        >
                          {togglingId === metabox.id && (
                            <Loader2 className="rdcfe-h-5 rdcfe-w-5 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                          )}
                        </span>
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-end rdcfe-gap-1">
                        <Link
                          to={`/metaboxes/${metabox.id}`}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                          title="Edit"
                        >
                          <Pencil className="rdcfe-h-4 rdcfe-w-4" />
                        </Link>
                        <button 
                          onClick={() => handleDuplicate(metabox.id, metabox.title)}
                          disabled={duplicatingId === metabox.id}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                          title="Duplicate"
                        >
                          {duplicatingId === metabox.id ? (
                            <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                          ) : (
                            <Copy className="rdcfe-h-4 rdcfe-w-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDelete(metabox.id)}
                          disabled={deleteId === metabox.id}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                          title="Delete"
                        >
                          {deleteId === metabox.id ? (
                            <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                          ) : (
                            <Trash2 className="rdcfe-h-4 rdcfe-w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          <div className="rdcfe-px-6 rdcfe-py-4 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center rdcfe-justify-between">
            <div className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              Showing {filteredMetaboxes?.length} of {metaboxCount} metaboxes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

