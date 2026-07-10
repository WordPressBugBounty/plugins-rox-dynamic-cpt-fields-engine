import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Layers,
  ChevronRight,
  Settings,
  HelpCircle,
  LayoutGrid,
  MapPin,
  Zap,
  Info,
  ArrowUpDown,
} from 'lucide-react';
import { 
  useMetabox, 
  useCreateMetabox, 
  useUpdateMetabox,
  type MetaboxFormData,
  type MetaField,
  type LocationRuleGroup,
} from '../hooks/useMetaboxes';
import { Input } from '../components/ui/input';
import { useNotificationToast } from '../components/ui/notification-toast';
import { MetaFieldsEditor } from '../components/meta-fields/MetaFieldsEditor';
import { LocationRulesBuilder } from '../components/metabox/LocationRulesBuilder';
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

const defaultFormData: MetaboxFormData = {
  title: '',
  description: '',
  fields: [],
  locations: [[{ param: 'post_type', operator: '==', value: 'post' }]],
  active: true,
  position: 'normal',
  style: 'default',
  label_placement: 'top',
  instruction_placement: 'field',
  match_priority: 10,
};

// Position options
const positionOptions = [
  { value: 'normal', label: 'Default (after content)' },
  { value: 'side', label: 'Side' },
];

// Label placement options
const labelPlacementOptions = [
  { value: 'top', label: 'Top aligned' },
  { value: 'left', label: 'Left aligned' },
];

// Instruction placement options
const instructionPlacementOptions = [
  { value: 'label', label: 'Below labels' },
  { value: 'field', label: 'Below fields' },
];

// Location-rule params that target surfaces which honour Display Options
// (Position / Label Placement / Instruction Placement). These settings drive
// the `.rdcfe-meta-box--label-{top|left}` and
// `.rdcfe-meta-box--instructions-{label|field}` modifier classes — so any
// surface that renders fields inside a `.rdcfe-meta-box.rdcfe-cpt-meta-fields`
// wrapper (post-edit metaboxes AND options pages) supports them. Taxonomy
// terms and user profiles still use WP's native form-table and are excluded.
const DISPLAY_OPTIONS_LOCATION_PARAMS: ReadonlySet<string> = new Set([
  'post_type',
  'post',
  'post_status',
  'page_template',
  'post_parent',
  'post_author',
  'post_format',
  'post_taxonomy',
  'options_page',
]);

const hasPostScreenAnchor = (locations: LocationRuleGroup[]): boolean => {
  if (!Array.isArray(locations)) return false;
  return locations.some(group => {
    const rules = Array.isArray(group) ? group : (group ? [group] : []);
    return rules.some(rule => rule && typeof rule === 'object' && 'param' in rule && DISPLAY_OPTIONS_LOCATION_PARAMS.has(rule.param));
  });
};

// Tab type
type TabId = 'basic' | 'fields' | 'presentation';

export function MetaboxForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useNotificationToast();
  const metaboxId = id ? parseInt(id, 10) : null;
  const isEditing = Boolean(metaboxId);

  // Get initial location from URL params (e.g., ?location=options_page&value=theme-settings)
  const initialFormData = useMemo(() => {
    const locationParam = searchParams.get('location');
    const valueParam = searchParams.get('value');
    
    if (locationParam && valueParam && !isEditing) {
      return {
        ...defaultFormData,
        locations: [[{ param: locationParam, operator: '==', value: valueParam }]],
      };
    }
    return defaultFormData;
  }, [searchParams, isEditing]);

  const [formData, setFormData] = useState<MetaboxFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabId>('basic');

  // Query hooks
  const { data: existingData, isLoading: isLoadingData } = useMetabox(metaboxId);
  const createMutation = useCreateMetabox();
  const updateMutation = useUpdateMetabox();

  const isLoading = isLoadingData;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Load existing data (only for editing)
  useEffect(() => {
    if (existingData && isEditing) {
      setFormData(existingData);
    }
  }, [existingData, isEditing]);
  
  // Update form data when initialFormData changes (for new metabox from URL params)
  useEffect(() => {
    if (!isEditing && !existingData) {
      setFormData(initialFormData);
    }
  }, [initialFormData, isEditing, existingData]);

  // Handle input changes
  const handleChange = (field: keyof MetaboxFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle meta fields change (from MetaFieldsEditor)
  const handleMetaFieldsChange = (fields: MetaField[] | ((prev: MetaField[]) => MetaField[])) => {
    if (typeof fields === 'function') {
      setFormData(prev => ({ ...prev, fields: fields(prev.fields) }));
    } else {
      setFormData(prev => ({ ...prev, fields }));
    }
  };

  // Handle locations change (from LocationRulesBuilder)
  const handleLocationsChange = (locations: LocationRuleGroup[] | ((prev: LocationRuleGroup[]) => LocationRuleGroup[])) => {
    if (typeof locations === 'function') {
      setFormData(prev => ({ ...prev, locations: locations(prev.locations) }));
    } else {
      setFormData(prev => ({ ...prev, locations }));
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.fields.length === 0) {
      newErrors.fields = 'Add at least one field';
    }
    formData.fields.forEach((field, index) => {
      if (field.object_type === 'field' && !field.label.trim()) {
        newErrors[`field_${index}_label`] = 'Label is required';
      }
      if (field.object_type === 'field' && !field.name.trim()) {
        newErrors[`field_${index}_name`] = 'Name is required';
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
      
      if (!formData.title.trim()) {
        errorMessages.push('Field Group Title is required');
      }
      
      if (formData.fields.length === 0) {
        errorMessages.push('Add at least one field');
        setActiveTab('fields');
      } else {
        // Check for field validation errors
        const fieldErrors: string[] = [];
        formData.fields.forEach((field, index) => {
          if (field.object_type === 'field') {
            if (!field.label?.trim() || !field.name?.trim()) {
              const fieldLabel = field.label?.trim() || `Field #${index + 1}`;
              const missingFields: string[] = [];
              if (!field.label?.trim()) missingFields.push('Label');
              if (!field.name?.trim()) missingFields.push('Name/ID');
              fieldErrors.push(`"${fieldLabel}" is missing: ${missingFields.join(', ')}`);
            }
          }
        });

        if (fieldErrors.length > 0) {
          errorMessages.push(`Fields: ${fieldErrors.join('; ')}`);
          setActiveTab('fields');
        }
      }
      
      showToast('error', errorMessages.length > 1 
        ? `Please fix: ${errorMessages.join(', ')}`
        : errorMessages[0] || 'Please fix validation errors'
      );
      return;
    }

    try {
      if (isEditing && metaboxId) {
        await updateMutation.mutateAsync({ id: metaboxId, data: formData });
        showToast('success', 'Metabox updated successfully!');
      } else {
        const result = await createMutation.mutateAsync(formData);
        showToast('success', 'Metabox created successfully!');
        // Navigate to edit page for the newly created metabox
        if (result?.id) {
          setTimeout(() => {
            navigate(`/metaboxes/${result.id}`);
          }, 500);
        }
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Count field types
  const fieldCount = formData.fields.filter(f => f.object_type === 'field').length;
  const tabCount = formData.fields.filter(f => f.object_type === 'tab').length;
  const locationRuleCount = (formData.locations || []).reduce((acc, group) => acc + (Array.isArray(group) ? group.length : 1), 0);

  // Generate location summary text
  const getLocationSummary = (): string => {
    if (!formData.locations || !Array.isArray(formData.locations) || formData.locations.length === 0) {
      return 'No location rules set';
    }
    
    const rawFirstGroup = formData.locations[0];
    const firstGroup = Array.isArray(rawFirstGroup) ? rawFirstGroup : (rawFirstGroup ? [rawFirstGroup] : []);
    if (firstGroup.length === 0) {
      return 'No location rules set';
    }

    const firstRule = firstGroup[0];
    if (!firstRule || typeof firstRule !== 'object' || !('param' in firstRule)) {
      return 'No location rules set';
    }

    const paramLabels: Record<string, string> = {
      post_type: 'Post Type',
      page_template: 'Page Template',
      page_type: 'Page Type',
      post_status: 'Post Status',
      post_format: 'Post Format',
      post_category: 'Post Category',
      post_taxonomy: 'Post Taxonomy',
      user_form: 'User Form',
      user_role: 'User Role',
      user_type: 'User Type',
    };

    const label = paramLabels[firstRule.param] || firstRule.param;
    let summary = `${label} ${firstRule.operator === '==' ? 'is' : 'is not'} "${firstRule.value}"`;
    
    if (firstGroup.length > 1) {
      summary += ` +${firstGroup.length - 1} more`;
    }
    if (formData.locations.length > 1) {
      summary += ` (${formData.locations.length} groups)`;
    }
    
    return summary;
  };

  const handleAIAccept = (suggestion: Record<string, unknown>) => {
    if (suggestion.title) handleChange('title', String(suggestion.title));
    if (suggestion.description) handleChange('description', String(suggestion.description));
    if (suggestion.location_param && suggestion.location_value) {
      handleLocationsChange([[{
        param: String(suggestion.location_param),
        operator: '==',
        value: String(suggestion.location_value),
      }]]);
    }
    if (Array.isArray(suggestion.fields)) {
      handleMetaFieldsChange(
        (suggestion.fields as Array<Record<string, unknown>>).map(mapAIFieldToMetaField)
      );
      setActiveTab('fields');
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
    <form onSubmit={handleSubmit}>
      {/* Page Header */}
      <div className="rdcfe-mb-8">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-3">
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-4">
            <button
              type="button"
              onClick={() => navigate('/metaboxes')}
              className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
            >
              <ArrowLeft className="rdcfe-w-5 rdcfe-h-5" />
            </button>
            <div>
              <h1 className="rdcfe-text-[24px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-tracking-tight">
                {isEditing ? 'Edit Metabox' : 'Add New Metabox'}
              </h1>
              <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
                {isEditing 
                  ? 'Modify your metabox settings and fields' 
                  : 'Create a custom field group with location rules'}
              </p>
            </div>
          </div>
          <AIGenerateButton
            module="metabox"
            context={isEditing && formData.title ? { existing_slug: formData.title } : undefined}
            onAccept={handleAIAccept}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-[1fr_320px] rdcfe-gap-6">
        {/* Main Content */}
        <div className="rdcfe-space-y-6">
          
          {/* Quick Setup Card */}
          <div className="rdcfe-card rdcfe-p-6">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-5">
              <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                <Zap className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
              </div>
              <div>
                <h2 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">Quick Setup</h2>
                <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Name your field group and we'll auto-generate the rest</p>
              </div>
            </div>

            {/* Title Field */}
            <div>
              <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                Field Group Title <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Product Details, Event Information"
                error={!!errors.title}
                className="rdcfe-text-[15px]"
              />
              {errors.title && (
                <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">{errors.title}</p>
              )}
            </div>

            {/* Location Preview Badge */}
            {formData.title && (
              <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-flex rdcfe-flex-wrap rdcfe-gap-3">
                <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  <MapPin className="rdcfe-w-4 rdcfe-h-4" />
                  {getLocationSummary()}
                </span>
                <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  <Layers className="rdcfe-w-4 rdcfe-h-4" />
                  {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                  {tabCount > 0 && `, ${tabCount} tab${tabCount !== 1 ? 's' : ''}`}
                </span>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="rdcfe-flex rdcfe-gap-1 rdcfe-p-1.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-xl rdcfe-w-fit rdcfe-overflow-x-auto">
            {[
              { id: 'basic' as TabId, label: 'Basic Settings', icon: <Settings className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'fields' as TabId, label: 'Fields', icon: <Layers className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'presentation' as TabId, label: 'Presentation', icon: <LayoutGrid className="rdcfe-w-4 rdcfe-h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-5 rdcfe-py-2.5 rdcfe-rounded-lg rdcfe-text-[14px] rdcfe-font-medium rdcfe-transition-all rdcfe-duration-200 rdcfe-whitespace-nowrap ${
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
              <CollapsibleSection
                title="Details"
                icon={<Settings className="rdcfe-w-5 rdcfe-h-5" />}
                defaultOpen={true}
              >
                <FieldRow
                  label="Description"
                  hint="Optional description for the field group"
                >
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Add a description for this field group..."
                  />
                </FieldRow>
              </CollapsibleSection>

              {/* Location Rules inside Basic Settings */}
              <LocationRulesBuilder
                locations={formData.locations}
                setLocations={handleLocationsChange}
              />
            </div>
          )}

          {/* Fields Tab */}
          {activeTab === 'fields' && (
            <>
              {errors.fields && (
                <div className="rdcfe-p-4 rdcfe-rounded-xl rdcfe-bg-[hsl(0_84%_96%)] rdcfe-border rdcfe-border-[hsl(0_84%_60%/0.3)] rdcfe-text-[hsl(0_84%_45%)] rdcfe-text-[14px]">
                  {errors.fields}
                </div>
              )}
              <MetaFieldsEditor
                metaFields={formData.fields}
                setMetaFields={handleMetaFieldsChange}
                emptyStateText="Add custom fields to collect additional data for your content"
              />
            </>
          )}

          {/* Presentation Tab */}
          {activeTab === 'presentation' && (
            <div className="rdcfe-space-y-6">
              {/* Match Priority — metabox loading order.
                  Numeric 0-100, default 10. Higher values load first when
                  multiple field groups match the same screen. Always
                  visible regardless of location-rule mix because it
                  applies to every render surface (post, term, user,
                  options page). */}
              <CollapsibleSection
                title="Match Priority"
                icon={<ArrowUpDown className="rdcfe-w-5 rdcfe-h-5" />}
                defaultOpen={true}
              >
                <FieldRow
                  label="Loading priority"
                  hint="Higher values load first (0-100). Defaults to 10."
                >
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={formData.match_priority ?? 10}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isNaN(next)) {
                          handleChange('match_priority', 10);
                          return;
                        }
                        handleChange(
                          'match_priority',
                          Math.max(0, Math.min(100, Math.round(next)))
                        );
                      }}
                      className="rdcfe-w-24"
                    />
                    <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      Useful when multiple metaboxes match the same screen
                      (e.g. a generic Post metabox plus a more specific
                      Property metabox). The higher-priority group renders
                      first; ties fall back to creation order.
                    </span>
                  </div>
                </FieldRow>
              </CollapsibleSection>

              {/* Display Options only render meaningfully on surfaces that
                  use the `.rdcfe-meta-box.rdcfe-cpt-meta-fields` wrapper —
                  i.e. post-edit metaboxes and options pages. Taxonomy terms
                  and user profiles still use WP's native form-table layout
                  and don't honour these classes, so we hide the block in
                  that case to avoid setting expectations the renderer can't
                  fulfil. */}
              {!hasPostScreenAnchor(formData.locations) ? (
                <div className="rdcfe-card rdcfe-p-6">
                  <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
                    <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0">
                      <Info className="rdcfe-w-5 rdcfe-h-5" />
                    </div>
                    <div className="rdcfe-flex-1">
                      <h3 className="rdcfe-font-semibold rdcfe-text-[15px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1">
                        Display options unavailable
                      </h3>
                      <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
                        Position, Label Placement, and Instruction Placement only apply on post edit screens. Add a post-related Location Rule (Post Type, Post, Page Template, etc.) under <strong>Basic Settings</strong> to enable these options.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <CollapsibleSection
                title="Display Options"
                icon={<LayoutGrid className="rdcfe-w-5 rdcfe-h-5" />}
                defaultOpen={true}
              >
                <FieldRow
                  label="Position"
                  hint="Where to display this field group"
                >
                  <div className="rdcfe-grid rdcfe-grid-cols-3 rdcfe-gap-2">
                    {positionOptions.map(opt => (
                      <label key={opt.value} className="rdcfe-cursor-pointer">
                        <input
                          type="radio"
                          name="position"
                          value={opt.value}
                          checked={formData.position === opt.value}
                          onChange={(e) => handleChange('position', e.target.value)}
                          className="rdcfe-sr-only"
                        />
                        <div className={`rdcfe-p-3 rdcfe-rounded-xl rdcfe-border-2 rdcfe-text-center rdcfe-transition-all ${
                          formData.position === opt.value
                            ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]'
                            : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                        }`}>
                          <span className={`rdcfe-text-[13px] rdcfe-font-medium ${formData.position === opt.value ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'}`}>
                            {opt.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </FieldRow>

                <FieldRow
                  label="Label Placement"
                  hint="Where to place field labels"
                >
                  <div className="rdcfe-grid rdcfe-grid-cols-2 rdcfe-gap-2">
                    {labelPlacementOptions.map(opt => (
                      <label key={opt.value} className="rdcfe-cursor-pointer">
                        <input
                          type="radio"
                          name="label_placement"
                          value={opt.value}
                          checked={formData.label_placement === opt.value}
                          onChange={(e) => handleChange('label_placement', e.target.value)}
                          className="rdcfe-sr-only"
                        />
                        <div className={`rdcfe-p-3 rdcfe-rounded-xl rdcfe-border-2 rdcfe-text-center rdcfe-transition-all ${
                          formData.label_placement === opt.value
                            ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]'
                            : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                        }`}>
                          <span className={`rdcfe-text-[13px] rdcfe-font-medium ${formData.label_placement === opt.value ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'}`}>
                            {opt.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </FieldRow>

                <FieldRow
                  label="Instruction Placement"
                  hint="Where to display field instructions"
                >
                  <div className="rdcfe-grid rdcfe-grid-cols-2 rdcfe-gap-2">
                    {instructionPlacementOptions.map(opt => (
                      <label key={opt.value} className="rdcfe-cursor-pointer">
                        <input
                          type="radio"
                          name="instruction_placement"
                          value={opt.value}
                          checked={formData.instruction_placement === opt.value}
                          onChange={(e) => handleChange('instruction_placement', e.target.value)}
                          className="rdcfe-sr-only"
                        />
                        <div className={`rdcfe-p-3 rdcfe-rounded-xl rdcfe-border-2 rdcfe-text-center rdcfe-transition-all ${
                          formData.instruction_placement === opt.value
                            ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]'
                            : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                        }`}>
                          <span className={`rdcfe-text-[13px] rdcfe-font-medium ${formData.instruction_placement === opt.value ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'}`}>
                            {opt.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </FieldRow>
              </CollapsibleSection>
              )}
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
              {isEditing ? 'Update Metabox' : 'Create Metabox'}
            </button>

            <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
              <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-3">Summary</div>
              <div className="rdcfe-space-y-2">
                <div className="rdcfe-flex rdcfe-justify-between rdcfe-items-center rdcfe-py-2 rdcfe-px-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Fields</span>
                  <span className="rdcfe-font-semibold rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-px-2.5 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[12px]">
                    {fieldCount}
                  </span>
                </div>
                {tabCount > 0 && (
                  <div className="rdcfe-flex rdcfe-justify-between rdcfe-items-center rdcfe-py-2 rdcfe-px-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
                    <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Tabs</span>
                    <span className="rdcfe-font-semibold rdcfe-bg-[hsl(217_91%_60%/0.1)] rdcfe-text-[hsl(217_91%_50%)] rdcfe-px-2.5 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[12px]">
                      {tabCount}
                    </span>
                  </div>
                )}
                <div className="rdcfe-flex rdcfe-justify-between rdcfe-items-center rdcfe-py-2 rdcfe-px-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Location Rules</span>
                  <span className="rdcfe-font-semibold rdcfe-bg-[hsl(262_83%_58%/0.1)] rdcfe-text-[hsl(262_83%_58%)] rdcfe-px-2.5 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[12px]">
                    {locationRuleCount}
                  </span>
                </div>
              </div>
            </div>
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
                <span>Use <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">Location Rules</strong> to control where the group appears</span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">2</span>
                <span>Set <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">Field Width</strong> for side-by-side layouts</span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">3</span>
                <span><strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">Conditional Logic</strong> shows/hides fields based on values</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
}
