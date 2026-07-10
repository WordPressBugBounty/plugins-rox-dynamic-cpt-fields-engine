/**
 * Listing Grid Form.
 *
 * Authors point a saved Pro Query at a saved Listing Template and
 * pick column / gap / pagination / empty-state settings. Live preview
 * hits `POST /listings/preview` with the same draft config the Save
 * button would persist.
 *
 * Layout matches the rest of the React admin (gradient-headed cards,
 * sidebar Save column) so the grid form reads as a sibling of the
 * template builder rather than a different surface.
 *
 * The shortcode + Gutenberg block + Elementor widget embed snippets surface inside an "Embed"
 * card that only appears once the grid has been saved at least once
 * (an unsaved listing has no ID for the shortcode to reference).
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  Grid3x3,
  Trash2,
  Info,
  HelpCircle,
  Copy,
  Check,
  Eye,
  RefreshCw,
  Database,
  LayoutTemplate,
  Sliders,
  Plus,
} from 'lucide-react';
import { Input, Select, Textarea, type SelectOption } from '../components/ui';
import { useNotificationToast } from '../components/ui/notification-toast';
import { useProContext } from '../contexts/ProContext';
import { ProModuleGate } from '../components/ui/pro-feature-gate';
import {
  createDefaultGridFormData,
  useCreateListing,
  useDeleteListing,
  useListing,
  useListingTemplates,
  usePreviewDraftListing,
  useUpdateListing,
  type ListingFormData,
} from '../hooks/useListings';
import { useQueries, useQueryMetaKeys } from '../hooks/useQueries';
import { useRelations } from '../hooks/useRelations';
import type { ListingConfigData } from '../services/api';
import { VisibilityRulesBuilder } from '../components/listing-builder/visibility/VisibilityRulesBuilder';

const PAGINATION_OPTIONS: Array<{ value: NonNullable<ListingConfigData['pagination']>; label: string; hint: string }> = [
  { value: 'none', label: 'None', hint: 'Show only the first page worth of results.' },
  { value: 'numeric', label: 'Numeric', hint: 'Render 1 / 2 / 3 … page links below the grid.' },
  { value: 'load_more', label: 'Load More', hint: 'AJAX-paginated button (V1.1 — falls back to numeric on the front-end for now).' },
];

const COLUMN_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Small generic debounce — copied locally to avoid pulling lodash and
 * to match the implementation used inside `CanvasPreview.tsx`.
 */
function useDebounced<T>(value: T, delay = 600): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function ListingGridForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotificationToast();
  const { isPro } = useProContext();

  const listingId = id ? Number.parseInt(id, 10) : null;
  const isEditing = !!listingId;

  const [formData, setFormData] = useState<ListingFormData>(() => createDefaultGridFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoPreview, setAutoPreview] = useState(true);
  const [shortcodeCopied, setShortcodeCopied] = useState(false);

  const { data: existing, isLoading: isLoadingExisting } = useListing(listingId);
  const { data: templates = [], isLoading: isLoadingTemplates } = useListingTemplates();
  const { data: queries = [], isLoading: isLoadingQueries } = useQueries('publish');
  const { data: relations = [] } = useRelations('publish');
  const { data: metaKeysResponse } = useQueryMetaKeys();

  const relationOptions = useMemo(
    () =>
      relations.map((r) => ({
        value: r.data.slug,
        label: r.title || r.data.slug,
      })),
    [relations]
  );
  const metaKeyOptions = useMemo(
    () => (metaKeysResponse?.meta_keys ?? []).map((k) => ({ value: k, label: k })),
    [metaKeysResponse?.meta_keys]
  );

  const createMutation = useCreateListing();
  const updateMutation = useUpdateListing();
  const deleteMutation = useDeleteListing();
  const previewMutation = usePreviewDraftListing();

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isLoading =
    (isLoadingExisting && isEditing) || isLoadingTemplates || isLoadingQueries;

  useEffect(() => {
    if (existing?.form && isEditing) {
      const form = existing.form;
      // Coerce a stray template into a grid shape so the form doesn't
      // crash if the user followed a stale URL.
      if (form.data.listing_type !== 'grid') {
        setFormData({
          ...form,
          data: { ...form.data, listing_type: 'grid' },
        });
      } else {
        setFormData(form);
      }
    }
  }, [existing?.form, isEditing]);

  const setData = (updater: (prev: ListingConfigData) => ListingConfigData) => {
    setFormData((prev) => ({ ...prev, data: updater(prev.data) }));
  };

  const templateOptions: SelectOption[] = [
    { value: '0', label: '— Pick a template —' },
    ...templates.map((tpl) => ({ value: String(tpl.id), label: tpl.title || `#${tpl.id}` })),
  ];

  const queryOptions: SelectOption[] = [
    { value: '0', label: '— Select a saved query —' },
    ...queries.map((q) => ({ value: String(q.id), label: q.title || `#${q.id}` })),
  ];

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.title.trim()) {
      next.title = 'Title is required';
    }
    if (!formData.data.template_id) {
      next.template_id = 'Pick a Listing Template';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const messages = Object.values(errors).filter(Boolean);
      showToast('error', messages.length ? messages.join('. ') : 'Please fix validation errors.');
      return;
    }

    try {
      if (isEditing && listingId) {
        await updateMutation.mutateAsync({ id: listingId, data: formData });
        showToast('success', 'Grid updated.');
      } else {
        const result = await createMutation.mutateAsync(formData);
        showToast('success', 'Grid created.');
        if (result?.id) {
          window.setTimeout(() => navigate(`/listings/grid/${result.id}`), 400);
        }
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save grid.');
    }
  };

  const handleDelete = async () => {
    if (!listingId) return;
    if (!window.confirm('Delete this grid? This cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(listingId);
      showToast('success', 'Grid deleted.');
      navigate('/listings');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete grid.');
    }
  };

  // Live preview wiring — debounce off the JSON snapshot so we don't
  // hammer the REST endpoint while the author drags the column slider
  // across all six positions.
  const dataSnapshot = useDebounced(JSON.stringify(formData.data), 600);

  useEffect(() => {
    if (!autoPreview) return;
    if (!formData.data.template_id) return;
    const config = JSON.parse(dataSnapshot) as ListingConfigData;
    previewMutation.mutate({ config });
    // Excluded `previewMutation` from deps on purpose — its identity
    // changes on every render and including it triggers an infinite
    // loop. The snapshot is the only source-of-truth signal.
     
  }, [dataSnapshot, autoPreview]);

  const handleManualRefresh = () => {
    if (!formData.data.template_id) return;
    previewMutation.mutate({ config: formData.data });
  };

  const previewResult = previewMutation.data;
  const previewError = previewMutation.error;
  const isPreviewing = previewMutation.isPending;

  // Embed snippets — only meaningful once the grid has a real ID.
  const shortcode = listingId ? `[rdcfe_listing id="${listingId}"]` : '';

  const handleCopyShortcode = () => {
    if (!shortcode) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shortcode).then(() => {
        setShortcodeCopied(true);
        showToast('success', 'Shortcode copied.');
        window.setTimeout(() => setShortcodeCopied(false), 1500);
      });
    }
  };

  if (!isPro) {
    return (
      <ProModuleGate module="listings" moduleName="Listings">
        <div className="rdcfe-card rdcfe-p-6">
          <h2 className="rdcfe-text-[18px] rdcfe-font-bold">Listing Grid Builder</h2>
          <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            Combine a saved query with a listing template to render a grid anywhere on your site.
            Available in Pro.
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

  // Three-way data source picker. `relation_children` is its own
  // first-class mode (different code path on the server), the other
  // two are differentiated only by whether a saved query is set.
  const dataSource: 'default' | 'query' | 'relation_children' =
    formData.data.data_source === 'relation_children'
      ? 'relation_children'
      : formData.data.query_id
        ? 'query'
        : 'default';

  const relationSlugOptions: SelectOption[] = [
    { value: '', label: 'Select a relation...' },
    ...relations
      .map((rel) => {
        const cfg = (rel.data ?? {}) as { slug?: string; name?: string };
        const slug = cfg.slug || rel.slug;
        if (!slug) return null;
        const niceName = cfg.name || rel.title || slug;
        return { value: slug, label: `${niceName} (${slug})` };
      })
      .filter((opt): opt is SelectOption => opt !== null),
  ];

  return (
    <form onSubmit={handleSubmit}>
      {/* Page Header */}
      <div className="rdcfe-mb-6">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-4 rdcfe-mb-3">
          <button
            type="button"
            onClick={() => navigate('/listings')}
            className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
          >
            <ArrowLeft className="rdcfe-w-5 rdcfe-h-5" />
          </button>
          <div>
            <h1 className="rdcfe-text-[24px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-tracking-tight">
              {isEditing ? 'Edit Grid' : 'New Grid'}
            </h1>
            <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
              Combine a Listing Template with a saved Query to render a multi-card grid.
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout — main form + sidebar */}
      <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-[1fr_320px] rdcfe-gap-6">
        <div className="rdcfe-space-y-5">
          {/* Quick Setup — Template + Data Source */}
          <div className="rdcfe-card rdcfe-p-6">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-5">
              <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                <Grid3x3 className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
              </div>
              <div>
                <h2 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  Quick Setup
                </h2>
                <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Pick the template, then point a query at it.
                </p>
              </div>
            </div>

            <div className="rdcfe-space-y-5">
              <div>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                  Title <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, title: e.target.value }));
                    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder="e.g. Featured Properties Grid"
                  error={!!errors.title}
                />
                {errors.title && (
                  <p className="rdcfe-mt-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                  <LayoutTemplate className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                  Listing Template{' '}
                  <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                </label>
                <div className="rdcfe-flex rdcfe-gap-2">
                  <div className="rdcfe-flex-1">
                    <Select
                      value={String(formData.data.template_id ?? 0)}
                      onChange={(e) => {
                        setData((prev) => ({
                          ...prev,
                          template_id: Number.parseInt(e.target.value, 10) || 0,
                        }));
                        if (errors.template_id) {
                          setErrors((prev) => ({ ...prev, template_id: '' }));
                        }
                      }}
                      options={templateOptions}
                      error={!!errors.template_id}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/listings/template/new')}
                    className="rdcfe-btn rdcfe-btn-secondary rdcfe-btn-sm"
                    title="Create new template"
                  >
                    <Plus className="rdcfe-w-3.5 rdcfe-h-3.5" />
                    New
                  </button>
                </div>
                {errors.template_id && (
                  <p className="rdcfe-mt-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                    {errors.template_id}
                  </p>
                )}
              </div>

              {/* Data Source — radio cards */}
              <div>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                  <Database className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                  Data Source
                </label>
                <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-3 rdcfe-gap-2">
                  <DataSourceCard
                    selected={dataSource === 'default'}
                    title="Default Loop"
                    description="Inherit the host page's query (archives, search, blog feed)."
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        data_source: 'posts',
                        query_id: 0,
                      }))
                    }
                  />
                  <DataSourceCard
                    selected={dataSource === 'query'}
                    title="Saved Query"
                    description="Drive this grid from a saved query."
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        data_source: 'posts',
                        query_id: prev.query_id || queries[0]?.id || 0,
                      }))
                    }
                  />
                  <DataSourceCard
                    selected={dataSource === 'relation_children'}
                    title="Relation Children"
                    description="Iterate pairs of a relation, with per-pair meta available."
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        data_source: 'relation_children',
                        relation_slug:
                          prev.relation_slug ||
                          ((relations[0]?.data ?? {}) as { slug?: string }).slug ||
                          relations[0]?.slug ||
                          '',
                        relation_direction: prev.relation_direction || 'from',
                        relation_anchor: prev.relation_anchor || '{{current_post_id}}',
                      }))
                    }
                  />
                </div>

                {dataSource === 'query' && (
                  <div className="rdcfe-mt-3">
                    <div className="rdcfe-flex rdcfe-gap-2">
                      <div className="rdcfe-flex-1">
                        <Select
                          value={String(formData.data.query_id ?? 0)}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              query_id: Number.parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          options={queryOptions}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/queries/new')}
                        className="rdcfe-btn rdcfe-btn-secondary rdcfe-btn-sm"
                        title="Create new query"
                      >
                        <Plus className="rdcfe-w-3.5 rdcfe-h-3.5" />
                        New
                      </button>
                    </div>
                  </div>
                )}

                {dataSource === 'relation_children' && (
                  <div className="rdcfe-mt-3 rdcfe-space-y-3">
                    <div>
                      <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                        Relation
                      </label>
                      <div className="rdcfe-flex rdcfe-gap-2">
                        <div className="rdcfe-flex-1">
                          <Select
                            value={formData.data.relation_slug ?? ''}
                            onChange={(e) =>
                              setData((prev) => ({
                                ...prev,
                                relation_slug: e.target.value,
                              }))
                            }
                            options={relationSlugOptions}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/relations/new')}
                          className="rdcfe-btn rdcfe-btn-secondary rdcfe-btn-sm"
                          title="Create new relation"
                        >
                          <Plus className="rdcfe-w-3.5 rdcfe-h-3.5" />
                          New
                        </button>
                      </div>
                    </div>

                    <div className="rdcfe-grid rdcfe-grid-cols-2 rdcfe-gap-3">
                      <div>
                        <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                          Direction
                        </label>
                        <Select
                          value={formData.data.relation_direction ?? 'from'}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              relation_direction: (e.target.value === 'to' ? 'to' : 'from') as
                                | 'from'
                                | 'to',
                            }))
                          }
                          options={[
                            { value: 'from', label: 'Source → children' },
                            { value: 'to', label: 'Target → parents' },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                          Anchor
                        </label>
                        <Input
                          value={formData.data.relation_anchor ?? ''}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              relation_anchor: e.target.value,
                            }))
                          }
                          placeholder="{{current_post_id}} or 123"
                        />
                      </div>
                    </div>
                    <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      Components inside the template can read per-pair meta
                      with the source token{' '}
                      <code className="rdcfe-px-1 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-muted))]">
                        pair_meta:&lt;key&gt;
                      </code>
                      . An empty anchor falls back to the current post on
                      single templates.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Layout */}
          <div className="rdcfe-card rdcfe-p-6">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-5">
              <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))]">
                <Sliders className="rdcfe-w-4 rdcfe-h-4" />
              </div>
              <h2 className="rdcfe-text-[15px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                Layout
              </h2>
            </div>

            <div className="rdcfe-space-y-4">
              <div>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Columns
                </label>
                <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-2">
                  {COLUMN_OPTIONS.map((cols) => (
                    <ColumnPickerTile
                      key={cols}
                      cols={cols}
                      selected={(formData.data.columns ?? 3) === cols}
                      onClick={() => setData((prev) => ({ ...prev, columns: cols }))}
                    />
                  ))}
                </div>
              </div>

              <div className="rdcfe-grid rdcfe-grid-cols-2 rdcfe-gap-4">
                <div>
                  <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                    Gap
                  </label>
                  <Input
                    value={formData.data.gap ?? '20px'}
                    onChange={(e) => setData((prev) => ({ ...prev, gap: e.target.value }))}
                    placeholder="20px"
                  />
                  <p className="rdcfe-mt-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    Any CSS length: <code>20px</code>, <code>1.5rem</code>, etc.
                  </p>
                </div>
                <div>
                  <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                    Pagination
                  </label>
                  <div className="rdcfe-space-y-1.5">
                    {PAGINATION_OPTIONS.map((option) => (
                      <PaginationRadio
                        key={option.value}
                        option={option}
                        selected={(formData.data.pagination ?? 'none') === option.value}
                        onClick={() => setData((prev) => ({ ...prev, pagination: option.value }))}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                  Empty State Message
                </label>
                <Textarea
                  rows={2}
                  value={formData.data.empty_message ?? ''}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, empty_message: e.target.value }))
                  }
                  placeholder="No items found."
                />
                <p className="rdcfe-mt-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Shown when the query returns zero rows.
                </p>
              </div>
            </div>
          </div>

          <div className="rdcfe-mb-5">
            <VisibilityRulesBuilder
              title="Grid visibility"
              hint="Hide the entire listing grid based on the viewer and (for row-bound rules) the host page context — macro overrides from the shortcode/block, or the current queried object on singular archives."
              value={formData.data.visibility}
              onChange={(next) =>
                setData((prev) => {
                  if (next === undefined) {
                    const rest = { ...prev };
                    delete rest.visibility;
                    return rest;
                  }
                  return { ...prev, visibility: next };
                })
              }
              metaKeyOptions={metaKeyOptions}
              relationOptions={relationOptions}
            />
          </div>

          {/* Live Preview */}
          <div className="rdcfe-card rdcfe-overflow-visible">
            <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-gap-3 rdcfe-px-5 rdcfe-py-3 rdcfe-bg-gradient-to-r rdcfe-from-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-to-transparent rdcfe-rounded-t-xl rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))]">
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                <div className="rdcfe-w-8 rdcfe-h-8 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))]">
                  <Eye className="rdcfe-w-4 rdcfe-h-4" />
                </div>
                <span className="rdcfe-font-semibold rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  Live Preview
                </span>
                {isPreviewing && (
                  <Loader2 className="rdcfe-w-4 rdcfe-h-4 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                )}
              </div>

              <div className="rdcfe-flex-1" />

              <button
                type="button"
                onClick={() => setAutoPreview((auto) => !auto)}
                className={`rdcfe-px-2.5 rdcfe-py-1 rdcfe-rounded-md rdcfe-text-[12px] rdcfe-font-semibold rdcfe-transition-colors ${
                  autoPreview
                    ? 'rdcfe-bg-[hsl(var(--rdcfe-success)/0.12)] rdcfe-text-[hsl(var(--rdcfe-success))]'
                    : 'rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
                }`}
              >
                {autoPreview ? 'Auto' : 'Paused'}
              </button>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isPreviewing || !formData.data.template_id}
                className="rdcfe-btn rdcfe-btn-secondary rdcfe-btn-sm"
                title="Refresh preview"
              >
                {isPreviewing ? (
                  <Loader2 className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-animate-spin" />
                ) : (
                  <RefreshCw className="rdcfe-w-3.5 rdcfe-h-3.5" />
                )}
                <span className="rdcfe-text-[12px]">Refresh</span>
              </button>
            </div>

            <div className="rdcfe-p-6 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-min-h-[260px]">
              {!formData.data.template_id && (
                <PreviewEmpty
                  title="Pick a template"
                  description="Once you select a Listing Template, the preview will render below."
                />
              )}

              {formData.data.template_id && previewError && (
                <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(0_84%_88%)] rdcfe-bg-[hsl(0_84%_98%)] rdcfe-p-4 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                  Preview failed:{' '}
                  {previewError instanceof Error ? previewError.message : 'Unknown error'}
                </div>
              )}

              {formData.data.template_id && !previewError && previewResult && (
                <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-shadow-sm rdcfe-overflow-hidden">
                  {previewResult.message && (
                    <div className="rdcfe-px-5 rdcfe-py-3 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)] rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))]">
                      {previewResult.message}
                    </div>
                  )}
                  {previewResult.html ? (
                    <div
                      className="rdcfe-listing-canvas-preview rdcfe-p-6"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: previewResult.html }}
                    />
                  ) : (
                    <PreviewEmpty
                      title="Empty grid"
                      description={
                        previewResult.message ||
                        'The query returned zero rows. Try a different query or check your filters.'
                      }
                      inset
                    />
                  )}
                </div>
              )}

              {formData.data.template_id && !previewError && !previewResult && isPreviewing && (
                <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-py-12">
                  <Loader2 className="rdcfe-w-6 rdcfe-h-6 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                </div>
              )}
            </div>
          </div>

          {/* Embed snippets — only meaningful once saved. */}
          {isEditing && (
            <div className="rdcfe-card rdcfe-p-6">
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-4">
                <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))]">
                  <Copy className="rdcfe-w-4 rdcfe-h-4" />
                </div>
                <div>
                  <h2 className="rdcfe-text-[15px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    Embed
                  </h2>
                  <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    Drop this grid anywhere on your site.
                  </p>
                </div>
              </div>

              <div className="rdcfe-space-y-4">
                <div>
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-1.5">
                    <span className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      Shortcode
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyShortcode}
                      className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-sm"
                    >
                      {shortcodeCopied ? (
                        <>
                          <Check className="rdcfe-w-3.5 rdcfe-h-3.5" />
                          <span className="rdcfe-text-[12px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="rdcfe-w-3.5 rdcfe-h-3.5" />
                          <span className="rdcfe-text-[12px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <code className="rdcfe-block rdcfe-px-3 rdcfe-py-2.5 rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[13px] rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-overflow-x-auto rdcfe-select-all">
                    {shortcode}
                  </code>
                </div>

                <div>
                  <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5">
                    Gutenberg Block
                  </div>
                  <div className="rdcfe-px-3 rdcfe-py-2.5 rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    Search the block inserter for{' '}
                    <strong className="rdcfe-text-[hsl(var(--rdcfe-primary))]">
                      RDCFE Listing Grid
                    </strong>{' '}
                    and pick this listing from the dropdown. The editor preview matches the
                    front-end output (server-side rendered through the same pipeline).
                  </div>
                </div>

                <div>
                  <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5">
                    Elementor Widget
                  </div>
                  <div className="rdcfe-px-3 rdcfe-py-2.5 rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    Open the Elementor panel, find the{' '}
                    <strong className="rdcfe-text-[hsl(var(--rdcfe-primary))]">Dynamic CPT</strong>{' '}
                    category, and drag in{' '}
                    <strong className="rdcfe-text-[hsl(var(--rdcfe-primary))]">
                      RDCFE Listing Grid
                    </strong>
                    . Pick this listing in the widget settings — the editor preview is rendered by
                    the same pipeline as the front-end.
                  </div>
                </div>

                <div>
                  <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5">
                    PHP Template
                  </div>
                  <code className="rdcfe-block rdcfe-px-3 rdcfe-py-2.5 rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[13px] rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-overflow-x-auto">
                    {`echo do_shortcode( '${shortcode}' );`}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="rdcfe-space-y-4">
          <div className="rdcfe-card rdcfe-p-5">
            <button
              type="submit"
              disabled={isSaving}
              className="rdcfe-btn rdcfe-btn-primary rdcfe-w-full rdcfe-py-3 rdcfe-text-[14px]"
            >
              {isSaving ? (
                <Loader2 className="rdcfe-w-4 rdcfe-h-4 rdcfe-animate-spin" />
              ) : (
                <Save className="rdcfe-w-4 rdcfe-h-4" />
              )}
              {isEditing ? 'Update Grid' : 'Create Grid'}
            </button>

            <div className="rdcfe-mt-4">
              <label className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-2 rdcfe-block">
                Status
              </label>
              <div className="rdcfe-flex rdcfe-gap-1 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg">
                {(['publish', 'draft'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, status }))}
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
              <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-3">
                Summary
              </div>
              <div className="rdcfe-space-y-2">
                <SummaryRow
                  label="Template"
                  value={
                    formData.data.template_id
                      ? templates.find((t) => t.id === formData.data.template_id)?.title ||
                        `#${formData.data.template_id}`
                      : '—'
                  }
                  tone="primary"
                />
                <SummaryRow
                  label="Source"
                  value={
                    formData.data.query_id
                      ? queries.find((q) => q.id === formData.data.query_id)?.title ||
                        `Query #${formData.data.query_id}`
                      : 'Default loop'
                  }
                  tone="purple"
                />
                <SummaryRow
                  label="Columns"
                  value={String(formData.data.columns ?? 3)}
                  tone="default"
                />
                <SummaryRow
                  label="Pagination"
                  value={formData.data.pagination ?? 'none'}
                  tone="orange"
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
                  Delete Grid
                </button>
              </div>
            )}
          </div>

          <div className="rdcfe-card rdcfe-p-5">
            <h3 className="rdcfe-text-[13px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-3">
              <HelpCircle className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
              Quick Tips
            </h3>
            <ul className="rdcfe-space-y-2 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">
                  1
                </span>
                <span>
                  Templates ship one card; grids ship many. Build a template first, then a grid.
                </span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">
                  2
                </span>
                <span>
                  Saved queries inherit macros — use{' '}
                  <code>{`{{current_post_id}}`}</code> for context-aware grids.
                </span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">
                  3
                </span>
                <span>
                  The Gutenberg block and Elementor widget share the renderer with the shortcode —
                  preview matches the front-end on every surface.
                </span>
              </li>
            </ul>
          </div>

          <div className="rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
            <Info className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
            <span>
              Edits autosave to the form — hit{' '}
              <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                {isEditing ? 'Update Grid' : 'Create Grid'}
              </strong>{' '}
              to persist.
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ===========================================================================
 * Local presentational helpers
 * ========================================================================= */

function DataSourceCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rdcfe-text-left rdcfe-px-3 rdcfe-py-3 rdcfe-rounded-lg rdcfe-border rdcfe-transition-all ${
        selected
          ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.06)] rdcfe-shadow-sm'
          : 'rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)]'
      }`}
    >
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-1">
        <span
          className={`rdcfe-text-[13px] rdcfe-font-semibold ${
            selected
              ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
              : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'
          }`}
        >
          {title}
        </span>
        <span
          className={`rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-border-2 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 ${
            selected
              ? 'rdcfe-border-[hsl(var(--rdcfe-primary))]'
              : 'rdcfe-border-[hsl(var(--rdcfe-border))]'
          }`}
        >
          {selected && (
            <span className="rdcfe-w-2 rdcfe-h-2 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary))]" />
          )}
        </span>
      </div>
      <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
        {description}
      </p>
    </button>
  );
}

function ColumnPickerTile({
  cols,
  selected,
  onClick,
}: {
  cols: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${cols} ${cols === 1 ? 'column' : 'columns'}`}
      className={`rdcfe-relative rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-3 rdcfe-py-2.5 rdcfe-rounded-lg rdcfe-border rdcfe-min-w-[60px] rdcfe-transition-all ${
        selected
          ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.06)] rdcfe-shadow-sm'
          : 'rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)]'
      }`}
    >
      <div
        className="rdcfe-w-9 rdcfe-h-6 rdcfe-grid rdcfe-gap-0.5 rdcfe-rounded-sm rdcfe-overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <span
            key={i}
            className={`rdcfe-rounded-sm ${
              selected
                ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]'
                : 'rdcfe-bg-[hsl(var(--rdcfe-muted-foreground)/0.4)]'
            }`}
          />
        ))}
      </div>
      <span
        className={`rdcfe-text-[12px] rdcfe-font-semibold ${
          selected
            ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
            : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'
        }`}
      >
        {cols}
      </span>
    </button>
  );
}

function PaginationRadio({
  option,
  selected,
  onClick,
}: {
  option: { value: string; label: string; hint: string };
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rdcfe-w-full rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-px-2.5 rdcfe-py-2 rdcfe-rounded-md rdcfe-border rdcfe-text-left rdcfe-transition-all ${
        selected
          ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.06)]'
          : 'rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)]'
      }`}
    >
      <span
        className={`rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-rounded-full rdcfe-border-2 rdcfe-flex-shrink-0 rdcfe-mt-0.5 rdcfe-flex rdcfe-items-center rdcfe-justify-center ${
          selected
            ? 'rdcfe-border-[hsl(var(--rdcfe-primary))]'
            : 'rdcfe-border-[hsl(var(--rdcfe-border))]'
        }`}
      >
        {selected && (
          <span className="rdcfe-w-1.5 rdcfe-h-1.5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary))]" />
        )}
      </span>
      <div className="rdcfe-flex-1 rdcfe-min-w-0">
        <div
          className={`rdcfe-text-[12px] rdcfe-font-semibold rdcfe-leading-tight ${
            selected
              ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
              : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'
          }`}
        >
          {option.label}
        </div>
        <div className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-snug rdcfe-mt-0.5">
          {option.hint}
        </div>
      </div>
    </button>
  );
}

function PreviewEmpty({
  title,
  description,
  inset,
}: {
  title: string;
  description: string;
  inset?: boolean;
}) {
  return (
    <div
      className={`rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-text-center ${
        inset ? 'rdcfe-px-6 rdcfe-py-8' : 'rdcfe-px-6 rdcfe-py-12'
      }`}
    >
      <div className="rdcfe-w-12 rdcfe-h-12 rdcfe-mx-auto rdcfe-mb-3 rdcfe-rounded-xl rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
        <Eye className="rdcfe-w-5 rdcfe-h-5" />
      </div>
      <div className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1">
        {title}
      </div>
      <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-max-w-sm rdcfe-mx-auto">
        {description}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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
    <div className="rdcfe-flex rdcfe-justify-between rdcfe-items-center rdcfe-gap-2 rdcfe-py-1.5 rdcfe-px-2.5 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
      <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0">
        {label}
      </span>
      <span
        className="rdcfe-font-semibold rdcfe-px-2 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[11px] rdcfe-truncate rdcfe-max-w-[160px]"
        style={{ background: t.bg, color: t.fg }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
