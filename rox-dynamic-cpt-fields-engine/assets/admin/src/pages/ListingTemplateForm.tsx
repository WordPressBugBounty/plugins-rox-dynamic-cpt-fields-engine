import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  LayoutTemplate,
  Trash2,
  Info,
  HelpCircle,
  Undo2,
  Redo2,
  Sparkles,
  X,
} from 'lucide-react';
import { Input, MultiSelect, Select, type SelectOption } from '../components/ui';
import { useNotificationToast } from '../components/ui/notification-toast';
import { useProContext } from '../contexts/ProContext';
import { ProModuleGate } from '../components/ui/pro-feature-gate';
import {
  createDefaultTemplateFormData,
  generateComponentId,
  useCreateListing,
  useDeleteListing,
  useListing,
  useListingComponents,
  useUpdateListing,
  type ListingFormData,
} from '../hooks/useListings';
import { useListingHistory } from '../hooks/useListingHistory';
import { usePostTypes } from '../hooks/usePostTypes';
import { useQueryMetaKeys } from '../hooks/useQueries';
import { useRelations } from '../hooks/useRelations';
import type { ListingConfigData } from '../services/api';
import {
  duplicateComponent,
  moveComponent,
  removeComponent,
} from '../components/listing-builder/shared';

import { ComponentPalette } from '../components/listing-builder/ComponentPalette';
import { LayersTree } from '../components/listing-builder/LayersTree';
import { CanvasPreview } from '../components/listing-builder/CanvasPreview';
import { PageCanvasPreview } from '../components/listing-builder/PageCanvasPreview';
import { PageSettingsPanel } from '../components/listing-builder/PageSettingsPanel';
import { ComponentInspector } from '../components/listing-builder/ComponentInspector';
import { PresetGallery } from '../components/listing-builder/card-presets/PresetGallery';
import { applyAIComponents, replaceComponents } from '../components/listing-builder/card-presets';
import { AIGenerateButton } from '../components/ai-assistant/AIGenerateButton';
import { VisibilityRulesBuilder } from '../components/listing-builder/visibility/VisibilityRulesBuilder';

const DATA_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'posts', label: 'Posts' },
  { value: 'terms', label: 'Terms' },
  { value: 'users', label: 'Users' },
];

const CORE_POST_TYPES: SelectOption[] = [
  { value: 'post', label: 'Posts (post)' },
  { value: 'page', label: 'Pages (page)' },
  { value: 'attachment', label: 'Media (attachment)' },
];

export function ListingTemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotificationToast();
  const { isPro } = useProContext();

  const listingId = id ? Number.parseInt(id, 10) : null;
  const isEditing = !!listingId;

  // Form state lives inside the history stack so Cmd+Z rolls back any
  // canvas mutation (drop, drag, delete, inspector tweak). The hook
  // debounces commits at 180ms — fast keystrokes inside an inspector
  // text input collapse into one undo step.
  const history = useListingHistory<ListingFormData>(createDefaultTemplateFormData());
  const formData = history.state;
  const setFormData = history.setState;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [presetGalleryOpen, setPresetGalleryOpen] = useState(false);
  // Tracks the saved baseline so the dirty indicator can compare
  // against the latest snapshot. Cheap because we stringify on save
  // (≤5KB for a typical template).
  const savedBaselineRef = useRef<string>(JSON.stringify(createDefaultTemplateFormData()));

  const { data: existing, isLoading: isLoadingExisting } = useListing(listingId);
  const { data: components = [], isLoading: isLoadingComponents } = useListingComponents();
  const { data: rdcfeCpts } = usePostTypes();

  const createMutation = useCreateListing();
  const updateMutation = useUpdateListing();
  const deleteMutation = useDeleteListing();

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isLoading = (isLoadingExisting && isEditing) || isLoadingComponents;

  const isPageMode =
    formData.data.listing_type === 'single_page' ||
    formData.data.listing_type === 'archive_page';

  useEffect(() => {
    if (existing?.form && isEditing) {
      // Editor handles templates and page types — anything labelled
      // `grid` is routed back to the grid form by the list page, but
      // if a saved grid somehow lands here we coerce it into a
      // template shape so the canvas doesn't crash.
      const form = existing.form;
      const isValidType = ['template', 'single_page', 'archive_page'].includes(
        form.data.listing_type
      );
      const next = !isValidType
        ? { ...form, data: { ...form.data, listing_type: 'template' as const } }
        : form;
      history.reset(next);
      savedBaselineRef.current = JSON.stringify(next);
    }
     
  }, [existing?.form, isEditing]);

  const setData = useCallback(
    (updater: (prev: ListingConfigData) => ListingConfigData) => {
      setFormData((prev) => ({ ...prev, data: updater(prev.data) }));
    },
    [setFormData]
  );

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== savedBaselineRef.current,
    [formData]
  );

  // Merge core WP post types with RDCFE-managed CPTs, deduped on slug —
  // identical helper to the one in the Query Builder's SourceTab so
  // both editors see the same list of post types.
  const postTypeOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set(CORE_POST_TYPES.map((opt) => opt.value));
    const merged: SelectOption[] = [...CORE_POST_TYPES];
    (rdcfeCpts ?? []).forEach((cpt) => {
      const slug = (cpt.data?.slug as string | undefined) || cpt.slug;
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        merged.push({ value: slug, label: `${cpt.title} (${slug})` });
      }
    });
    return merged;
  }, [rdcfeCpts]);

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

  /* -------- Keyboard shortcuts ----------------------------------------- */

  useEffect(() => {
    function isTextInput(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // Undo / Redo work everywhere — even inside form inputs they
      // should fall back to the editor's history because that's what
      // authors expect when they're "editing the listing", not the
      // text in any single input.
      if (meta && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          history.redo();
        } else {
          e.preventDefault();
          history.undo();
        }
        return;
      }

      // Component-targeted shortcuts only fire when no text input has
      // focus — otherwise typing "d" in a text field would duplicate.
      if (isTextInput(e.target)) {
        return;
      }

      // Esc — clear selection.
      if (e.key === 'Escape' && selectedComponentId) {
        e.preventDefault();
        setSelectedComponentId(null);
        return;
      }

      if (!selectedComponentId) {
        return;
      }

      // Cmd+D / Ctrl+D — duplicate selected.
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        let newId: string | null = null;
        setData((prev) => {
          const result = duplicateComponent(prev, selectedComponentId, generateComponentId);
          newId = result.newId;
          return result.data;
        });
        history.commit();
        if (newId) {
          window.setTimeout(() => setSelectedComponentId(newId), 0);
        }
        return;
      }

      // Delete / Backspace — remove selected.
      if (e.key === 'Delete' || (e.key === 'Backspace' && meta)) {
        e.preventDefault();
        setData((prev) => removeComponent(prev, selectedComponentId));
        setSelectedComponentId(null);
        history.commit();
        return;
      }

      // Arrow Up/Down — move selected within its parent list.
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setData((prev) => moveComponent(prev, selectedComponentId, 'up'));
        history.commit();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setData((prev) => moveComponent(prev, selectedComponentId, 'down'));
        history.commit();
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedComponentId, history, setData]);

  /* -------- beforeunload guard ----------------------------------------- */

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
      // Modern browsers ignore returnValue text but require it set.
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  /* -------- Validate + save -------------------------------------------- */

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.title.trim()) {
      next.title = 'Title is required';
    }
    if ((formData.data.components ?? []).length === 0) {
      next.components = 'Add at least one component to the canvas';
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
        savedBaselineRef.current = JSON.stringify(formData);
        showToast('success', 'Template updated.');
      } else {
        const result = await createMutation.mutateAsync(formData);
        savedBaselineRef.current = JSON.stringify(formData);
        showToast('success', 'Template created.');
        if (result?.id) {
          window.setTimeout(() => navigate(`/listings/template/${result.id}`), 400);
        }
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save template.');
    }
  };

  const handleDelete = async () => {
    if (!listingId) return;
    if (!window.confirm('Delete this listing template? This cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(listingId);
      showToast('success', 'Template deleted.');
      navigate('/listings');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete template.');
    }
  };

  if (!isPro) {
    return (
      <ProModuleGate module="listings" moduleName="Listings">
        <div className="rdcfe-card rdcfe-p-6">
          <h2 className="rdcfe-text-[18px] rdcfe-font-bold">Listing Template Builder</h2>
          <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            Build dynamic card layouts with drag-and-drop components, field bindings, and live
            preview. Available in Pro.
          </p>
        </div>
      </ProModuleGate>
    );
  }

  const handleAIAccept = (suggestion: Record<string, unknown>) => {
    const dataPatch =
      suggestion.data && typeof suggestion.data === 'object'
        ? (suggestion.data as Record<string, unknown>)
        : undefined;
    const rawComponents = dataPatch?.components ?? suggestion.components;

    let appliedCount = 0;

    setFormData((prev) => {
      const next: ListingFormData = {
        ...prev,
        title: suggestion.title ? String(suggestion.title) : prev.title,
        data: { ...prev.data },
      };

      if (dataPatch) {
        if (Array.isArray(dataPatch.post_types)) {
          next.data.post_types = dataPatch.post_types.map(String);
        }
        if (
          dataPatch.data_source === 'posts' ||
          dataPatch.data_source === 'terms' ||
          dataPatch.data_source === 'users'
        ) {
          next.data.data_source = dataPatch.data_source;
        }
      }

      if (Array.isArray(rawComponents) && rawComponents.length > 0) {
        const nodes = applyAIComponents(rawComponents, components);
        if (nodes.length > 0) {
          next.data = replaceComponents(next.data, nodes);
          appliedCount = nodes.length;
        }
      }

      return next;
    });

    setSelectedComponentId(null);
    history.commit();

    if (appliedCount > 0) {
      showToast(
        'success',
        `AI applied ${appliedCount} component${appliedCount === 1 ? '' : 's'} to the canvas.`
      );
      return;
    }

    if (suggestion.title) {
      showToast('success', 'AI title applied — no components were returned.');
      return;
    }

    showToast('error', 'AI response did not include usable components.');
  };

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
      <div className="rdcfe-mb-6">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-4 rdcfe-mb-3">
          <button
            type="button"
            onClick={() => navigate('/listings')}
            className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
          >
            <ArrowLeft className="rdcfe-w-5 rdcfe-h-5" />
          </button>
          <div className="rdcfe-flex-1">
            <h1 className="rdcfe-text-[24px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-tracking-tight rdcfe-flex rdcfe-items-center rdcfe-gap-2">
              {isEditing
                ? isPageMode
                  ? `Edit ${formData.data.listing_type === 'single_page' ? 'Single Page' : 'Archive'} Template`
                  : 'Edit Listing Template'
                : isPageMode
                  ? `New ${formData.data.listing_type === 'single_page' ? 'Single Page' : 'Archive'} Template`
                  : 'New Listing Template'}
              {isDirty && (
                <span
                  className="rdcfe-w-2 rdcfe-h-2 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-warning,38_92%_50%))]"
                  title="Unsaved changes"
                  aria-label="Unsaved changes"
                />
              )}
            </h1>
            <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
              {isPageMode
                ? formData.data.listing_type === 'single_page'
                  ? 'Build a full-page layout for single posts. Add page components like Post Content, Breadcrumbs, and Author Box.'
                  : 'Build an archive page layout. Add components like Archive Title, Listing Grid, and Pagination.'
                : 'Compose a single card. Drop it inside a Grid to render many of them.'}
            </p>
          </div>

          <AIGenerateButton
            module="listing"
            context={isEditing && formData.title ? { existing_slug: formData.title } : undefined}
            onAccept={handleAIAccept}
          />

          {/* Undo / Redo */}
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1">
            <button
              type="button"
              onClick={history.undo}
              disabled={!history.canUndo}
              title="Undo (⌘Z)"
              className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] disabled:rdcfe-opacity-30 disabled:rdcfe-cursor-not-allowed rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-transition-colors"
            >
              <Undo2 className="rdcfe-w-4 rdcfe-h-4" />
            </button>
            <button
              type="button"
              onClick={history.redo}
              disabled={!history.canRedo}
              title="Redo (⌘⇧Z)"
              className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] disabled:rdcfe-opacity-30 disabled:rdcfe-cursor-not-allowed rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-transition-colors"
            >
              <Redo2 className="rdcfe-w-4 rdcfe-h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Setup + Save — horizontal bar so the save button is always visible */}
      <div className="rdcfe-card rdcfe-p-5 rdcfe-mb-5">
        <div className="rdcfe-flex rdcfe-flex-col lg:rdcfe-flex-row rdcfe-items-start lg:rdcfe-items-end rdcfe-gap-5">
          {/* Setup fields */}
          <div className="rdcfe-flex-1 rdcfe-min-w-0">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-4">
              <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0">
                <LayoutTemplate className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
              </div>
              <div>
                <h2 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  Quick Setup
                </h2>
                <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Name your template and pick the data it renders.
                </p>
              </div>
            </div>

            <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-3 rdcfe-gap-4">
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
                  placeholder="e.g. Property Card, Author Spotlight"
                  error={!!errors.title}
                />
                {errors.title && (
                  <p className="rdcfe-mt-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                    {errors.title}
                  </p>
                )}
              </div>
              <div>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                  Data Source
                </label>
                <Select
                  value={formData.data.data_source}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      data_source: e.target.value as 'posts' | 'terms' | 'users',
                    }))
                  }
                  options={DATA_SOURCE_OPTIONS}
                />
              </div>
              {formData.data.data_source === 'posts' && (
                <div>
                  <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                    Restrict to Post Types
                  </label>
                  <MultiSelect
                    value={formData.data.post_types ?? []}
                    onChange={(value) =>
                      setData((prev) => ({ ...prev, post_types: value }))
                    }
                    options={postTypeOptions}
                    placeholder="Any post type"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save button — right side of the bar */}
          <div className="rdcfe-flex-shrink-0 rdcfe-w-full lg:rdcfe-w-auto">
            <button
              type="submit"
              disabled={isSaving}
              className={`rdcfe-btn rdcfe-btn-primary rdcfe-whitespace-nowrap rdcfe-px-6 rdcfe-py-2.5 rdcfe-text-[14px] ${
                isDirty ? 'rdcfe-relative rdcfe-ring-2 rdcfe-ring-[hsl(var(--rdcfe-warning,38_92%_50%)/0.3)]' : ''
              }`}
            >
              {isSaving ? (
                <Loader2 className="rdcfe-w-4 rdcfe-h-4 rdcfe-animate-spin" />
              ) : (
                <Save className="rdcfe-w-4 rdcfe-h-4" />
              )}
              {isEditing ? 'Update Template' : 'Create Template'}
              {isDirty && !isSaving && (
                <span className="rdcfe-text-[11px] rdcfe-opacity-80 rdcfe-ml-1">• unsaved</span>
              )}
            </button>

            {errors.components && (
              <div className="rdcfe-mt-2 rdcfe-px-3 rdcfe-py-1.5 rdcfe-rounded-md rdcfe-bg-[hsl(0_84%_98%)] rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                {errors.components}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rdcfe-mb-5">
        <VisibilityRulesBuilder
          title={isPageMode ? 'Template visibility' : 'Card visibility'}
          hint={
            isPageMode
              ? 'Control when this page template is active. Rules are evaluated against the queried object.'
              : 'Hide the entire card for the current listing row when rules match (same context as components — the iterated post, term, or user).'
          }
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

      {/* 3-Panel Builder */}
      <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-[280px_1fr_320px] rdcfe-gap-4">
        {/* Left rail — Components + Layers */}
        <div className="rdcfe-space-y-4">
          <ComponentPalette
            data={formData.data}
            setData={setData}
            components={components}
            selectedComponentId={selectedComponentId}
            setSelectedComponentId={setSelectedComponentId}
            listingType={formData.data.listing_type}
          />
          <LayersTree
            data={formData.data}
            setData={setData}
            selectedComponentId={selectedComponentId}
            setSelectedComponentId={setSelectedComponentId}
            onCommit={history.commit}
          />
        </div>

        {/* Center — Live preview canvas (sticky on large screens so Style tab
            tweaks stay visible while scrolling the inspector). */}
        <div className="rdcfe-min-w-0 lg:rdcfe-sticky lg:rdcfe-top-6 lg:rdcfe-self-start lg:rdcfe-z-10 lg:rdcfe-max-h-[calc(100vh-3rem)] lg:rdcfe-overflow-y-auto">
          {isPageMode ? (
            <PageCanvasPreview
              data={formData.data}
              setData={setData}
              selectedComponentId={selectedComponentId}
              setSelectedComponentId={setSelectedComponentId}
              onCommit={history.commit}
              descriptors={components}
              listingType={formData.data.listing_type}
              emptyStateSlot={
                <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-p-5 rdcfe-text-center">
                  <div className="rdcfe-w-12 rdcfe-h-12 rdcfe-mx-auto rdcfe-mb-3 rdcfe-rounded-xl rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    <LayoutTemplate className="rdcfe-w-5 rdcfe-h-5" />
                  </div>
                  <h3 className="rdcfe-text-[15px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1">
                    Empty page template
                  </h3>
                  <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-max-w-sm rdcfe-mx-auto">
                    {formData.data.listing_type === 'single_page'
                      ? 'Add Page Structure components from the left panel — Post Content, Breadcrumbs, Author Box, etc.'
                      : 'Add Archive Title, Listing Grid, and Pagination from the Page Structure section on the left.'}
                  </p>
                </div>
              }
            />
          ) : (
            <CanvasPreview
              data={formData.data}
              setData={setData}
              selectedComponentId={selectedComponentId}
              setSelectedComponentId={setSelectedComponentId}
              onCommit={history.commit}
              descriptors={components}
              emptyStateSlot={
                <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-p-5">
                  <div className="rdcfe-mb-4">
                    <h3 className="rdcfe-text-[15px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1">
                      Start with a quick layout
                    </h3>
                    <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      Pick a starter card below or add components one at a time from the panel
                      on the left.
                    </p>
                  </div>
                  <PresetGallery
                    descriptors={components}
                    hasExistingLayout={false}
                    onPick={(_preset, nodes) => {
                      setData((prev) => replaceComponents(prev, nodes));
                      setSelectedComponentId(null);
                      history.commit();
                    }}
                  />
                </div>
              }
            />
          )}
        </div>

        {/* Right rail — Inspector + Save (sticky on lg+ so the Style tab is
            always reachable while the canvas preview scrolls). Mirror of the
            sticky preview wrapper above. */}
        <div className="rdcfe-min-w-0 rdcfe-space-y-4 lg:rdcfe-sticky lg:rdcfe-top-6 lg:rdcfe-self-start lg:rdcfe-z-10 lg:rdcfe-max-h-[calc(100vh-3rem)] lg:rdcfe-overflow-y-auto">
          {isPageMode && (
            <PageSettingsPanel data={formData.data} setData={setData} />
          )}
          <ComponentInspector
            data={formData.data}
            setData={setData}
            components={components}
            selectedComponentId={selectedComponentId}
            setSelectedComponentId={setSelectedComponentId}
          />

          {/* Status + Delete */}
          <div className="rdcfe-card rdcfe-px-4 rdcfe-py-3">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
              <label className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide">
                Status
              </label>
              <div className="rdcfe-flex rdcfe-gap-1 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg rdcfe-flex-1">
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
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  title="Delete Template"
                  className="rdcfe-w-8 rdcfe-h-8 rdcfe-rounded-lg rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)] rdcfe-transition-colors rdcfe-flex-shrink-0"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="rdcfe-w-4 rdcfe-h-4 rdcfe-animate-spin" />
                  ) : (
                    <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Layout presets — entry point to swap the whole card via a
              modal gallery. Visible whenever there are components on the
              canvas (the empty state already inlines a richer gallery). */}
          {(formData.data.components ?? []).length > 0 && (
            <button
              type="button"
              onClick={() => setPresetGalleryOpen(true)}
              className="rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2 rdcfe-px-3 rdcfe-py-2 rdcfe-text-[12px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-colors"
            >
              <Sparkles className="rdcfe-w-3.5 rdcfe-h-3.5" />
              Browse layouts
            </button>
          )}

          {/* Quick Tips */}
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
                  Click any component on the canvas to edit it. Drag to reorder.
                </span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">
                  2
                </span>
                <span>
                  Shortcuts —{' '}
                  <code className="rdcfe-text-[10px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-px-1 rdcfe-rounded">⌘D</code> duplicate,{' '}
                  <code className="rdcfe-text-[10px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-px-1 rdcfe-rounded">Del</code> remove,{' '}
                  <code className="rdcfe-text-[10px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-px-1 rdcfe-rounded">⌘Z</code> undo.
                </span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">
                  3
                </span>
                <span>
                  Pick a sample post in the canvas toolbar to preview real data.
                </span>
              </li>
            </ul>
          </div>

          <div className="rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
            <Info className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
            <span>
              Edits autosave to the form — hit{' '}
              <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                {isEditing ? 'Update Template' : 'Create Template'}
              </strong>{' '}
              to persist.
            </span>
          </div>
        </div>
      </div>

      {presetGalleryOpen && (
        <div
          className="rdcfe-fixed rdcfe-inset-0 rdcfe-z-50 rdcfe-bg-black/40 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-p-4"
          onClick={() => setPresetGalleryOpen(false)}
        >
          <div
            className="rdcfe-bg-white rdcfe-rounded-xl rdcfe-shadow-xl rdcfe-w-full rdcfe-max-w-4xl rdcfe-max-h-[85vh] rdcfe-overflow-hidden rdcfe-flex rdcfe-flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-5 rdcfe-py-3 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))]">
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                <Sparkles className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                <span className="rdcfe-text-[14px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  Browse layouts
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPresetGalleryOpen(false)}
                title="Close"
                className="rdcfe-w-7 rdcfe-h-7 rdcfe-rounded-md rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors"
              >
                <X className="rdcfe-w-4 rdcfe-h-4" />
              </button>
            </div>
            <div className="rdcfe-overflow-y-auto rdcfe-p-5">
              <PresetGallery
                descriptors={components}
                hasExistingLayout={(formData.data.components ?? []).length > 0}
                onPick={(_preset, nodes) => {
                  setData((prev) => replaceComponents(prev, nodes));
                  setSelectedComponentId(null);
                  history.commit();
                  setPresetGalleryOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
