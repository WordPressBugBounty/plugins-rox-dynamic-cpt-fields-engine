/**
 * Settings form for single_page / archive_page listings that use an
 * external editor (Gutenberg or Elementor). Visual design lives in the
 * linked WordPress page; this form edits override metadata only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Trash2,
  Info,
  Settings2,
} from 'lucide-react';
import { Input, MultiSelect, type SelectOption } from '../components/ui';
import { useNotificationToast } from '../components/ui/notification-toast';
import { useProContext } from '../contexts/ProContext';
import { ProModuleGate } from '../components/ui/pro-feature-gate';
import {
  useDeleteListing,
  useListing,
  useUpdateListing,
  type ListingFormData,
} from '../hooks/useListings';
import { usePostTypes } from '../hooks/usePostTypes';
import { useQueryMetaKeys } from '../hooks/useQueries';
import { useRelations } from '../hooks/useRelations';
import type { ListingConfigData, ListingEditor } from '../services/api';
import { PageSettingsPanel } from '../components/listing-builder/PageSettingsPanel';
import { VisibilityRulesBuilder } from '../components/listing-builder/visibility/VisibilityRulesBuilder';
import { ExternalEditorLink } from '../components/listings/ExternalEditorLink';

const CORE_POST_TYPES: SelectOption[] = [
  { value: 'post', label: 'Posts (post)' },
  { value: 'page', label: 'Pages (page)' },
  { value: 'attachment', label: 'Media (attachment)' },
];

const EDITOR_LABELS: Record<Exclude<ListingEditor, 'rdcfe'>, string> = {
  gutenberg: 'Gutenberg Block Editor',
  elementor: 'Elementor',
};

export function ListingPageSettingsForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotificationToast();
  const { isPro } = useProContext();

  const listingId = id ? Number.parseInt(id, 10) : null;
  const { data: existing, isLoading } = useListing(listingId);
  const { data: rdcfeCpts } = usePostTypes();
  const updateMutation = useUpdateListing();
  const deleteMutation = useDeleteListing();

  const [formData, setFormData] = useState<ListingFormData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const savedBaselineRef = useRef<string>('');

  useEffect(() => {
    if (existing?.form) {
      setFormData(existing.form);
      savedBaselineRef.current = JSON.stringify(existing.form);
    }
  }, [existing?.form]);

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

  const setData = useCallback(
    (updater: (prev: ListingConfigData) => ListingConfigData) => {
      setFormData((prev) => (prev ? { ...prev, data: updater(prev.data) } : prev));
    },
    []
  );

  const isDirty = useMemo(
    () => formData !== null && JSON.stringify(formData) !== savedBaselineRef.current,
    [formData]
  );

  const isSaving = updateMutation.isPending;
  const isSingle = formData?.data.listing_type === 'single_page';
  const editor = formData?.data.editor;
  const pageId = formData?.data.page_id;
  const pageStatus = existing?.raw?.page_status;

  const validate = (): boolean => {
    if (!formData) return false;
    const next: Record<string, string> = {};
    if (!formData.title.trim()) {
      next.title = 'Title is required';
    }
    const overrides = formData.data.override_post_types ?? [];
    if (!overrides.length) {
      next.override_post_types = 'Select at least one post type to override';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !listingId || !validate()) {
      showToast('error', 'Please fix the validation errors.');
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: listingId, data: formData });
      savedBaselineRef.current = JSON.stringify(formData);
      showToast('success', 'Template settings updated.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings.');
    }
  };

  const handleDelete = async () => {
    if (!listingId) return;
    if (!window.confirm('Delete this listing? The linked template page will also be removed.')) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(listingId);
      showToast('success', 'Listing deleted.');
      navigate('/listings');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete listing.');
    }
  };

  if (!isPro) {
    return (
      <ProModuleGate module="listings" moduleName="Listings">
        <div className="rdcfe-card rdcfe-p-6">
          <h2 className="rdcfe-text-[18px] rdcfe-font-bold">Page Template Settings</h2>
          <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            Manage single and archive page overrides. Available in Pro.
          </p>
        </div>
      </ProModuleGate>
    );
  }

  if (isLoading || !formData) {
    return (
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-py-20">
        <Loader2 className="rdcfe-h-8 rdcfe-w-8 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-primary))]" />
      </div>
    );
  }

  const editorLabel =
    editor && editor !== 'rdcfe' ? EDITOR_LABELS[editor] : 'External Editor';

  return (
    <form onSubmit={handleSubmit}>
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
              {isSingle ? 'Single Page' : 'Archive Page'} Settings
              {isDirty && (
                <span
                  className="rdcfe-w-2 rdcfe-h-2 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-warning,38_92%_50%))]"
                  title="Unsaved changes"
                  aria-label="Unsaved changes"
                />
              )}
            </h1>
            <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
              Layout is edited in {editorLabel}. Use this form for override rules and placement.
            </p>
          </div>
        </div>
      </div>

      <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-[1fr_320px] rdcfe-gap-6">
        <div className="rdcfe-space-y-5">
          {/* Design editor card */}
          {editor && editor !== 'rdcfe' && pageId && (
            <div className="rdcfe-card rdcfe-p-6">
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-4">
                <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                  <FileText className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
                </div>
                <div>
                  <h2 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    Page Design
                  </h2>
                  <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    Open the linked template page in {editorLabel} to edit the layout.
                  </p>
                </div>
              </div>
              <ExternalEditorLink pageId={pageId} editor={editor} pageStatus={pageStatus} />
            </div>
          )}

          {/* General settings */}
          <div className="rdcfe-card rdcfe-p-6">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-5">
              <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                <Settings2 className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
              </div>
              <div>
                <h2 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  General
                </h2>
                <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Name this template and choose which post types it overrides.
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
                    setFormData((prev) => (prev ? { ...prev, title: e.target.value } : prev));
                    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder={isSingle ? 'e.g. Property Single Layout' : 'e.g. Property Archive Layout'}
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
                  Override Post Types{' '}
                  <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                </label>
                <MultiSelect
                  value={formData.data.override_post_types ?? []}
                  onChange={(value) => {
                    setData((prev) => ({ ...prev, override_post_types: value }));
                    if (errors.override_post_types) {
                      setErrors((prev) => ({ ...prev, override_post_types: '' }));
                    }
                  }}
                  options={postTypeOptions}
                  placeholder="Select post types"
                />
                {errors.override_post_types && (
                  <p className="rdcfe-mt-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                    {errors.override_post_types}
                  </p>
                )}
                <p className="rdcfe-mt-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  {isSingle
                    ? 'Single posts of these types will use this template.'
                    : 'Archive pages for these types will use this template.'}
                </p>
              </div>

              <div>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                  Editor
                </label>
                <div className="rdcfe-px-3 rdcfe-py-2.5 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  {editorLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="rdcfe-card rdcfe-p-5">
            <PageSettingsPanel data={formData.data} setData={setData} />
          </div>

          <VisibilityRulesBuilder
            title="Template visibility"
            hint="Control when this page template is active. Rules are evaluated against the queried object."
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

        {/* Sidebar */}
        <div className="rdcfe-form-sidebar">
          <div className="rdcfe-card rdcfe-p-6 rdcfe-mb-5">
            <button
              type="submit"
              disabled={isSaving}
              className={`rdcfe-btn rdcfe-btn-primary rdcfe-w-full rdcfe-py-3.5 rdcfe-text-[15px] ${
                isDirty ? 'rdcfe-ring-2 rdcfe-ring-[hsl(var(--rdcfe-warning,38_92%_50%)/0.3)]' : ''
              }`}
            >
              {isSaving ? (
                <Loader2 className="rdcfe-w-5 rdcfe-h-5 rdcfe-animate-spin" />
              ) : (
                <Save className="rdcfe-w-5 rdcfe-h-5" />
              )}
              Update Settings
              {isDirty && !isSaving && (
                <span className="rdcfe-text-[11px] rdcfe-opacity-80 rdcfe-ml-1">• unsaved</span>
              )}
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
                    onClick={() => setFormData((prev) => (prev ? { ...prev, status } : prev))}
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

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rdcfe-btn rdcfe-btn-ghost rdcfe-w-full rdcfe-mt-4 rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="rdcfe-w-4 rdcfe-h-4 rdcfe-animate-spin" />
              ) : (
                <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
              )}
              Delete Listing
            </button>
          </div>

          <div className="rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
            <Info className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
            <span>
              To change the page layout, use{' '}
              <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                Edit in {editor === 'elementor' ? 'Elementor' : 'Gutenberg'}
              </strong>{' '}
              above. Save here to update override rules.
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
