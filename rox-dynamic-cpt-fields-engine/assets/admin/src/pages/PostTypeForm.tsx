import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Settings,
  Tag,
  Sliders,
  Columns,
  HelpCircle,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Zap,
  Check,
  ChevronRight,
  Layers,
  Filter,
  GripVertical,
  Trash2,
  Copy,
  Code,
  Clipboard,
  CheckCircle2,
  PanelTop,
  Plus,
} from 'lucide-react';
import { 
  usePostType, 
  useCreatePostType, 
  useUpdatePostType,
  PostTypeFormData,
  MetaField,
} from '../hooks/usePostTypes';
import { buildAdminPhpHref } from '../lib/utils';
import { useTaxonomies } from '../hooks/useTaxonomies';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectOption } from '../components/ui/select';
import { IconPicker } from '../components/ui/icon-picker';
import { CheckboxGroup } from '../components/ui/checkbox';
import { useNotificationToast } from '../components/ui/notification-toast';
import { MetaFieldsEditor } from '../components/meta-fields/MetaFieldsEditor';
import { useProContext } from '../contexts/ProContext';
import { AIGenerateButton, mapAIFieldToMetaField } from '../components/ai-assistant/AIGenerateButton';

// Default form data
const defaultFormData: PostTypeFormData = {
  title: '',
  slug: '',
  singular_label: '',
  plural_label: '',
  description: '',
  public: true,
  hierarchical: false,
  has_archive: true,
  show_in_rest: true,
  supports: ['title', 'editor', 'thumbnail', 'custom-fields'],
  menu_icon: 'dashicons-admin-post',
  menu_position: 25,
  exclude_from_search: false,
  publicly_queryable: true,
  show_ui: true,
  show_in_menu: true,
  show_in_nav_menus: true,
  show_in_admin_bar: true,
  rest_base: '',
  capability_type: 'post',
  map_meta_cap: true,
  rewrite: true,
  rewrite_slug: '',
  rewrite_with_front: true,
  query_var: true,
  labels: {},
  admin_columns: [],
  meta_fields: [],
};

// Supports options - arranged in grid order
const supportOptions: SelectOption[] = [
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'comments', label: 'Comments' },
  { value: 'trackbacks', label: 'Trackbacks' },
  { value: 'editor', label: 'Editor' },
  { value: 'excerpt', label: 'Excerpt' },
  { value: 'revisions', label: 'Revisions' },
  { value: 'page-attributes', label: 'Page Attributes' },
  { value: 'thumbnail', label: 'Featured Image' },
  { value: 'custom-fields', label: 'Custom Fields' },
  { value: 'post-formats', label: 'Post Formats' },
];

// Menu position options
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

// Reserved WordPress post type slugs
const RESERVED_POST_TYPES = [
  'post', 'page', 'attachment', 'revision', 'nav_menu_item',
  'custom_css', 'customize_changeset', 'oembed_cache', 'user_request',
  'wp_block', 'wp_template', 'wp_template_part', 'wp_global_styles',
  'wp_navigation', 'wp_font_family', 'wp_font_face'
];

// Reserved WordPress query vars / rewrite slugs
const RESERVED_SLUGS = [
  'action', 'author', 'author_name', 'calendar', 'cat', 'category', 
  'category_name', 'day', 'embed', 'error', 'feed', 'hour', 'm', 
  'minute', 'monthnum', 'name', 'order', 'orderby', 'p', 'page', 
  'page_id', 'paged', 'pagename', 'post', 'post_format', 'post_tag', 
  'post_type', 'posts', 'preview', 's', 'search', 'second', 'static', 
  'status', 'tag', 'taxonomy', 'term', 'theme', 'title', 'type', 'year'
];

// Admin column types - button style options
const columnTypeOptions = [
  { value: 'meta_value', label: 'Meta Value', description: 'Display custom field value' },
  { value: 'post_terms', label: 'Post Terms', description: 'Display taxonomy terms' },
  { value: 'post_id', label: 'Post ID', description: 'Display post ID' },
  { value: 'custom_callback', label: 'Custom Callback', description: 'Use custom function' },
];

// Admin filter types - button style options. Meta Data is listed first
// because it's the more common starting point — most editors filter by
// stored meta values; taxonomy filters are added when a CPT is also wired
// to a taxonomy, which is the secondary case.
const filterTypeOptions = [
  { value: 'meta', label: 'Meta Data', description: 'Filter by meta field values' },
  { value: 'meta_range', label: 'Meta range', description: 'Filter numeric meta by min/max buckets' },
  { value: 'taxonomy', label: 'Taxonomy', description: 'Filter by taxonomy terms' },
];

// Order by options for taxonomy filter
const taxonomyOrderByOptions: SelectOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'slug', label: 'Slug' },
  { value: 'term_group', label: 'Term group' },
  { value: 'term_id', label: 'Term ID' },
  { value: 'description', label: 'Description' },
  { value: 'parent', label: 'Parent' },
  { value: 'term_order', label: 'Term Order' },
  { value: 'count', label: 'Post Count' },
];

// Order direction options
const orderOptions: SelectOption[] = [
  { value: 'ASC', label: 'Ascending' },
  { value: 'DESC', label: 'Descending' },
];

// Options source for meta filter
const optionsSourceOptions: SelectOption[] = [
  { value: 'meta_values', label: 'Get from Meta Values' },
  { value: 'manual', label: 'Manual Input' },
  { value: 'posts', label: 'Get from Posts' },
];

// (These option lists are wired into the Pro interactive Admin Columns &
// Filters editor below — kept as module constants so they remain a single
// source of truth for both the Free read-only preview and the Pro inputs.)

interface AdminColumn {
  id: string;
  title: string;
  type: string;
  field_name: string;
  taxonomy?: string;
  callback?: string;
  column_order: number;
  prefix: string;
  suffix: string;
  sortable: boolean;
  sort_by_field?: string;
  is_numeric?: boolean;
}

interface AdminFilterRangeOption {
  label: string;
  min: string;
  max: string;
}

interface AdminFilter {
  id: string;
  name: string;
  use_name_as_placeholder: boolean;
  type: 'taxonomy' | 'meta' | 'meta_range';
  taxonomy?: string;
  show_counts?: boolean;
  order_by?: string;
  order?: 'ASC' | 'DESC';
  meta_field?: string;
  custom_meta_field?: string;
  options_source?: string;
  /** Preset numeric buckets for type meta_range (saved on CPT). */
  range_options?: AdminFilterRangeOption[];
}

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
  const { isPro } = useProContext();

  // When the badge is the string literal "Pro" and the user already has
  // a Pro license, skip rendering it — Pro chrome should never appear
  // for paying users.
  const showBadge = badge && !(badge.toLowerCase() === 'pro' && isPro);

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
          {showBadge && (
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

// Field Row Component - Cleaner inline layout
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

export function PostTypeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotificationToast();
  const { isPro } = useProContext();
  const postTypeId = id ? parseInt(id, 10) : null;
  const isEditing = Boolean(postTypeId);

  const [formData, setFormData] = useState<PostTypeFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manualEdits, setManualEdits] = useState<Record<string, boolean>>({});
  const [adminColumns, setAdminColumns] = useState<AdminColumn[]>([]);
  const [adminFilters, setAdminFilters] = useState<AdminFilter[]>([]);
  // Track which column / filter cards are open. Stored as Sets of IDs
  // (mirrors the pattern used by the Meta Fields editor) so we don't have
  // to mutate the persisted data shape just to track UI state. Existing
  // items load collapsed; freshly-added items are auto-expanded by their
  // respective add handlers.
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const formInitializedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'labels' | 'meta_fields' | 'admin_columns_filters' | 'advanced'>('basic');
  const [showJsonView, setShowJsonView] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  const toggleColumnExpand = (id: string) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const expandAllColumns = () => setExpandedColumns(new Set(adminColumns.map(c => c.id)));
  const collapseAllColumns = () => setExpandedColumns(new Set());

  const toggleFilterExpand = (id: string) => {
    setExpandedFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const expandAllFilters = () => setExpandedFilters(new Set(adminFilters.map(f => f.id)));
  const collapseAllFilters = () => setExpandedFilters(new Set());

  const metaFields = formData.meta_fields ?? [];

  const handleMetaFieldsChange = (
    fields: MetaField[] | ((prev: MetaField[]) => MetaField[])
  ) => {
    setFormData((prev) => ({
      ...prev,
      meta_fields:
        typeof fields === 'function'
          ? fields(prev.meta_fields ?? [])
          : fields,
    }));
  };
  const { data: existingData, isLoading: isLoadingData } = usePostType(postTypeId);
  const createMutation = useCreatePostType();
  const updateMutation = useUpdatePostType();
  const { data: allTaxonomies } = useTaxonomies();

  const isLoading = isLoadingData;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  
  // Surface every taxonomy linked to this CPT so the Pro Admin Filters
  // editor can offer them as options. We accept both `object_type` (the
  // shape used by saved configs) and `post_types` (the legacy array) to
  // stay compatible with older snapshots.
  const linkedTaxonomies = (allTaxonomies || []).filter((tax) => {
    const taxData = (tax.data || tax.schema || {}) as { object_type?: string[]; post_types?: string[] };
    const objectTypes = taxData.object_type || taxData.post_types || [];
    return objectTypes.includes(formData.slug);
  });

  // Admin columns handlers (will be used in Pro). Newly added columns
  // start expanded so the user can configure them immediately, while
  // pre-existing columns load collapsed (cleaner page on long lists).
  const addAdminColumn = () => {
    const newColumn: AdminColumn = {
      id: `col_${Date.now()}`,
      title: '',
      type: 'meta_value',
      field_name: '',
      taxonomy: '',
      callback: '',
      column_order: adminColumns.length,
      prefix: '',
      suffix: '',
      sortable: false,
      sort_by_field: '',
      is_numeric: false,
    };
    setAdminColumns([...adminColumns, newColumn]);
    setExpandedColumns(prev => new Set(prev).add(newColumn.id));
  };

  const removeAdminColumn = (id: string) => {
    setAdminColumns(cols => cols.filter(col => col.id !== id));
  };

  const duplicateAdminColumn = (id: string) => {
    const col = adminColumns.find(c => c.id === id);
    if (col) {
      const newColumn = { ...col, id: `col_${Date.now()}`, title: `${col.title} (Copy)` };
      setAdminColumns([...adminColumns, newColumn]);
      setExpandedColumns(prev => new Set(prev).add(newColumn.id));
    }
  };

  const updateAdminColumn = <K extends keyof AdminColumn>(id: string, field: K, value: AdminColumn[K]) => {
    setAdminColumns(cols => cols.map(col => col.id === id ? { ...col, [field]: value } : col));
  };

  // Admin filter handlers. New filters default to the `meta` type because
  // most editor workflows start there; user can flip the Type pill once
  // they want a taxonomy-based dropdown instead.
  const addAdminFilter = () => {
    const newFilter: AdminFilter = {
      id: `filter_${Date.now()}`,
      name: '',
      use_name_as_placeholder: false,
      type: 'meta',
      taxonomy: '',
      show_counts: false,
      order_by: 'name',
      order: 'ASC',
      meta_field: '',
      custom_meta_field: '',
      options_source: 'meta_values',
    };
    setAdminFilters([...adminFilters, newFilter]);
    setExpandedFilters(prev => new Set(prev).add(newFilter.id));
  };

  const removeAdminFilter = (id: string) => {
    setAdminFilters(filters => filters.filter(f => f.id !== id));
  };

  const duplicateAdminFilter = (id: string) => {
    const filter = adminFilters.find(f => f.id === id);
    if (filter) {
      const newFilter = { ...filter, id: `filter_${Date.now()}`, name: `${filter.name} (Copy)` };
      setAdminFilters([...adminFilters, newFilter]);
      setExpandedFilters(prev => new Set(prev).add(newFilter.id));
    }
  };

  const updateAdminFilter = <K extends keyof AdminFilter>(id: string, field: K, value: AdminFilter[K]) => {
    setAdminFilters(filters => filters.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const setAdminFilterType = (id: string, nextType: AdminFilter['type']) => {
    setAdminFilters(filters => filters.map(f => {
      if (f.id !== id) return f;
      const next: AdminFilter = { ...f, type: nextType };
      if (nextType === 'meta_range' && (!next.range_options || next.range_options.length === 0)) {
        next.range_options = [{ label: '', min: '', max: '' }];
      }
      return next;
    }));
  };

  const addRangeOption = (filterId: string) => {
    setAdminFilters(filters => filters.map(f =>
      f.id === filterId
        ? { ...f, range_options: [...(f.range_options || []), { label: '', min: '', max: '' }] }
        : f
    ));
  };

  const removeRangeOption = (filterId: string, index: number) => {
    setAdminFilters(filters => filters.map(f => {
      if (f.id !== filterId) return f;
      const opts = [...(f.range_options || [])];
      opts.splice(index, 1);
      return { ...f, range_options: opts.length ? opts : [{ label: '', min: '', max: '' }] };
    }));
  };

  const updateRangeOption = (filterId: string, index: number, field: keyof AdminFilterRangeOption, value: string) => {
    setAdminFilters(filters => filters.map(f => {
      if (f.id !== filterId) return f;
      const opts = [...(f.range_options || [])];
      const row = opts[index] || { label: '', min: '', max: '' };
      opts[index] = { ...row, [field]: value };
      return { ...f, range_options: opts };
    }));
  };

  // Build select option lists derived from this CPT's linked taxonomies and
  // its defined meta fields so the Pro Admin Columns / Filters editor can
  // surface valid choices without requiring the user to type slugs.
  const taxonomyOptions: SelectOption[] = linkedTaxonomies.map((tax) => {
    const taxData = (tax.data || tax.schema || {}) as { slug?: string; label?: string };
    const slug = taxData.slug || '';
    const label = taxData.label || tax.title || slug;
    return { value: slug, label: `${label} (${slug})` };
  });

  const metaFieldOptions: SelectOption[] = metaFields
    .filter((f) => f.object_type === 'field' && f.name)
    .map((f) => ({ value: f.name, label: `${f.label || f.name} (${f.name})` }));

  // Reset hydration when switching post types; load saved data once per session.
  useEffect(() => {
    formInitializedRef.current = false;
  }, [postTypeId]);

  useEffect(() => {
    if (existingData && isEditing && !formInitializedRef.current) {
      setFormData(existingData);
      setManualEdits({
        singular: true,
        slug: true,
        add_new: true,
        add_new_item: true,
        edit_item: true,
        view_item: true,
        all_items: true,
        search_items: true,
        not_found: true,
        not_found_in_trash: true,
      });
      if (existingData.admin_columns) {
        setAdminColumns(existingData.admin_columns as AdminColumn[]);
      }
      if (existingData.admin_filters) {
        setAdminFilters(existingData.admin_filters as AdminFilter[]);
      }
      formInitializedRef.current = true;
    }
  }, [existingData, isEditing]);

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
  const generateLabels = (singular: string, plural: string) => {
    const singularLower = singular.toLowerCase();
    const pluralLower = plural.toLowerCase();
    
    return {
      add_new: 'Add New',
      add_new_item: `Add New ${singular}`,
      edit_item: `Edit ${singular}`,
      new_item: `New ${singular}`,
      view_item: `View ${singular}`,
      view_items: `View ${plural}`,
      search_items: `Search ${plural}`,
      not_found: `No ${pluralLower} found`,
      not_found_in_trash: `No ${pluralLower} found in Trash`,
      parent_item_colon: `Parent ${singular}:`,
      all_items: `All ${plural}`,
      archives: `${singular} Archives`,
      attributes: `${singular} Attributes`,
      insert_into_item: `Insert into ${singularLower}`,
      uploaded_to_this_item: `Uploaded to this ${singularLower}`,
      featured_image: 'Featured Image',
      set_featured_image: 'Set featured image',
      remove_featured_image: 'Remove featured image',
      use_featured_image: 'Use as featured image',
      filter_items_list: `Filter ${pluralLower} list`,
      items_list_navigation: `${plural} list navigation`,
      items_list: `${plural} list`,
    };
  };

  // Auto-generate fields from plural label
  const handlePluralLabelChange = (value: string) => {
    const singular = generateSingular(value);
    const slug = singular.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20);
    const autoLabels = generateLabels(singular, value);
    
    setFormData(prev => {
      const newLabels = { ...(prev.labels || {}) };
      
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
  const handleChange = <K extends keyof PostTypeFormData>(field: K, value: PostTypeFormData[K]) => {
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

  // Handle label changes
  const handleLabelChange = (labelKey: string, value: string) => {
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
      newErrors.plural_label = 'Post type name is required';
    }
    if (!formData.singular_label?.trim()) {
      newErrors.singular_label = 'Singular name is required';
    }
    if (!formData.slug?.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.slug)) {
      newErrors.slug = 'Slug must start with a letter and contain only lowercase letters, numbers, and underscores';
    } else if (formData.slug.length > 20) {
      newErrors.slug = 'Slug must be 20 characters or less';
    } else if (RESERVED_POST_TYPES.includes(formData.slug.toLowerCase())) {
      newErrors.slug = `"${formData.slug}" is a reserved WordPress post type and cannot be used`;
    } else if (RESERVED_SLUGS.includes(formData.slug.toLowerCase())) {
      newErrors.slug = `"${formData.slug}" conflicts with WordPress reserved query variables`;
    } else if (formData.slug.toLowerCase().startsWith('wp_')) {
      newErrors.slug = 'Slugs starting with "wp_" are reserved for WordPress core';
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
        errorMessages.push('Post type name is required');
      }
      if (!formData.singular_label?.trim()) {
        errorMessages.push('Singular name is required');
      }
      if (!formData.slug?.trim()) {
        errorMessages.push('Slug is required');
      } else if (!/^[a-z][a-z0-9_]*$/.test(formData.slug)) {
        errorMessages.push('Invalid slug format');
      } else if (formData.slug.length > 20) {
        errorMessages.push('Slug must be 20 characters or less');
      } else if (RESERVED_POST_TYPES.includes(formData.slug.toLowerCase())) {
        errorMessages.push(`"${formData.slug}" is a reserved WordPress post type`);
      } else if (RESERVED_SLUGS.includes(formData.slug.toLowerCase())) {
        errorMessages.push(`"${formData.slug}" conflicts with WordPress reserved query variables`);
      } else if (formData.slug.toLowerCase().startsWith('wp_')) {
        errorMessages.push('Slugs starting with "wp_" are reserved');
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
        ? `Please fix: ${errorMessages.join(', ')}`
        : errorMessages[0] || 'Please fix validation errors'
      );
      return;
    }

    const dataToSave = {
      ...formData,
      admin_columns: adminColumns,
      admin_filters: adminFilters,
    };

    try {
      if (isEditing && postTypeId) {
        await updateMutation.mutateAsync({ id: postTypeId, data: dataToSave });
        showToast('success', 'Post type updated successfully!');
        // No refresh needed for updates - sidebar menu already exists
      } else {
        const result = await createMutation.mutateAsync(dataToSave);
        showToast('success', 'Post type created successfully! Refreshing menu...');
        // Reload page to refresh WordPress admin menu with new post type
        // Use setTimeout to ensure toast is visible before reload
        setTimeout(() => {
          // Force full page reload to show new post type in WordPress sidebar
          const newId = result?.id;
          if (newId) {
            window.location.href = buildAdminPhpHref('rdcfe-post-types', `#/post-types/${newId}`);
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
    const singular = suggestion.singular_label ? String(suggestion.singular_label) : '';
    const plural = suggestion.plural_label ? String(suggestion.plural_label) : '';

    setFormData(prev => {
      const updates: Partial<PostTypeFormData> = {};

      if (suggestion.slug) updates.slug = String(suggestion.slug);
      if (singular) updates.singular_label = singular;
      if (plural) {
        updates.plural_label = plural;
        updates.title = plural;
      }
      if (suggestion.description) updates.description = String(suggestion.description);
      if (suggestion.menu_icon) updates.menu_icon = String(suggestion.menu_icon);
      if (suggestion.menu_position) updates.menu_position = Number(suggestion.menu_position);
      if (Array.isArray(suggestion.supports)) updates.supports = suggestion.supports as string[];
      if (typeof suggestion.hierarchical === 'boolean') updates.hierarchical = suggestion.hierarchical as boolean;
      if (typeof suggestion.has_archive === 'boolean') updates.has_archive = suggestion.has_archive as boolean;
      if (typeof suggestion.public === 'boolean') updates.public = suggestion.public as boolean;
      if (typeof suggestion.show_in_rest === 'boolean') updates.show_in_rest = suggestion.show_in_rest as boolean;

      if (singular && plural) {
        updates.labels = generateLabels(singular, plural);
      }

      return { ...prev, ...updates };
    });

    if (singular && plural) {
      setManualEdits(prev => ({
        ...prev,
        singular: true,
        slug: true,
        add_new: true,
        add_new_item: true,
        edit_item: true,
        view_item: true,
        all_items: true,
        search_items: true,
        not_found: true,
        not_found_in_trash: true,
      }));
    }

    if (Array.isArray(suggestion.fields) && suggestion.fields.length > 0) {
      handleMetaFieldsChange(
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
              onClick={() => navigate('/post-types')}
              className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
            >
              <ArrowLeft className="rdcfe-w-5 rdcfe-h-5" />
            </button>
            <div>
              <h1 className="rdcfe-text-[24px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-tracking-tight">
                {isEditing ? 'Edit Post Type' : 'Create Post Type'}
              </h1>
              <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
                {isEditing ? 'Update your custom post type settings' : 'Set up a new custom post type for your site'}
              </p>
            </div>
          </div>
          <AIGenerateButton
            module="post_type"
            context={isEditing && formData.slug ? { existing_slug: formData.slug } : undefined}
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
                <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Enter your post type name and we'll auto-generate the rest</p>
              </div>
            </div>

            <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-3 rdcfe-gap-5">
              <div className="rdcfe-col-span-1 md:rdcfe-col-span-2">
                <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Post Type Name <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.plural_label || ''}
                  onChange={(e) => handlePluralLabelChange(e.target.value)}
                  placeholder="e.g., Projects, Products, Events"
                  className="rdcfe-input rdcfe-text-[15px]"
                />
                {errors.plural_label && (
                  <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">{errors.plural_label}</p>
                )}
                <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Enter a plural name. Singular name and slug will be auto-generated.
                </p>
              </div>
              <div>
                <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="auto-generated"
                  className="rdcfe-input rdcfe-font-mono rdcfe-text-[15px]"
                />
                {errors.slug && (
                  <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">{errors.slug}</p>
                )}
              </div>
            </div>

            {formData.slug && (
              <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-flex rdcfe-flex-wrap rdcfe-gap-3">
                <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  <Globe className="rdcfe-w-4 rdcfe-h-4" />
                  yoursite.com/{formData.rewrite_slug || formData.slug}/
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
              { id: 'admin_columns_filters', label: 'Admin Columns & Filters', icon: <Columns className="rdcfe-w-4 rdcfe-h-4" /> },
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
                    placeholder="e.g., Project, Product, Event"
                    error={!!errors.singular_label}
                  />
                </FieldRow>

                <FieldRow label="Description" hint="Brief explanation of this post type (optional)">
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe what this post type is used for..."
                    rows={2}
                  />
                </FieldRow>
              </CollapsibleSection>

              {/* Menu & Icon */}
              <CollapsibleSection title="Admin Menu" icon={<Settings className="rdcfe-w-5 rdcfe-h-5" />}>
                <FieldRow label="Menu Icon" hint="Choose an icon for the admin sidebar">
                  <IconPicker
                    value={formData.menu_icon || 'dashicons-admin-post'}
                    onChange={(value) => handleChange('menu_icon', value)}
                  />
                </FieldRow>

                <FieldRow label="Menu Position" hint="Where to place in the admin menu">
                  <Select
                    options={menuPositionOptions}
                    value={String(formData.menu_position || 25)}
                    onChange={(e) => handleChange('menu_position', parseInt(e.target.value))}
                  />
                </FieldRow>

                <div className="rdcfe-space-y-3">
                  <div>
                    <label className="rdcfe-block rdcfe-text-[14px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1">
                      Supports
                    </label>
                    <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      Enable various features in the content editor.
                    </p>
                  </div>
                  <CheckboxGroup
                    options={supportOptions}
                    value={formData.supports || []}
                    onChange={(value) => handleChange('supports', value)}
                    layout="grid"
                    columns={4}
                  />
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Labels Tab */}
          {activeTab === 'labels' && (
            <div className="rdcfe-space-y-6">
              <CollapsibleSection title="UI Labels" icon={<Tag className="rdcfe-w-5 rdcfe-h-5" />}>
                <div className="rdcfe-info-box rdcfe-mb-6">
                  <HelpCircle className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0" />
                  <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    Labels are auto-generated from your post type name. Customize them below if needed.
                  </p>
                </div>

                <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-5">
                  <div>
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">Add New</label>
                    <Input
                      value={formData.labels?.add_new || ''}
                      onChange={(e) => handleLabelChange('add_new', e.target.value)}
                      placeholder="Add New"
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
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">Edit Item</label>
                    <Input
                      value={formData.labels?.edit_item || ''}
                      onChange={(e) => handleLabelChange('edit_item', e.target.value)}
                      placeholder={`Edit ${formData.singular_label || 'Item'}`}
                    />
                  </div>
                  <div>
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">View Item</label>
                    <Input
                      value={formData.labels?.view_item || ''}
                      onChange={(e) => handleLabelChange('view_item', e.target.value)}
                      placeholder={`View ${formData.singular_label || 'Item'}`}
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
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">Search Items</label>
                    <Input
                      value={formData.labels?.search_items || ''}
                      onChange={(e) => handleLabelChange('search_items', e.target.value)}
                      placeholder={`Search ${formData.plural_label || 'Items'}`}
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
                    <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">Not Found in Trash</label>
                    <Input
                      value={formData.labels?.not_found_in_trash || ''}
                      onChange={(e) => handleLabelChange('not_found_in_trash', e.target.value)}
                      placeholder={`No ${formData.plural_label?.toLowerCase() || 'items'} found in Trash`}
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
              setMetaFields={handleMetaFieldsChange}
              emptyStateText="Add custom fields to collect additional data for your posts"
            />
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="rdcfe-space-y-6">
              {/* Visibility Options */}
              <CollapsibleSection title="Visibility & Access" icon={<Eye className="rdcfe-w-5 rdcfe-h-5" />}>
                <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-2 rdcfe-gap-4">
                  <ToggleCard
                    icon={<Globe className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Public"
                    description="Visible to all visitors on your site"
                    checked={formData.public ?? true}
                    onChange={(v) => handleChange('public', v)}
                  />
                  <ToggleCard
                    icon={<Eye className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Show Admin UI"
                    description="Generate default admin UI for this type"
                    checked={formData.show_ui ?? true}
                    onChange={(v) => handleChange('show_ui', v)}
                  />
                  <ToggleCard
                    icon={<Settings className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Show in Admin Menu"
                    description="Display in WordPress admin sidebar"
                    checked={formData.show_in_menu ?? true}
                    onChange={(v) => handleChange('show_in_menu', v)}
                  />
                  <ToggleCard
                    icon={<Layers className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Show in Nav Menus"
                    description="Available in Appearance → Menus"
                    checked={formData.show_in_nav_menus ?? true}
                    onChange={(v) => handleChange('show_in_nav_menus', v)}
                  />
                  <ToggleCard
                    icon={formData.has_archive ? <Eye className="rdcfe-w-5 rdcfe-h-5" /> : <EyeOff className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Enable Archive"
                    description="Create an archive page listing all items"
                    checked={formData.has_archive ?? true}
                    onChange={(v) => handleChange('has_archive', v)}
                  />
                  <ToggleCard
                    icon={<Zap className="rdcfe-w-5 rdcfe-h-5" />}
                    title="REST API"
                    description="Enable Gutenberg editor & REST API access"
                    checked={formData.show_in_rest ?? true}
                    onChange={(v) => handleChange('show_in_rest', v)}
                  />
                  <ToggleCard
                    icon={<PanelTop className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Show in Admin Bar"
                    description="Display 'Add New' shortcut in the top WP admin bar"
                    checked={formData.show_in_admin_bar ?? true}
                    onChange={(v) => handleChange('show_in_admin_bar', v)}
                  />
                </div>
              </CollapsibleSection>

              {/* URL & Permalinks */}
              <CollapsibleSection title="URL Settings" icon={<Globe className="rdcfe-w-5 rdcfe-h-5" />}>
                <FieldRow label="Enable Rewrite" hint="Create pretty permalinks for this post type">
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
                  <>
                    <FieldRow label="Custom Slug" hint="Override the default URL slug (leave empty to use post type slug)">
                      <Input
                        value={formData.rewrite_slug || ''}
                        onChange={(e) => handleChange('rewrite_slug', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder={formData.slug || 'custom-slug'}
                        className="rdcfe-font-mono"
                      />
                    </FieldRow>

                    <FieldRow label="Rewrite With Front" hint="Prepend the permalink structure front base (e.g., /blog/)">
                      <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-cursor-pointer">
                        <div className={`rdcfe-relative rdcfe-w-12 rdcfe-h-7 rdcfe-rounded-full rdcfe-transition-colors ${formData.rewrite_with_front ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'}`}>
                          <input 
                            type="checkbox" 
                            checked={formData.rewrite_with_front ?? true}
                            onChange={(e) => handleChange('rewrite_with_front', e.target.checked)}
                            className="rdcfe-sr-only"
                          />
                          <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-transition-transform ${formData.rewrite_with_front ? 'rdcfe-translate-x-5' : ''}`} />
                        </div>
                        <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-font-medium">
                          {formData.rewrite_with_front ? 'Yes' : 'No'}
                        </span>
                      </label>
                    </FieldRow>
                  </>
                )}

                <FieldRow label="Query Var" hint="Enable URL query variable (e.g., ?post_type=slug)">
                  <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-cursor-pointer">
                    <div className={`rdcfe-relative rdcfe-w-12 rdcfe-h-7 rdcfe-rounded-full rdcfe-transition-colors ${formData.query_var ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'}`}>
                      <input 
                        type="checkbox" 
                        checked={formData.query_var ?? true}
                        onChange={(e) => handleChange('query_var', e.target.checked)}
                        className="rdcfe-sr-only"
                      />
                      <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-transition-transform ${formData.query_var ? 'rdcfe-translate-x-5' : ''}`} />
                    </div>
                    <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-font-medium">
                      {formData.query_var ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </FieldRow>

                <FieldRow label="Hierarchical" hint="Enable parent/child relationships like Pages">
                  <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-cursor-pointer">
                    <div className={`rdcfe-relative rdcfe-w-12 rdcfe-h-7 rdcfe-rounded-full rdcfe-transition-colors ${formData.hierarchical ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'}`}>
                      <input 
                        type="checkbox" 
                        checked={formData.hierarchical ?? false}
                        onChange={(e) => handleChange('hierarchical', e.target.checked)}
                        className="rdcfe-sr-only"
                      />
                      <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-transition-transform ${formData.hierarchical ? 'rdcfe-translate-x-5' : ''}`} />
                    </div>
                    <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-font-medium">
                      {formData.hierarchical ? 'Yes (like Pages)' : 'No (like Posts)'}
                    </span>
                  </label>
                </FieldRow>

                {formData.show_in_rest && (
                  <FieldRow label="REST API Base" hint="Override REST endpoint base (leave empty to use post type slug)" error={errors.rest_base}>
                    <Input
                      value={formData.rest_base || ''}
                      onChange={(e) => handleChange('rest_base', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                      placeholder={formData.slug || 'rest-base'}
                      className="rdcfe-font-mono"
                      error={!!errors.rest_base}
                    />
                  </FieldRow>
                )}
              </CollapsibleSection>

              {/* Capability Type */}
              <CollapsibleSection title="Permissions" icon={<Lock className="rdcfe-w-5 rdcfe-h-5" />}>
                <FieldRow label="Capability Type" hint="What built-in type should this use for permissions? Choose Custom to define your own (e.g., 'project')." error={errors.capability_type}>
                  <div className="rdcfe-space-y-3">
                    <Select
                      options={[
                        { value: 'post', label: 'Post (default)' },
                        { value: 'page', label: 'Page' },
                        { value: 'custom', label: 'Custom' },
                      ]}
                      value={
                        formData.capability_type === 'post' || formData.capability_type === 'page' || !formData.capability_type
                          ? (formData.capability_type || 'post')
                          : 'custom'
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'custom') {
                          handleChange('capability_type', '');
                        } else {
                          handleChange('capability_type', v);
                        }
                      }}
                    />
                    {formData.capability_type !== 'post' && formData.capability_type !== 'page' && (
                      <Input
                        value={formData.capability_type || ''}
                        onChange={(e) => handleChange('capability_type', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="e.g., project, product"
                        className="rdcfe-font-mono"
                        error={!!errors.capability_type}
                      />
                    )}
                  </div>
                </FieldRow>

                <FieldRow label="Map Meta Cap" hint="Use WordPress internal default meta capability handling">
                  <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-cursor-pointer">
                    <div className={`rdcfe-relative rdcfe-w-12 rdcfe-h-7 rdcfe-rounded-full rdcfe-transition-colors ${formData.map_meta_cap ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'}`}>
                      <input 
                        type="checkbox" 
                        checked={formData.map_meta_cap ?? true}
                        onChange={(e) => handleChange('map_meta_cap', e.target.checked)}
                        className="rdcfe-sr-only"
                      />
                      <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-transition-transform ${formData.map_meta_cap ? 'rdcfe-translate-x-5' : ''}`} />
                    </div>
                    <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-font-medium">
                      {formData.map_meta_cap ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </FieldRow>

                <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-2 rdcfe-gap-4 rdcfe-mt-5">
                  <ToggleCard
                    icon={<EyeOff className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Exclude from Search"
                    description="Hide from WordPress search results"
                    checked={formData.exclude_from_search ?? false}
                    onChange={(v) => handleChange('exclude_from_search', v)}
                  />
                  <ToggleCard
                    icon={<Globe className="rdcfe-w-5 rdcfe-h-5" />}
                    title="Publicly Queryable"
                    description="Allow direct URL access to posts"
                    checked={formData.publicly_queryable ?? true}
                    onChange={(v) => handleChange('publicly_queryable', v)}
                  />
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Admin Columns & Filters Tab */}
          {activeTab === 'admin_columns_filters' && (
            <div className="rdcfe-space-y-6">
              {/* Admin Columns */}
              <CollapsibleSection 
                title="Admin Columns" 
                icon={<Columns className="rdcfe-w-5 rdcfe-h-5" />}
                badge="Pro"
              >
                <div className="rdcfe-space-y-4">
                  {/* Expand / Collapse All bar — mirrors the Meta Fields editor
                      so the cards stay tidy on long lists. Hidden when the
                      list is empty (nothing to expand) and when there is
                      only a single card (toggle-on-card is enough). */}
                  {adminColumns.length > 1 && (
                    <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between">
                      <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                        {adminColumns.length} column{adminColumns.length !== 1 ? 's' : ''} • {expandedColumns.size} expanded
                      </span>
                      <div className="rdcfe-flex rdcfe-gap-2">
                        <button
                          type="button"
                          onClick={expandAllColumns}
                          className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline"
                        >
                          Expand All
                        </button>
                        <span className="rdcfe-text-[hsl(var(--rdcfe-border))]">|</span>
                        <button
                          type="button"
                          onClick={collapseAllColumns}
                          className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline"
                        >
                          Collapse All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Column Items */}
                  {adminColumns.length > 0 ? (
                    <div className="rdcfe-space-y-3">
                      {adminColumns.map((column, index) => {
                        const isExpanded = expandedColumns.has(column.id);
                        // Header label: prefer the user's typed title, fall
                        // back to the positional "Column N" so empty cards
                        // are still distinguishable.
                        const displayTitle = column.title?.trim() || `Column ${index + 1}`;
                        return (
                        <div 
                          key={column.id}
                          className="rdcfe-rounded-2xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-shadow-sm rdcfe-overflow-hidden"
                        >
                          {/* Header - clickable to toggle expansion. The
                              drag handle and action buttons stop click
                              propagation so they don't double-fire. */}
                          <div
                            className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-px-4 rdcfe-py-3 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-cursor-pointer hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-transition-colors"
                            onClick={() => toggleColumnExpand(column.id)}
                          >
                            <div
                              className="rdcfe-cursor-grab active:rdcfe-cursor-grabbing rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-colors rdcfe-p-1 rdcfe-rounded hover:rdcfe-bg-[hsl(var(--rdcfe-muted))]"
                              onClick={(e) => e.stopPropagation()}
                              title="Drag to reorder"
                            >
                              <GripVertical className="rdcfe-h-4 rdcfe-w-4" />
                            </div>

                            <div className="rdcfe-flex-1 rdcfe-min-w-0">
                              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                                <span className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-truncate">
                                  {displayTitle}
                                </span>
                              </div>
                              <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                                {(columnTypeOptions.find(o => o.value === column.type)?.label) || 'Meta Value'}
                                {column.field_name ? ` • ${column.field_name}` : ''}
                              </div>
                            </div>

                            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => duplicateAdminColumn(column.id)}
                                className="rdcfe-p-2 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg rdcfe-transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="rdcfe-w-4 rdcfe-h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeAdminColumn(column.id)}
                                className="rdcfe-p-2 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(var(--rdcfe-destructive)/0.1)] rdcfe-rounded-lg rdcfe-transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleColumnExpand(column.id)}
                                className="rdcfe-p-2 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg rdcfe-transition-colors"
                                title={isExpanded ? 'Collapse' : 'Expand'}
                                aria-expanded={isExpanded}
                              >
                                <ChevronRight className={`rdcfe-w-4 rdcfe-h-4 rdcfe-transition-transform ${isExpanded ? 'rdcfe-rotate-90' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Content - Blurred with Pro Overlay (Free) / fully interactive (Pro) */}
                          {isExpanded && (
                          <div className="rdcfe-relative rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                            {/* Pro Overlay — only for Free users */}
                            {!isPro && (
                              <div className="rdcfe-absolute rdcfe-inset-0 rdcfe-z-20 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-rounded-b-xl" style={{ backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)', backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                                <div className="rdcfe-text-center rdcfe-p-4">
                                  <div className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-bg-gradient-to-r rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-text-white rdcfe-text-[10px] rdcfe-font-bold rdcfe-px-2.5 rdcfe-py-1 rdcfe-rounded-full rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-2">
                                    <Lock className="rdcfe-w-3 rdcfe-h-3" />
                                    Pro Feature
                                  </div>
                                  <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-2">
                                    Unlock all column options
                                  </p>
                                  <a
                                    href="https://developer4starter.dev/plugins/dynamic-cpt-fields-engine-pro"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-bg-gradient-to-r rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-text-white rdcfe-font-semibold rdcfe-px-3 rdcfe-py-1.5 rdcfe-rounded-lg rdcfe-shadow-md hover:rdcfe-shadow-lg rdcfe-transition-all hover:rdcfe-scale-105 rdcfe-text-[11px]"
                                  >
                                    <Zap className="rdcfe-w-3 rdcfe-h-3" />
                                    Upgrade
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Actual Fields. Disabled (no pointer events) for Free users so the overlay above is the only interactive layer. */}
                            <div className={`rdcfe-p-5 rdcfe-space-y-5 ${!isPro ? 'rdcfe-pointer-events-none rdcfe-select-none' : ''}`}>
                              {/* Type Selector */}
                              <div>
                                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-flex-nowrap">
                                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-whitespace-nowrap">Type:</span>
                                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-rounded-xl rdcfe-flex-shrink-0">
                                    {columnTypeOptions.map(opt => (
                                      isPro ? (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => updateAdminColumn(column.id, 'type', opt.value)}
                                          title={opt.description}
                                          className={`rdcfe-block rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-text-[13px] rdcfe-font-medium rdcfe-whitespace-nowrap rdcfe-transition-colors ${
                                            column.type === opt.value
                                              ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                                              : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                                          }`}
                                        >
                                          {opt.label}
                                        </button>
                                      ) : (
                                        <span key={opt.value} className={`rdcfe-block rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-text-[13px] rdcfe-font-medium rdcfe-whitespace-nowrap ${
                                          column.type === opt.value 
                                            ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm' 
                                            : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
                                        }`}>
                                          {opt.label}
                                        </span>
                                      )
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Title */}
                              <div>
                                <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                  Title <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                                </span>
                                {isPro ? (
                                  <Input
                                    value={column.title}
                                    onChange={(e) => updateAdminColumn(column.id, 'title', e.target.value)}
                                    placeholder="e.g. Price, Status, Featured"
                                  />
                                ) : (
                                  <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                    <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">e.g. Price, Status, Featured</span>
                                  </div>
                                )}
                              </div>

                              {/* Field source — depends on column.type */}
                              {column.type === 'meta_value' && (
                                <div>
                                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Field Name (Meta Key)
                                  </span>
                                  {isPro ? (
                                    metaFieldOptions.length > 0 ? (
                                      <Select
                                        options={[{ value: '', label: '— Select a meta field or type custom —' }, ...metaFieldOptions]}
                                        value={column.field_name}
                                        onChange={(e) => updateAdminColumn(column.id, 'field_name', e.target.value)}
                                      />
                                    ) : (
                                      <Input
                                        value={column.field_name}
                                        onChange={(e) => updateAdminColumn(column.id, 'field_name', e.target.value)}
                                        placeholder="meta_key_name"
                                        className="rdcfe-font-mono"
                                      />
                                    )
                                  ) : (
                                    <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                      <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-font-mono">meta_key_name</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {column.type === 'post_terms' && (
                                <div>
                                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Taxonomy
                                  </span>
                                  {isPro ? (
                                    <Select
                                      options={[{ value: '', label: '— Select a taxonomy —' }, ...taxonomyOptions]}
                                      value={column.taxonomy || ''}
                                      onChange={(e) => updateAdminColumn(column.id, 'taxonomy', e.target.value)}
                                    />
                                  ) : (
                                    <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                      <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-font-mono">taxonomy_slug</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {column.type === 'custom_callback' && (
                                <div>
                                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Callback function
                                  </span>
                                  {isPro ? (
                                    <>
                                      <Input
                                        value={column.callback || ''}
                                        onChange={(e) => updateAdminColumn(column.id, 'callback', e.target.value)}
                                        placeholder="my_callback_function"
                                        className="rdcfe-font-mono"
                                      />
                                      <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1.5">
                                        Built-ins: <code>dcfe_cb_format_date</code>, <code>dcfe_cb_post_link</code>, <code>dcfe_cb_image</code>, <code>dcfe_cb_yes_no</code>, <code>dcfe_cb_menu_order</code>, <code>dcfe_cb_select_label</code>.
                                      </p>
                                    </>
                                  ) : (
                                    <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                      <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-font-mono">my_callback_function</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Grid fields */}
                              <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-3 rdcfe-gap-4">
                                <div>
                                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Column Order
                                  </span>
                                  {isPro ? (
                                    <Input
                                      type="number"
                                      value={column.column_order}
                                      onChange={(e) => updateAdminColumn(column.id, 'column_order', parseInt(e.target.value || '0', 10))}
                                      placeholder="0"
                                    />
                                  ) : (
                                    <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                      <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">0</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Prefix
                                  </span>
                                  {isPro ? (
                                    <Input
                                      value={column.prefix}
                                      onChange={(e) => updateAdminColumn(column.id, 'prefix', e.target.value)}
                                      placeholder="e.g. $"
                                    />
                                  ) : (
                                    <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                      <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">e.g. $</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Suffix
                                  </span>
                                  {isPro ? (
                                    <Input
                                      value={column.suffix}
                                      onChange={(e) => updateAdminColumn(column.id, 'suffix', e.target.value)}
                                      placeholder="e.g. USD"
                                    />
                                  ) : (
                                    <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                      <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">e.g. USD</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Sortable toggle */}
                              <div className="rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
                                <label className={`rdcfe-flex rdcfe-items-center rdcfe-gap-3 ${isPro ? 'rdcfe-cursor-pointer' : ''}`}>
                                  <div className={`rdcfe-relative rdcfe-w-12 rdcfe-h-7 rdcfe-rounded-full rdcfe-transition-colors ${column.sortable ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'}`}>
                                    {isPro && (
                                      <input
                                        type="checkbox"
                                        checked={column.sortable}
                                        onChange={(e) => updateAdminColumn(column.id, 'sortable', e.target.checked)}
                                        className="rdcfe-sr-only"
                                      />
                                    )}
                                    <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-transition-transform ${column.sortable ? 'rdcfe-translate-x-5' : ''}`} />
                                  </div>
                                  <div>
                                    <span className="rdcfe-text-[14px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))]">Enable Sorting</span>
                                    <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Allow users to sort by this column</p>
                                  </div>
                                </label>

                                {isPro && column.sortable && (
                                  <div className="rdcfe-mt-4 rdcfe-pl-4 rdcfe-border-l-2 rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)] rdcfe-space-y-3">
                                    <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!!column.is_numeric}
                                        onChange={(e) => updateAdminColumn(column.id, 'is_numeric', e.target.checked)}
                                      />
                                      <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Sort numerically (use for prices, counts, dates as timestamps)</span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rdcfe-text-center rdcfe-py-8">
                      <div className="rdcfe-w-14 rdcfe-h-14 rdcfe-mx-auto rdcfe-rounded-2xl rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-mb-3">
                        <Columns className="rdcfe-w-7 rdcfe-h-7 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                      </div>
                      <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4">
                        {isPro
                          ? 'No admin columns yet. Click "Add Column" below to surface meta values, terms or callbacks on the post-list screen.'
                          : 'No admin columns yet. Add one to preview the Pro features.'}
                      </p>
                    </div>
                  )}

                  {/* Add Button — Pro only. Free users see the upgrade overlay above instead. */}
                  {isPro && (
                    <button
                      type="button"
                      onClick={addAdminColumn}
                      className="rdcfe-w-full rdcfe-py-4 rdcfe-border-2 rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-rounded-xl rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2"
                    >
                      <Plus className="rdcfe-w-4 rdcfe-h-4" />
                      Add Column
                    </button>
                  )}
                </div>
              </CollapsibleSection>

              {/* Admin Filters */}
              <CollapsibleSection 
                title="Admin Filters" 
                icon={<Filter className="rdcfe-w-5 rdcfe-h-5" />}
                badge="Pro"
              >
                <div className="rdcfe-space-y-4">
                  {/* Expand / Collapse All bar — only shown when there are
                      multiple filter cards, otherwise the per-card chevron
                      is sufficient. */}
                  {adminFilters.length > 1 && (
                    <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between">
                      <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                        {adminFilters.length} filter{adminFilters.length !== 1 ? 's' : ''} • {expandedFilters.size} expanded
                      </span>
                      <div className="rdcfe-flex rdcfe-gap-2">
                        <button
                          type="button"
                          onClick={expandAllFilters}
                          className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline"
                        >
                          Expand All
                        </button>
                        <span className="rdcfe-text-[hsl(var(--rdcfe-border))]">|</span>
                        <button
                          type="button"
                          onClick={collapseAllFilters}
                          className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline"
                        >
                          Collapse All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filter Items */}
                  {adminFilters.length > 0 ? (
                    <div className="rdcfe-space-y-3">
                      {adminFilters.map((filter, index) => {
                        const isExpanded = expandedFilters.has(filter.id);
                        // Resolve a friendly key label for the meta-key
                        // subtitle so collapsed cards still show the
                        // configured meta key / taxonomy at a glance.
                        const subtitleKey = filter.type === 'taxonomy'
                          ? (filter.taxonomy || '')
                          : filter.type === 'meta_range'
                            ? (filter.meta_field === '__custom__' ? (filter.custom_meta_field || '') : (filter.meta_field || ''))
                            : (filter.meta_field === '__custom__' ? (filter.custom_meta_field || '') : (filter.meta_field || ''));
                        const typeLabel = (filterTypeOptions.find(o => o.value === filter.type)?.label) || 'Meta Data';
                        // Header label: prefer the user's typed Name/Placeholder.
                        const displayName = filter.name?.trim() || `Filter ${index + 1}`;
                        return (
                        <div 
                          key={filter.id}
                          className="rdcfe-rounded-2xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-shadow-sm rdcfe-overflow-hidden"
                        >
                          {/* Header - clickable to toggle. Action buttons
                              and drag handle stop propagation so they
                              don't double-fire. */}
                          <div
                            className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-px-4 rdcfe-py-3 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-cursor-pointer hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-transition-colors"
                            onClick={() => toggleFilterExpand(filter.id)}
                          >
                            <div
                              className="rdcfe-cursor-grab active:rdcfe-cursor-grabbing rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-colors rdcfe-p-1 rdcfe-rounded hover:rdcfe-bg-[hsl(var(--rdcfe-muted))]"
                              onClick={(e) => e.stopPropagation()}
                              title="Drag to reorder"
                            >
                              <GripVertical className="rdcfe-h-4 rdcfe-w-4" />
                            </div>

                            <div className="rdcfe-flex-1 rdcfe-min-w-0">
                              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                                <span className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-truncate">
                                  {displayName}
                                </span>
                              </div>
                              <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                                {typeLabel}
                                {subtitleKey ? ` • ${subtitleKey}` : ''}
                              </div>
                            </div>

                            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => duplicateAdminFilter(filter.id)}
                                className="rdcfe-p-2 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg rdcfe-transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="rdcfe-w-4 rdcfe-h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeAdminFilter(filter.id)}
                                className="rdcfe-p-2 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(var(--rdcfe-destructive)/0.1)] rdcfe-rounded-lg rdcfe-transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleFilterExpand(filter.id)}
                                className="rdcfe-p-2 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-lg rdcfe-transition-colors"
                                title={isExpanded ? 'Collapse' : 'Expand'}
                                aria-expanded={isExpanded}
                              >
                                <ChevronRight className={`rdcfe-w-4 rdcfe-h-4 rdcfe-transition-transform ${isExpanded ? 'rdcfe-rotate-90' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Content - Blurred with Pro Overlay (Free) / fully interactive (Pro) */}
                          {isExpanded && (
                          <div className="rdcfe-relative rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                            {/* Pro Overlay — only for Free users */}
                            {!isPro && (
                              <div className="rdcfe-absolute rdcfe-inset-0 rdcfe-z-20 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-rounded-b-xl" style={{ backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)', backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                                <div className="rdcfe-text-center rdcfe-p-4">
                                  <div className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-bg-gradient-to-r rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-text-white rdcfe-text-[10px] rdcfe-font-bold rdcfe-px-2.5 rdcfe-py-1 rdcfe-rounded-full rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-2">
                                    <Lock className="rdcfe-w-3 rdcfe-h-3" />
                                    Pro Feature
                                  </div>
                                  <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-2">
                                    Unlock all filter options
                                  </p>
                                  <a
                                    href="https://developer4starter.dev/plugins/dynamic-cpt-fields-engine-pro"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-bg-gradient-to-r rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-text-white rdcfe-font-semibold rdcfe-px-3 rdcfe-py-1.5 rdcfe-rounded-lg rdcfe-shadow-md hover:rdcfe-shadow-lg rdcfe-transition-all hover:rdcfe-scale-105 rdcfe-text-[11px]"
                                  >
                                    <Zap className="rdcfe-w-3 rdcfe-h-3" />
                                    Upgrade
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Actual Fields. Disabled (no pointer events) for Free users so the overlay above is the only interactive layer. */}
                            <div className={`rdcfe-p-5 rdcfe-space-y-5 ${!isPro ? 'rdcfe-pointer-events-none rdcfe-select-none' : ''}`}>
                              {/* Type Selector */}
                              <div>
                                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-flex-nowrap">
                                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-whitespace-nowrap">Type:</span>
                                  <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-gap-1 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-rounded-xl">
                                    {filterTypeOptions.map(opt => (
                                      isPro ? (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => setAdminFilterType(filter.id, opt.value as AdminFilter['type'])}
                                          title={opt.description}
                                          className={`rdcfe-block rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-text-[13px] rdcfe-font-medium rdcfe-whitespace-nowrap rdcfe-transition-colors ${
                                            filter.type === opt.value
                                              ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                                              : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                                          }`}
                                        >
                                          {opt.label}
                                        </button>
                                      ) : (
                                        <span key={opt.value} className={`rdcfe-block rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-text-[13px] rdcfe-font-medium rdcfe-whitespace-nowrap ${
                                          filter.type === opt.value 
                                            ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm' 
                                            : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
                                        }`}>
                                          {opt.label}
                                        </span>
                                      )
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Name/Placeholder */}
                              <div>
                                <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                  Name/Placeholder <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                                </span>
                                {isPro ? (
                                  <Input
                                    value={filter.name}
                                    onChange={(e) => updateAdminFilter(filter.id, 'name', e.target.value)}
                                    placeholder="e.g. Category, Status, Author"
                                  />
                                ) : (
                                  <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                    <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">e.g. Category, Status, Author</span>
                                  </div>
                                )}
                                {isPro && (
                                  <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mt-2 rdcfe-cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={filter.use_name_as_placeholder}
                                      onChange={(e) => updateAdminFilter(filter.id, 'use_name_as_placeholder', e.target.checked)}
                                    />
                                    <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Use this name as the dropdown placeholder (instead of "All …")</span>
                                  </label>
                                )}
                              </div>

                              {/* Taxonomy Select — for taxonomy filters */}
                              {filter.type === 'taxonomy' && (
                                <div>
                                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Taxonomy
                                  </span>
                                  {isPro ? (
                                    <Select
                                      options={[{ value: '', label: '— Select a taxonomy —' }, ...taxonomyOptions]}
                                      value={filter.taxonomy || ''}
                                      onChange={(e) => updateAdminFilter(filter.id, 'taxonomy', e.target.value)}
                                    />
                                  ) : (
                                    <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center rdcfe-justify-between">
                                      <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Select taxonomy</span>
                                      <ChevronRight className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-rotate-90" />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Meta-field source — for meta filters */}
                              {filter.type === 'meta' && (
                                <>
                                  <div>
                                    <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Meta Field
                                    </span>
                                    {isPro ? (
                                      <Select
                                        options={[
                                          { value: '', label: '— Select a meta field —' },
                                          ...metaFieldOptions,
                                          { value: '__custom__', label: 'Use custom meta key…' },
                                        ]}
                                        value={filter.meta_field === '__custom__' || (filter.meta_field === '' && filter.custom_meta_field) ? '__custom__' : (filter.meta_field || '')}
                                        onChange={(e) => updateAdminFilter(filter.id, 'meta_field', e.target.value)}
                                      />
                                    ) : (
                                      <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                        <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-font-mono">meta_key_name</span>
                                      </div>
                                    )}
                                  </div>
                                  {isPro && filter.meta_field === '__custom__' && (
                                    <div>
                                      <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                        Custom Meta Key
                                      </span>
                                      <Input
                                        value={filter.custom_meta_field || ''}
                                        onChange={(e) => updateAdminFilter(filter.id, 'custom_meta_field', e.target.value)}
                                        placeholder="my_custom_meta_key"
                                        className="rdcfe-font-mono"
                                      />
                                    </div>
                                  )}
                                  {isPro && (
                                    <div>
                                      <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                        Options Source
                                      </span>
                                      <Select
                                        options={optionsSourceOptions}
                                        value={filter.options_source || 'meta_values'}
                                        onChange={(e) => updateAdminFilter(filter.id, 'options_source', e.target.value)}
                                      />
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Numeric range buckets — Pro meta_range */}
                              {filter.type === 'meta_range' && (
                                <>
                                  <div>
                                    <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Meta Field (numeric)
                                    </span>
                                    {isPro ? (
                                      <Select
                                        options={[
                                          { value: '', label: '— Select a meta field —' },
                                          ...metaFieldOptions,
                                          { value: '__custom__', label: 'Use custom meta key…' },
                                        ]}
                                        value={filter.meta_field === '__custom__' || (filter.meta_field === '' && filter.custom_meta_field) ? '__custom__' : (filter.meta_field || '')}
                                        onChange={(e) => updateAdminFilter(filter.id, 'meta_field', e.target.value)}
                                      />
                                    ) : (
                                      <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center">
                                        <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-font-mono">price_meta_key</span>
                                      </div>
                                    )}
                                  </div>
                                  {isPro && filter.meta_field === '__custom__' && (
                                    <div>
                                      <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                        Custom Meta Key
                                      </span>
                                      <Input
                                        value={filter.custom_meta_field || ''}
                                        onChange={(e) => updateAdminFilter(filter.id, 'custom_meta_field', e.target.value)}
                                        placeholder="price"
                                        className="rdcfe-font-mono"
                                      />
                                    </div>
                                  )}
                                  {isPro && (
                                    <div className="rdcfe-space-y-3">
                                      <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-block">
                                        Range presets
                                      </span>
                                      <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-2 rdcfe-leading-relaxed">
                                        Each row is one dropdown choice in the admin list. Leave min or max empty for an open bound (e.g. “Over $500k” = min only).
                                      </p>
                                      {(filter.range_options || [{ label: '', min: '', max: '' }]).map((row, rIndex) => (
                                        <div
                                          key={`${filter.id}-range-${rIndex}`}
                                          className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-[1fr_1fr_1fr_auto] rdcfe-gap-3 rdcfe-items-end rdcfe-p-3 rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border)/0.6)] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.15)]"
                                        >
                                          <div>
                                            <span className="rdcfe-text-[11px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1 rdcfe-block">Label</span>
                                            <Input
                                              value={row.label}
                                              onChange={(e) => updateRangeOption(filter.id, rIndex, 'label', e.target.value)}
                                              placeholder="e.g. Under $100k"
                                            />
                                          </div>
                                          <div>
                                            <span className="rdcfe-text-[11px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1 rdcfe-block">Min</span>
                                            <Input
                                              value={row.min}
                                              onChange={(e) => updateRangeOption(filter.id, rIndex, 'min', e.target.value)}
                                              placeholder="0"
                                              className="rdcfe-font-mono"
                                            />
                                          </div>
                                          <div>
                                            <span className="rdcfe-text-[11px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1 rdcfe-block">Max</span>
                                            <Input
                                              value={row.max}
                                              onChange={(e) => updateRangeOption(filter.id, rIndex, 'max', e.target.value)}
                                              placeholder="100000"
                                              className="rdcfe-font-mono"
                                            />
                                          </div>
                                          <div className="rdcfe-flex rdcfe-justify-end">
                                            <button
                                              type="button"
                                              onClick={() => removeRangeOption(filter.id, rIndex)}
                                              className="rdcfe-p-2 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-rounded-lg hover:rdcfe-bg-[hsl(var(--rdcfe-destructive)/0.08)]"
                                              title="Remove range"
                                            >
                                              <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => addRangeOption(filter.id)}
                                        className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline"
                                      >
                                        + Add range row
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Order Options — only relevant for taxonomy filters */}
                              {filter.type === 'taxonomy' && (
                                <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-4">
                                  <div>
                                    <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Order By
                                    </span>
                                    {isPro ? (
                                      <Select
                                        options={taxonomyOrderByOptions}
                                        value={filter.order_by || 'name'}
                                        onChange={(e) => updateAdminFilter(filter.id, 'order_by', e.target.value)}
                                      />
                                    ) : (
                                      <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center rdcfe-justify-between">
                                        <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Name</span>
                                        <ChevronRight className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-rotate-90" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Order
                                    </span>
                                    {isPro ? (
                                      <Select
                                        options={orderOptions}
                                        value={filter.order || 'ASC'}
                                        onChange={(e) => updateAdminFilter(filter.id, 'order', e.target.value as 'ASC' | 'DESC')}
                                      />
                                    ) : (
                                      <div className="rdcfe-h-10 rdcfe-px-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-flex rdcfe-items-center rdcfe-justify-between">
                                        <span className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Ascending</span>
                                        <ChevronRight className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-rotate-90" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Show counts checkbox — only relevant for taxonomy filters */}
                              {filter.type === 'taxonomy' && (
                                <label className={`rdcfe-flex rdcfe-items-center rdcfe-gap-3 ${isPro ? 'rdcfe-cursor-pointer' : ''}`}>
                                  {isPro ? (
                                    <input
                                      type="checkbox"
                                      checked={!!filter.show_counts}
                                      onChange={(e) => updateAdminFilter(filter.id, 'show_counts', e.target.checked)}
                                      className="rdcfe-w-4 rdcfe-h-4"
                                    />
                                  ) : (
                                    <div className="rdcfe-w-4 rdcfe-h-4 rdcfe-rounded rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white" />
                                  )}
                                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Show post counts for taxonomy terms</span>
                                </label>
                              )}
                            </div>
                          </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rdcfe-text-center rdcfe-py-8">
                      <div className="rdcfe-w-14 rdcfe-h-14 rdcfe-mx-auto rdcfe-rounded-2xl rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-mb-3">
                        <Filter className="rdcfe-w-7 rdcfe-h-7 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                      </div>
                      <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4">
                        {isPro
                          ? 'No admin filters yet. Click "Add Filter" below to add taxonomy or meta-value dropdowns above the post-list table.'
                          : 'No admin filters yet. Add one to preview the Pro features.'}
                      </p>
                    </div>
                  )}

                  {/* Add Button — Pro only. Free users see the upgrade overlay above instead. */}
                  {isPro && (
                    <button
                      type="button"
                      onClick={addAdminFilter}
                      className="rdcfe-w-full rdcfe-py-4 rdcfe-border-2 rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-rounded-xl rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2"
                    >
                      <Plus className="rdcfe-w-4 rdcfe-h-4" />
                      Add Filter
                    </button>
                  )}
                </div>
              </CollapsibleSection>

              {/* Pro Info Box - Meta fields sourcing notice */}
              {metaFields.length > 0 && (
                <div className="rdcfe-bg-gradient-to-r rdcfe-from-[#7367f0]/5 rdcfe-to-[#675dd8]/5 rdcfe-border rdcfe-border-[#7367f0]/20 rdcfe-rounded-xl rdcfe-p-4">
                  <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
                    <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-lg rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0">
                      <Layers className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
                    </div>
                    <div>
                      <h4 className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1">
                        {metaFields.length} Meta Field{metaFields.length !== 1 ? 's' : ''} Available
                      </h4>
                      <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                        With Pro, you can use your defined meta fields in Admin Columns and Filters for powerful data display and filtering.
                      </p>
                    </div>
                  </div>
                </div>
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
              {isEditing ? 'Update Post Type' : 'Create Post Type'}
            </button>

            {formData.slug && (
              <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-3">Preview</div>
                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-rounded-xl">
                  <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                    <span 
                      className={`dashicons ${formData.menu_icon || 'dashicons-admin-post'}`}
                      style={{ fontSize: '20px', width: '20px', height: '20px', color: 'hsl(var(--rdcfe-primary))' }}
                    />
                  </div>
                  <span className="rdcfe-font-semibold rdcfe-text-[15px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    {formData.plural_label || 'Post Type Name'}
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
                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Admin Columns</span>
                  <span className="rdcfe-font-semibold rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-px-2.5 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[12px]">
                    {adminColumns.length}
                  </span>
                </div>
                <div className="rdcfe-flex rdcfe-justify-between rdcfe-items-center rdcfe-py-2 rdcfe-px-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">Admin Filters</span>
                  <span className="rdcfe-font-semibold rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-px-2.5 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[12px]">
                    {adminFilters.length}
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
                <span>Use plural names like "Projects" or "Products"</span>
              </li>
              <li className="rdcfe-flex rdcfe-gap-3">
                <div className="rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                  <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))]">2</span>
                </div>
                <span>Labels are auto-generated from the name</span>
              </li>
              <li className="rdcfe-flex rdcfe-gap-3">
                <div className="rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-mt-0.5">
                  <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))]">3</span>
                </div>
                <span>Enable REST API for Gutenberg support</span>
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
                        slug: formData.slug,
                        label: formData.plural_label,
                        singular_label: formData.singular_label,
                        description: formData.description || '',
                        public: formData.public ?? true,
                        hierarchical: formData.hierarchical ?? false,
                        has_archive: formData.has_archive ?? true,
                        show_in_rest: formData.show_in_rest ?? true,
                        rest_base: formData.rest_base || '',
                        supports: formData.supports || ['title', 'editor', 'thumbnail'],
                        menu_icon: formData.menu_icon || 'dashicons-admin-post',
                        menu_position: formData.menu_position || 25,
                        exclude_from_search: formData.exclude_from_search ?? false,
                        publicly_queryable: formData.publicly_queryable ?? true,
                        show_ui: formData.show_ui ?? true,
                        show_in_menu: formData.show_in_menu ?? true,
                        show_in_nav_menus: formData.show_in_nav_menus ?? true,
                        show_in_admin_bar: formData.show_in_admin_bar ?? true,
                        capability_type: formData.capability_type || 'post',
                        map_meta_cap: formData.map_meta_cap ?? true,
                        rewrite: formData.rewrite ?? true,
                        rewrite_slug: formData.rewrite_slug || '',
                        rewrite_with_front: formData.rewrite_with_front ?? true,
                        query_var: formData.query_var ?? true,
                        labels: formData.labels || {},
                        admin_columns: adminColumns,
                        admin_filters: adminFilters,
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
                      slug: formData.slug,
                      label: formData.plural_label,
                      singular_label: formData.singular_label,
                      description: formData.description || '',
                      public: formData.public ?? true,
                      hierarchical: formData.hierarchical ?? false,
                      has_archive: formData.has_archive ?? true,
                      show_in_rest: formData.show_in_rest ?? true,
                      supports: formData.supports || ['title', 'editor', 'thumbnail'],
                      menu_icon: formData.menu_icon || 'dashicons-admin-post',
                      menu_position: formData.menu_position || 25,
                      labels: formData.labels || {},
                      meta_fields_count: metaFields.length,
                      admin_columns_count: adminColumns.length,
                      admin_filters_count: adminFilters.length,
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
