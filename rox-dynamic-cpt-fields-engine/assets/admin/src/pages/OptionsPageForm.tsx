import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  ChevronRight,
  Zap,
  Settings,
  HelpCircle,
  Sliders,
  Layers,
  Code,
  Clipboard,
  CheckCircle2,
  Tag,
  Check,
  Globe,
  Lock,
  Database,
  ExternalLink,
} from 'lucide-react';
import { 
  useOptionsPage, 
  useCreateOptionsPage, 
  useUpdateOptionsPage,
  OptionsPageFormData 
} from '../hooks/useOptionsPages';
import { buildAdminPhpHref } from '../lib/utils';
import { MetaField } from '../hooks/usePostTypes';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectOption } from '../components/ui/select';
import { IconPicker } from '../components/ui/icon-picker';
import { useNotificationToast } from '../components/ui/notification-toast';
import { MetaFieldsEditor } from '../components/meta-fields/MetaFieldsEditor';
import { AIGenerateButton, mapAIFieldToMetaField } from '../components/ai-assistant/AIGenerateButton';

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = true,
  badge
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="rdcfe-card rdcfe-overflow-visible">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rdcfe-w-full rdcfe-px-6 rdcfe-py-4 rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-bg-gradient-to-r rdcfe-from-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-to-transparent hover:rdcfe-from-[hsl(var(--rdcfe-muted)/0.7)] rdcfe-transition-all rdcfe-rounded-t-xl"
      >
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
          <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))]">
            {icon}
          </div>
          <span className="rdcfe-font-semibold rdcfe-text-[15px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">{title}</span>
          {badge && (
            <span className="rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[11px] rdcfe-font-semibold rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight 
          className={`rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200 ${isOpen ? 'rdcfe-rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="rdcfe-p-6 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

// Field Row Component
function FieldRow({ 
  label, 
  hint, 
  required, 
  children,
  error
}: { 
  label: string; 
  hint?: string; 
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-[220px_1fr] rdcfe-gap-4 rdcfe-items-start rdcfe-py-5 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border)/0.5)] last:rdcfe-border-b-0 last:rdcfe-pb-0 first:rdcfe-pt-0">
      <div className="rdcfe-flex rdcfe-flex-col rdcfe-gap-1">
        <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
          {label}
          {required && <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>}
        </label>
        {hint && (
          <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">{hint}</span>
        )}
      </div>
      <div>
        {children}
        {error && <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-flex rdcfe-items-center rdcfe-gap-1">{error}</p>}
      </div>
    </div>
  );
}

// Toggle Card Component
function ToggleCard({ 
  icon, 
  title, 
  description, 
  checked, 
  onChange 
}: { 
  icon: React.ReactNode;
  title: string; 
  description: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`rdcfe-flex rdcfe-items-start rdcfe-gap-4 rdcfe-p-4 rdcfe-rounded-xl rdcfe-border rdcfe-cursor-pointer rdcfe-transition-all rdcfe-duration-200 ${
      checked 
        ? 'rdcfe-border-[#7367f0]/30 rdcfe-bg-[#7367f0]/5' 
        : 'rdcfe-border-[hsl(var(--rdcfe-border)/0.6)] hover:rdcfe-border-[#7367f0]/20 rdcfe-bg-white'
    }`}>
      <div className={`rdcfe-mt-0.5 rdcfe-p-2.5 rdcfe-rounded-xl rdcfe-transition-all ${checked ? 'rdcfe-bg-[#7367f0]/15 rdcfe-text-[#7367f0]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted)/0.6)] rdcfe-text-[hsl(var(--rdcfe-muted-foreground)/0.7)]'}`}>
        {icon}
      </div>
      <div className="rdcfe-flex-1">
        <div className="rdcfe-font-semibold rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">{title}</div>
        <div className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-0.5 rdcfe-leading-relaxed">{description}</div>
      </div>
      <div className="rdcfe-relative rdcfe-w-12 rdcfe-h-7 rdcfe-flex-shrink-0">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)}
          className="rdcfe-sr-only"
        />
        <div className={`rdcfe-w-12 rdcfe-h-7 rdcfe-rounded-full rdcfe-transition-all rdcfe-duration-200 ${checked ? 'rdcfe-bg-[#7367f0]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'}`}>
          <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-md rdcfe-transition-transform rdcfe-duration-200 rdcfe-flex rdcfe-items-center rdcfe-justify-center ${checked ? 'rdcfe-translate-x-5' : ''}`}>
            {checked && <Check className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[#7367f0]" />}
          </div>
        </div>
      </div>
    </label>
  );
}

// Labels interface
interface OptionsPageLabels {
  update_button?: string;
  updated_message?: string;
}

// Extended form data with meta fields and labels
interface ExtendedOptionsPageFormData extends OptionsPageFormData {
  meta_fields?: MetaField[];
  description?: string;
  labels?: OptionsPageLabels;
  storage?: 'options' | 'custom';
  custom_storage?: string;
  autoload?: boolean;
}

const defaultFormData: ExtendedOptionsPageFormData = {
  title: '',
  menu_title: '',
  menu_slug: '',
  capability: 'manage_options',
  position: 80,
  icon: 'dashicons-admin-generic',
  parent_slug: '',
  redirect: true,
  meta_fields: [],
  description: '',
  labels: {
    update_button: 'Save Settings',
    updated_message: 'Settings saved successfully.',
  },
  storage: 'options',
  custom_storage: '',
  autoload: false,
};

const capabilities: SelectOption[] = [
  { value: 'manage_options', label: 'Administrator (manage_options)' },
  { value: 'edit_posts', label: 'Editor (edit_posts)' },
  { value: 'publish_posts', label: 'Author (publish_posts)' },
  { value: 'edit_published_posts', label: 'Contributor (edit_published_posts)' },
  { value: 'custom', label: 'Custom Capability' },
];

const PRESET_CAPABILITIES = ['manage_options', 'edit_posts', 'publish_posts', 'edit_published_posts'];

// Menu position options (same as PostTypes)
const menuPositionOptions: SelectOption[] = [
  { value: '5', label: 'Below Posts' },
  { value: '10', label: 'Below Media' },
  { value: '15', label: 'Below Links' },
  { value: '20', label: 'Below Pages' },
  { value: '25', label: 'Below Comments' },
  { value: '60', label: 'Below First Separator' },
  { value: '65', label: 'Below Plugins' },
  { value: '70', label: 'Below Users' },
  { value: '75', label: 'Below Tools' },
  { value: '80', label: 'Below Settings' },
  { value: '100', label: 'Below Second Separator' },
];

// Data storage options
const storageOptions: SelectOption[] = [
  { value: 'options', label: 'WordPress Options Table (Default)' },
  { value: 'custom', label: 'Custom Location (Post, User, or Term)' },
];

// Tab type
type TabId = 'basic' | 'labels' | 'meta_fields' | 'advanced';

export function OptionsPageForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotificationToast();
  const optionsPageId = id ? parseInt(id, 10) : null;
  const isEditing = Boolean(optionsPageId);

  const [formData, setFormData] = useState<ExtendedOptionsPageFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manualEdits, setManualEdits] = useState<Record<string, boolean>>({});
  const [metaFields, setMetaFields] = useState<MetaField[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [showJsonView, setShowJsonView] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  // Query hooks
  const { data: existingData, isLoading: isLoadingData } = useOptionsPage(optionsPageId);
  const createMutation = useCreateOptionsPage();
  const updateMutation = useUpdateOptionsPage();

  const isLoading = isLoadingData;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  
  // Get dynamic parent menu options from WordPress
  const parentMenuOptions: SelectOption[] = useMemo(() => {
    const adminMenus = window.rdcfeSettings?.adminMenus;
    if (adminMenus && Array.isArray(adminMenus)) {
      return adminMenus;
    }
    // Fallback to static options if dynamic not available
    return [
      { value: '', label: 'Top Level Menu' },
      { value: 'options-general.php', label: 'Settings' },
      { value: 'tools.php', label: 'Tools' },
      { value: 'edit.php', label: 'Posts' },
      { value: 'upload.php', label: 'Media' },
      { value: 'edit.php?post_type=page', label: 'Pages' },
      { value: 'themes.php', label: 'Appearance' },
      { value: 'plugins.php', label: 'Plugins' },
      { value: 'users.php', label: 'Users' },
    ];
  }, []);

  // Load existing data
  useEffect(() => {
    if (existingData) {
      setFormData({
        ...existingData,
        meta_fields: (existingData as ExtendedOptionsPageFormData).meta_fields || [],
        labels: (existingData as ExtendedOptionsPageFormData).labels || defaultFormData.labels,
        storage: (existingData as ExtendedOptionsPageFormData).storage || 'options',
        custom_storage: (existingData as ExtendedOptionsPageFormData).custom_storage || '',
        autoload: (existingData as ExtendedOptionsPageFormData).autoload ?? true,
      });
      if ((existingData as ExtendedOptionsPageFormData).meta_fields) {
        setMetaFields((existingData as ExtendedOptionsPageFormData).meta_fields || []);
      }
      // Mark all fields as manually edited when loading existing data
      setManualEdits({
        menu_title: true,
        menu_slug: true,
      });
    }
  }, [existingData]);

  // Auto-generate slug and menu_title from title (like PostTypes)
  const handleTitleChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
    
    setFormData(prev => ({
      ...prev,
      title: value,
      menu_title: manualEdits.menu_title ? prev.menu_title : value,
      menu_slug: manualEdits.menu_slug ? prev.menu_slug : slug,
    }));
  };

  // Handle input changes
  const handleChange = (field: keyof ExtendedOptionsPageFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Track manual edits
    if (field === 'menu_title') {
      setManualEdits(prev => ({ ...prev, menu_title: true }));
    }
    if (field === 'menu_slug') {
      setManualEdits(prev => ({ ...prev, menu_slug: true }));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle label changes
  const handleLabelChange = (labelKey: keyof OptionsPageLabels, value: string) => {
    setFormData(prev => ({
      ...prev,
      labels: {
        ...(prev.labels || {}),
        [labelKey]: value,
      },
    }));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.menu_title.trim()) {
      newErrors.menu_title = 'Menu title is required';
    }
    if (!formData.menu_slug.trim()) {
      newErrors.menu_slug = 'Menu slug is required';
    } else if (!/^[a-z][a-z0-9-]*$/.test(formData.menu_slug)) {
      newErrors.menu_slug = 'Slug must start with a letter and contain only lowercase letters, numbers, and hyphens';
    }

    // Validate custom storage if selected
    if (formData.storage === 'custom' && !formData.custom_storage?.trim()) {
      newErrors.custom_storage = 'Custom storage location is required';
    }

    // Validate meta fields
    metaFields.forEach((field, index) => {
      if (field.object_type === 'field') {
        if (!field.label?.trim()) {
          newErrors[`meta_field_${index}_label`] = `Field #${index + 1}: Label is required`;
        }
        if (!field.name?.trim()) {
          newErrors[`meta_field_${index}_name`] = `Field #${index + 1}: Name/ID is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      const errorMessages: string[] = [];
      
      if (!formData.title.trim()) errorMessages.push('Page Title is required');
      if (!formData.menu_title.trim()) errorMessages.push('Menu Title is required');
      if (!formData.menu_slug.trim()) errorMessages.push('Menu Slug is required');

      // Check for meta field validation errors
      const metaFieldErrors: string[] = [];
      metaFields.forEach((field, index) => {
        if (field.object_type === 'field') {
          if (!field.label?.trim() || !field.name?.trim()) {
            const fieldLabel = field.label?.trim() || `Field #${index + 1}`;
            const missingFields: string[] = [];
            if (!field.label?.trim()) missingFields.push('Label');
            if (!field.name?.trim()) missingFields.push('Name/ID');
            metaFieldErrors.push(`"${fieldLabel}" is missing: ${missingFields.join(', ')}`);
          }
        }
      });

      if (metaFieldErrors.length > 0) {
        errorMessages.push(`Meta Fields: ${metaFieldErrors.join('; ')}`);
        setActiveTab('meta_fields');
      }
      
      showToast('error', errorMessages.length > 1 
        ? `Please fix: ${errorMessages.join(', ')}`
        : errorMessages[0] || 'Please fix validation errors'
      );
      return;
    }

    const dataToSave = {
      ...formData,
      meta_fields: metaFields,
    };

    try {
      if (isEditing && optionsPageId) {
        await updateMutation.mutateAsync({ id: optionsPageId, data: dataToSave });
        // WordPress renders the admin sidebar server-side, so any change that
        // affects menu registration (title, slug, icon, position, parent,
        // capability, or the redirect-to-child toggle) only becomes visible
        // after a full page reload. We always reload after a successful save
        // here — it's a minor UX cost (~1s) but guarantees the sidebar and
        // form reflect the persisted state, and avoids subtle race conditions
        // between react-query's invalidation and our local state diff.
        showToast(
          'success',
          formData.labels?.updated_message || 'Options page updated successfully! Refreshing menu...'
        );
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const result = await createMutation.mutateAsync(dataToSave);
        showToast('success', 'Options page created successfully! Refreshing menu...');
        setTimeout(() => {
          const newId = (result as { id?: number })?.id;
          if (newId) {
            window.location.href = buildAdminPhpHref('rdcfe-options-pages', `#/options-pages/${newId}`);
          } else {
            window.location.reload();
          }
        }, 1000);
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleAIAccept = (suggestion: Record<string, unknown>) => {
    if (suggestion.title) handleTitleChange(String(suggestion.title));
    if (suggestion.menu_title) handleChange('menu_title', String(suggestion.menu_title));
    if (suggestion.menu_slug) handleChange('menu_slug', String(suggestion.menu_slug));
    if (suggestion.icon) handleChange('icon', String(suggestion.icon));
    if (suggestion.description) handleChange('description', String(suggestion.description));
    if (suggestion.capability) handleChange('capability', String(suggestion.capability));
    if (suggestion.position) handleChange('position', Number(suggestion.position));
    if (suggestion.parent_slug !== undefined) handleChange('parent_slug', String(suggestion.parent_slug));
    if (Array.isArray(suggestion.fields)) {
      setMetaFields(
        (suggestion.fields as Array<Record<string, unknown>>).map(mapAIFieldToMetaField)
      );
      setActiveTab('meta_fields');
    }
    showToast('success', 'AI suggestions applied to form');
  };

  if (isLoading) {
    return (
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-py-20">
        <Loader2 className="rdcfe-h-8 rdcfe-w-8 rdcfe-animate-spin rdcfe-text-[hsl(var(--rdcfe-primary))]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rdcfe-animate-fade-in">
      {/* Page Header */}
      <div className="rdcfe-mb-8">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-3">
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-4">
            <button
              type="button"
              onClick={() => navigate('/options-pages')}
              className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
            >
              <ArrowLeft className="rdcfe-w-5 rdcfe-h-5" />
            </button>
            <div>
              <h1 className="rdcfe-text-[24px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-tracking-tight">
                {isEditing ? 'Edit Options Page' : 'Create Options Page'}
              </h1>
              <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
                {isEditing ? 'Update your options page settings' : 'Create a new options page for global settings'}
              </p>
            </div>
          </div>
          <AIGenerateButton
            module="options_page"
            context={isEditing && formData.menu_slug ? { existing_slug: formData.menu_slug } : undefined}
            onAccept={handleAIAccept}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="rdcfe-form-layout">
        {/* Main Content */}
        <div className="rdcfe-form-main rdcfe-space-y-6">
          
          {/* Quick Setup Card */}
          <div className="rdcfe-card rdcfe-p-6">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-5">
              <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                <Zap className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
              </div>
              <div>
                <h2 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">Quick Setup</h2>
                <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Enter your page title and we'll auto-generate the rest</p>
              </div>
            </div>

            <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-3 rdcfe-gap-5">
              <div className="rdcfe-col-span-1 md:rdcfe-col-span-2">
                <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Page Title <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g., Theme Options, Site Settings"
                  className="rdcfe-input rdcfe-text-[15px]"
                />
                {errors.title && (
                  <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">{errors.title}</p>
                )}
                <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Enter a title. Menu title and slug will be auto-generated.
                </p>
              </div>
              <div>
                <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Menu Slug
                </label>
                <input
                  type="text"
                  value={formData.menu_slug}
                  onChange={(e) => handleChange('menu_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="auto-generated"
                  className="rdcfe-input rdcfe-font-mono rdcfe-text-[15px]"
                />
                {errors.menu_slug && (
                  <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">{errors.menu_slug}</p>
                )}
              </div>
            </div>

            {formData.menu_slug && (
              <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-flex rdcfe-flex-wrap rdcfe-gap-3">
                <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[13px] rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  <Globe className="rdcfe-w-4 rdcfe-h-4" />
                  /wp-admin/admin.php?page={formData.menu_slug}
                </span>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="rdcfe-flex rdcfe-gap-1 rdcfe-p-1.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-xl rdcfe-w-fit">
            {[
              { id: 'basic', label: 'Basic Settings', icon: <Settings className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'labels', label: 'Labels', icon: <Tag className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'meta_fields', label: 'Fields', icon: <Layers className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'advanced', label: 'Advanced', icon: <Sliders className="rdcfe-w-4 rdcfe-h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-5 rdcfe-py-2.5 rdcfe-rounded-lg rdcfe-text-[14px] rdcfe-font-medium rdcfe-transition-all rdcfe-duration-200 ${
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

          {/* Basic Settings Tab */}
          {activeTab === 'basic' && (
            <div className="rdcfe-space-y-6">
              {/* Menu Settings */}
              <CollapsibleSection title="Menu Settings" icon={<Tag className="rdcfe-w-5 rdcfe-h-5" />}>
                <FieldRow label="Menu Title" hint="The text displayed in the admin menu" required error={errors.menu_title}>
                  <Input
                    value={formData.menu_title}
                    onChange={(e) => handleChange('menu_title', e.target.value)}
                    placeholder="e.g., Theme Options"
                    error={!!errors.menu_title}
                  />
                </FieldRow>

                <FieldRow label="Description" hint="Brief description of what this options page is for (optional)">
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe what settings are managed here..."
                    rows={2}
                  />
                </FieldRow>

                <FieldRow label="Parent Menu" hint="Make this a submenu of another menu">
                  <Select
                    options={parentMenuOptions}
                    value={formData.parent_slug || ''}
                    onChange={(e) => handleChange('parent_slug', e.target.value)}
                  />
                </FieldRow>
              </CollapsibleSection>

              {/* Admin Menu - Only show for Top Level Menu (no parent) */}
              {!formData.parent_slug && (
                <CollapsibleSection title="Admin Menu" icon={<Settings className="rdcfe-w-5 rdcfe-h-5" />}>
                  <FieldRow label="Menu Icon" hint="Choose an icon for the admin sidebar">
                    <IconPicker
                      value={formData.icon || 'dashicons-admin-generic'}
                      onChange={(value) => handleChange('icon', value)}
                    />
                  </FieldRow>

                  <FieldRow label="Menu Position" hint="Where to place in the admin menu">
                    <Select
                      options={menuPositionOptions}
                      value={String(formData.position || 80)}
                      onChange={(e) => handleChange('position', parseInt(e.target.value))}
                    />
                  </FieldRow>

                  {/* Redirect to Child Page Toggle */}
                  <div className="rdcfe-mt-4">
                    <ToggleCard
                      icon={<ExternalLink className="rdcfe-w-5 rdcfe-h-5" />}
                      title="Redirect to Child Page"
                      description="When child pages exist for this parent page, this page will redirect to the first child page."
                      checked={formData.redirect ?? true}
                      onChange={(v) => handleChange('redirect', v)}
                    />
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}

          {/* Labels Tab */}
          {activeTab === 'labels' && (
            <div className="rdcfe-space-y-6">
              <CollapsibleSection title="UI Labels" icon={<Tag className="rdcfe-w-5 rdcfe-h-5" />}>
                <div className="rdcfe-info-box rdcfe-mb-6">
                  <HelpCircle className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0" />
                  <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    Customize the text shown on buttons and messages for this options page.
                  </p>
                </div>

                <FieldRow label="Update Button" hint="Text for the save/update button">
                  <Input
                    value={formData.labels?.update_button || 'Save Settings'}
                    onChange={(e) => handleLabelChange('update_button', e.target.value)}
                    placeholder="Save Settings"
                  />
                </FieldRow>

                <FieldRow label="Updated Message" hint="Success message shown after saving">
                  <Input
                    value={formData.labels?.updated_message || 'Settings saved successfully.'}
                    onChange={(e) => handleLabelChange('updated_message', e.target.value)}
                    placeholder="Settings saved successfully."
                  />
                </FieldRow>
              </CollapsibleSection>
            </div>
          )}

          {/* Meta Fields Tab */}
          {activeTab === 'meta_fields' && (
            <MetaFieldsEditor
              metaFields={metaFields}
              setMetaFields={setMetaFields}
              emptyStateText="Add custom fields to collect settings for your options page"
            />
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="rdcfe-space-y-6">
              {/* Data Storage */}
              <CollapsibleSection title="Data Storage" icon={<Database className="rdcfe-w-5 rdcfe-h-5" />}>
                <div className="rdcfe-info-box rdcfe-mb-6">
                  <Database className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0" />
                  <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    Choose where to save the options page data. By default, data is stored in the WordPress options table (<code className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded rdcfe-text-[12px]">wp_options</code>).
                  </p>
                </div>

                <FieldRow label="Storage Location" hint="Select where this page's field data will be saved and loaded from">
                  <Select
                    options={storageOptions}
                    value={formData.storage || 'options'}
                    onChange={(e) => handleChange('storage', e.target.value)}
                  />
                </FieldRow>

                {formData.storage === 'custom' && (
                  <FieldRow label="Custom Storage ID" hint="Enter the ID or key for the custom storage location" error={errors.custom_storage}>
                    <Input
                      value={formData.custom_storage || ''}
                      onChange={(e) => handleChange('custom_storage', e.target.value)}
                      placeholder="e.g., 123, user_2, term_5"
                      error={!!errors.custom_storage}
                    />
                    <div className="rdcfe-mt-3 rdcfe-p-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      <p className="rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2">Examples:</p>
                      <ul className="rdcfe-space-y-1.5">
                        <li><code className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-bg-white rdcfe-rounded">123</code> - Load from Post ID 123</li>
                        <li><code className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-bg-white rdcfe-rounded">user_2</code> - Load from User ID 2</li>
                        <li><code className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-bg-white rdcfe-rounded">term_5</code> - Load from Term ID 5</li>
                        <li><code className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-bg-white rdcfe-rounded">category_3</code> - Load from Category ID 3</li>
                      </ul>
                    </div>
                  </FieldRow>
                )}

                <div className="rdcfe-mt-4">
                  {formData.storage === 'custom' ? (
                    <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-4 rdcfe-p-4 rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border)/0.6)] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-opacity-70">
                      <div className="rdcfe-mt-0.5 rdcfe-p-2.5 rdcfe-rounded-xl rdcfe-bg-[hsl(var(--rdcfe-muted)/0.6)] rdcfe-text-[hsl(var(--rdcfe-muted-foreground)/0.7)]">
                        <Zap className="rdcfe-w-5 rdcfe-h-5" />
                      </div>
                      <div className="rdcfe-flex-1">
                        <div className="rdcfe-font-semibold rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Autoload Options</div>
                        <div className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-0.5 rdcfe-leading-relaxed">
                          Not applicable for custom storage locations (post/user/term meta have no autoload concept).
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ToggleCard
                      icon={<Zap className="rdcfe-w-5 rdcfe-h-5" />}
                      title="Autoload Options"
                      description="When enabled, WordPress will load these options into memory on every page load. Enable only if these settings are needed on every page."
                      checked={formData.autoload ?? false}
                      onChange={(v) => handleChange('autoload', v)}
                    />
                  )}
                </div>
              </CollapsibleSection>

              {/* Permissions */}
              <CollapsibleSection title="Permissions" icon={<Lock className="rdcfe-w-5 rdcfe-h-5" />}>
                <FieldRow label="Required Capability" hint="Users need this capability to access the page. Choose Custom to use any role/capability slug." error={errors.capability}>
                  <div className="rdcfe-space-y-3">
                    <Select
                      options={capabilities}
                      value={
                        PRESET_CAPABILITIES.includes(formData.capability || '')
                          ? (formData.capability || 'manage_options')
                          : 'custom'
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'custom') {
                          handleChange('capability', '');
                        } else {
                          handleChange('capability', v);
                        }
                      }}
                    />
                    {!PRESET_CAPABILITIES.includes(formData.capability || '') && (
                      <Input
                        value={formData.capability || ''}
                        onChange={(e) => handleChange('capability', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="e.g., manage_woocommerce, edit_users"
                        className="rdcfe-font-mono"
                        error={!!errors.capability}
                      />
                    )}
                  </div>
                </FieldRow>

                <div className="rdcfe-info-box rdcfe-mt-4">
                  <HelpCircle className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0" />
                  <div className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    <p className="rdcfe-mb-2"><strong>Common capabilities:</strong></p>
                    <ul className="rdcfe-space-y-1 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      <li><code className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded rdcfe-text-[12px]">manage_options</code> - Administrators only</li>
                      <li><code className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded rdcfe-text-[12px]">edit_posts</code> - Editors and above</li>
                      <li><code className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded rdcfe-text-[12px]">publish_posts</code> - Authors and above</li>
                    </ul>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="rdcfe-form-sidebar">
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
              {isEditing ? 'Update Options Page' : 'Create Options Page'}
            </button>

            {formData.menu_slug && (
              <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-3">Preview</div>
                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-rounded-xl">
                  <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                    <span 
                      className={`dashicons ${formData.icon || 'dashicons-admin-generic'}`}
                      style={{ fontSize: '20px', width: '20px', height: '20px', color: 'hsl(var(--rdcfe-primary))' }}
                    />
                  </div>
                  <span className="rdcfe-font-semibold rdcfe-text-[15px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    {formData.menu_title || formData.title || 'Options Page'}
                  </span>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
              <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-3">Summary</div>
              <div className="rdcfe-space-y-2">
                <div className="rdcfe-flex rdcfe-justify-between rdcfe-items-center rdcfe-py-2 rdcfe-px-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Meta Fields</span>
                  <span className="rdcfe-font-semibold rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-px-2.5 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[12px]">
                    {metaFields.length}
                  </span>
                </div>
                <div className="rdcfe-flex rdcfe-justify-between rdcfe-items-center rdcfe-py-2 rdcfe-px-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Storage</span>
                  <span className="rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-text-[12px]">
                    {formData.storage === 'custom' ? 'Custom' : 'Options'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="rdcfe-card rdcfe-p-6 rdcfe-mb-5">
            <h3 className="rdcfe-text-[14px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-4">
              <HelpCircle className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
              Quick Tips
            </h3>
            <ul className="rdcfe-space-y-3 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              <li className="rdcfe-flex rdcfe-gap-3">
                <div className="rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                  <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))]">1</span>
                </div>
                <span>Menu title and slug are auto-generated from the page title</span>
              </li>
              <li className="rdcfe-flex rdcfe-gap-3">
                <div className="rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                  <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))]">2</span>
                </div>
                <span>Set appropriate capabilities for security</span>
              </li>
              <li className="rdcfe-flex rdcfe-gap-3">
                <div className="rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                  <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))]">3</span>
                </div>
                <span>Customize labels in the Labels tab</span>
              </li>
            </ul>
          </div>

          {/* JSON View Card */}
          <div className="rdcfe-card rdcfe-overflow-hidden">
            <button
              type="button"
              onClick={() => setShowJsonView(!showJsonView)}
              className="rdcfe-w-full rdcfe-p-4 rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-bg-gradient-to-r rdcfe-from-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-to-transparent hover:rdcfe-from-[hsl(var(--rdcfe-muted)/0.7)] rdcfe-transition-all"
            >
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                <Code className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                <span className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">JSON Config</span>
              </div>
              <ChevronRight 
                className={`rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200 ${showJsonView ? 'rdcfe-rotate-90' : ''}`}
              />
            </button>
            {showJsonView && (
              <div className="rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                <div className="rdcfe-p-3 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-flex rdcfe-items-center rdcfe-justify-between">
                  <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Read-only configuration</span>
                  <button
                    type="button"
                    onClick={() => {
                      const jsonConfig = JSON.stringify({
                        page_title: formData.title,
                        menu_title: formData.menu_title,
                        menu_slug: formData.menu_slug,
                        capability: formData.capability,
                        position: formData.position,
                        icon_url: formData.icon,
                        parent_slug: formData.parent_slug,
                        redirect: formData.redirect,
                        description: formData.description,
                        labels: formData.labels,
                        storage: formData.storage,
                        custom_storage: formData.custom_storage,
                        autoload: formData.autoload,
                        meta_fields: metaFields,
                      }, null, 2);
                      navigator.clipboard.writeText(jsonConfig);
                      setJsonCopied(true);
                      setTimeout(() => setJsonCopied(false), 2000);
                    }}
                    className="rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-text-[hsl(var(--rdcfe-primary)/0.8)] rdcfe-transition-colors"
                  >
                    {jsonCopied ? (
                      <>
                        <CheckCircle2 className="rdcfe-w-3.5 rdcfe-h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Clipboard className="rdcfe-w-3.5 rdcfe-h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="rdcfe-p-4 rdcfe-max-h-[300px] rdcfe-overflow-auto">
                  <pre className="rdcfe-text-[11px] rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-whitespace-pre-wrap rdcfe-break-words">
                    {JSON.stringify({
                      page_title: formData.title,
                      menu_title: formData.menu_title,
                      menu_slug: formData.menu_slug,
                      capability: formData.capability,
                      position: formData.position,
                      icon_url: formData.icon,
                      parent_slug: formData.parent_slug,
                      redirect: formData.redirect,
                      storage: formData.storage,
                      autoload: formData.autoload,
                      labels: formData.labels,
                      meta_fields_count: metaFields.length,
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
