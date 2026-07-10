import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Settings,
  Tag,
  Sliders,
  HelpCircle,
  Link as LinkIcon,
  Check,
  ChevronRight,
  Eye,
  Globe,
  Layers,
  Database,
  PanelTop,
  LayoutList,
  Zap,
  Edit3,
  Search,
} from 'lucide-react';
import { 
  useTaxonomy, 
  useCreateTaxonomy, 
  useUpdateTaxonomy,
  TaxonomyFormData 
} from '../hooks/useTaxonomies';
import { buildAdminPhpHref } from '../lib/utils';
import { usePostTypes, MetaField } from '../hooks/usePostTypes';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { CheckboxGroup } from '../components/ui/checkbox';
import { useNotificationToast } from '../components/ui/notification-toast';
import { MetaFieldsEditor } from '../components/meta-fields/MetaFieldsEditor';
import { AIGenerateButton } from '../components/ai-assistant/AIGenerateButton';

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
    <label className={`rdcfe-flex rdcfe-items-start rdcfe-gap-4 rdcfe-p-4 rdcfe-rounded-xl rdcfe-border-2 rdcfe-cursor-pointer rdcfe-transition-all rdcfe-duration-200 ${
      checked 
        ? 'rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]' 
        : 'rdcfe-border-[hsl(var(--rdcfe-border)/0.6)] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.4)] rdcfe-bg-white'
    }`}>
      <div className={`rdcfe-mt-0.5 rdcfe-p-2.5 rdcfe-rounded-xl rdcfe-transition-all ${checked ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.15)] rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted)/0.6)] rdcfe-text-[hsl(var(--rdcfe-muted-foreground)/0.7)]'}`}>
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
        <div className={`rdcfe-w-12 rdcfe-h-7 rdcfe-rounded-full rdcfe-transition-all rdcfe-duration-200 ${checked ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'}`}>
          <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-md rdcfe-transition-transform rdcfe-duration-200 rdcfe-flex rdcfe-items-center rdcfe-justify-center ${checked ? 'rdcfe-translate-x-5' : ''}`}>
            {checked && <Check className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-primary))]" />}
          </div>
        </div>
      </div>
    </label>
  );
}

const defaultFormData: TaxonomyFormData = {
  title: '',
  slug: '',
  singular_label: '',
  plural_label: '',
  description: '',
  object_type: [],
  public: true,
  hierarchical: true,
  show_in_rest: true,
  show_admin_column: true,
  show_tagcloud: true,
  show_in_nav_menus: true,
  show_ui: true,
  show_in_quick_edit: true,
  query_var: true,
  rewrite: true,
  rewrite_slug: '',
  labels: {},
};

export function TaxonomyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotificationToast();
  const taxonomyId = id ? parseInt(id, 10) : null;
  const isEditing = Boolean(taxonomyId);

  const [formData, setFormData] = useState<TaxonomyFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'labels' | 'meta_fields' | 'advanced'>('basic');
  // Track which fields have been manually edited
  const [manualEdits, setManualEdits] = useState<Record<string, boolean>>({});
  // Meta fields state
  const [metaFields, setMetaFields] = useState<MetaField[]>([]);

  // Query hooks
  const { data: existingData, isLoading: isLoadingData } = useTaxonomy(taxonomyId);
  const { data: postTypes } = usePostTypes();
  const createMutation = useCreateTaxonomy();
  const updateMutation = useUpdateTaxonomy();

  const isLoading = isLoadingData;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Load existing data
  useEffect(() => {
    if (existingData) {
      setFormData(existingData);
      // Mark all fields as manually edited when loading existing data
      setManualEdits({ 
        singular: true, 
        slug: true,
        search_items: true,
        all_items: true,
        edit_item: true,
        add_new_item: true,
        not_found: true,
      });
      // Load meta fields
      if (existingData.meta_fields) {
        setMetaFields(existingData.meta_fields);
      }
    }
  }, [existingData]);

  // Generate singular from plural
  const generateSingular = (plural: string): string => {
    if (!plural) return '';
    const lower = plural.toLowerCase();
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    
    // Handle words ending in 'ies' - need special logic
    if (lower.endsWith('ies') && lower.length > 3) {
      // Short words like "pies", "ties", "lies" - just remove 's'
      if (lower.length <= 4) {
        return plural.slice(0, -1);
      }
      
      const letterAtMinus4 = lower.charAt(lower.length - 4);
      const letterAtMinus5 = lower.length > 4 ? lower.charAt(lower.length - 5) : '';
      
      // These consonants almost always indicate an 'ie' word (movie, cookie, pixie)
      // Just remove 's': movies → movie, cookies → cookie
      if (['v', 'k', 'x'].includes(letterAtMinus4)) {
        return plural.slice(0, -1);
      }
      
      // If two consonants before 'ies' (like 'mb' in zombies, 'rd' in birdies), likely "ie" word
      if (letterAtMinus5 && !vowels.includes(letterAtMinus5) && !vowels.includes(letterAtMinus4)) {
        return plural.slice(0, -1);
      }
      
      // For other consonants (t, b, d, r, l, s, etc.), apply the y → ies rule in reverse
      // cities → city, babies → baby, ladies → lady
      if (!vowels.includes(letterAtMinus4)) {
        return plural.slice(0, -3) + 'y';
      }
      
      // Vowel before 'ies' - just remove 's'
      return plural.slice(0, -1);
    }
    
    if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes') || 
        lower.endsWith('ches') || lower.endsWith('shes')) {
      return plural.slice(0, -2);
    }
    
    if (lower.endsWith('s') && plural.length > 1) {
      return plural.slice(0, -1);
    }
    
    return plural;
  };

  // Generate all labels from singular and plural
  const generateTaxonomyLabels = (singular: string, plural: string) => {
    const pluralLower = plural.toLowerCase();
    
    return {
      search_items: `Search ${plural}`,
      popular_items: `Popular ${plural}`,
      all_items: `All ${plural}`,
      parent_item: `Parent ${singular}`,
      parent_item_colon: `Parent ${singular}:`,
      edit_item: `Edit ${singular}`,
      view_item: `View ${singular}`,
      update_item: `Update ${singular}`,
      add_new_item: `Add New ${singular}`,
      new_item_name: `New ${singular} Name`,
      not_found: `No ${pluralLower} found`,
      back_to_items: `← Back to ${plural}`,
    };
  };

  // Auto-generate singular, slug, and ALL labels from plural label (Taxonomy Name)
  const handlePluralLabelChange = (value: string) => {
    const singular = generateSingular(value);
    const slug = singular.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32);
    const autoLabels = generateTaxonomyLabels(singular, value);
    
    setFormData(prev => {
      // Only update fields that haven't been manually edited
      const newLabels = { ...(prev.labels || {}) };
      
      // Update each label only if not manually edited
      Object.entries(autoLabels).forEach(([key, autoValue]) => {
        if (!manualEdits[key]) {
          newLabels[key as keyof typeof newLabels] = autoValue;
        }
      });

      return {
        ...prev,
        plural_label: value,
        title: value,
        singular_label: manualEdits.singular ? prev.singular_label : singular,
        slug: manualEdits.slug ? prev.slug : slug,
        labels: newLabels,
      };
    });
  };

  // Handle input changes
  const handleChange = <K extends keyof TaxonomyFormData>(field: K, value: TaxonomyFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'singular_label') {
      setManualEdits(prev => ({ ...prev, singular: true }));
    }
    if (field === 'slug') {
      setManualEdits(prev => ({ ...prev, slug: true }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle label changes - marks the field as manually edited
  const handleLabelChange = (labelKey: string, value: string) => {
    // Mark this label as manually edited
    setManualEdits(prev => ({ ...prev, [labelKey]: true }));
    
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

    if (!formData.plural_label?.trim()) {
      newErrors.plural_label = 'Taxonomy name is required';
    }
    if (!formData.singular_label?.trim()) {
      newErrors.singular_label = 'Singular name is required';
    }
    if (!formData.slug?.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.slug)) {
      newErrors.slug = 'Slug must start with a letter and contain only lowercase letters, numbers, and underscores';
    } else if (formData.slug.length > 32) {
      newErrors.slug = 'Slug must be 32 characters or less';
    }
    if (!formData.object_type || formData.object_type.length === 0) {
      newErrors.object_type = 'Select at least one post type';
    }

    // Validate meta fields - Label and Name are required for field type
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
      // Show toast for validation errors
      const errorMessages: string[] = [];
      if (!formData.plural_label?.trim()) {
        errorMessages.push('Taxonomy name is required');
      }
      if (!formData.singular_label?.trim()) {
        errorMessages.push('Singular name is required');
      }
      if (!formData.slug?.trim()) {
        errorMessages.push('Slug is required');
      }
      if (!formData.object_type || formData.object_type.length === 0) {
        errorMessages.push('Please select at least one post type');
      }

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
        // Switch to meta fields tab to show the errors
        setActiveTab('meta_fields');
      }
      
      showToast('error', errorMessages.length > 1 
        ? `Please fix the following: ${errorMessages.join(', ')}`
        : errorMessages[0] || 'Please fix validation errors'
      );
      return;
    }

    // Include meta_fields in the data
    const dataToSave = {
      ...formData,
      meta_fields: metaFields,
    };

    try {
      if (isEditing && taxonomyId) {
        await updateMutation.mutateAsync({ id: taxonomyId, data: dataToSave });
        showToast('success', 'Taxonomy updated successfully!');
        // No refresh needed for updates - sidebar menu already exists
      } else {
        const result = await createMutation.mutateAsync(dataToSave);
        showToast('success', 'Taxonomy created successfully! Refreshing menu...');
        // Reload page to refresh WordPress admin menu with new taxonomy
        // Use setTimeout to ensure toast is visible before reload
        setTimeout(() => {
          try {
            // Force full page reload to show new taxonomy in WordPress sidebar
            const newId = result?.id;
            if (newId) {
              window.location.href = buildAdminPhpHref('rdcfe-taxonomies', `#/taxonomies/${newId}`);
            } else {
              window.location.href = buildAdminPhpHref('rdcfe-taxonomies', '#/taxonomies');
            }
          } catch {
            // Ultimate fallback
            window.location.reload();
          }
        }, 1000);
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'An error occurred');
      setErrors({ submit: error instanceof Error ? error.message : 'An error occurred' });
    }
  };

  // Available post types (built-in + custom)
  const availablePostTypes = [
    { value: 'post', label: 'Posts' },
    { value: 'page', label: 'Pages' },
    ...(postTypes?.map(pt => ({ value: pt.slug, label: pt.title })) || []),
  ];

  const handleAIAccept = (suggestion: Record<string, unknown>) => {
    if (suggestion.slug) handleChange('slug', String(suggestion.slug));
    if (suggestion.singular_label) handleChange('singular_label', String(suggestion.singular_label));
    if (suggestion.plural_label) {
      const plural = String(suggestion.plural_label);
      handlePluralLabelChange(plural);
    }
    if (suggestion.description) handleChange('description', String(suggestion.description));
    if (typeof suggestion.hierarchical === 'boolean') handleChange('hierarchical', suggestion.hierarchical);
    if (typeof suggestion.public === 'boolean') handleChange('public', suggestion.public);
    if (typeof suggestion.show_in_rest === 'boolean') handleChange('show_in_rest', suggestion.show_in_rest);
    if (typeof suggestion.show_admin_column === 'boolean') handleChange('show_admin_column', suggestion.show_admin_column);
    if (Array.isArray(suggestion.object_type)) handleChange('object_type', suggestion.object_type as string[]);
    if (suggestion.labels && typeof suggestion.labels === 'object') {
      const labels = suggestion.labels as Record<string, string>;
      Object.entries(labels).forEach(([key, value]) => {
        handleLabelChange(key, value);
      });
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
              onClick={() => navigate('/taxonomies')}
              className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
            >
              <ArrowLeft className="rdcfe-w-5 rdcfe-h-5" />
            </button>
            <div>
              <h1 className="rdcfe-text-[24px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-tracking-tight">
                {isEditing ? 'Edit Taxonomy' : 'Create Taxonomy'}
              </h1>
              <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
                {isEditing ? 'Update your custom taxonomy settings' : 'Set up a new taxonomy to organize your content'}
              </p>
            </div>
          </div>
          <AIGenerateButton
            module="taxonomy"
            context={isEditing && formData.slug ? { existing_slug: formData.slug } : undefined}
            onAccept={handleAIAccept}
          />
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="rdcfe-mb-6 rdcfe-rounded-xl rdcfe-bg-[hsl(142_76%_94%)] rdcfe-border rdcfe-border-[hsl(142_76%_80%)] rdcfe-px-5 rdcfe-py-4 rdcfe-text-[14px] rdcfe-text-[hsl(142_76%_30%)] rdcfe-flex rdcfe-items-center rdcfe-gap-3">
          <Check className="rdcfe-w-5 rdcfe-h-5" />
          {successMessage}
        </div>
      )}

      {errors.submit && (
        <div className="rdcfe-mb-6 rdcfe-rounded-xl rdcfe-bg-[hsl(0_84%_96%)] rdcfe-border rdcfe-border-[hsl(0_84%_80%)] rdcfe-px-5 rdcfe-py-4 rdcfe-text-[14px] rdcfe-text-[hsl(0_84%_40%)]">
          {errors.submit}
        </div>
      )}

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
                <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Enter your taxonomy name and we'll auto-generate the rest</p>
              </div>
            </div>

            <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-5">
              <div>
                <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Taxonomy Name <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                </label>
                <Input
                  value={formData.plural_label || ''}
                  onChange={(e) => handlePluralLabelChange(e.target.value)}
                  placeholder="e.g., Genres, Locations"
                  error={!!errors.plural_label}
                  className="rdcfe-h-12"
                />
                <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Enter a plural name. Singular name and slug will be auto-generated.
                </p>
                {errors.plural_label && (
                  <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">{errors.plural_label}</p>
                )}
              </div>
              <div>
                <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Slug
                </label>
                <Input
                  value={formData.slug || ''}
                  onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="taxonomy_slug"
                  error={!!errors.slug}
                  className="rdcfe-h-12 rdcfe-font-mono"
                />
                {errors.slug && (
                  <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">{errors.slug}</p>
                )}
              </div>
            </div>

            {/* Attach to Post Types */}
            <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
              <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                Attach to Post Types <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
              </label>
              <CheckboxGroup
                options={availablePostTypes}
                value={formData.object_type || []}
                onChange={(value) => handleChange('object_type', value)}
                layout="horizontal"
              />
              {errors.object_type && (
                <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">{errors.object_type}</p>
              )}
              <p className="rdcfe-mt-3 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                Select which post types this taxonomy should be attached to
              </p>
            </div>

            {formData.slug && (
              <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-flex rdcfe-flex-wrap rdcfe-gap-3">
                <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  <Globe className="rdcfe-w-4 rdcfe-h-4" />
                  yoursite.com/{formData.rewrite_slug || formData.slug}/term-name/
                </span>
                <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[13px] rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  /wp-json/wp/v2/{formData.slug}
                </span>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="rdcfe-flex rdcfe-gap-1 rdcfe-p-1.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-xl rdcfe-w-fit">
            {[
              { id: 'basic', label: 'Basic Settings', icon: <Settings className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'labels', label: 'Labels', icon: <Tag className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'meta_fields', label: 'Meta Fields', icon: <Layers className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'advanced', label: 'Advanced', icon: <Sliders className="rdcfe-w-4 rdcfe-h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
              {/* Names & Description */}
              <CollapsibleSection title="Names & Description" icon={<Tag className="rdcfe-w-5 rdcfe-h-5" />}>
                <FieldRow label="Singular Name" hint="Used when referring to one item" required error={errors.singular_label}>
                  <Input
                    value={formData.singular_label || ''}
                    onChange={(e) => handleChange('singular_label', e.target.value)}
                    placeholder="e.g., Genre, Location"
                    error={!!errors.singular_label}
                  />
                </FieldRow>

                <FieldRow label="Description" hint="Brief explanation of this taxonomy (optional)">
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="A brief description of this taxonomy..."
                    rows={2}
                  />
                </FieldRow>
              </CollapsibleSection>

              {/* Visibility Options */}
              <CollapsibleSection title="Visibility & Access" icon={<Eye className="rdcfe-w-5 rdcfe-h-5" />}>
                <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-2 rdcfe-gap-4">
                  <ToggleCard
                    icon={<Layers className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Hierarchical"
                    description="Allow parent/child relationships (like categories)"
                    checked={formData.hierarchical ?? true}
                    onChange={(v) => handleChange('hierarchical', v)}
                  />
                  <ToggleCard
                    icon={<Globe className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Public"
                    description="Visible to all visitors on your site"
                    checked={formData.public ?? true}
                    onChange={(v) => handleChange('public', v)}
                  />
                  <ToggleCard
                    icon={<PanelTop className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Show in Admin"
                    description="Display in WordPress admin menu"
                    checked={formData.show_ui ?? true}
                    onChange={(v) => handleChange('show_ui', v)}
                  />
                  <ToggleCard
                    icon={<Database className="rdcfe-w-5 rdcfe-h-5" />}
                    title="REST API"
                    description="Enable Gutenberg editor & REST API access"
                    checked={formData.show_in_rest ?? true}
                    onChange={(v) => handleChange('show_in_rest', v)}
                  />
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Labels Tab */}
          {activeTab === 'labels' && (
            <div className="rdcfe-space-y-6">
              <CollapsibleSection title="Taxonomy Labels" icon={<Tag className="rdcfe-w-5 rdcfe-h-5" />}>
                <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-5">
                  <div>
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">Search Items</label>
                    <Input
                      value={formData.labels?.search_items || ''}
                      onChange={(e) => handleLabelChange('search_items', e.target.value)}
                      placeholder={`Search ${formData.plural_label || 'Items'}`}
                    />
                  </div>
                  <div>
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">All Items</label>
                    <Input
                      value={formData.labels?.all_items || ''}
                      onChange={(e) => handleLabelChange('all_items', e.target.value)}
                      placeholder={`All ${formData.plural_label || 'Items'}`}
                    />
                  </div>
                  <div>
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">Edit Item</label>
                    <Input
                      value={formData.labels?.edit_item || ''}
                      onChange={(e) => handleLabelChange('edit_item', e.target.value)}
                      placeholder={`Edit ${formData.singular_label || 'Item'}`}
                    />
                  </div>
                  <div>
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">Add New Item</label>
                    <Input
                      value={formData.labels?.add_new_item || ''}
                      onChange={(e) => handleLabelChange('add_new_item', e.target.value)}
                      placeholder={`Add New ${formData.singular_label || 'Item'}`}
                    />
                  </div>
                  <div>
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">Not Found</label>
                    <Input
                      value={formData.labels?.not_found || ''}
                      onChange={(e) => handleLabelChange('not_found', e.target.value)}
                      placeholder={`No ${formData.plural_label?.toLowerCase() || 'items'} found`}
                    />
                  </div>
                  <div>
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">Parent Item</label>
                    <Input
                      value={formData.labels?.parent_item || ''}
                      onChange={(e) => handleLabelChange('parent_item', e.target.value)}
                      placeholder={`Parent ${formData.singular_label || 'Item'}`}
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Meta Fields Tab */}
          {activeTab === 'meta_fields' && (
            <MetaFieldsEditor
              metaFields={metaFields}
              setMetaFields={setMetaFields}
              emptyStateText="Add custom fields to collect additional data for your taxonomy terms"
              showFieldWidth={false}
            />
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="rdcfe-space-y-6">
              {/* URL Settings */}
              <CollapsibleSection title="URL Settings" icon={<LinkIcon className="rdcfe-w-5 rdcfe-h-5" />}>
                <FieldRow label="Enable Rewrite" hint="Create pretty permalinks for this taxonomy">
                  <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-cursor-pointer">
                    <div className={`rdcfe-relative rdcfe-w-12 rdcfe-h-7 rdcfe-rounded-full rdcfe-transition-colors ${formData.rewrite ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'}`}>
                      <input 
                        type="checkbox" 
                        checked={formData.rewrite ?? true}
                        onChange={(e) => handleChange('rewrite', e.target.checked)}
                        className="rdcfe-sr-only"
                      />
                      <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-transition-transform ${formData.rewrite ? 'rdcfe-translate-x-5' : ''}`} />
                    </div>
                    <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-font-medium">
                      {formData.rewrite ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </FieldRow>

                {formData.rewrite && (
                  <FieldRow label="Custom Slug" hint="Override the default URL slug (leave empty to use taxonomy slug)">
                    <Input
                      value={formData.rewrite_slug || ''}
                      onChange={(e) => handleChange('rewrite_slug', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder={formData.slug || 'custom-slug'}
                      className="rdcfe-font-mono"
                    />
                  </FieldRow>
                )}
              </CollapsibleSection>

              {/* Additional Options */}
              <CollapsibleSection title="Additional Options" icon={<Sliders className="rdcfe-w-5 rdcfe-h-5" />}>
                <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-2 rdcfe-gap-4">
                  <ToggleCard
                    icon={<LayoutList className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Show Admin Column"
                    description="Display a column in the post admin list table"
                    checked={formData.show_admin_column ?? true}
                    onChange={(v) => handleChange('show_admin_column', v)}
                  />
                  <ToggleCard
                    icon={<Tag className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Show Tag Cloud"
                    description="Display in the tag cloud widget"
                    checked={formData.show_tagcloud ?? true}
                    onChange={(v) => handleChange('show_tagcloud', v)}
                  />
                  <ToggleCard
                    icon={<LayoutList className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Show in Nav Menus"
                    description="Make available for selection in navigation menus"
                    checked={formData.show_in_nav_menus ?? true}
                    onChange={(v) => handleChange('show_in_nav_menus', v)}
                  />
                  <ToggleCard
                    icon={<Edit3 className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Show in Quick Edit"
                    description="Allow assigning terms from the Quick Edit panel"
                    checked={formData.show_in_quick_edit ?? true}
                    onChange={(v) => handleChange('show_in_quick_edit', v)}
                  />
                  <ToggleCard
                    icon={<Search className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Enable Query Var"
                    description="Allow front-end URL queries by this taxonomy"
                    checked={formData.query_var ?? true}
                    onChange={(v) => handleChange('query_var', v)}
                  />
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
              {isEditing ? 'Update Taxonomy' : 'Create Taxonomy'}
            </button>

            {/* Summary - only show if there are meta fields */}
            {metaFields.filter(f => f.object_type === 'field').length > 0 && (
              <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-3">Summary</div>
                <div className="rdcfe-space-y-2">
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-p-3 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-rounded-lg">
                    <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Fields</span>
                    <span className="rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[12px] rdcfe-font-semibold rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]">
                      {metaFields.filter(f => f.object_type === 'field').length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="rdcfe-card rdcfe-p-6">
            <h3 className="rdcfe-text-[14px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-4">
              <HelpCircle className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
              Quick Tips
            </h3>
            <ul className="rdcfe-space-y-3 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              <li className="rdcfe-flex rdcfe-gap-3">
                <div className="rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                  <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))]">1</span>
                </div>
                <span>Use <strong>hierarchical</strong> for nested categories, disable for flat tags</span>
              </li>
              <li className="rdcfe-flex rdcfe-gap-3">
                <div className="rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                  <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))]">2</span>
                </div>
                <span>Keep <strong>REST API</strong> enabled for Gutenberg support</span>
              </li>
              <li className="rdcfe-flex rdcfe-gap-3">
                <div className="rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                  <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))]">3</span>
                </div>
                <span>Attach to multiple post types if needed</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
}
