import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, X, Plus } from 'lucide-react';
import { usePostTypes } from '../../hooks/usePostTypes';
import { useCreateListing } from '../../hooks/useListings';
import { useNotificationToast } from '../ui/notification-toast';
import { getListingEditPath } from '../../utils/listingPaths';
import type { ListingType, ListingEditor, ListingConfigData } from '../../services/api';

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DataSource = 'posts' | 'terms' | 'users';

interface ModalFormState {
  title: string;
  dataSource: DataSource;
  postType: string;
  templateType: ListingType;
  editor: ListingEditor;
}

const INITIAL_STATE: ModalFormState = {
  title: '',
  dataSource: 'posts',
  postType: '',
  templateType: 'template',
  editor: 'rdcfe',
};

const TEMPLATE_TYPE_OPTIONS: Array<{ value: ListingType; label: string; description: string }> = [
  { value: 'template', label: 'Card (listing item)', description: 'A single card layout for grids' },
  { value: 'grid', label: 'Grid', description: 'Multi-card listing grid' },
  { value: 'single_page', label: 'Single Page', description: 'Override single post template' },
  { value: 'archive_page', label: 'Archive Page', description: 'Override archive/listing page' },
];

const DATA_SOURCE_OPTIONS: Array<{ value: DataSource; label: string }> = [
  { value: 'posts', label: 'Posts' },
  { value: 'terms', label: 'Terms' },
  { value: 'users', label: 'Users' },
];

export function CreateTemplateModal({ open, onOpenChange }: CreateTemplateModalProps) {
  const navigate = useNavigate();
  const { showToast } = useNotificationToast();
  const createMutation = useCreateListing();
  const { data: postTypeConfigs } = usePostTypes();

  const [form, setForm] = useState<ModalFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const elementorActive = window.rdcfeSettings?.elementorActive ?? false;

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_STATE);
      setErrors({});
    }
  }, [open]);

  const postTypeOptions = useMemo(() => {
    const registered = window.rdcfeSettings?.registeredPostTypes ?? [];
    const fromConfigs = (postTypeConfigs ?? [])
      .filter((c) => c.status === 'publish')
      .map((c) => ({
        value: c.data?.slug || c.slug || '',
        label: c.title || c.data?.label || c.slug || '',
      }))
      .filter((o) => o.value);

    const merged = new Map<string, string>();
    for (const opt of registered) {
      merged.set(opt.value, opt.label);
    }
    for (const opt of fromConfigs) {
      if (!merged.has(opt.value)) {
        merged.set(opt.value, opt.label);
      }
    }

    return Array.from(merged, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [postTypeConfigs]);

  const showPostType = form.dataSource === 'posts';
  const showEditor = form.templateType === 'single_page' || form.templateType === 'archive_page';

  const editorOptions = useMemo(() => {
    const options: Array<{ value: ListingEditor; label: string }> = [
      { value: 'gutenberg', label: 'Gutenberg (Block Editor)' },
    ];
    if (elementorActive) {
      options.push({ value: 'elementor', label: 'Elementor' });
    }
    return options;
  }, [elementorActive]);

  const update = <K extends keyof ModalFormState>(key: K, value: ModalFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) {
      errs.title = 'Template name is required.';
    }
    if (showPostType && !form.postType) {
      errs.postType = 'Please select a post type.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildConfig = (): ListingConfigData => {
    const base: ListingConfigData = {
      listing_type: form.templateType,
      data_source: form.dataSource,
      post_types: showPostType && form.postType ? [form.postType] : [],
      components: [],
    };

    if (form.templateType === 'grid') {
      return {
        ...base,
        listing_type: 'grid',
        template_id: 0,
        query_id: 0,
        columns: 3,
        gap: '20px',
        pagination: 'none',
        empty_message: 'No items found.',
      };
    }

    if (form.templateType === 'single_page' || form.templateType === 'archive_page') {
      return {
        ...base,
        editor: form.editor,
        override_post_types: showPostType && form.postType ? [form.postType] : [],
        canvas_mode: 'full_width',
        placement: 'template_include',
      };
    }

    return base;
  };

  const getNavigationPath = (id: number): string =>
    getListingEditPath({ id, data: buildConfig() });

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const config = buildConfig();
      const result = await createMutation.mutateAsync({
        title: form.title.trim(),
        // Grids are incomplete until a card template is picked in the editor.
        status: form.templateType === 'grid' ? 'draft' : 'publish',
        data: config,
      });

      showToast('success', 'Template created successfully.');
      onOpenChange(false);

      // For external editors, open the editor URL in a new tab.
      const editorUrl = result?._links?.editor_url;
      if (editorUrl && (form.editor === 'gutenberg' || form.editor === 'elementor')) {
        window.open(editorUrl, '_blank', 'noopener,noreferrer');
      }

      const path = getNavigationPath(result.id);
      navigate(path);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to create template.');
    }
  };

  if (!open) return null;

  return (
    <div className="rdcfe-fixed rdcfe-inset-0 rdcfe-z-[99999]" role="presentation">
      {/* Backdrop */}
      <button
        type="button"
        className="rdcfe-absolute rdcfe-inset-0 rdcfe-bg-black/40 rdcfe-backdrop-blur-[1px]"
        aria-label="Close panel"
        onClick={() => onOpenChange(false)}
      />

      {/* Slide-over panel */}
      <div
        className="rdcfe-absolute rdcfe-inset-y-0 rdcfe-right-0 rdcfe-flex rdcfe-w-full rdcfe-max-w-md rdcfe-min-w-0 rdcfe-flex-col rdcfe-border-l rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rdcfe-create-template-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="rdcfe-flex rdcfe-shrink-0 rdcfe-items-center rdcfe-justify-between rdcfe-gap-3 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-px-5 rdcfe-py-4">
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-min-w-0">
            <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0">
              <Plus className="rdcfe-w-4.5 rdcfe-h-4.5 rdcfe-text-white" />
            </div>
            <div className="rdcfe-min-w-0">
              <h2
                id="rdcfe-create-template-title"
                className="rdcfe-text-[15px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]"
              >
                Create Template
              </h2>
              <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                Set up a new template, grid, or page override.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rdcfe-flex rdcfe-h-8 rdcfe-w-8 rdcfe-flex-shrink-0 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors"
            aria-label="Close"
          >
            <X className="rdcfe-h-4 rdcfe-w-4" />
          </button>
        </div>

        {/* Form body — scrollable */}
        <div className="rdcfe-min-h-0 rdcfe-flex-1 rdcfe-overflow-y-auto rdcfe-px-5 rdcfe-py-5">
          <div className="rdcfe-space-y-5">
            {/* Template name */}
            <div>
              <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                Template name <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Property Single Layout"
                className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-text-[14px] rdcfe-rounded-md rdcfe-border rdcfe-bg-white rdcfe-transition-colors focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-1 ${
                  errors.title
                    ? 'rdcfe-border-[hsl(var(--rdcfe-destructive))]'
                    : 'rdcfe-border-[hsl(var(--rdcfe-border))]'
                }`}
                autoFocus
              />
              {errors.title && (
                <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-mt-1">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Data source + Post type — side by side */}
            <div className={`rdcfe-grid rdcfe-gap-3 ${showPostType ? 'rdcfe-grid-cols-2' : 'rdcfe-grid-cols-1'}`}>
              <div>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                  Data source
                </label>
                <select
                  value={form.dataSource}
                  onChange={(e) => update('dataSource', e.target.value as DataSource)}
                  className="rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-text-[14px] rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-transition-colors focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-1"
                >
                  {DATA_SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {showPostType && (
                <div>
                  <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                    Post type <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                  </label>
                  <select
                    value={form.postType}
                    onChange={(e) => update('postType', e.target.value)}
                    className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-text-[14px] rdcfe-rounded-md rdcfe-border rdcfe-bg-white rdcfe-transition-colors focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-offset-1 ${
                      errors.postType
                        ? 'rdcfe-border-[hsl(var(--rdcfe-destructive))]'
                        : 'rdcfe-border-[hsl(var(--rdcfe-border))]'
                    }`}
                  >
                    <option value="">— Select post type —</option>
                    {postTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.postType && (
                    <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-mt-1">
                      {errors.postType}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Template type — compact radio cards */}
            <div>
              <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                Template type
              </label>
              <div className="rdcfe-grid rdcfe-grid-cols-2 rdcfe-gap-2">
                {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`rdcfe-flex rdcfe-flex-col rdcfe-px-3 rdcfe-py-2.5 rdcfe-rounded-lg rdcfe-border rdcfe-cursor-pointer rdcfe-transition-all ${
                      form.templateType === opt.value
                        ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.04)] rdcfe-shadow-sm'
                        : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="templateType"
                      value={opt.value}
                      checked={form.templateType === opt.value}
                      onChange={() => {
                        const nextType = opt.value;
                        setForm((prev) => ({
                          ...prev,
                          templateType: nextType,
                          editor:
                            nextType === 'single_page' || nextType === 'archive_page'
                              ? 'gutenberg'
                              : prev.editor,
                        }));
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.templateType;
                          return next;
                        });
                      }}
                      className="rdcfe-sr-only"
                    />
                    <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                      <div
                        className={`rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-rounded-full rdcfe-border-2 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 ${
                          form.templateType === opt.value
                            ? 'rdcfe-border-[hsl(var(--rdcfe-primary))]'
                            : 'rdcfe-border-[hsl(var(--rdcfe-muted-foreground)/0.4)]'
                        }`}
                      >
                        {form.templateType === opt.value && (
                          <div className="rdcfe-w-1.5 rdcfe-h-1.5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary))]" />
                        )}
                      </div>
                      <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                        {opt.label}
                      </span>
                    </div>
                    <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-0.5 rdcfe-ml-5.5">
                      {opt.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Editor (conditional — single_page / archive_page only) */}
            {showEditor && (
              <div>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                  Editor
                </label>
                <div className="rdcfe-space-y-1.5">
                  {editorOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-border rdcfe-cursor-pointer rdcfe-transition-all ${
                        form.editor === opt.value
                          ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.04)]'
                          : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editor"
                        value={opt.value}
                        checked={form.editor === opt.value}
                        onChange={() => update('editor', opt.value)}
                        className="rdcfe-sr-only"
                      />
                      <div
                        className={`rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-rounded-full rdcfe-border-2 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 ${
                          form.editor === opt.value
                            ? 'rdcfe-border-[hsl(var(--rdcfe-primary))]'
                            : 'rdcfe-border-[hsl(var(--rdcfe-muted-foreground)/0.4)]'
                        }`}
                      >
                        {form.editor === opt.value && (
                          <div className="rdcfe-w-1.5 rdcfe-h-1.5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary))]" />
                        )}
                      </div>
                      <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-mt-2.5 rdcfe-p-2.5 rdcfe-rounded-lg rdcfe-bg-[hsl(45_93%_47%/0.08)] rdcfe-border rdcfe-border-[hsl(45_93%_47%/0.2)]">
                  <AlertTriangle className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-text-[hsl(45_93%_47%)] rdcfe-mt-0.5 rdcfe-flex-shrink-0" />
                  <p className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
                    A linked WordPress page will be created automatically. You'll be redirected to
                    the {form.editor === 'gutenberg' ? 'Block Editor' : 'Elementor'} to design it.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer — sticky at bottom */}
        <div className="rdcfe-flex rdcfe-shrink-0 rdcfe-items-center rdcfe-justify-end rdcfe-gap-3 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-px-5 rdcfe-py-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rdcfe-btn rdcfe-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="rdcfe-btn rdcfe-btn-primary"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                Creating…
              </>
            ) : (
              'Create Template'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
