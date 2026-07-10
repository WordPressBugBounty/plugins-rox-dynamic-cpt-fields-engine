import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Tags, Search, Pencil, Trash2, Loader2, Copy, AlertCircle } from 'lucide-react';
import { useTaxonomies, useDeleteTaxonomy, useDuplicateTaxonomy, useToggleTaxonomyStatus } from '../hooks/useTaxonomies';
import { buildAdminPhpHref } from '../lib/utils';

export function Taxonomies() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  const { data: taxonomies, isLoading, error } = useTaxonomies();
  const deleteMutation = useDeleteTaxonomy();
  const duplicateMutation = useDuplicateTaxonomy();
  const toggleStatusMutation = useToggleTaxonomyStatus();

  // Filter taxonomies by search and status
  const filteredTaxonomies = taxonomies?.filter(tax => {
    const matchesSearch = tax.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tax.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'active') return matchesSearch && tax.status === 'publish';
    if (filterStatus === 'inactive') return matchesSearch && tax.status === 'draft';
    return matchesSearch;
  });

  const taxonomyCount = taxonomies?.length || 0;
  const activeCount = taxonomies?.filter(tax => tax.status === 'publish').length || 0;
  const inactiveCount = taxonomies?.filter(tax => tax.status === 'draft').length || 0;

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this taxonomy? This action cannot be undone.')) {
      setDeleteId(id);
      try {
        await deleteMutation.mutateAsync(id);
        const reloadUrl = window.location.origin + window.location.pathname + '?page=rdcfe-taxonomies';
        setTimeout(() => {
          window.location.href = reloadUrl;
        }, 100);
      } catch {
        setDeleteId(null);
      }
    }
  };

  const handleDuplicate = async (id: number, title: string) => {
    setDuplicatingId(id);
    try {
      const result = await duplicateMutation.mutateAsync({ id, title: `${title} (Copy)` });
      const reloadUrl = window.location.origin + window.location.pathname + '?page=rdcfe-taxonomies';
      setTimeout(() => {
        // Redirect to edit the duplicated taxonomy
        if (result?.id) {
          window.location.href = buildAdminPhpHref('rdcfe-taxonomies', `#/taxonomies/${result.id}`);
        } else {
          window.location.href = reloadUrl;
        }
      }, 100);
    } catch {
      setDuplicatingId(null);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    setTogglingId(id);
    const newStatus = currentStatus === 'publish' ? 'draft' : 'publish';
    try {
      await toggleStatusMutation.mutateAsync({ id, status: newStatus });
      const reloadUrl = window.location.origin + window.location.pathname + '?page=rdcfe-taxonomies';
      setTimeout(() => {
        window.location.href = reloadUrl;
      }, 100);
    } catch {
      setTogglingId(null);
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
            <div className="rdcfe-font-semibold">Error loading taxonomies</div>
            <div className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasTaxonomies = filteredTaxonomies && filteredTaxonomies.length > 0;

  return (
    <div className="rdcfe-animate-fade-in">
      {/* Page Header */}
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Taxonomies</h1>
          <p className="rdcfe-page-description">
            Create and manage custom taxonomies for organizing content.
          </p>
        </div>
        <Link
          to="/taxonomies/new"
          className="rdcfe-btn rdcfe-btn-primary"
          style={{ marginTop: '25px' }}
        >
          <Plus className="rdcfe-h-4 rdcfe-w-4" />
          Add Taxonomy
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
              All ({taxonomyCount})
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
              placeholder="Search taxonomies..."
              className="rdcfe-flex-1"
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasTaxonomies && (
        <div className="rdcfe-card">
          <div className="rdcfe-empty-state">
            <div className="rdcfe-empty-state-icon">
              <Tags className="rdcfe-w-full rdcfe-h-full" />
            </div>
            <h3 className="rdcfe-empty-state-title">
              {searchQuery || filterStatus !== 'all' ? 'No Results Found' : 'No Taxonomies Yet'}
            </h3>
            <p className="rdcfe-empty-state-description">
              {searchQuery 
                ? `No taxonomies match "${searchQuery}". Try a different search term.`
                : filterStatus !== 'all'
                ? `No ${filterStatus} taxonomies found.`
                : 'Create custom taxonomies to organize your content. Like categories or tags, but custom.'
              }
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Link
                to="/taxonomies/new"
                className="rdcfe-btn rdcfe-btn-primary"
              >
                <Plus className="rdcfe-h-4 rdcfe-w-4" />
                Create Taxonomy
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Taxonomies Table */}
      {hasTaxonomies && (
        <div className="rdcfe-card">
          <div className="rdcfe-table-wrapper">
            <table className="rdcfe-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Name</th>
                  <th style={{ width: '18%' }}>Slug</th>
                  <th style={{ width: '20%' }}>Post Types</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '24%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTaxonomies?.map((taxonomy) => (
                  <tr key={taxonomy.id} className="rdcfe-group">
                    <td>
                      <div className="rdcfe-data-row">
                        <div className="rdcfe-data-row-icon rdcfe-bg-[hsl(142_71%_95%)]">
                          <Tags className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(142_71%_45%)]" />
                        </div>
                        <div className="rdcfe-data-row-content">
                          <Link
                            to={`/taxonomies/${taxonomy.id}`}
                            className="rdcfe-data-row-title hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors"
                          >
                            {taxonomy.title}
                          </Link>
                          <div className="rdcfe-data-row-subtitle">
                            {taxonomy.data?.singular_label || taxonomy.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-mono rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-rounded-lg">
                        {taxonomy.slug}
                      </code>
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-1">
                        {(taxonomy.schema?.object_type || taxonomy.data?.post_types || []).map((pt: string) => (
                          <span key={pt} className="rdcfe-px-2 rdcfe-py-1 rdcfe-text-[12px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-rounded-md">
                            {pt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-justify-center">
                        <button
                        onClick={() => handleToggleStatus(taxonomy.id, taxonomy.status)}
                        disabled={togglingId === taxonomy.id}
                        className={`rdcfe-relative rdcfe-inline-flex rdcfe-h-6 rdcfe-w-11 rdcfe-flex-shrink-0 rdcfe-cursor-pointer rdcfe-rounded-full rdcfe-transition-colors rdcfe-duration-200 rdcfe-ease-in-out focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-2 disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed ${
                          taxonomy.status === 'publish' 
                            ? 'rdcfe-bg-[hsl(var(--rdcfe-success))]' 
                            : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                        }`}
                        title={taxonomy.status === 'publish' ? 'Click to disable' : 'Click to enable'}
                      >
                        <span
                          className={`rdcfe-pointer-events-none rdcfe-inline-block rdcfe-h-5 rdcfe-w-5 rdcfe-transform rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-ring-0 rdcfe-transition rdcfe-duration-200 rdcfe-ease-in-out ${
                            taxonomy.status === 'publish' ? 'rdcfe-translate-x-5' : 'rdcfe-translate-x-0'
                          }`}
                          style={{ marginTop: '2px', marginLeft: '2px' }}
                        >
                          {togglingId === taxonomy.id && (
                            <Loader2 className="rdcfe-h-5 rdcfe-w-5 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                          )}
                        </span>
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-end rdcfe-gap-1">
                        <Link
                          to={`/taxonomies/${taxonomy.id}`}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                          title="Edit"
                        >
                          <Pencil className="rdcfe-h-4 rdcfe-w-4" />
                        </Link>
                        <button 
                          onClick={() => handleDuplicate(taxonomy.id, taxonomy.title)}
                          disabled={duplicatingId === taxonomy.id}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                          title="Duplicate"
                        >
                          {duplicatingId === taxonomy.id ? (
                            <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                          ) : (
                            <Copy className="rdcfe-h-4 rdcfe-w-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDelete(taxonomy.id)}
                          disabled={deleteId === taxonomy.id}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                          title="Delete"
                        >
                          {deleteId === taxonomy.id ? (
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
              Showing {filteredTaxonomies?.length} of {taxonomyCount} taxonomies
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
