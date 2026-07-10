import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileType, Search, Pencil, Trash2, Loader2, Copy, AlertCircle, Database } from 'lucide-react';
import { usePostTypes, useDeletePostType, useTogglePostTypeStatus, useDuplicatePostType } from '../hooks/usePostTypes';
import { buildAdminPhpHref } from '../lib/utils';

const ITEMS_PER_PAGE = 10;

// Helper function to count actual fields (excluding tabs, accordions, endpoints)
function getFieldsCount(metaFields: Array<{ object_type?: string }> | undefined): number {
  if (!metaFields || !Array.isArray(metaFields)) return 0;
  return metaFields.filter((field) => 
    field.object_type === 'field' || !field.object_type
  ).length;
}

export function PostTypes() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data: postTypes, isLoading, error } = usePostTypes();
  const deleteMutation = useDeletePostType();
  const toggleStatusMutation = useTogglePostTypeStatus();
  const duplicateMutation = useDuplicatePostType();

  // Filter post types by search and status
  const filteredPostTypes = postTypes?.filter(pt => {
    const matchesSearch = pt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pt.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'active') return matchesSearch && pt.status === 'publish';
    if (filterStatus === 'inactive') return matchesSearch && pt.status === 'draft';
    return matchesSearch;
  });

  // Pagination calculations
  const totalFilteredItems = filteredPostTypes?.length || 0;
  const totalPages = Math.ceil(totalFilteredItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPostTypes = filteredPostTypes?.slice(startIndex, endIndex);

  // Reset to page 1 when filter or search changes
  const handleFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const postTypeCount = postTypes?.length || 0;
  const activeCount = postTypes?.filter(pt => pt.status === 'publish').length || 0;
  const inactiveCount = postTypes?.filter(pt => pt.status === 'draft').length || 0;

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this post type? This action cannot be undone.')) {
      setDeleteId(id);
      try {
        await deleteMutation.mutateAsync(id);
        const reloadUrl = window.location.origin + window.location.pathname + '?page=rdcfe-post-types';
        setTimeout(() => {
          window.location.href = reloadUrl;
        }, 100);
      } catch {
        setDeleteId(null);
      }
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    setTogglingId(id);
    const newStatus = currentStatus === 'publish' ? 'draft' : 'publish';
    try {
      await toggleStatusMutation.mutateAsync({ id, status: newStatus });
      const reloadUrl = window.location.origin + window.location.pathname + '?page=rdcfe-post-types';
      setTimeout(() => {
        window.location.href = reloadUrl;
      }, 100);
    } catch {
      setTogglingId(null);
    }
  };

  const handleDuplicate = async (id: number, title: string) => {
    setDuplicatingId(id);
    try {
      const result = await duplicateMutation.mutateAsync({ id, title: `${title} (Copy)` });
      if (result?.id) {
        // Redirect to edit the duplicated post type
        navigate(`/post-types/${result.id}`);
        // Reload to refresh WordPress menu
        setTimeout(() => {
          window.location.href = buildAdminPhpHref('rdcfe-post-types', `#/post-types/${result.id}`);
        }, 100);
      }
    } catch {
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
            <div className="rdcfe-font-semibold">Error loading post types</div>
            <div className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasPostTypes = filteredPostTypes && filteredPostTypes.length > 0;

  return (
    <div className="rdcfe-animate-fade-in">
      {/* Page Header */}
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Post Types</h1>
          <p className="rdcfe-page-description">
            Create and manage custom post types for your WordPress site.
          </p>
        </div>
        <Link
          to="/post-types/new"
          className="rdcfe-btn rdcfe-btn-primary"
          style={{ marginTop: '25px' }}
        >
          <Plus className="rdcfe-h-4 rdcfe-w-4" />
          Add Post Type
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="rdcfe-card rdcfe-p-4 rdcfe-mb-6">
        <div className="rdcfe-flex rdcfe-flex-col sm:rdcfe-flex-row rdcfe-items-start sm:rdcfe-items-center rdcfe-gap-4">
          {/* Filter Tabs - First */}
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg">
            <button
              onClick={() => handleFilterChange('all')}
              className={`rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-medium rdcfe-rounded-md rdcfe-transition-all ${
                filterStatus === 'all'
                  ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                  : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
              }`}
            >
              All ({postTypeCount})
            </button>
            <button
              onClick={() => handleFilterChange('active')}
              className={`rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-medium rdcfe-rounded-md rdcfe-transition-all ${
                filterStatus === 'active'
                  ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                  : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => handleFilterChange('inactive')}
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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search post types..."
              className="rdcfe-flex-1"
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasPostTypes && (
        <div className="rdcfe-card">
          <div className="rdcfe-empty-state">
            <div className="rdcfe-empty-state-icon">
              <FileType className="rdcfe-w-full rdcfe-h-full" />
            </div>
            <h3 className="rdcfe-empty-state-title">
              {searchQuery || filterStatus !== 'all' ? 'No Results Found' : 'No Post Types Yet'}
            </h3>
            <p className="rdcfe-empty-state-description">
              {searchQuery 
                ? `No post types match "${searchQuery}". Try a different search term.`
                : filterStatus !== 'all'
                ? `No ${filterStatus} post types found.`
                : 'Get started by creating your first custom post type. Define content like Products, Events, or Properties.'
              }
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Link
                to="/post-types/new"
                className="rdcfe-btn rdcfe-btn-primary"
              >
                <Plus className="rdcfe-h-4 rdcfe-w-4" />
                Create Post Type
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Post Types Table */}
      {hasPostTypes && (
        <div className="rdcfe-card">
          <div className="rdcfe-table-wrapper">
            <table className="rdcfe-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Post Type</th>
                  <th style={{ width: '22%' }}>Slug</th>
                  <th style={{ width: '15%' }}>Fields</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '23%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPostTypes?.map((postType) => (
                  <tr key={postType.id} className="rdcfe-group">
                    <td>
                      <div className="rdcfe-data-row">
                        <div className="rdcfe-data-row-icon rdcfe-bg-[hsl(var(--rdcfe-accent))]">
                          <span 
                            className={`dashicons ${postType.data?.menu_icon || 'dashicons-admin-post'}`}
                            style={{ fontSize: '18px', width: '18px', height: '18px', color: 'hsl(var(--rdcfe-primary))' }}
                          />
                        </div>
                        <div className="rdcfe-data-row-content">
                          <Link
                            to={`/post-types/${postType.id}`}
                            className="rdcfe-data-row-title hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors"
                          >
                            {postType.title}
                          </Link>
                          <div className="rdcfe-data-row-subtitle">
                            {postType.data?.singular_label || postType.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-mono rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-rounded-lg">
                        {postType.slug}
                      </code>
                    </td>
                    <td>
                      {(() => {
                        const fieldsCount = getFieldsCount(postType.data?.meta_fields as Array<{ object_type?: string }> | undefined);
                        return fieldsCount > 0 ? (
                          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                            <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[12px] rdcfe-font-medium rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-rounded-full">
                              <Database className="rdcfe-w-3 rdcfe-h-3" />
                              {fieldsCount} {fieldsCount === 1 ? 'field' : 'fields'}
                            </span>
                          </div>
                        ) : (
                          <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">—</span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-justify-center">
                        <button
                        onClick={() => handleToggleStatus(postType.id, postType.status)}
                        disabled={togglingId === postType.id}
                        className={`rdcfe-relative rdcfe-inline-flex rdcfe-h-6 rdcfe-w-11 rdcfe-flex-shrink-0 rdcfe-cursor-pointer rdcfe-rounded-full rdcfe-transition-colors rdcfe-duration-200 rdcfe-ease-in-out focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-2 disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed ${
                          postType.status === 'publish' 
                            ? 'rdcfe-bg-[hsl(var(--rdcfe-success))]' 
                            : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                        }`}
                        title={postType.status === 'publish' ? 'Click to disable' : 'Click to enable'}
                      >
                        <span
                          className={`rdcfe-pointer-events-none rdcfe-inline-block rdcfe-h-5 rdcfe-w-5 rdcfe-transform rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-ring-0 rdcfe-transition rdcfe-duration-200 rdcfe-ease-in-out ${
                            postType.status === 'publish' ? 'rdcfe-translate-x-5' : 'rdcfe-translate-x-0'
                          }`}
                          style={{ marginTop: '2px', marginLeft: '2px' }}
                        >
                          {togglingId === postType.id && (
                            <Loader2 className="rdcfe-h-5 rdcfe-w-5 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                          )}
                        </span>
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-end rdcfe-gap-1">
                        <Link
                          to={`/post-types/${postType.id}`}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                          title="Edit"
                        >
                          <Pencil className="rdcfe-h-4 rdcfe-w-4" />
                        </Link>
                        <button 
                          onClick={() => handleDuplicate(postType.id, postType.title)}
                          disabled={duplicatingId === postType.id}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                          title="Duplicate"
                        >
                          {duplicatingId === postType.id ? (
                            <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                          ) : (
                            <Copy className="rdcfe-h-4 rdcfe-w-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDelete(postType.id)}
                          disabled={deleteId === postType.id}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                          title="Delete"
                        >
                          {deleteId === postType.id ? (
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
              Showing {Math.min(startIndex + 1, totalFilteredItems)}-{Math.min(endIndex, totalFilteredItems)} of {totalFilteredItems} post types
            </div>
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
              <button 
                className="rdcfe-btn rdcfe-btn-secondary rdcfe-btn-sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-px-2">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button 
                className="rdcfe-btn rdcfe-btn-secondary rdcfe-btn-sm" 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
