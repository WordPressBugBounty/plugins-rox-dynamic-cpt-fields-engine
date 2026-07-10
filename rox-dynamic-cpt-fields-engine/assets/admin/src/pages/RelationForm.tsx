import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  Link2,
  Settings,
  Tag as TagIcon,
  Hash,
  HelpCircle,
  Info,
  Trash2,
  ArrowRight,
  ArrowLeftRight,
  ChevronRight,
  FileText,
  Folder,
  Users,
  Database,
  Plus,
  GitBranch,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Select, type SelectOption } from '../components/ui/select';
import { Toggle } from '../components/ui/toggle';
import { useNotificationToast } from '../components/ui/notification-toast';
import { useProContext } from '../contexts/ProContext';
import { ProModuleGate } from '../components/ui/pro-feature-gate';
import { AIGenerateButton } from '../components/ai-assistant/AIGenerateButton';
import {
  createDefaultRelationFormData,
  suggestRelationSlug,
  useCreateRelation,
  useDeleteRelation,
  useRelation,
  useUpdateRelation,
  type RelationFormData,
} from '../hooks/useRelations';
import { usePostTypes } from '../hooks/usePostTypes';
import { useTaxonomies } from '../hooks/useTaxonomies';
import type {
  RelationConfigData,
  RelationMetaField,
  RelationMetaFieldType,
  RelationObjectKind,
  RelationType,
} from '../services/api';

// =====================================================================
// Static option pools
// =====================================================================

// Built-in WP post types people most often want to relate. The
// rdcfe-managed CPTs are merged on top from `usePostTypes()` below.
// Mirrors `SourceTab` so the dropdowns feel identical between the
// Query Builder and the Relations editor.
const CORE_POST_TYPES: SelectOption[] = [
  { value: 'post', label: 'Posts (post)' },
  { value: 'page', label: 'Pages (page)' },
];

const CORE_TAXONOMIES: SelectOption[] = [
  { value: 'category', label: 'Categories (category)' },
  { value: 'post_tag', label: 'Tags (post_tag)' },
];

// Object kind picker options. The icons mirror the affordances the
// meta box uses (post = file, term = folder/tag, user = person) so
// authors can scan the form quickly.
const OBJECT_KIND_OPTIONS: Array<{
  value: RelationObjectKind;
  label: string;
  description: string;
  Icon: typeof FileText;
}> = [
  {
    value: 'post',
    label: 'Post',
    description: 'Connect post types like posts, pages, or your CPTs.',
    Icon: FileText,
  },
  {
    value: 'term',
    label: 'Term',
    description: 'Connect categories, tags, or any custom taxonomy.',
    Icon: Folder,
  },
  {
    value: 'user',
    label: 'User',
    description: 'Connect users — optionally scoped to a single role.',
    Icon: Users,
  },
];

/** Read the runtime registry localised by `AdminAssets::get_object_registry()`. */
function getRegistry(): {
  postTypes: SelectOption[];
  taxonomies: SelectOption[];
  roles: SelectOption[];
} {
  type RegistrySettings = {
    registry?: {
      postTypes?: SelectOption[];
      taxonomies?: SelectOption[];
      roles?: SelectOption[];
    };
  };
  const settings = (window as { rdcfeSettings?: RegistrySettings }).rdcfeSettings;
  const reg = settings?.registry ?? {};
  return {
    postTypes: Array.isArray(reg.postTypes) ? reg.postTypes : [],
    taxonomies: Array.isArray(reg.taxonomies) ? reg.taxonomies : [],
    roles: Array.isArray(reg.roles) ? reg.roles : [{ value: '', label: 'Any role' }],
  };
}

// Cardinality cards, ordered most → least restrictive. The visual
// indicators (1 ↔ 1, 1 ↔ N, N ↔ N) are the same shorthand the
// list page uses, so authors recognise the picked value at a glance.
const RELATION_TYPES: Array<{
  value: RelationType;
  label: string;
  description: string;
  short: string;
}> = [
  {
    value: 'one-to-one',
    label: 'One to One',
    description: 'Each item on either side connects to exactly one item on the other.',
    short: '1 ↔ 1',
  },
  {
    value: 'one-to-many',
    label: 'One to Many',
    description: 'One owner on the target side can have many items on the source side.',
    short: '1 ↔ N',
  },
  {
    value: 'many-to-many',
    label: 'Many to Many',
    description: 'Either side can connect to any number of items on the other.',
    short: 'N ↔ N',
  },
];

// =====================================================================
// Local helpers (kept inline to mirror MetaboxForm structure)
// =====================================================================

/** Right-rail counter pill — same visual treatment as MetaboxForm sidebar. */
function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'primary' | 'success' | 'orange' | 'purple' | 'default';
}) {
  const tones: Record<typeof tone, { bg: string; fg: string }> = {
    primary: { bg: 'hsl(var(--rdcfe-primary)/0.1)', fg: 'hsl(var(--rdcfe-primary))' },
    success: { bg: 'hsl(var(--rdcfe-success)/0.1)', fg: 'hsl(var(--rdcfe-success))' },
    orange: { bg: 'hsl(38 92% 96%)', fg: 'hsl(38 92% 40%)' },
    purple: { bg: 'hsl(262 83% 96%)', fg: 'hsl(262 83% 50%)' },
    default: { bg: 'hsl(var(--rdcfe-muted))', fg: 'hsl(var(--rdcfe-muted-foreground))' },
  };
  const palette = tones[tone];
  return (
    <div className="rdcfe-flex rdcfe-justify-between rdcfe-items-center rdcfe-py-2 rdcfe-px-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
      <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">{label}</span>
      <span
        className="rdcfe-font-semibold rdcfe-px-2.5 rdcfe-py-0.5 rdcfe-rounded-full rdcfe-text-[12px]"
        style={{ background: palette.bg, color: palette.fg }}
      >
        {value}
      </span>
    </div>
  );
}

/** Card-style collapsible section — copied from MetaboxForm so visual
 *  weight matches between the two editors. Opens by default; the
 *  caret rotates on toggle. */
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
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
          <span className="rdcfe-font-semibold rdcfe-text-[15px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
            {title}
          </span>
          {badge && (
            <span className="rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[11px] rdcfe-font-semibold rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight
          className={`rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200 ${
            isOpen ? 'rdcfe-rotate-90' : ''
          }`}
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

/** 220px-label / fluid-input grid row — matches `FieldRow` in MetaboxForm. */
function FieldRow({
  label,
  hint,
  required,
  children,
  error,
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
          <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
            {hint}
          </span>
        )}
      </div>
      <div>
        {children}
        {error && (
          <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Object-kind picker. Three icon cards (post / term / user) styled
 * like the cardinality cards below; selecting a kind swaps the
 * matching `*_cpt` dropdown options. Identical visual treatment to
 * `RELATION_TYPES` so the Connection section reads as one cohesive
 * cluster.
 */
function KindPicker({
  value,
  onChange,
  name,
}: {
  value: RelationObjectKind;
  onChange: (next: RelationObjectKind) => void;
  name: string;
}) {
  return (
    <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-3 rdcfe-gap-2">
      {OBJECT_KIND_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.Icon;
        return (
          <label key={opt.value} className="rdcfe-cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="rdcfe-sr-only"
            />
            <div
              className={`rdcfe-h-full rdcfe-p-4 rdcfe-rounded-xl rdcfe-border-2 rdcfe-transition-all ${
                active
                  ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]'
                  : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
              }`}
            >
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-1">
                <Icon
                  className={`rdcfe-w-4 rdcfe-h-4 ${
                    active
                      ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
                      : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
                  }`}
                />
                <span
                  className={`rdcfe-text-[14px] rdcfe-font-semibold ${
                    active
                      ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
                      : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                  }`}
                >
                  {opt.label}
                </span>
              </div>
              <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
                {opt.description}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

// =====================================================================
// Meta-fields editor — repeater UI for the per-pair custom field
// schema. Authors add fields (key + label + type) which the meta box
// renders as inputs underneath every attached pair. Compact card
// layout matches `Section` cards used elsewhere in the form.
// =====================================================================

const META_FIELD_TYPE_OPTIONS: SelectOption[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select' },
];

const META_FIELD_TYPE_HINTS: Record<RelationMetaFieldType, string> = {
  text: 'Single-line input. Stores up to 255 characters.',
  textarea: 'Multi-line input for longer notes (no HTML).',
  number: 'Numeric input. Use for ordering weights, prices, scores.',
  date: 'YYYY-MM-DD date input. Stored as UTC.',
  checkbox: 'On/off flag — useful for "primary", "featured", etc.',
  select: 'Drop-down with author-defined options.',
};

function suggestMetaFieldKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .replace(/^[^a-z]/, 'f') || ''
  );
}

function MetaFieldsEditor({
  fields,
  onChange,
  fieldErrors,
}: {
  fields: RelationMetaField[];
  onChange: (next: RelationMetaField[]) => void;
  fieldErrors: Record<string, string>;
}) {
  const updateField = (i: number, patch: Partial<RelationMetaField>) => {
    const next = fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    onChange(next);
  };

  const removeField = (i: number) => {
    onChange(fields.filter((_, idx) => idx !== i));
  };

  const moveField = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return;
    const next = fields.slice();
    const [picked] = next.splice(from, 1);
    next.splice(to, 0, picked);
    onChange(next);
  };

  const addField = () => {
    const used = new Set(fields.map((f) => f.key));
    let candidate = 'field_' + (fields.length + 1);
    while (used.has(candidate)) candidate = candidate + '_x';
    onChange([
      ...fields,
      {
        key: candidate,
        label: '',
        type: 'text',
        required: false,
        default: '',
      },
    ]);
  };

  if (fields.length === 0) {
    return (
      <div className="rdcfe-rounded-lg rdcfe-border-2 rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-p-6 rdcfe-text-center">
        <Database className="rdcfe-w-7 rdcfe-h-7 rdcfe-mx-auto rdcfe-mb-2 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
        <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4">
          No custom fields yet. Add one to capture pair-specific data.
        </p>
        <button
          type="button"
          onClick={addField}
          className="rdcfe-btn rdcfe-btn-secondary rdcfe-text-[13px]"
        >
          <Plus className="rdcfe-w-4 rdcfe-h-4" />
          Add custom field
        </button>
      </div>
    );
  }

  return (
    <div className="rdcfe-space-y-3">
      {fields.map((field, i) => {
        const keyError = fieldErrors[`meta_fields.${i}.key`];
        const typeError = fieldErrors[`meta_fields.${i}.type`];
        const optionsError = fieldErrors[`meta_fields.${i}.options`];
        return (
          <div
            key={i}
            className="rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)] rdcfe-p-4"
          >
            <div className="rdcfe-flex rdcfe-items-start rdcfe-justify-between rdcfe-gap-3 rdcfe-mb-3">
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide">
                Field {i + 1}
              </div>
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1">
                <button
                  type="button"
                  onClick={() => moveField(i, i - 1)}
                  disabled={i === 0}
                  className="rdcfe-btn rdcfe-btn-ghost rdcfe-px-2 rdcfe-py-1 rdcfe-text-[12px] disabled:rdcfe-opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveField(i, i + 1)}
                  disabled={i === fields.length - 1}
                  className="rdcfe-btn rdcfe-btn-ghost rdcfe-px-2 rdcfe-py-1 rdcfe-text-[12px] disabled:rdcfe-opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="rdcfe-btn rdcfe-btn-ghost rdcfe-px-2 rdcfe-py-1 rdcfe-text-[hsl(var(--rdcfe-destructive))]"
                  aria-label="Remove field"
                >
                  <Trash2 className="rdcfe-w-3.5 rdcfe-h-3.5" />
                </button>
              </div>
            </div>

            <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-2 rdcfe-gap-3">
              <div>
                <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                  Label
                </label>
                <Input
                  type="text"
                  value={field.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    // Keep the key in sync with the label as long as the
                    // author hasn't hand-edited it. We treat the key as
                    // "still auto" when it equals the placeholder, the
                    // empty string, or the slug derived from the previous
                    // label — that last condition is the one that lets
                    // consecutive keystrokes ("n" → "na" → "name") keep
                    // re-deriving instead of getting stuck after the
                    // first character.
                    const prevAuto = suggestMetaFieldKey(field.label);
                    const isAuto =
                      field.key === '' ||
                      /^field_\d+$/.test(field.key) ||
                      (prevAuto !== '' && field.key === prevAuto);
                    const nextAuto = suggestMetaFieldKey(label);
                    updateField(i, {
                      label,
                      key: isAuto && nextAuto ? nextAuto : field.key,
                    });
                  }}
                  placeholder="Notes"
                  className="rdcfe-text-[14px]"
                />
              </div>
              <div>
                <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                  Key
                </label>
                <Input
                  type="text"
                  value={field.key}
                  onChange={(e) =>
                    updateField(i, {
                      key: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, ''),
                    })
                  }
                  placeholder="notes"
                  className={`rdcfe-text-[14px] rdcfe-font-mono ${
                    keyError ? 'rdcfe-border-[hsl(var(--rdcfe-destructive))]' : ''
                  }`}
                />
                {keyError && (
                  <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-mt-1">
                    {keyError}
                  </p>
                )}
              </div>
              <div>
                <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                  Type
                </label>
                <Select
                  options={META_FIELD_TYPE_OPTIONS}
                  value={field.type}
                  onChange={(e) => {
                    const value = e.target.value as RelationMetaFieldType;
                    updateField(i, {
                      type: value,
                      // Reset default + options when the type changes
                      // so coercion doesn't carry stale data.
                      default: '',
                      options:
                        value === 'select' ? field.options ?? [] : undefined,
                    });
                  }}
                />
                <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
                  {META_FIELD_TYPE_HINTS[field.type]}
                </p>
                {typeError && (
                  <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-mt-1">
                    {typeError}
                  </p>
                )}
              </div>
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-pt-6">
                <Toggle
                  checked={Boolean(field.required)}
                  onChange={(required) => updateField(i, { required })}
                />
                <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  Required
                </span>
              </div>
            </div>

            {field.type === 'select' && (
              <div className="rdcfe-mt-4 rdcfe-pt-4 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                <label className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Options
                </label>
                <SelectOptionsEditor
                  options={field.options ?? []}
                  onChange={(opts) => updateField(i, { options: opts })}
                />
                {optionsError && (
                  <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-mt-2">
                    {optionsError}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addField}
        className="rdcfe-btn rdcfe-btn-secondary rdcfe-w-full rdcfe-text-[13px]"
      >
        <Plus className="rdcfe-w-4 rdcfe-h-4" />
        Add another field
      </button>
    </div>
  );
}

function SelectOptionsEditor({
  options,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  onChange: (next: Array<{ value: string; label: string }>) => void;
}) {
  const update = (i: number, patch: Partial<{ value: string; label: string }>) => {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  };
  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...options,
      { value: 'option_' + (options.length + 1), label: '' },
    ]);

  return (
    <div className="rdcfe-space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
          <Input
            type="text"
            value={opt.label}
            placeholder="Label"
            onChange={(e) => update(i, { label: e.target.value })}
            className="rdcfe-flex-1 rdcfe-text-[14px]"
          />
          <Input
            type="text"
            value={opt.value}
            placeholder="value"
            onChange={(e) =>
              update(i, {
                value: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_-]/g, ''),
              })
            }
            className="rdcfe-flex-1 rdcfe-text-[14px] rdcfe-font-mono"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="rdcfe-btn rdcfe-btn-ghost rdcfe-px-2 rdcfe-py-1 rdcfe-text-[hsl(var(--rdcfe-destructive))]"
            aria-label="Remove option"
          >
            <Trash2 className="rdcfe-w-3.5 rdcfe-h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rdcfe-btn rdcfe-btn-ghost rdcfe-text-[12px]"
      >
        <Plus className="rdcfe-w-3.5 rdcfe-h-3.5" />
        Add option
      </button>
    </div>
  );
}

// =====================================================================
// Main page
// =====================================================================

export function RelationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotificationToast();
  const { isPro } = useProContext();

  const relationId = id ? Number.parseInt(id, 10) : null;
  const isEditing = !!relationId;

  const [formData, setFormData] = useState<RelationFormData>(() => createDefaultRelationFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Track whether the slug was hand-edited so that further changes to
  // the name/CPTs don't overwrite the user's deliberate slug. This is
  // the same pattern PostTypeForm uses for its slug field.
  const [slugTouched, setSlugTouched] = useState(false);
  // Top-level tab on the form body. Mirrors `PostTypeForm` so
  // authors get the same compact pill-bar shell across editors.
  type RelationTabId = 'connection' | 'labels' | 'limits' | 'hierarchy' | 'meta_fields';
  const [activeTab, setActiveTab] = useState<RelationTabId>('connection');

  const { data: rdcfeCpts } = usePostTypes();
  const { data: rdcfeTaxes } = useTaxonomies();
  const { data: existing, isLoading: isLoadingExisting } = useRelation(relationId);
  const createMutation = useCreateRelation();
  const updateMutation = useUpdateRelation();
  const deleteMutation = useDeleteRelation();

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isLoading = isLoadingExisting && isEditing;

  // Hydrate the form when an existing relation arrives. We treat the
  // slug as "touched" so auto-generation doesn't kick in on first
  // re-render and clobber the persisted value.
  useEffect(() => {
    if (existing?.form && isEditing) {
      setFormData(existing.form);
      setSlugTouched(true);
    }
  }, [existing?.form, isEditing]);

  // Option pools per kind. Posts merge core types + RDCFE CPTs +
  // the runtime `registry.postTypes` (covers third-party CPTs
  // registered outside RDCFE). Terms merge core taxonomies + RDCFE
  // taxonomies + runtime registry. Users use the localised
  // `registry.roles`. All three pipelines share the same dedupe
  // helper to avoid drift between Query Builder and Relations editor.
  const registry = useMemo(getRegistry, []);

  const postTypeOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const merged: SelectOption[] = [];
    const push = (opt: SelectOption) => {
      if (opt.value && !seen.has(opt.value)) {
        seen.add(opt.value);
        merged.push(opt);
      }
    };
    CORE_POST_TYPES.forEach(push);
    registry.postTypes.forEach(push);
    (rdcfeCpts ?? []).forEach((cpt) => {
      const data = (cpt.data ?? {}) as { slug?: string };
      const slug = data.slug || cpt.slug;
      if (slug) push({ value: slug, label: `${cpt.title} (${slug})` });
    });
    return merged;
  }, [rdcfeCpts, registry.postTypes]);

  const taxonomyOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const merged: SelectOption[] = [];
    const push = (opt: SelectOption) => {
      if (opt.value && !seen.has(opt.value)) {
        seen.add(opt.value);
        merged.push(opt);
      }
    };
    CORE_TAXONOMIES.forEach(push);
    registry.taxonomies.forEach(push);
    (rdcfeTaxes ?? []).forEach((tax) => {
      const data = (tax.data ?? {}) as { slug?: string };
      const slug = data.slug || tax.slug;
      if (slug) push({ value: slug, label: `${tax.title} (${slug})` });
    });
    return merged;
  }, [rdcfeTaxes, registry.taxonomies]);

  const roleOptions = useMemo<SelectOption[]>(() => registry.roles, [registry.roles]);

  /**
   * Pick the right option pool for a given object kind.
   *
   * `term` returns taxonomies, `user` returns roles, anything else
   * falls back to post types — the validator already enforces the
   * enum so an unknown kind in the JSON safely degrades to the
   * least-surprising picker.
   */
  const optionsForKind = (kind: RelationObjectKind | undefined): SelectOption[] => {
    switch (kind) {
      case 'term':
        return taxonomyOptions;
      case 'user':
        return roleOptions;
      default:
        return postTypeOptions;
    }
  };

  /** Look up the human label for a (kind, slug) pair across all pools. */
  const labelFor = (kind: RelationObjectKind | undefined, slug: string): string => {
    const pool = optionsForKind(kind);
    if (!slug) {
      // For users we render "Any role" instead of em-dash so the
      // summary reads naturally.
      return kind === 'user' ? 'Any role' : '—';
    }
    return pool.find((opt) => opt.value === slug)?.label.split(' (')[0] || slug;
  };

  // =================================================================
  // State patches
  // =================================================================

  const setData = (patch: Partial<RelationConfigData>) => {
    setFormData((prev) => ({ ...prev, data: { ...prev.data, ...patch } }));
  };

  const handleNameChange = (next: string) => {
    setFormData((prev) => {
      const nextData: RelationConfigData = { ...prev.data, name: next };
      // Only auto-generate slug if user hasn't manually edited it.
      if (!slugTouched) {
        nextData.slug = suggestRelationSlug(next, prev.data.from_cpt, prev.data.to_cpt);
      }
      return {
        ...prev,
        title: next,
        data: nextData,
      };
    });
    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
  };

  const handleSlugChange = (next: string) => {
    // Sanitise on the fly so the user sees the shape the validator
    // would accept (lowercase, underscores, no leading digits).
    const cleaned = next
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+/, '')
      .slice(0, 64);
    setSlugTouched(true);
    setData({ slug: cleaned });
    if (errors.slug) setErrors((prev) => ({ ...prev, slug: '' }));
  };

  const handleCptChange = (key: 'from_cpt' | 'to_cpt', value: string) => {
    setFormData((prev) => {
      const patch: RelationConfigData = { ...prev.data, [key]: value };
      // Re-derive slug only when nothing's been hand-edited yet AND
      // the user hasn't typed a name. Authors who haven't filled out
      // the name field get a sensible default like `property_to_agent`
      // for free.
      if (!slugTouched && !prev.data.name.trim()) {
        const from = key === 'from_cpt' ? value : prev.data.from_cpt;
        const to = key === 'to_cpt' ? value : prev.data.to_cpt;
        patch.slug = suggestRelationSlug('', from, to);
      }
      return { ...prev, data: patch };
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  /**
   * Switching the source kind (post → term/user) needs to reset the
   * matching `*_cpt` slug because a slug like `property` is
   * meaningless when the kind changes to `user`. We also auto-prefer
   * the first available option (the same gentle nudge the post type
   * picker gives) so authors aren't left with an empty dropdown.
   */
  const handleKindChange = (key: 'from_object' | 'to_object', value: RelationObjectKind) => {
    const cptKey = key === 'from_object' ? 'from_cpt' : 'to_cpt';
    setFormData((prev) => {
      const patch: RelationConfigData = { ...prev.data, [key]: value };

      // Reset the matching slug — the previous selection (e.g.
      // `property` post type) won't exist in the new kind's pool.
      // For users the empty string is a legitimate "any role" value
      // so we let it through without a default.
      patch[cptKey] = '';
      patch.from_max = prev.data.from_max ?? 0;

      // Surface a sensible first-option nudge for posts and terms.
      if (value !== 'user') {
        const pool = optionsForKind(value);
        if (pool.length > 0) {
          patch[cptKey] = pool[0].value;
        }
      }

      // Re-derive slug if no name and not hand-edited.
      if (!slugTouched && !prev.data.name.trim()) {
        const from = key === 'from_object' ? patch.from_cpt : prev.data.from_cpt;
        const to = key === 'to_object' ? patch.to_cpt : prev.data.to_cpt;
        patch.slug = suggestRelationSlug('', from, to);
      }

      return { ...prev, data: patch };
    });
    if (errors[cptKey]) setErrors((prev) => ({ ...prev, [cptKey]: '' }));
  };

  const handleTypeChange = (next: RelationType) => {
    setFormData((prev) => {
      const patch: RelationConfigData = { ...prev.data, type: next };
      // Mirror the server-side `RelationValidator::normalize()` so
      // the UI never drifts from what the validator will write to
      // disk. Cardinality coerces from_max/to_max:
      //   one-to-one  → from_max = to_max = 1
      //   one-to-many → from_max = 1 (the "one" side)
      if (next === 'one-to-one') {
        patch.from_max = 1;
        patch.to_max = 1;
      } else if (next === 'one-to-many') {
        patch.from_max = 1;
      }
      return { ...prev, data: patch };
    });
  };

  // =================================================================
  // Validation + submit (mirrors RelationValidator)
  // =================================================================

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};

    if (!formData.title.trim()) {
      next.title = 'Title is required';
    }
    if (!formData.data.name.trim()) {
      next.name = 'Display name is required';
    }
    if (!formData.data.slug.trim()) {
      next.slug = 'Slug is required';
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.data.slug)) {
      next.slug = 'Slug must start with a letter and contain only lowercase letters, numbers, and underscores';
    } else if (formData.data.slug.length > 64) {
      next.slug = 'Slug must be 64 characters or fewer';
    }
    // For users the empty string is the legitimate "any role" sentinel
    // — only posts and terms require a concrete slug.
    if (formData.data.from_object !== 'user' && !formData.data.from_cpt) {
      next.from_cpt = 'Source slug is required';
    }
    if (formData.data.to_object !== 'user' && !formData.data.to_cpt) {
      next.to_cpt = 'Target slug is required';
    }

    const fromMax = Number(formData.data.from_max ?? 0);
    const toMax = Number(formData.data.to_max ?? 0);
    if (Number.isNaN(fromMax) || fromMax < 0) {
      next.from_max = 'Must be 0 (unlimited) or a positive number';
    }
    if (Number.isNaN(toMax) || toMax < 0) {
      next.to_max = 'Must be 0 (unlimited) or a positive number';
    }

    setErrors(next);
    return next;
  };

  /**
   * Map the first error key we hit back to the tab that owns it so the
   * user lands on the right pane after a failed submit. Quick-Setup
   * fields (title/name/slug) live above the tabs so they don't need a
   * jump — the inline error already sits above the fold.
   */
  const tabForError = (keys: string[]): RelationTabId | null => {
    for (const k of keys) {
      if (k.startsWith('meta_fields')) return 'meta_fields';
      if (k === 'from_max' || k === 'to_max') return 'limits';
      if (
        k === 'inherit_from_parent' ||
        k === 'cascade_to_descendants' ||
        k === 'cascade_strategy'
      ) {
        return 'hierarchy';
      }
      if (k === 'from_cpt' || k === 'to_cpt') return 'connection';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      const messages = Object.values(validationErrors).filter(Boolean);
      const jump = tabForError(Object.keys(validationErrors));
      if (jump) setActiveTab(jump);
      showToast(
        'error',
        messages.length ? messages.join('. ') : 'Please fix validation errors.'
      );
      return;
    }

    try {
      // Server-side `RelationValidator::normalize()` will run again
      // — calling it client-side here is purely defensive so the
      // sidebar summary numbers match what gets stored.
      const payload: RelationFormData = {
        ...formData,
        data: {
          ...formData.data,
          from_max: Number(formData.data.from_max ?? 0) || 0,
          to_max: Number(formData.data.to_max ?? 0) || 0,
          bidirectional: !!formData.data.bidirectional,
          inherit_from_parent: !!formData.data.inherit_from_parent,
          cascade_to_descendants: !!formData.data.cascade_to_descendants,
          cascade_strategy: formData.data.cascade_to_descendants
            ? formData.data.cascade_strategy === 'replace'
              ? 'replace'
              : 'merge'
            : undefined,
        },
      };

      if (isEditing && relationId) {
        await updateMutation.mutateAsync({ id: relationId, data: payload });
        showToast('success', 'Relation updated.');
      } else {
        const result = await createMutation.mutateAsync(payload);
        showToast('success', 'Relation created.');
        if (result?.id) {
          window.setTimeout(() => navigate(`/relations/${result.id}`), 400);
        }
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save relation.');
    }
  };

  const handleDelete = async () => {
    if (!relationId) return;
    const pairCount = existing?.raw?.pair_count ?? 0;
    const purge =
      pairCount > 0 &&
      window.confirm(
        `This relation has ${pairCount} attached pair${pairCount === 1 ? '' : 's'}.\n\n` +
          'Click OK to delete the definition AND all attached pairs.\n' +
          'Click Cancel to delete just the definition.'
      );
    if (
      !window.confirm(
        purge
          ? 'Are you sure? This will permanently delete the definition and every attached pair.'
          : 'Delete this relation definition? This cannot be undone.'
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({ id: relationId, purge });
      showToast('success', purge ? 'Relation deleted with all pairs.' : 'Relation deleted.');
      navigate('/relations');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete relation.');
    }
  };

  // Free users don't see this page at all — gated like Query Builder.
  if (!isPro) {
    return (
      <ProModuleGate module="relations" moduleName="Relations">
        <div className="rdcfe-card rdcfe-p-6">
          <h2 className="rdcfe-text-[18px] rdcfe-font-bold">Relation Editor</h2>
          <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            Connect post types together with one-to-one, one-to-many, or many-to-many
            relationships, then attach items straight from the post edit screen.
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

  const data = formData.data;
  const fromLabelPlaceholder = data.to_cpt || data.to_object === 'user'
    ? `Assigned ${labelFor(data.to_object, data.to_cpt)}`
    : 'Assigned (target label)';
  const toLabelPlaceholder = data.from_cpt || data.from_object === 'user'
    ? `Listed ${labelFor(data.from_object, data.from_cpt)}`
    : 'Listed (source label)';

  // Per-side helper labels — match the kind picker's nuance so the
  // FieldRow hint text reads naturally regardless of selection.
  const sourceLabelByKind: Record<RelationObjectKind, string> = {
    post: 'Source post type',
    term: 'Source taxonomy',
    user: 'Source role',
  };
  const targetLabelByKind: Record<RelationObjectKind, string> = {
    post: 'Target post type',
    term: 'Target taxonomy',
    user: 'Target role',
  };

  const fromKindLabel = sourceLabelByKind[(data.from_object ?? 'post') as RelationObjectKind];
  const toKindLabel = targetLabelByKind[(data.to_object ?? 'post') as RelationObjectKind];

  const handleAIAccept = (suggestion: Record<string, unknown>) => {
    if (suggestion.name) handleNameChange(String(suggestion.name));
    if (suggestion.slug) {
      setFormData(prev => ({ ...prev, data: { ...prev.data, slug: String(suggestion.slug) } }));
      setSlugTouched(true);
    }
    if (suggestion.from_cpt) setData({ from_cpt: String(suggestion.from_cpt) });
    if (suggestion.to_cpt) setData({ to_cpt: String(suggestion.to_cpt) });
    if (suggestion.type) handleTypeChange(String(suggestion.type) as RelationType);
    if (suggestion.from_label) setData({ from_label: String(suggestion.from_label) });
    if (suggestion.to_label) setData({ to_label: String(suggestion.to_label) });
    if (typeof suggestion.bidirectional === 'boolean') setData({ bidirectional: suggestion.bidirectional });
    showToast('success', 'AI suggestions applied to form');
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Page Header */}
      <div className="rdcfe-mb-8">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-3">
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-4">
            <button
              type="button"
              onClick={() => navigate('/relations')}
              className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
            >
              <ArrowLeft className="rdcfe-w-5 rdcfe-h-5" />
            </button>
            <div>
              <h1 className="rdcfe-text-[24px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-tracking-tight">
                {isEditing ? 'Edit Relation' : 'Add New Relation'}
              </h1>
              <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
                {isEditing
                  ? 'Tune the connection — kind, type, labels, and limits.'
                  : 'Define how two objects connect (posts, terms, or users) — meta boxes appear on every matching edit screen.'}
              </p>
            </div>
          </div>
          <AIGenerateButton
            module="relation"
            context={isEditing && formData.data.slug ? { existing_slug: formData.data.slug } : undefined}
            onAccept={handleAIAccept}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-[1fr_320px] rdcfe-gap-6">
        {/* Main Content */}
        <div className="rdcfe-space-y-6">
          {/* Quick Setup */}
          <div className="rdcfe-card rdcfe-p-6">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-mb-5">
              <div className="rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-[#7367f0] rdcfe-to-[#675dd8] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                <Link2 className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
              </div>
              <div>
                <h2 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  Quick Setup
                </h2>
                <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Name your relation — we'll generate a slug from it.
                </p>
              </div>
            </div>

            <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-[1fr_240px] rdcfe-gap-5">
              <div>
                <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Display Name <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                </label>
                <Input
                  value={data.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Property to Agent"
                  error={!!errors.name || !!errors.title}
                  className="rdcfe-text-[15px]"
                />
                {(errors.name || errors.title) && (
                  <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                    {errors.name || errors.title}
                  </p>
                )}
              </div>
              <div>
                <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
                  <Hash className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                  Slug <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                </label>
                <Input
                  value={data.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="property_to_agent"
                  error={!!errors.slug}
                  className="rdcfe-text-[14px] rdcfe-font-mono"
                />
                {errors.slug && (
                  <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                    {errors.slug}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tab navigation — same compact pill bar PostTypeForm uses,
              keyed to a small enum so adding a tab later is a one-line
              change. */}
          <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-1 rdcfe-p-1.5 rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-xl rdcfe-w-fit">
            {[
              { id: 'connection' as const, label: 'Connection', icon: <Settings className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'labels' as const, label: 'Labels', icon: <TagIcon className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'limits' as const, label: 'Limits', icon: <Hash className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'hierarchy' as const, label: 'Hierarchy', icon: <GitBranch className="rdcfe-w-4 rdcfe-h-4" /> },
              { id: 'meta_fields' as const, label: 'Pair Custom Fields', icon: <Database className="rdcfe-w-4 rdcfe-h-4" /> },
            ].map((tab) => {
              const hasError =
                (tab.id === 'connection' && (!!errors.from_cpt || !!errors.to_cpt)) ||
                (tab.id === 'limits' && (!!errors.from_max || !!errors.to_max)) ||
                (tab.id === 'hierarchy' &&
                  (!!errors.inherit_from_parent ||
                    !!errors.cascade_to_descendants ||
                    !!errors.cascade_strategy)) ||
                (tab.id === 'meta_fields' &&
                  Object.keys(errors).some((k) => k.startsWith('meta_fields')));
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-5 rdcfe-py-2.5 rdcfe-rounded-lg rdcfe-text-[14px] rdcfe-font-medium rdcfe-transition-all rdcfe-duration-200 ${
                    activeTab === tab.id
                      ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                      : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {hasError && (
                    <span
                      className="rdcfe-w-1.5 rdcfe-h-1.5 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-destructive))]"
                      aria-label="This tab has errors"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Connection — the heart of the form */}
          {activeTab === 'connection' && (
          <Section
            title="Connection"
            icon={<Settings className="rdcfe-w-5 rdcfe-h-5" />}
            defaultOpen={true}
          >
            <FieldRow
              label="Source kind"
              hint="The object type that owns the relation — posts, terms, or users."
              required
            >
              <KindPicker
                value={(data.from_object ?? 'post') as RelationObjectKind}
                onChange={(next) => handleKindChange('from_object', next)}
                name="from_object"
              />
            </FieldRow>

            <FieldRow
              label={fromKindLabel}
              hint={
                data.from_object === 'user'
                  ? 'Restrict the relation to a single role, or pick "Any role" to cover every user.'
                  : "The 'owner' side. Edit screens for the matching object will show the meta box."
              }
              required={data.from_object !== 'user'}
              error={errors.from_cpt}
            >
              <Select
                options={optionsForKind(data.from_object)}
                value={data.from_cpt}
                onChange={(e) => handleCptChange('from_cpt', e.target.value)}
                placeholder={
                  data.from_object === 'term'
                    ? 'Select source taxonomy...'
                    : data.from_object === 'user'
                    ? 'Any role'
                    : 'Select source post type...'
                }
                error={!!errors.from_cpt}
              />
            </FieldRow>

            <FieldRow
              label="Target kind"
              hint="The object type on the other side of the relation."
              required
            >
              <KindPicker
                value={(data.to_object ?? 'post') as RelationObjectKind}
                onChange={(next) => handleKindChange('to_object', next)}
                name="to_object"
              />
            </FieldRow>

            <FieldRow
              label={toKindLabel}
              hint={
                data.to_object === 'user'
                  ? 'Restrict the relation to a single role, or pick "Any role" to cover every user.'
                  : "The 'target' side. Authors will pick from this list when attaching."
              }
              required={data.to_object !== 'user'}
              error={errors.to_cpt}
            >
              <Select
                options={optionsForKind(data.to_object)}
                value={data.to_cpt}
                onChange={(e) => handleCptChange('to_cpt', e.target.value)}
                placeholder={
                  data.to_object === 'term'
                    ? 'Select target taxonomy...'
                    : data.to_object === 'user'
                    ? 'Any role'
                    : 'Select target post type...'
                }
                error={!!errors.to_cpt}
              />
            </FieldRow>

            <FieldRow
              label="Cardinality"
              hint="How many items can be attached on each side."
              required
            >
              <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-3 rdcfe-gap-2">
                {RELATION_TYPES.map((opt) => {
                  const active = data.type === opt.value;
                  return (
                    <label key={opt.value} className="rdcfe-cursor-pointer">
                      <input
                        type="radio"
                        name="relation_type"
                        value={opt.value}
                        checked={active}
                        onChange={() => handleTypeChange(opt.value)}
                        className="rdcfe-sr-only"
                      />
                      <div
                        className={`rdcfe-h-full rdcfe-p-4 rdcfe-rounded-xl rdcfe-border-2 rdcfe-transition-all ${
                          active
                            ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]'
                            : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                        }`}
                      >
                        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-1">
                          <span
                            className={`rdcfe-text-[14px] rdcfe-font-semibold ${
                              active
                                ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
                                : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span
                            className={`rdcfe-text-[12px] rdcfe-font-mono rdcfe-px-2 rdcfe-py-0.5 rdcfe-rounded-md ${
                              active
                                ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]'
                                : 'rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
                            }`}
                          >
                            {opt.short}
                          </span>
                        </div>
                        <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </FieldRow>

            <FieldRow
              label="Bidirectional"
              hint="When on, the meta box also appears on the target side so authors can attach from either direction."
            >
              <Toggle
                checked={!!data.bidirectional}
                onChange={(next) => setData({ bidirectional: next })}
                label={data.bidirectional ? 'Show on both edit screens' : 'Show only on source side'}
                description={
                  data.bidirectional
                    ? 'Pairs stored once, surfaced from either edit screen.'
                    : 'Authors must edit the source CPT to manage this connection.'
                }
              />
            </FieldRow>
          </Section>
          )}

          {/* Labels — small, optional, but powers the meta-box headings */}
          {activeTab === 'labels' && (
          <Section
            title="Labels"
            icon={<TagIcon className="rdcfe-w-5 rdcfe-h-5" />}
            defaultOpen={true}
          >
            <FieldRow
              label="Source-side label"
              hint={`Shown on every "${labelFor(data.from_object, data.from_cpt)}" edit screen as the meta-box title.`}
            >
              <Input
                value={data.from_label ?? ''}
                onChange={(e) => setData({ from_label: e.target.value })}
                placeholder={fromLabelPlaceholder}
                className="rdcfe-text-[14px]"
              />
            </FieldRow>

            <FieldRow
              label="Target-side label"
              hint={
                data.bidirectional
                  ? `Shown on every "${labelFor(data.to_object, data.to_cpt)}" edit screen.`
                  : 'Only used when Bidirectional is on.'
              }
            >
              <Input
                value={data.to_label ?? ''}
                onChange={(e) => setData({ to_label: e.target.value })}
                placeholder={toLabelPlaceholder}
                disabled={!data.bidirectional}
                className="rdcfe-text-[14px]"
              />
            </FieldRow>
          </Section>
          )}

          {/* Limits — server enforces, but we let authors tighten further */}
          {activeTab === 'limits' && (
          <Section
            title="Limits"
            icon={<Hash className="rdcfe-w-5 rdcfe-h-5" />}
            defaultOpen={true}
            badge="Optional"
          >
            <FieldRow
              label="Max from source"
              hint="Maximum items each source post can attach. 0 = unlimited."
              error={errors.from_max}
            >
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={data.from_max ?? 0}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setData({ from_max: Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0 });
                  }}
                  disabled={data.type !== 'many-to-many'}
                  className="rdcfe-w-24"
                />
                {data.type !== 'many-to-many' && (
                  <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    Locked to <strong>1</strong> by the {data.type} cardinality.
                  </span>
                )}
              </div>
            </FieldRow>

            <FieldRow
              label="Max from target"
              hint="Maximum items each target post can be attached to. 0 = unlimited."
              error={errors.to_max}
            >
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={data.to_max ?? 0}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setData({ to_max: Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0 });
                  }}
                  disabled={data.type === 'one-to-one'}
                  className="rdcfe-w-24"
                />
                {data.type === 'one-to-one' && (
                  <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    Locked to <strong>1</strong> by the one-to-one cardinality.
                  </span>
                )}
              </div>
            </FieldRow>
          </Section>
          )}

          {/* Hierarchy — inheritance + cascade flags. Only meaningful
              for hierarchical post types or taxonomies; user-to-user
              definitions reject both flags at validation time. */}
          {activeTab === 'hierarchy' && (
          <Section
            title="Hierarchy &amp; Inheritance"
            icon={<GitBranch className="rdcfe-w-5 rdcfe-h-5" />}
            defaultOpen={true}
            badge="Optional"
          >
            <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4">
              Propagate pairs along the post-parent or term-parent
              chain. Best paired with hierarchical post types or
              taxonomies — user-to-user relations don&apos;t qualify
              because users have no hierarchy in WordPress.
            </p>

            <FieldRow
              label="Inherit from parent"
              hint="When on, the picker also surfaces pairs attached to the anchor's ancestors. Inherited rows render as locked chips."
              error={errors.inherit_from_parent}
            >
              <Toggle
                checked={!!data.inherit_from_parent}
                onChange={(next) => setData({ inherit_from_parent: next })}
                label={data.inherit_from_parent ? 'Reads include ancestors' : 'Reads only show direct pairs'}
                description={
                  data.inherit_from_parent
                    ? 'Authors see ancestor pairs too. Walk depth is capped at 5 by default — filter `rdcfe_relation_inheritance_max_depth` to override.'
                    : 'Direct pairs only. Switch on once both sides represent a hierarchical kind.'
                }
              />
            </FieldRow>

            <FieldRow
              label="Cascade to descendants"
              hint="When on, attaching a pair on a parent post / term auto-attaches the same pair on every descendant."
              error={errors.cascade_to_descendants}
            >
              <Toggle
                checked={!!data.cascade_to_descendants}
                onChange={(next) => setData({ cascade_to_descendants: next })}
                label={data.cascade_to_descendants ? 'Writes propagate downward' : 'Writes stay on the source row'}
                description={
                  data.cascade_to_descendants
                    ? 'Each attach / detach mirrors onto the BFS-walked descendants of the canonical parent.'
                    : 'Descendants do not inherit the write — useful when you want manual control.'
                }
              />
            </FieldRow>

            {data.cascade_to_descendants && (
              <FieldRow
                label="Cascade strategy"
                hint="How aggressive a cascading detach is. `Merge` only removes descendants currently attached; `Replace` removes them regardless of overrides."
                error={errors.cascade_strategy}
              >
                <Select
                  options={[
                    { value: 'merge', label: 'Merge — keep manual overrides' },
                    { value: 'replace', label: 'Replace — descendants always mirror parent' },
                  ]}
                  value={(data.cascade_strategy ?? 'merge')}
                  onChange={(e) =>
                    setData({
                      cascade_strategy: e.target.value === 'replace' ? 'replace' : 'merge',
                    })
                  }
                  className="rdcfe-w-72"
                />
              </FieldRow>
            )}

            <div className="rdcfe-mt-4 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)] rdcfe-px-4 rdcfe-py-3 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">Heads-up:</strong> the
              server validates these against the underlying post-type
              and taxonomy registration — neither flag has any
              effect when both sides are non-hierarchical, and both
              hard-reject for user-to-user relations.
            </div>
          </Section>
          )}

          {/* Per-pair meta fields — extra info attached to each connection */}
          {activeTab === 'meta_fields' && (
          <Section
            title="Pair Custom Fields"
            icon={<Database className="rdcfe-w-5 rdcfe-h-5" />}
            defaultOpen={true}
            badge="Optional"
          >
            <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4">
              Attach extra info to each connection — notes, an effective
              date, a status flag, or anything else that varies per pair
              rather than per object. Editors will see one input per
              field underneath every attached item in the meta box.
            </p>
            <MetaFieldsEditor
              fields={data.meta_fields ?? []}
              onChange={(next) => setData({ meta_fields: next })}
              fieldErrors={errors}
            />
          </Section>
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
              {isEditing ? 'Update Relation' : 'Create Relation'}
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

            {/* Connection preview chips — same visual treatment as the
                list page so the editor and the table agree. */}
            <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
              <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-3">
                Connection
              </div>
              <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2 rdcfe-py-3 rdcfe-px-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]">
                <span
                  className="rdcfe-px-2 rdcfe-py-1 rdcfe-rounded-md rdcfe-bg-white rdcfe-font-mono rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
                  title={`${data.from_object ?? 'post'}: ${data.from_cpt || '(any)'}`}
                >
                  {data.from_cpt || (data.from_object === 'user' ? 'any' : '—')}
                </span>
                {data.bidirectional ? (
                  <ArrowLeftRight className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                ) : (
                  <ArrowRight className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                )}
                <span
                  className="rdcfe-px-2 rdcfe-py-1 rdcfe-rounded-md rdcfe-bg-white rdcfe-font-mono rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]"
                  title={`${data.to_object ?? 'post'}: ${data.to_cpt || '(any)'}`}
                >
                  {data.to_cpt || (data.to_object === 'user' ? 'any' : '—')}
                </span>
              </div>
            </div>

            <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
              <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-3">
                Summary
              </div>
              <div className="rdcfe-space-y-2">
                <SummaryRow
                  label="Type"
                  value={
                    RELATION_TYPES.find((t) => t.value === data.type)?.short ?? 'N ↔ N'
                  }
                  tone="primary"
                />
                <SummaryRow
                  label="Bidirectional"
                  value={data.bidirectional ? 'Yes' : 'No'}
                  tone={data.bidirectional ? 'success' : 'default'}
                />
                <SummaryRow
                  label="Max from"
                  value={(data.from_max ?? 0) === 0 ? '∞' : (data.from_max ?? 0)}
                  tone="orange"
                />
                <SummaryRow
                  label="Max to"
                  value={(data.to_max ?? 0) === 0 ? '∞' : (data.to_max ?? 0)}
                  tone="purple"
                />
                {data.inherit_from_parent && (
                  <SummaryRow
                    label="Inherit"
                    value="Ancestors"
                    tone="success"
                  />
                )}
                {data.cascade_to_descendants && (
                  <SummaryRow
                    label="Cascade"
                    value={data.cascade_strategy === 'replace' ? 'Replace' : 'Merge'}
                    tone="orange"
                  />
                )}
                {isEditing && existing?.raw?.pair_count !== undefined && (
                  <SummaryRow
                    label="Live pairs"
                    value={existing.raw.pair_count.toLocaleString()}
                    tone="default"
                  />
                )}
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
                  Delete Relation
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
                  Once active, a meta box appears on every{' '}
                  <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    {labelFor(data.from_object, data.from_cpt)}
                  </strong>{' '}
                  edit screen.
                </span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">2</span>
                <span>
                  Use the{' '}
                  <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    Query Builder
                  </strong>{' '}
                  to filter posts by relation — pick the slug under "Related to…".
                </span>
              </li>
              <li className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-bold rdcfe-flex-shrink-0">3</span>
                <span>
                  Changing the slug after pairs exist will{' '}
                  <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">orphan</strong>{' '}
                  them — duplicate instead.
                </span>
              </li>
            </ul>
          </div>

          <div className="rdcfe-mt-4 rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
            <Info className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
            <span>
              Edits autosave to the form — hit{' '}
              <strong className="rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                {isEditing ? 'Update Relation' : 'Create Relation'}
              </strong>{' '}
              to persist.
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
