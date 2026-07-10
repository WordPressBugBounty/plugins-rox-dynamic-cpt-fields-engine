import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Search, Pencil, Trash2, Loader2, AlertCircle, Crown, Copy } from 'lucide-react';
import { useOptionsPages, useDeleteOptionsPage, useToggleOptionsPageStatus, useDuplicateOptionsPage } from '../hooks/useOptionsPages';
import { useProContext } from '../contexts/ProContext';
import { FREE_LIMITS } from '../lib/pro-features';
import { buildAdminPhpHref } from '../lib/utils';
import { UpgradeModal } from '../components/ui/upgrade-modal';

export function OptionsPages() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { data: optionsPages, isLoading, error } = useOptionsPages();
  const deleteMutation = useDeleteOptionsPage();
  const toggleStatusMutation = useToggleOptionsPageStatus();
  const duplicateMutation = useDuplicateOptionsPage();
  const { isPro } = useProContext();
  
  // Check if free limit is reached
  const optionsPageCount = optionsPages?.length || 0;
  const isLimitReached = !isPro && optionsPageCount >= FREE_LIMITS.options_pages;

  // Filter options pages by search and status
  const filteredOptionsPages = optionsPages?.filter(op => {
    const matchesSearch = op.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (op.schema?.menu_slug || op.data?.menu_slug as string || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'active') return matchesSearch && op.status === 'publish';
    if (filterStatus === 'inactive') return matchesSearch && op.status === 'draft';
    return matchesSearch;
  });

  const activeCount = optionsPages?.filter(op => op.status === 'publish').length || 0;
  const inactiveCount = optionsPages?.filter(op => op.status === 'draft').length || 0;
  
  // Handle add button click
  const handleAddClick = () => {
    if (isLimitReached) {
      setShowUpgradeModal(true);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this options page? This action cannot be undone.')) {
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
      // Reload to refresh WordPress admin menu (registered options pages).
      const reloadUrl = window.location.origin + window.location.pathname + '?page=rdcfe-options-pages';
      setTimeout(() => {
        window.location.href = reloadUrl;
      }, 100);
    } catch {
      setTogglingId(null);
    }
  };

  const handleDuplicate = async (id: number, title: string) => {
    if (isLimitReached) {
      setShowUpgradeModal(true);
      return;
    }
    setDuplicatingId(id);
    try {
      const result = await duplicateMutation.mutateAsync({ id, title: `${title} (Copy)` });
      if (result?.id) {
        // Open the duplicated options page for editing.
        navigate(`/options-pages/${result.id}`);
        // Reload to refresh WordPress admin menu (newly registered page).
        setTimeout(() => {
          window.location.href = buildAdminPhpHref('rdcfe-options-pages', `#/options-pages/${result.id}`);
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
            <div className="rdcfe-font-semibold">Error loading options pages</div>
            <div className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasOptionsPages = filteredOptionsPages && filteredOptionsPages.length > 0;

  return (
    <div className="rdcfe-animate-fade-in">
      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="Unlimited Options Pages"
        featureCategory="general"
      />

      {/* Page Header */}
      <div className="rdcfe-page-header">
        <div className="rdcfe-page-header-content">
          <h1 className="rdcfe-page-title">Options Pages</h1>
          <p className="rdcfe-page-description">
            Create and manage options pages for global site settings.
            {!isPro && (
              <span className="rdcfe-ml-2 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                ({optionsPageCount}/{FREE_LIMITS.options_pages} used)
              </span>
            )}
          </p>
        </div>
        {isLimitReached ? (
          <button
            onClick={handleAddClick}
            className="rdcfe-btn rdcfe-btn-primary rdcfe-gap-2"
            style={{ marginTop: '25px' }}
          >
            <Crown className="rdcfe-h-4 rdcfe-w-4" />
            Upgrade to Add More
          </button>
        ) : (
          <Link
            to="/options-pages/new"
            className="rdcfe-btn rdcfe-btn-primary"
            style={{ marginTop: '25px' }}
          >
            <Plus className="rdcfe-h-4 rdcfe-w-4" />
            Add Options Page
          </Link>
        )}
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
              All ({optionsPageCount})
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
              placeholder="Search options pages..."
              className="rdcfe-flex-1"
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasOptionsPages && (
        <div className="rdcfe-card">
          <div className="rdcfe-empty-state">
            <div className="rdcfe-empty-state-icon">
              <FileText className="rdcfe-w-full rdcfe-h-full" />
            </div>
            <h3 className="rdcfe-empty-state-title">
              {searchQuery || filterStatus !== 'all' ? 'No Results Found' : 'No Options Pages Yet'}
            </h3>
            <p className="rdcfe-empty-state-description">
              {searchQuery 
                ? `No options pages match "${searchQuery}". Try a different search term.`
                : filterStatus !== 'all'
                ? `No ${filterStatus} options pages found.`
                : 'Create options pages to manage global site settings. Perfect for theme options, API keys, and configurations.'
              }
            </p>
            {!searchQuery && filterStatus === 'all' && (
              isLimitReached ? (
                <button
                  onClick={handleAddClick}
                  className="rdcfe-btn rdcfe-btn-primary rdcfe-gap-2"
                >
                  <Crown className="rdcfe-h-4 rdcfe-w-4" />
                  Upgrade to Add More
                </button>
              ) : (
                <Link
                  to="/options-pages/new"
                  className="rdcfe-btn rdcfe-btn-primary"
                >
                  <Plus className="rdcfe-h-4 rdcfe-w-4" />
                  Create Options Page
                </Link>
              )
            )}
          </div>
        </div>
      )}

      {/* Options Pages Table */}
      {hasOptionsPages && (
        <div className="rdcfe-card">
          <div className="rdcfe-table-wrapper">
            <table className="rdcfe-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Name</th>
                  <th>Menu Slug</th>
                  <th>Capability</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Status</th>
                  <th className="rdcfe-text-right" style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOptionsPages?.map((optionsPage) => (
                  <tr key={optionsPage.id} className="rdcfe-group">
                    <td>
                      <div className="rdcfe-data-row">
                        <div className="rdcfe-data-row-icon rdcfe-bg-[hsl(38_92%_96%)]">
                          <FileText className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(38_92%_50%)]" />
                        </div>
                        <div className="rdcfe-data-row-content">
                          <Link
                            to={`/options-pages/${optionsPage.id}`}
                            className="rdcfe-data-row-title hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors"
                          >
                            {optionsPage.title}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[13px] rdcfe-font-mono rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-rounded-lg">
                        {optionsPage.schema?.menu_slug || (optionsPage.data?.menu_slug as string) || '-'}
                      </code>
                    </td>
                    <td>
                      <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                        {optionsPage.schema?.capability || (optionsPage.data?.capability as string) || 'manage_options'}
                      </span>
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-justify-center">
                        <button
                          onClick={() => handleToggleStatus(optionsPage.id, optionsPage.status)}
                          disabled={togglingId === optionsPage.id}
                          className={`rdcfe-relative rdcfe-inline-flex rdcfe-h-6 rdcfe-w-11 rdcfe-flex-shrink-0 rdcfe-cursor-pointer rdcfe-rounded-full rdcfe-transition-colors rdcfe-duration-200 rdcfe-ease-in-out focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-2 disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed ${
                            optionsPage.status === 'publish'
                              ? 'rdcfe-bg-[hsl(var(--rdcfe-success))]'
                              : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                          }`}
                          title={optionsPage.status === 'publish' ? 'Click to disable' : 'Click to enable'}
                        >
                          <span
                            className={`rdcfe-pointer-events-none rdcfe-inline-block rdcfe-h-5 rdcfe-w-5 rdcfe-transform rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-ring-0 rdcfe-transition rdcfe-duration-200 rdcfe-ease-in-out ${
                              optionsPage.status === 'publish' ? 'rdcfe-translate-x-5' : 'rdcfe-translate-x-0'
                            }`}
                            style={{ marginTop: '2px', marginLeft: '2px' }}
                          >
                            {togglingId === optionsPage.id && (
                              <Loader2 className="rdcfe-h-5 rdcfe-w-5 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                            )}
                          </span>
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-end rdcfe-gap-1">
                        <Link
                          to={`/options-pages/${optionsPage.id}`}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                          title="Edit"
                        >
                          <Pencil className="rdcfe-h-4 rdcfe-w-4" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(optionsPage.id, optionsPage.title)}
                          disabled={duplicatingId === optionsPage.id}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                          title={isLimitReached ? 'Upgrade to duplicate options pages' : 'Duplicate'}
                        >
                          {duplicatingId === optionsPage.id ? (
                            <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                          ) : (
                            <Copy className="rdcfe-h-4 rdcfe-w-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDelete(optionsPage.id)}
                          disabled={deleteId === optionsPage.id}
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                          title="Delete"
                        >
                          {deleteId === optionsPage.id ? (
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
              Showing {filteredOptionsPages?.length} of {optionsPageCount} options pages
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
