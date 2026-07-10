import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  Database,
  Filter,
  Layers,
  ListOrdered,
  Zap,
  Play,
  Code2,
  HelpCircle,
  Info,
  Trash2,
  Link2,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { useNotificationToast } from '../components/ui/notification-toast';
import { useProContext } from '../contexts/ProContext';
import { ProModuleGate } from '../components/ui/pro-feature-gate';
import {
  createDefaultQueryFormData,
  useCreateQuery,
  useDeleteQuery,
  useQueryConfig,
  useUpdateQuery,
  type QueryFormData,
} from '../hooks/useQueries';
import type { QueryConfigData } from '../services/api';

import { SourceTab } from '../components/query-builder/SourceTab';
import { FiltersTab } from '../components/query-builder/FiltersTab';
import { RelationsTab } from '../components/query-builder/RelationsTab';
import { TaxMetaTab } from '../components/query-builder/TaxMetaTab';
import { OrderPaginationTab } from '../components/query-builder/OrderPaginationTab';
import { AIGenerateButton } from '../components/ai-assistant/AIGenerateButton';
import { MacrosTab } from '../components/query-builder/MacrosTab';
import { PreviewTab } from '../components/query-builder/PreviewTab';
import { QueryJsonView } from '../components/query-builder/QueryJsonView';

type TabId =
  | 'source'
  | 'filters'
  | 'tax_meta'
  | 'relations'
  | 'order_pagination'
  | 'macros'
  | 'preview'
  | 'json';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'source', label: 'Source', icon: <Database className="rdcfe-w-4 rdcfe-h-4" /> },
  { id: 'filters', label: 'Filters', icon: <Filter className="rdcfe-w-4 rdcfe-h-4" /> },
  {
    id: 'tax_meta',
    label: 'Tax & meta',
    icon: <Layers className="rdcfe-w-4 rdcfe-h-4" />,
  },
  { id: 'relations', label: 'Relations', icon: <Link2 className="rdcfe-w-4 rdcfe-h-4" /> },
  {
    id: 'order_pagination',
    label: 'Order & paging',
    icon: <ListOrdered className="rdcfe-w-4 rdcfe-h-4" />,
  },
  { id: 'macros', label: 'Macros', icon: <Zap className="rdcfe-w-4 rdcfe-h-4" /> },
  { id: 'preview', label: 'Preview', icon: <Play className="rdcfe-w-4 rdcfe-h-4" /> },
  { id: 'json', label: 'JSON', icon: <Code2 className="rdcfe-w-4 rdcfe-h-4" /> },
];

export function QueryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotificationToast();
  const { isPro } = useProContext();

  const queryId = id ? Number.parseInt(id, 10) : null;
  const isEditing = !!queryId;

  const [formData, setFormData] = useState<QueryFormData>(() => createDefaultQueryFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabId>('source');

  const { data: existing, isLoading: isLoadingExisting } = useQueryConfig(queryId);
  const createMutation = useCreateQuery();
  const updateMutation = useUpdateQuery();
  const deleteMutation = useDeleteQuery();

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isLoading = isLoadingExisting && isEditing;

  useEffect(() => {
    if (existing?.form && isEditing) {
      setFormData(existing.form);
    }
  }, [existing?.form, isEditing]);

  const setData = (updater: (prev: QueryConfigData) => QueryConfigData) => {
    setFormData((prev) => ({ ...prev, data: updater(prev.data) }));
  };

  // Cheap counters used in the sidebar summary card.
  const counters = useMemo(() => {
    const d = formData.data;
    return {
      taxRows: d.tax_query?.queries?.length ?? 0,
      metaRows: d.meta_query?.queries?.length ?? 0,
      relationRows: d.relation_query?.queries?.length ?? 0,
      includeIds: d.filters?.include_ids?.length ?? 0,
      excludeIds: d.filters?.exclude_ids?.length ?? 0,
    };
  }, [formData.data]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.title.trim()) {
      next.title = 'Title is required';
    }
    const t = formData.data.query_type;
    if (t === 'terms' && !(formData.data.source.taxonomies?.length)) {
      next.source = 'Pick at least one taxonomy on the Source tab';
    }
    if (
      (formData.data.orderby === 'meta_value' || formData.data.orderby === 'meta_value_num') &&
      !formData.data.orderby_meta_key?.trim()
    ) {
      next.orderby_meta_key = 'A meta key is required when ordering by meta_value';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const messages = Object.values(errors).filter(Boolean);
      if (errors.title) setActiveTab('source');
      if (errors.source) setActiveTab('source');
      if (errors.orderby_meta_key) setActiveTab('order_pagination');
      showToast('error', messages.length ? messages.join('. ') : 'Please fix validation errors.');
      return;
    }

    try {
      if (isEditing && queryId) {
        await updateMutation.mutateAsync({ id: queryId, data: formData });
        showToast('success', 'Query updated.');
      } else {
        const result = await createMutation.mutateAsync(formData);
        showToast('success', 'Query created.');
        if (result?.id) {
          window.setTimeout(() => navigate(`/queries/${result.id}`), 400);
        }
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save query.');
    }
  };

  const handleDelete = async () => {
    if (!queryId) return;
    if (!window.confirm('Delete this saved query? This cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(queryId);
      showToast('success', 'Query deleted.');
      navigate('/queries');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete query.');
    }
  };

  const handleAIAccept = (suggestion: Record<string, unknown>) => {
    if (suggestion.title) setFormData(prev => ({ ...prev, title: String(suggestion.title) }));
    if (suggestion.description) setFormData(prev => ({ ...prev, description: String(suggestion.description) }));
    if (suggestion.query_type) {
      setData(prev => ({ ...prev, query_type: String(suggestion.query_type) as QueryConfigData['query_type'] }));
    }
    if (suggestion.source && typeof suggestion.source === 'object') {
      const src = suggestion.source as Record<string, unknown>;
      setData(prev => ({
        ...prev,
        source: {
          ...prev.source,
          ...(Array.isArray(src.post_types) ? { post_types: src.post_types as string[] } : {}),
          ...(Array.isArray(src.status) ? { status: src.status as string[] } : {}),
        },
      }));
    }
    if (suggestion.orderby) setData(prev => ({ ...prev, orderby: String(suggestion.orderby) }));
    if (suggestion.order) setData(prev => ({ ...prev, order: String(suggestion.order) as 'ASC' | 'DESC' }));
    if (suggestion.posts_per_page) setData(prev => ({ ...prev, posts_per_page: Number(suggestion.posts_per_page) }));
    if ('ignore_sticky_posts' in suggestion) {
      setData(prev => ({
        ...prev,
        ignore_sticky_posts: Boolean(suggestion.ignore_sticky_posts),
      }));
    }
    showToast('success', 'AI suggestions applied to form');
  };

  if (!isPro) {
    return (
      <ProModuleGate module="query_builder" moduleName="Query Builder">
        <div className="rdcfe-card rdcfe-p-6">
          <h2 className="rdcfe-text-[18px] rdcfe-font-bold">Query Builder Editor</h2>
          <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            Build dynamic queries with filters, taxonomies, meta values, ordering, macros, and live
            previews. Available in Pro.
          </p>
        </div>
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

  return (
    <form onSubmit={handleSubmit}>
      {/* Page Header */}
      <div className="rdcfe-mb-8">
        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-justify-between rdcfe-gap-4 rdcfe-mb-3">
          <div className="rdcfe-flex rdcfe-min-w-0 rdcfe-flex-1 rdcfe-items-center rdcfe-gap-4">
            <button
              type="button"
              onClick={() => navigate('/queries')}
              className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
            >
              <ArrowLeft className="rdcfe-w-5 rdcfe-h-5" />
            </button>
            <div>
              <h1 className="rdcfe-text-[24px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-tracking-tight">
                {isEditing ? 'Edit Query' : 'Add New Query'}
              </h1>
              <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
                {isEditing
                  ? 'Tune sources, filters, ordering, and macros — preview in real-time.'
                  : 'Build a reusable query you can drop into listings, related-content blocks, or shortcodes.'}
              </p>
            </div>
          </div>
          <AIGenerateButton
            module="query"
            context={isEditing && formData.title ? { existing_slug: formData.title } : undefined}
            onAccept={handleAIAccept}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-[minmax(0,1fr)_minmax(0,320px)] rdcfe-gap-6">
        {/* Main Content */}
        <div className="rdcfe-min-w-0 rdcfe-space-y-6">
          {/* Quick Setup */}
          <div className="rdcfe-card rdcfe-p-6">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-5">
              <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                <Database className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
              </div>
              <div>
                <h2 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  Quick Setup
                </h2>
                <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Name your query — everything else lives in the tabs below.
                </p>
              </div>
            </div>

            <div>
              <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                Query Title <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, title: e.target.value }));
                  if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                }}
                placeholder="e.g. Featured Properties, Recent Events, My Submissions"
                error={!!errors.title}
                className="rdcfe-text-[15px]"
              />
              {errors.title && (
                <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                  {errors.title}
                </p>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="rdcfe-flex rdcfe-gap-1 rdcfe-p-1.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-xl rdcfe-overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2.5 rdcfe-rounded-lg rdcfe-text-[13px] rdcfe-font-medium rdcfe-transition-all rdcfe-duration-200 rdcfe-whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                    : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Body */}
          {activeTab === 'source' && <SourceTab data={formData.data} setData={setData} />}
          {activeTab === 'filters' && <FiltersTab data={formData.data} setData={setData} />}
          {activeTab === 'tax_meta' && <TaxMetaTab data={formData.data} setData={setData} />}
          {activeTab === 'relations' && <RelationsTab data={formData.data} setData={setData} />}
          {activeTab === 'order_pagination' && (
            <OrderPaginationTab data={formData.data} setData={setData} />
          )}
          {activeTab === 'macros' && <MacrosTab />}
          {activeTab === 'preview' && <PreviewTab data={formData.data} setData={setData} />}
          {activeTab === 'json' && <QueryJsonView data={formData.data} setData={setData} />}
        </div>

        {/* Sidebar */}
        <div className="rdcfe-form-sidebar rdcfe-form-sidebar--grid">
          {/* Save Card */}
          <div className="rdcfe-card rdcfe-p-6 rdcfe-mb-5">
            <button
              type="submit"
              disabled={isSaving}
              className="rdcfe-btn rdcfe-btn-primary rdcfe-w-full rdcfe-py-3.5 rdcfe-text-[15px]"
            >
              {isSaving ? (
                <Loader2 className="rdcfe-w-5 rdcfe-h-5 rdcfe-animate-spin" />
              ) : (
                <Save className="rdcfe-w-5 rdcfe-h-5" />
              )}
              {isEditing ? 'Update Query' : 'Create Query'}
            </button>

            <div className="rdcfe-mt-4">
              <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-2 rdcfe-block">
                Status
              </label>
              <div className="rdcfe-flex rdcfe-gap-1 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg">
                {(['publish', 'draft'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, status }))
                    }
                    className={`rdcfe-flex-1 rdcfe-px-3 rdcfe-py-1.5 rdcfe-rounded-md rdcfe-text-[12px] rdcfe-font-medium rdcfe-transition-all ${
                      formData.status === status
                        ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                        : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                    }`}
                  >
                    {status === 'publish' ? 'Active' : 'Draft'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
              <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-3">
                Summary
              </div>
              <div className="rdcfe-space-y-2">
                <SummaryRow
                  label="Type"
                  value={formData.data.query_type}
                  tone="primary"
                />
                {counters.taxRows > 0 && (
                  <SummaryRow label="Tax rules" value={counters.taxRows} tone="orange" />
                )}
                {counters.metaRows > 0 && (
                  <SummaryRow label="Meta rules" value={counters.metaRows} tone="purple" />
                )}
                {counters.relationRows > 0 && (
                  <SummaryRow label="Relation rules" value={counters.relationRows} tone="primary" />
                )}
                {counters.includeIds > 0 && (
                  <SummaryRow label="Include IDs" value={counters.includeIds} tone="success" />
                )}
                {counters.excludeIds > 0 && (
                  <SummaryRow label="Exclude IDs" value={counters.excludeIds} tone="destructive" />
                )}
                <SummaryRow
                  label="Per page"
                  value={formData.data.posts_per_page === -1 ? 'all' : formData.data.posts_per_page ?? 10}
                  tone="default"
                />
              </div>
            </div>

            {isEditing && (
              <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="rdcfe-btn rdcfe-btn-ghost rdcfe-w-full rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="rdcfe-w-4 rdcfe-h-4 rdcfe-animate-spin" />
                  ) : (
                    <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
                  )}
                  Delete Query
                </button>
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="rdcfe-card rdcfe-p-6">
            <h3 className="rdcfe-text-[14px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-4">
              <HelpCircle className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
              Quick Tips
            </h3>
            <ul className="rdcfe-space-y-2.5 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">1</span>
                <span>
                  Use <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">Macros</strong> like{' '}
                  <code>{`{{current_post_id}}`}</code> for context-aware queries.
                </span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">2</span>
                <span>
                  The <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">Meta Query</strong> dropdown is
                  field-aware — pick from your Field Group keys.
                </span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">3</span>
                <span>
                  Run the <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">Preview</strong> tab before
                  saving — health warnings appear there.
                </span>
              </li>
            </ul>
          </div>

          {/* Hint about React Query cache. The icon + text live as two
              flex children — the text itself is a single <span> so that
              <strong> stays inline rather than becoming its own flex
              item (which would shove the trailing "to persist." onto a
              third column). */}
          <div className="rdcfe-mt-4 rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
            <Info className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
            <span>
              Edits autosave to the form — hit{' '}
              <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">Update Query</strong>{' '}
              to persist.
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'primary' | 'success' | 'destructive' | 'orange' | 'purple' | 'default';
}) {
  const tones: Record<typeof tone, { bg: string; fg: string }> = {
    primary: { bg: 'hsl(var(--rdcfe-primary)/0.1)', fg: 'hsl(var(--rdcfe-primary))' },
    success: { bg: 'hsl(var(--rdcfe-success)/0.1)', fg: 'hsl(var(--rdcfe-success))' },
    destructive: { bg: 'hsl(0 84% 96%)', fg: 'hsl(0 84% 50%)' },
    orange: { bg: 'hsl(38 92% 96%)', fg: 'hsl(38 92% 40%)' },
    purple: { bg: 'hsl(262 83% 58% / 0.1)', fg: 'hsl(262 83% 58%)' },
    default: { bg: 'hsl(var(--rdcfe-muted))', fg: 'hsl(var(--rdcfe-muted-foreground))' },
  };
  const t = tones[tone];
  return (
    <div className="rdcfe-flex rdcfe-justify-between rdcfe-items-center rdcfe-py-2 rdcfe-px-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
      <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">{label}</span>
      <span
        className="rdcfe-font-semibold rdcfe-px-2.5 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[12px]"
        style={{ background: t.bg, color: t.fg }}
      >
        {value}
      </span>
    </div>
  );
}
