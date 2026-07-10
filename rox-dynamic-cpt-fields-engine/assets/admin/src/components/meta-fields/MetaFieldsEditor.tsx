import React, { useState } from 'react';
import {
  Plus,
  GripVertical,
  Copy,
  Trash2,
  ChevronDown,
  Type,
  FileText,
  Hash,
  AtSign,
  Link as LinkIcon,
  List,
  ToggleLeft,
  Image,
  File,
  Layers,
  GitBranch,
  X,
  ChevronRight,
  Calendar,
  Clock,
  CalendarClock,
  Palette,
  AlignLeft,
  FolderOpen,
  Repeat,
  GalleryHorizontal,
  Network,
  Tags,
  Users,
  Code2,
  Lock,
} from 'lucide-react';
import { MetaField, ConditionalRule, usePostTypes } from '../../hooks/usePostTypes';
import { useTaxonomies } from '../../hooks/useTaxonomies';
import { Input } from '../ui/input';
import { Select, SelectOption } from '../ui/select';
import { ProSettingWrapper } from '../ui/pro-feature-gate';
import { ProBadge } from '../ui/pro-badge';
import { UpgradeModal } from '../ui/upgrade-modal';
import { useProContext } from '@/contexts/ProContext';

// Field types for Meta Fields
const fieldTypes = [
  // Basic Fields (Free)
  { value: 'text', label: 'Text', icon: Type, isPro: false },
  { value: 'textarea', label: 'Textarea', icon: FileText, isPro: false },
  { value: 'number', label: 'Number', icon: Hash, isPro: false },
  { value: 'email', label: 'Email', icon: AtSign, isPro: false },
  { value: 'url', label: 'URL', icon: LinkIcon, isPro: false },
  { value: 'date', label: 'Date', icon: Calendar, isPro: false },
  // Choice Fields (Free)
  { value: 'select', label: 'Select', icon: List, isPro: false },
  { value: 'checkbox', label: 'Checkbox', icon: ToggleLeft, isPro: false },
  { value: 'radio', label: 'Radio', icon: ToggleLeft, isPro: false },
  { value: 'toggle', label: 'Toggle (Yes/No)', icon: ToggleLeft, isPro: false },
  // Media Fields (Free)
  { value: 'image', label: 'Image', icon: Image, isPro: false },
  { value: 'file', label: 'File', icon: File, isPro: false },
  // Content Fields (Free)
  { value: 'wysiwyg', label: 'WYSIWYG Editor', icon: AlignLeft, isPro: false },
  { value: 'time', label: 'Time', icon: Clock, isPro: false },
  { value: 'datetime', label: 'Date & Time', icon: CalendarClock, isPro: false },
  { value: 'color', label: 'Color Picker', icon: Palette, isPro: false },
  // Pro Fields - Layout
  { value: 'group', label: 'Group', icon: FolderOpen, isPro: true },
  { value: 'repeater', label: 'Repeater', icon: Repeat, isPro: true },
  // Pro Fields - Media
  { value: 'gallery', label: 'Gallery', icon: GalleryHorizontal, isPro: true },
  // Pro Fields - Relational
  { value: 'relationship', label: 'Relationship', icon: Network, isPro: true },
  { value: 'taxonomy', label: 'Taxonomy Picker', icon: Tags, isPro: true },
  { value: 'user', label: 'User Picker', icon: Users, isPro: true },
  // Pro Fields - Layout Element (display-only block)
  { value: 'html', label: 'HTML', icon: Code2, isPro: true },
];

/**
 * Types that use structured inputs or booleans — simple text default is not used in the builder.
 */
const META_FIELD_TYPES_WITHOUT_DEFAULT_INPUT: string[] = [
  'email',
  'url',
  'date',
  'toggle',
  'wysiwyg',
  'time',
  'datetime',
  'color',
];

// Object types (Field, Tab, Accordion, Endpoint)
const objectTypeOptions: SelectOption[] = [
  { value: 'field', label: 'Field' },
  { value: 'tab', label: 'Tab' },
  { value: 'accordion', label: 'Accordion' },
  { value: 'endpoint', label: 'Endpoint' },
];

// Field width options
const fieldWidthOptions: SelectOption[] = [
  { value: '100%', label: '100%' },
  { value: '75%', label: '75%' },
  { value: '66.6%', label: '66.6%' },
  { value: '50%', label: '50%' },
  { value: '33.3%', label: '33.3%' },
  { value: '25%', label: '25%' },
];

// Tab Layout options
const tabLayoutOptions: SelectOption[] = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
];

// Options source for Select/Checkbox/Radio fields
const optionsSourceOptions: SelectOption[] = [
  { value: 'manual', label: 'Manual Input' },
  { value: 'query_builder', label: 'Query Builder' },
];

// Conditional logic operators
const conditionalOperators: SelectOption[] = [
  { value: 'equal', label: 'Is equal to' },
  { value: 'not_equal', label: 'Is not equal to' },
  { value: 'empty', label: 'Is empty' },
  { value: 'not_empty', label: 'Is not empty' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'greater', label: 'Greater than' },
  { value: 'less', label: 'Less than' },
];

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

// Field Type Selector Component with Pro badges
function FieldTypeSelector({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (value: string) => void;
}) {
  const { isPro, isProFeature } = useProContext();
  const [showDropdown, setShowDropdown] = useState(false);
  // Upgrade modal state. Free users clicking a locked Pro field opens the
  // shared `UpgradeModal` instead of switching the field type — same modal
  // we use for Quick Edit, Relations, etc. (see `pro-feature-gate.tsx`).
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureLabel, setUpgradeFeatureLabel] = useState<string>('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedType = fieldTypes.find(ft => ft.value === value) || fieldTypes[0];
  const TypeIcon = selectedType.icon;

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (fieldType: typeof fieldTypes[0]) => {
    // Pro field type clicked by a Free user — hard-block the value change
    // and show the upgrade modal instead. Closing the dropdown here keeps
    // the modal as the only visible focus.
    if (fieldType.isPro && !isPro && isProFeature(fieldType.value, 'field_type')) {
      setUpgradeFeatureLabel(fieldType.label);
      setShowUpgradeModal(true);
      setShowDropdown(false);
      return;
    }
    onChange(fieldType.value);
    setShowDropdown(false);
  };

  // Group field types by category
  const freeBasicTypes = fieldTypes.filter(ft => !ft.isPro && ['text', 'textarea', 'number', 'email', 'url', 'date'].includes(ft.value));
  const freeChoiceTypes = fieldTypes.filter(ft => !ft.isPro && ['select', 'checkbox', 'radio', 'toggle'].includes(ft.value));
  const freeMediaTypes = fieldTypes.filter(ft => !ft.isPro && ['image', 'file'].includes(ft.value));
  const freeContentTypes = fieldTypes.filter(ft => !ft.isPro && ['wysiwyg', 'time', 'datetime', 'color'].includes(ft.value));
  const proLayoutTypes = fieldTypes.filter(ft => ft.isPro && ['group', 'repeater'].includes(ft.value));
  const proMediaTypes = fieldTypes.filter(ft => ft.isPro && ['gallery'].includes(ft.value));
  const proRelationalTypes = fieldTypes.filter(ft => ft.isPro && ['relationship', 'taxonomy', 'user'].includes(ft.value));
  const proLayoutElementTypes = fieldTypes.filter(ft => ft.isPro && ['html'].includes(ft.value));

  return (
    <div className="rdcfe-relative" ref={dropdownRef}>
      <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
        Field Type
      </label>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="rdcfe-h-11 rdcfe-w-full rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-4 rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-all hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.5)] focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)] rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-text-left"
      >
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
          <TypeIcon className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
          <span>{selectedType.label}</span>
          {selectedType.isPro && <ProBadge size="sm" />}
        </div>
        <ChevronDown className={`rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform ${showDropdown ? 'rdcfe-rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="rdcfe-absolute rdcfe-z-50 rdcfe-w-full rdcfe-mt-1 rdcfe-bg-white rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-shadow-lg rdcfe-py-2 rdcfe-max-h-[400px] rdcfe-overflow-y-auto">
          {/* Free Basic Fields */}
          <div className="rdcfe-px-3 rdcfe-py-1.5">
            <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wider">Basic</div>
          </div>
          {freeBasicTypes.map(ft => {
            const Icon = ft.icon;
            return (
              <button
                key={ft.value}
                type="button"
                onClick={() => handleSelect(ft)}
                className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-text-left hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-transition-colors ${value === ft.value ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'}`}
              >
                <Icon className="rdcfe-w-4 rdcfe-h-4" />
                <span>{ft.label}</span>
              </button>
            );
          })}

          {/* Free Choice Fields */}
          <div className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-mt-1 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
            <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wider">Choice</div>
          </div>
          {freeChoiceTypes.map(ft => {
            const Icon = ft.icon;
            return (
              <button
                key={ft.value}
                type="button"
                onClick={() => handleSelect(ft)}
                className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-text-left hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-transition-colors ${value === ft.value ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'}`}
              >
                <Icon className="rdcfe-w-4 rdcfe-h-4" />
                <span>{ft.label}</span>
              </button>
            );
          })}

          {/* Free Media Fields */}
          <div className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-mt-1 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
            <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wider">Media</div>
          </div>
          {freeMediaTypes.map(ft => {
            const Icon = ft.icon;
            return (
              <button
                key={ft.value}
                type="button"
                onClick={() => handleSelect(ft)}
                className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-text-left hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-transition-colors ${value === ft.value ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'}`}
              >
                <Icon className="rdcfe-w-4 rdcfe-h-4" />
                <span>{ft.label}</span>
              </button>
            );
          })}

          {/* Free Content Fields */}
          <div className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-mt-1 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
            <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wider">Content</div>
          </div>
          {freeContentTypes.map(ft => {
            const Icon = ft.icon;
            return (
              <button
                key={ft.value}
                type="button"
                onClick={() => handleSelect(ft)}
                className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-text-left hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-transition-colors ${value === ft.value ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'}`}
              >
                <Icon className="rdcfe-w-4 rdcfe-h-4" />
                <span>{ft.label}</span>
              </button>
            );
          })}

          {/* Pro Layout Fields. Category title kept clean — each row already
              carries its own ProBadge, so doubling up looks noisy. */}
          <div className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-mt-1 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
            <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wider">Layout</div>
          </div>
          {proLayoutTypes.map(ft => {
            const Icon = ft.icon;
            const isProLocked = !isPro && isProFeature(ft.value, 'field_type');
            return (
              <button
                key={ft.value}
                type="button"
                onClick={() => handleSelect(ft)}
                title={isProLocked ? 'Available in Pro — click to upgrade' : undefined}
                aria-disabled={isProLocked}
                className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-text-left rdcfe-transition-colors ${
                  isProLocked
                    ? 'rdcfe-cursor-not-allowed rdcfe-opacity-60 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]'
                    : `hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] ${value === ft.value ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'}`
                }`}
              >
                <Icon className="rdcfe-w-4 rdcfe-h-4" />
                <span>{ft.label}</span>
                {isProLocked && (
                  <span className="rdcfe-ml-auto rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
                    <Lock className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                    <ProBadge size="sm" />
                  </span>
                )}
              </button>
            );
          })}

          {/* Pro Media Fields */}
          <div className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-mt-1 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
            <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wider">Media</div>
          </div>
          {proMediaTypes.map(ft => {
            const Icon = ft.icon;
            const isProLocked = !isPro && isProFeature(ft.value, 'field_type');
            return (
              <button
                key={ft.value}
                type="button"
                onClick={() => handleSelect(ft)}
                title={isProLocked ? 'Available in Pro — click to upgrade' : undefined}
                aria-disabled={isProLocked}
                className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-text-left rdcfe-transition-colors ${
                  isProLocked
                    ? 'rdcfe-cursor-not-allowed rdcfe-opacity-60 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]'
                    : `hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] ${value === ft.value ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'}`
                }`}
              >
                <Icon className="rdcfe-w-4 rdcfe-h-4" />
                <span>{ft.label}</span>
                {isProLocked && (
                  <span className="rdcfe-ml-auto rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
                    <Lock className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                    <ProBadge size="sm" />
                  </span>
                )}
              </button>
            );
          })}

          {/* Pro Relational Fields */}
          <div className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-mt-1 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
            <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wider">Relational</div>
          </div>
          {proRelationalTypes.map(ft => {
            const Icon = ft.icon;
            const isProLocked = !isPro && isProFeature(ft.value, 'field_type');
            return (
              <button
                key={ft.value}
                type="button"
                onClick={() => handleSelect(ft)}
                title={isProLocked ? 'Available in Pro — click to upgrade' : undefined}
                aria-disabled={isProLocked}
                className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-text-left rdcfe-transition-colors ${
                  isProLocked
                    ? 'rdcfe-cursor-not-allowed rdcfe-opacity-60 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]'
                    : `hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] ${value === ft.value ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'}`
                }`}
              >
                <Icon className="rdcfe-w-4 rdcfe-h-4" />
                <span>{ft.label}</span>
                {isProLocked && (
                  <span className="rdcfe-ml-auto rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
                    <Lock className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                    <ProBadge size="sm" />
                  </span>
                )}
              </button>
            );
          })}

          {/* Pro Layout Elements (HTML block) */}
          <div className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-mt-1 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
            <div className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wider">Layout Elements</div>
          </div>
          {proLayoutElementTypes.map(ft => {
            const Icon = ft.icon;
            const isProLocked = !isPro && isProFeature(ft.value, 'field_type');
            return (
              <button
                key={ft.value}
                type="button"
                onClick={() => handleSelect(ft)}
                title={isProLocked ? 'Available in Pro — click to upgrade' : undefined}
                aria-disabled={isProLocked}
                className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-text-left rdcfe-transition-colors ${
                  isProLocked
                    ? 'rdcfe-cursor-not-allowed rdcfe-opacity-60 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]'
                    : `hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] ${value === ft.value ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'}`
                }`}
              >
                <Icon className="rdcfe-w-4 rdcfe-h-4" />
                <span>{ft.label}</span>
                {isProLocked && (
                  <span className="rdcfe-ml-auto rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
                    <Lock className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                    <ProBadge size="sm" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature={upgradeFeatureLabel}
        featureCategory="field_type"
      />
    </div>
  );
}

// Generic Multi-Select Dropdown Component (used by Post Type, Taxonomy, Role selectors)
function MultiSelectDropdown({
  label,
  description,
  selectedValues,
  availableOptions,
  onChange,
  placeholder = 'Select...',
  allowEmpty = false,
  defaultValue,
  singleSelect = false,
  showSlug = true,
}: {
  label: string;
  description?: string;
  selectedValues: string[];
  availableOptions: { slug: string; label: string }[];
  onChange: (newValues: string[]) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  defaultValue?: string;
  singleSelect?: boolean;
  showSlug?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleValue = (slug: string) => {
    if (singleSelect) {
      onChange([slug]);
      setIsOpen(false);
      return;
    }
    let newValues: string[];
    if (selectedValues.includes(slug)) {
      newValues = selectedValues.filter(s => s !== slug);
      if (!allowEmpty && newValues.length === 0) {
        newValues = defaultValue ? [defaultValue] : [slug]; // Can't remove last one
      }
    } else {
      newValues = [...selectedValues, slug];
    }
    onChange(newValues);
  };

  const removeValue = (slug: string) => {
    const newValues = selectedValues.filter(s => s !== slug);
    if (!allowEmpty && newValues.length === 0) {
      onChange(defaultValue ? [defaultValue] : [slug]);
    } else {
      onChange(newValues);
    }
  };

  return (
    <div>
      <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
        {label}
      </label>
      {description && (
        <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-block rdcfe-mb-2">
          {description}
        </span>
      )}
      <div className="rdcfe-relative" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rdcfe-w-full rdcfe-min-h-[42px] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-3 rdcfe-py-2 rdcfe-text-left rdcfe-transition-all hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.5)] focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)] rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-flex-wrap"
        >
          {selectedValues.length > 0 ? (
            <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-1.5 rdcfe-flex-1">
              {selectedValues.map(slug => {
                const opt = availableOptions.find(o => o.slug === slug);
                return (
                  <span
                    key={slug}
                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-px-2 rdcfe-py-0.5 rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-text-[12px] rdcfe-font-medium rdcfe-rounded-md"
                  >
                    {opt?.label || slug}
                    {!singleSelect && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeValue(slug);
                        }}
                        className="rdcfe-text-[hsl(var(--rdcfe-primary)/0.5)] hover:rdcfe-text-[hsl(var(--rdcfe-primary))]"
                      >
                        <X className="rdcfe-w-3 rdcfe-h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">{placeholder}</span>
          )}
          <ChevronDown className={`rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-ml-auto rdcfe-flex-shrink-0 rdcfe-transition-transform ${isOpen ? 'rdcfe-rotate-180' : ''}`} />
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="rdcfe-absolute rdcfe-z-50 rdcfe-w-full rdcfe-mt-1 rdcfe-bg-white rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-shadow-lg rdcfe-py-1 rdcfe-max-h-[220px] rdcfe-overflow-y-auto">
            {availableOptions.map(opt => {
              const isChecked = selectedValues.includes(opt.slug);
              return (
                <button
                  key={opt.slug}
                  type="button"
                  onClick={() => toggleValue(opt.slug)}
                  className={`rdcfe-w-full rdcfe-px-3 rdcfe-py-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-text-[13px] rdcfe-text-left rdcfe-transition-colors hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] ${isChecked ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.08)]' : ''}`}
                >
                  <div className={`rdcfe-w-4 rdcfe-h-4 rdcfe-rounded ${singleSelect ? 'rdcfe-rounded-full' : ''} rdcfe-border rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0 rdcfe-transition-colors ${isChecked ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-border-[hsl(var(--rdcfe-primary))]' : 'rdcfe-border-[hsl(var(--rdcfe-border))]'}`}>
                    {isChecked && (
                      <svg className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="rdcfe-flex-1 rdcfe-text-[hsl(var(--rdcfe-foreground))]">{opt.label}</span>
                  {showSlug && (
                    <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">{opt.slug}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Props interface
interface MetaFieldsEditorProps {
  metaFields: MetaField[];
  setMetaFields: React.Dispatch<React.SetStateAction<MetaField[]>>;
  emptyStateText?: string;
  showFieldWidth?: boolean; // Show Field Width option (disabled for taxonomies as term meta doesn't support side-by-side layout)
}

export function MetaFieldsEditor({ 
  metaFields, 
  setMetaFields,
  emptyStateText = "Add custom fields to collect additional data for your posts",
  showFieldWidth = true
}: MetaFieldsEditorProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null);
  const [dragOverFieldIndex, setDragOverFieldIndex] = useState<number | null>(null);
  // Sub-field drag state. Keyed by parent field id so a Group/Repeater
  // builder can reorder its own children without leaking drag state across
  // sibling parents (the editor may have several Group/Repeater blocks open
  // at once with `expandedFields`).
  const [subFieldDrag, setSubFieldDrag] = useState<{
    parentId: string;
    fromIndex: number;
    overIndex: number | null;
  } | null>(null);
  const [conditionalModalOpen, setConditionalModalOpen] = useState<string | null>(null);

  // Pro gating — drives Pro badges + locks on object_type radios and
  // the html field option below. Same pattern as FieldTypeSelector.
  const { isPro, isProFeature } = useProContext();

  // Shared upgrade modal for the object-type radios (Tab / Accordion /
  // Endpoint). Free users clicking a locked option opens the same
  // `UpgradeModal` we use everywhere else (Quick Edit, Relations, etc.)
  // instead of switching the field's object_type.
  const [showObjectTypeUpgrade, setShowObjectTypeUpgrade] = useState(false);
  const [objectTypeUpgradeLabel, setObjectTypeUpgradeLabel] = useState<string>('');

  const triggerObjectTypeUpgrade = (label: string) => {
    setObjectTypeUpgradeLabel(label);
    setShowObjectTypeUpgrade(true);
  };

  // Fetch registered post types for Relationship field picker
  const { data: registeredPostTypes } = usePostTypes();
  const availablePostTypes = [
    { slug: 'post', label: 'Post' },
    { slug: 'page', label: 'Page' },
    ...(registeredPostTypes?.map(pt => ({ slug: pt.slug, label: pt.title })) || []),
  ].filter((pt, index, self) => self.findIndex(p => p.slug === pt.slug) === index); // deduplicate

  // Fetch registered taxonomies for Taxonomy Picker field
  const { data: registeredTaxonomies } = useTaxonomies();
  const availableTaxonomies = [
    { slug: 'category', label: 'Category' },
    { slug: 'post_tag', label: 'Tag' },
    ...(registeredTaxonomies?.map(tax => ({ slug: tax.slug, label: tax.title })) || []),
  ].filter((tax, index, self) => self.findIndex(t => t.slug === tax.slug) === index);

  // Available user roles for User Picker field
  const availableRoles = [
    { slug: 'administrator', label: 'Administrator' },
    { slug: 'editor', label: 'Editor' },
    { slug: 'author', label: 'Author' },
    { slug: 'contributor', label: 'Contributor' },
    { slug: 'subscriber', label: 'Subscriber' },
  ];

  // Meta Fields handlers
  const addMetaField = () => {
    const newField: MetaField = {
      id: `field_${Date.now()}`,
      label: '',
      name: '',
      object_type: 'field',
      type: 'text',
      description: '',
      placeholder: '',
      default_value: '',
      field_width: '100%',
      character_limit: null,
      required: false,
      quick_edit: false,
      revision_support: false,
      show_in_rest: false,
      conditional_logic: null,
      validation_pattern: '',
      validation_message: '',
      layout: 'horizontal',
      options_source: 'manual',
      options: [],
      multiple: false,
      min_search_characters: 3,
      options_layout: 'vertical',
      return_format: 'array',
    };
    setMetaFields([...metaFields, newField]);
    setExpandedFields(prev => new Set([...prev, newField.id]));
  };

  const updateMetaField = (id: string, field: keyof MetaField, value: unknown) => {
    setMetaFields(fields => fields.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const handleMetaFieldLabelChange = (id: string, label: string) => {
    const generatedSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const generatedPlaceholder = label;
    setMetaFields(fields => fields.map(f => 
      f.id === id ? { 
        ...f, 
        label, 
        name: generatedSlug,
        placeholder: generatedPlaceholder
      } : f
    ));
  };

  const removeMetaField = (id: string) => {
    setMetaFields(fields => fields.filter(f => f.id !== id));
    setExpandedFields(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const duplicateMetaField = (id: string) => {
    const fieldToDuplicate = metaFields.find(f => f.id === id);
    if (!fieldToDuplicate) return;
    
    const newField: MetaField = {
      ...fieldToDuplicate,
      id: `field_${Date.now()}`,
      label: `${fieldToDuplicate.label} (Copy)`,
      name: `${fieldToDuplicate.name}_copy`,
    };
    
    const originalIndex = metaFields.findIndex(f => f.id === id);
    const newFields = [...metaFields];
    newFields.splice(originalIndex + 1, 0, newField);
    setMetaFields(newFields);
    setExpandedFields(prev => new Set([...prev, newField.id]));
  };

  const toggleFieldExpand = (id: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllFields = () => {
    setExpandedFields(new Set(metaFields.map(f => f.id)));
  };

  const collapseAllFields = () => {
    setExpandedFields(new Set());
  };

  // Conditional Logic helpers
  const openConditionalModal = (fieldId: string) => {
    setConditionalModalOpen(fieldId);
  };

  const closeConditionalModal = () => {
    setConditionalModalOpen(null);
  };

  const initializeConditionalLogic = (fieldId: string) => {
    setMetaFields(fields => fields.map(f => {
      if (f.id === fieldId && !f.conditional_logic) {
        return {
          ...f,
          conditional_logic: {
            enabled: true,
            relation: 'and',
            rules: [{
              id: `rule_${Date.now()}`,
              field: '',
              operator: 'equal',
              value: '',
            }],
          },
        };
      }
      return f;
    }));
    openConditionalModal(fieldId);
  };

  const addConditionalRule = (fieldId: string) => {
    setMetaFields(fields => fields.map(f => {
      if (f.id === fieldId && f.conditional_logic) {
        return {
          ...f,
          conditional_logic: {
            ...f.conditional_logic,
            rules: [
              ...f.conditional_logic.rules,
              {
                id: `rule_${Date.now()}`,
                field: '',
                operator: 'equal' as const,
                value: '',
              },
            ],
          },
        };
      }
      return f;
    }));
  };

  const updateConditionalRule = (fieldId: string, ruleId: string, key: keyof ConditionalRule, value: string) => {
    setMetaFields(fields => fields.map(f => {
      if (f.id === fieldId && f.conditional_logic) {
        return {
          ...f,
          conditional_logic: {
            ...f.conditional_logic,
            rules: f.conditional_logic.rules.map(r =>
              r.id === ruleId ? { ...r, [key]: value } : r
            ),
          },
        };
      }
      return f;
    }));
  };

  const removeConditionalRule = (fieldId: string, ruleId: string) => {
    setMetaFields(fields => fields.map(f => {
      if (f.id === fieldId && f.conditional_logic) {
        return {
          ...f,
          conditional_logic: {
            ...f.conditional_logic,
            rules: f.conditional_logic.rules.filter(r => r.id !== ruleId),
          },
        };
      }
      return f;
    }));
  };

  const toggleConditionalLogic = (fieldId: string, enabled: boolean) => {
    setMetaFields(fields => fields.map(f => {
      if (f.id === fieldId) {
        if (enabled && !f.conditional_logic) {
          return {
            ...f,
            conditional_logic: {
              enabled: true,
              relation: 'and',
              rules: [{
                id: `rule_${Date.now()}`,
                field: '',
                operator: 'equal' as const,
                value: '',
              }],
            },
          };
        } else if (f.conditional_logic) {
          return {
            ...f,
            conditional_logic: { ...f.conditional_logic, enabled },
          };
        }
      }
      return f;
    }));
  };

  const updateConditionalRelation = (fieldId: string, relation: 'and' | 'or') => {
    setMetaFields(fields => fields.map(f => {
      if (f.id === fieldId && f.conditional_logic) {
        return {
          ...f,
          conditional_logic: { ...f.conditional_logic, relation },
        };
      }
      return f;
    }));
  };

  // Reset a rule's `value` whenever the operator switches into or out of
  // an "empty / not empty" branch — those operators carry no value, so
  // leaving stale text in `rule.value` would confuse the live summary
  // and the PHP/JS evaluators alike. Field changes also reset the
  // operator + value because the new controlling field may not support
  // the previously selected operator (e.g. moving from a number field
  // to a select field).
  const handleConditionalRuleField = (fieldId: string, ruleId: string, newFieldName: string) => {
    // Pick a default operator that the new controlling field actually
    // supports — toggle, checkbox, etc. don't expose `equal`, so
    // blindly resetting to 'equal' would leave the operator <select>
    // showing the first item with the rule.operator state stale.
    const meta = getControlMeta(newFieldName);
    const defaultOp = (meta.operators[0]?.value || 'equal') as ConditionalRule['operator'];

    setMetaFields(fields => fields.map(f => {
      if (f.id === fieldId && f.conditional_logic) {
        return {
          ...f,
          conditional_logic: {
            ...f.conditional_logic,
            rules: f.conditional_logic.rules.map(r =>
              r.id === ruleId ? { ...r, field: newFieldName, operator: defaultOp, value: '' } : r
            ),
          },
        };
      }
      return f;
    }));
  };

  const handleConditionalRuleOperator = (fieldId: string, ruleId: string, newOperator: string) => {
    setMetaFields(fields => fields.map(f => {
      if (f.id === fieldId && f.conditional_logic) {
        return {
          ...f,
          conditional_logic: {
            ...f.conditional_logic,
            rules: f.conditional_logic.rules.map(r => {
              if (r.id !== ruleId) return r;
              const isValueLess = ['empty', 'not_empty'].includes(newOperator);
              return {
                ...r,
                operator: newOperator as ConditionalRule['operator'],
                value: isValueLess ? '' : r.value,
              };
            }),
          },
        };
      }
      return f;
    }));
  };

  // Resolve the operator list + value-input shape for the currently
  // selected controlling field. Tailoring operators to the field type
  // is what makes the modal useful — a free-text `contains` check on a
  // dropdown (where the value is one of three known options) is the
  // kind of thing that breaks rules silently when the option label
  // is slightly different from what the user typed.
  type ControlInputType = 'text' | 'number' | 'date' | 'datetime' | 'option-select' | 'none';
  const getControlMeta = (fieldName: string): {
    controllingField: MetaField | null;
    operators: SelectOption[];
    valueInput: ControlInputType;
    options: { value: string; label: string }[];
  } => {
    const controllingField = metaFields.find(f => f.name === fieldName) || null;

    if (!controllingField) {
      return { controllingField: null, operators: conditionalOperators, valueInput: 'text', options: [] };
    }

    const opts = (controllingField.options || []).map(o => ({
      value: String(o.value ?? ''),
      label: String(o.label ?? o.value ?? ''),
    }));

    switch (controllingField.type) {
      case 'toggle':
        // Toggle stores '1' (checked) or '' / '0' (unchecked); empty /
        // not_empty cleanly capture both states without needing a
        // value picker.
        return {
          controllingField,
          operators: [
            { value: 'not_empty', label: 'Is checked' },
            { value: 'empty', label: 'Is unchecked' },
          ],
          valueInput: 'none',
          options: [],
        };

      case 'select':
      case 'radio':
        return {
          controllingField,
          operators: [
            { value: 'equal', label: 'Is equal to' },
            { value: 'not_equal', label: 'Is not equal to' },
            { value: 'empty', label: 'Is empty' },
            { value: 'not_empty', label: 'Is not empty' },
          ],
          valueInput: 'option-select',
          options: opts,
        };

      case 'checkbox':
        // Checkbox values are arrays. The PHP / JS evaluators treat
        // `equal` as "is in array" already, but `contains` reads more
        // naturally to authors and aligns with the underlying check.
        return {
          controllingField,
          operators: [
            { value: 'contains', label: 'Has selected' },
            { value: 'not_contains', label: 'Does not have selected' },
            { value: 'empty', label: 'Has none selected' },
            { value: 'not_empty', label: 'Has any selected' },
          ],
          valueInput: 'option-select',
          options: opts,
        };

      case 'number':
        return {
          controllingField,
          operators: [
            { value: 'equal', label: 'Is equal to' },
            { value: 'not_equal', label: 'Is not equal to' },
            { value: 'greater', label: 'Greater than' },
            { value: 'less', label: 'Less than' },
            { value: 'empty', label: 'Is empty' },
            { value: 'not_empty', label: 'Is not empty' },
          ],
          valueInput: 'number',
          options: [],
        };

      case 'date':
      case 'datetime':
        return {
          controllingField,
          operators: [
            { value: 'equal', label: 'Is on' },
            { value: 'not_equal', label: 'Is not on' },
            { value: 'greater', label: 'After' },
            { value: 'less', label: 'Before' },
            { value: 'empty', label: 'Is empty' },
            { value: 'not_empty', label: 'Is not empty' },
          ],
          valueInput: controllingField.type === 'date' ? 'date' : 'datetime',
          options: [],
        };

      // text, textarea, email, url, color, time, etc. share the
      // free-text operator set.
      default:
        return {
          controllingField,
          operators: conditionalOperators,
          valueInput: 'text',
          options: [],
        };
    }
  };

  // Build a plain-English summary of what the rules will do, shown at
  // the top of the modal so authors can verify their intent at a glance.
  const buildConditionalSummary = (targetField: MetaField): string | null => {
    const cl = targetField.conditional_logic;
    if (!cl?.enabled) return null;

    const validRules = cl.rules.filter(r => r.field);
    if (validRules.length === 0) return null;

    const parts = validRules.map(r => {
      const meta = getControlMeta(r.field);
      const ctlLabel = meta.controllingField?.label || meta.controllingField?.name || r.field;
      const opMeta = meta.operators.find(o => o.value === r.operator);
      const opLabel = (opMeta?.label || r.operator).toLowerCase();

      if (['empty', 'not_empty'].includes(r.operator) || meta.valueInput === 'none') {
        return `"${ctlLabel}" ${opLabel}`;
      }

      let valueLabel: string = r.value || '…';
      if (meta.valueInput === 'option-select') {
        const opt = meta.options.find(o => o.value === r.value);
        valueLabel = opt?.label || r.value || '…';
      }
      return `"${ctlLabel}" ${opLabel} "${valueLabel}"`;
    });

    if (parts.length === 1) {
      return `Show this field when ${parts[0]}.`;
    }

    const conn = cl.relation === 'or' ? ' OR ' : ' AND ';
    return `Show this field when ${parts.join(conn)}.`;
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedFieldIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedFieldIndex === null || draggedFieldIndex === index) return;
    setDragOverFieldIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedFieldIndex !== null && dragOverFieldIndex !== null && draggedFieldIndex !== dragOverFieldIndex) {
      const newFields = [...metaFields];
      const [draggedItem] = newFields.splice(draggedFieldIndex, 1);
      newFields.splice(dragOverFieldIndex, 0, draggedItem);
      setMetaFields(newFields);
    }
    setDraggedFieldIndex(null);
    setDragOverFieldIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverFieldIndex(null);
  };

  // Sub-field drag-and-drop handlers — mirror the parent-field flow but
  // are scoped to a single Group/Repeater (`parentId`). The actual reorder
  // is committed in `handleSubFieldDragEnd` so a cancelled drop (drag back
  // out, ESC) leaves the array untouched.
  const handleSubFieldDragStart = (parentId: string, fromIndex: number) => {
    setSubFieldDrag({ parentId, fromIndex, overIndex: null });
  };

  const handleSubFieldDragOver = (e: React.DragEvent, parentId: string, overIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!subFieldDrag || subFieldDrag.parentId !== parentId) return;
    if (subFieldDrag.fromIndex === overIndex) return;
    setSubFieldDrag(prev => (prev ? { ...prev, overIndex } : prev));
  };

  const handleSubFieldDragEnd = (parentId: string) => {
    if (subFieldDrag && subFieldDrag.parentId === parentId && subFieldDrag.overIndex !== null && subFieldDrag.fromIndex !== subFieldDrag.overIndex) {
      const parent = metaFields.find(f => f.id === parentId);
      if (parent && parent.sub_fields) {
        const newSubFields = [...parent.sub_fields];
        const [moved] = newSubFields.splice(subFieldDrag.fromIndex, 1);
        newSubFields.splice(subFieldDrag.overIndex, 0, moved);
        updateMetaField(parentId, 'sub_fields', newSubFields);
      }
    }
    setSubFieldDrag(null);
  };

  const handleSubFieldDragLeave = () => {
    setSubFieldDrag(prev => (prev ? { ...prev, overIndex: null } : prev));
  };

  return (
    <>
      <div className="rdcfe-space-y-6">
        <CollapsibleSection 
          title="Meta Fields" 
          icon={<Layers className="rdcfe-w-5 rdcfe-h-5" />}
          badge={metaFields.length > 0 ? `${metaFields.length} fields` : undefined}
        >
          {metaFields.length === 0 ? (
            <div className="rdcfe-text-center rdcfe-py-10">
              <div className="rdcfe-w-16 rdcfe-h-16 rdcfe-mx-auto rdcfe-rounded-2xl rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-mb-4">
                <Layers className="rdcfe-w-8 rdcfe-h-8 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
              </div>
              <p className="rdcfe-text-[15px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2">No Meta Fields Yet</p>
              <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-5">
                {emptyStateText}
              </p>
              <button
                type="button"
                onClick={addMetaField}
                className="rdcfe-btn rdcfe-btn-primary"
              >
                <Plus className="rdcfe-w-4 rdcfe-h-4" />
                Add First Field
              </button>
            </div>
          ) : (
            <div className="rdcfe-space-y-3">
              {/* Expand/Collapse All */}
              <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-2">
                <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  {metaFields.length} field{metaFields.length !== 1 ? 's' : ''} • {expandedFields.size} expanded
                </span>
                <div className="rdcfe-flex rdcfe-gap-2">
                  <button
                    type="button"
                    onClick={expandAllFields}
                    className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline"
                  >
                    Expand All
                  </button>
                  <span className="rdcfe-text-[hsl(var(--rdcfe-border))]">|</span>
                  <button
                    type="button"
                    onClick={collapseAllFields}
                    className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-underline"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {metaFields.map((field, fieldIndex) => {
                const fieldTypeInfo = fieldTypes.find(ft => ft.value === field.type);
                const TypeIcon = fieldTypeInfo?.icon || Type;
                const objectType = field.object_type || 'field';
                const isField = objectType === 'field';
                const isTab = objectType === 'tab';
                const isEndpoint = objectType === 'endpoint';
                // HTML is a display-only "field" — it has object_type='field'
                // but stores no value and doesn't need a name. Treat it like
                // a layout marker for validation/required-input purposes.
                const isHtmlBlock = isField && field.type === 'html';
                const isExpanded = expandedFields.has(field.id);
                const isDragging = draggedFieldIndex === fieldIndex;
                const isDragOver = dragOverFieldIndex === fieldIndex;
                
                // Check if this field should be indented
                const shouldIndent = (() => {
                  if (objectType === 'tab' || objectType === 'accordion' || objectType === 'endpoint') {
                    return false;
                  }
                  for (let i = fieldIndex - 1; i >= 0; i--) {
                    const prevType = metaFields[i].object_type || 'field';
                    if (prevType === 'tab' || prevType === 'accordion') {
                      return true;
                    }
                    if (prevType === 'endpoint') {
                      return false;
                    }
                  }
                  return false;
                })();
                
                // Check if field has validation errors (missing label or name)
                const hasValidationError = isField && !isHtmlBlock && (!field.label?.trim() || !field.name?.trim());

                const iconBgColors: Record<string, string> = {
                  field: 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.15)]',
                  tab: 'rdcfe-bg-[hsl(217_91%_60%/0.15)]',
                  accordion: 'rdcfe-bg-[hsl(262_83%_58%/0.15)]',
                  endpoint: 'rdcfe-bg-[hsl(var(--rdcfe-muted-foreground)/0.15)]',
                };

                const iconColors: Record<string, string> = {
                  field: 'rdcfe-text-[hsl(var(--rdcfe-primary))]',
                  tab: 'rdcfe-text-[hsl(217_91%_50%)]',
                  accordion: 'rdcfe-text-[hsl(262_83%_48%)]',
                  endpoint: 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]',
                };

                // Loud per-object-type badge classes for the collapsed item
                // header. Authors found it too easy to mis-set the Type radio
                // (e.g. a "Tab" item mistakenly carrying object_type='tab' and
                // a separate item *labelled* "Accordion" but still
                // object_type='tab'), because the only visual hint was a
                // subtle icon background tint. The badge spells out the role
                // in plain English right next to the label, in the matching
                // colour, so the structure of a metabox can be eyeballed
                // without expanding every item.
                const badgeClasses: Record<string, string> = {
                  tab: 'rdcfe-bg-[hsl(217_91%_60%/0.15)] rdcfe-text-[hsl(217_91%_40%)] rdcfe-border rdcfe-border-[hsl(217_91%_60%/0.25)]',
                  accordion: 'rdcfe-bg-[hsl(262_83%_58%/0.15)] rdcfe-text-[hsl(262_83%_42%)] rdcfe-border rdcfe-border-[hsl(262_83%_58%/0.25)]',
                  endpoint: 'rdcfe-bg-[hsl(var(--rdcfe-muted-foreground)/0.12)] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-border rdcfe-border-[hsl(var(--rdcfe-muted-foreground)/0.25)]',
                };
                const badgeLabels: Record<string, string> = {
                  tab: 'Tab',
                  accordion: 'Accordion',
                  endpoint: 'Endpoint',
                };

                return (
                  <div 
                    key={field.id} 
                    onDragOver={(e) => handleDragOver(e, fieldIndex)}
                    onDragEnd={handleDragEnd}
                    onDragLeave={handleDragLeave}
                    className={`rdcfe-rounded-2xl rdcfe-border rdcfe-bg-white rdcfe-shadow-sm rdcfe-overflow-hidden rdcfe-transition-all ${
                      hasValidationError ? 'rdcfe-border-[hsl(var(--rdcfe-destructive)/0.5)] rdcfe-border-2' : isExpanded ? 'rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]' : 'rdcfe-border-[hsl(var(--rdcfe-border))]'
                    } ${isDragging ? 'rdcfe-opacity-50 rdcfe-scale-[0.98]' : ''} ${
                      isDragOver ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-border-2 rdcfe-border-dashed' : ''
                    } ${shouldIndent ? 'rdcfe-ml-8 rdcfe-border-l-4 rdcfe-border-l-[hsl(var(--rdcfe-primary)/0.3)]' : ''}`}
                  >
                    {/* Field Header */}
                    <div 
                      className={`rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-px-4 rdcfe-py-3 rdcfe-cursor-pointer rdcfe-select-none rdcfe-transition-colors ${isExpanded ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]'}`}
                      onClick={() => toggleFieldExpand(field.id)}
                    >
                      {/* Drag Handle */}
                      <div 
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(fieldIndex);
                        }}
                        className="rdcfe-cursor-grab active:rdcfe-cursor-grabbing rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-colors rdcfe-p-1 rdcfe-rounded hover:rdcfe-bg-[hsl(var(--rdcfe-muted))]"
                        onClick={(e) => e.stopPropagation()}
                        title="Drag to reorder"
                      >
                        <GripVertical className="rdcfe-h-4 rdcfe-w-4" />
                      </div>
                      
                      {/* Field Type Icon */}
                      <div className={`rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-xl rdcfe-flex rdcfe-items-center rdcfe-justify-center ${iconBgColors[objectType]}`}>
                        <TypeIcon className={`rdcfe-w-5 rdcfe-h-5 ${iconColors[objectType]}`} />
                      </div>
                      
                      {/* Label & Info */}
                      <div className="rdcfe-flex-1 rdcfe-min-w-0">
                        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                          <div className={`rdcfe-text-[14px] rdcfe-font-semibold rdcfe-truncate ${hasValidationError ? 'rdcfe-text-[hsl(var(--rdcfe-destructive))]' : 'rdcfe-text-[hsl(var(--rdcfe-foreground))]'}`}>
                            {field.label || 'Untitled Field'}
                          </div>
                          {objectType !== 'field' && badgeLabels[objectType] && (
                            <span
                              className={`rdcfe-px-2 rdcfe-py-0.5 rdcfe-text-[10px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wide rdcfe-rounded-md rdcfe-flex-shrink-0 ${badgeClasses[objectType] || ''}`}
                              title={`Layout role: ${badgeLabels[objectType]}`}
                            >
                              {badgeLabels[objectType]}
                            </span>
                          )}
                          {hasValidationError && (
                            <span className="rdcfe-px-2 rdcfe-py-0.5 rdcfe-text-[10px] rdcfe-font-semibold rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-destructive)/0.1)] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                          {fieldTypeInfo?.label || 'Text'} • {field.name || 'no_name'}
                        </div>
                      </div>
                      
                      {/* Conditional Logic Indicator */}
                      {field.conditional_logic?.enabled && field.conditional_logic?.rules?.length > 0 && (
                        <div 
                          className="rdcfe-p-2 rdcfe-rounded-lg rdcfe-bg-[hsl(280_70%_95%)] rdcfe-text-[hsl(280_70%_45%)]"
                          title={`Conditional Logic: ${field.conditional_logic.rules.length} rule(s)`}
                        >
                          <GitBranch className="rdcfe-h-4 rdcfe-w-4" />
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => duplicateMetaField(field.id)}
                          className="rdcfe-p-2 rdcfe-rounded-lg rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-all"
                          title="Duplicate field"
                        >
                          <Copy className="rdcfe-h-4 rdcfe-w-4" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete "${field.label || 'Untitled Field'}" field?`)) {
                              removeMetaField(field.id);
                            }
                          }}
                          className="rdcfe-p-2 rdcfe-rounded-lg rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-transition-all"
                          title="Delete field"
                        >
                          <Trash2 className="rdcfe-h-4 rdcfe-w-4" />
                        </button>
                      </div>
                      
                      {/* Expand/Collapse Arrow */}
                      <ChevronDown className={`rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200 ${isExpanded ? 'rdcfe-rotate-180' : ''}`} />
                    </div>
                    
                    {/* Field Content - Collapsible */}
                    {isExpanded && (
                      <div className="rdcfe-p-5 rdcfe-space-y-5">
                        {/* Object Type Radio. Tab/Accordion/Endpoint are
                            Pro-only layout markers — they render with a
                            small ProBadge and stay disabled (visual only)
                            for free users so the upsell is obvious. */}
                        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-flex-wrap">
                          <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))]">Type:</span>
                          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-p-1 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-rounded-xl">
                            {objectTypeOptions.map(opt => {
                              const isProObjectType = ['tab', 'accordion', 'endpoint'].includes(opt.value);
                              const isProLocked = isProObjectType && !isPro && isProFeature(opt.value, 'field_type');
                              // For locked options we attach the click handler
                              // on the wrapping label and skip the underlying
                              // radio's `disabled` attribute — `disabled`
                              // would swallow the click before our handler
                              // can run, which means the user wouldn't see
                              // the upgrade modal at all.
                              const handleObjectTypeClick = (e: React.MouseEvent) => {
                                if (!isProLocked) return;
                                e.preventDefault();
                                triggerObjectTypeUpgrade(opt.label);
                              };
                              return (
                                <label
                                  key={opt.value}
                                  className={`${isProLocked ? 'rdcfe-cursor-not-allowed' : 'rdcfe-cursor-pointer'}`}
                                  title={isProLocked ? 'Available in Pro — click to upgrade' : undefined}
                                  onClick={handleObjectTypeClick}
                                >
                                  <input
                                    type="radio"
                                    name={`object_type_${field.id}`}
                                    value={opt.value}
                                    checked={objectType === opt.value}
                                    onChange={() => {
                                      if (isProLocked) return;
                                      updateMetaField(field.id, 'object_type', opt.value);
                                    }}
                                    aria-disabled={isProLocked}
                                    className="rdcfe-sr-only"
                                  />
                                  <span className={`rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-text-[13px] rdcfe-font-medium rdcfe-transition-all ${
                                    objectType === opt.value
                                      ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
                                      : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
                                  } ${isProLocked ? 'rdcfe-opacity-60' : ''}`}>
                                    {opt.label}
                                    {isProLocked && <Lock className="rdcfe-w-3 rdcfe-h-3" />}
                                    {isProObjectType && <ProBadge size="sm" />}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-italic">
                            {objectType === 'field' && '— Input field for collecting data'}
                            {objectType === 'tab' && '— Group fields under a tab'}
                            {objectType === 'accordion' && '— Collapsible section for fields'}
                            {objectType === 'endpoint' && '— End current tab or accordion'}
                          </span>
                        </div>

                        {/* Basic Info - Label & Name. HTML blocks render their
                            own content area below and don't need either, so we
                            collapse the row to a single label-only column. */}
                        <div className={`rdcfe-grid rdcfe-grid-cols-1 ${isHtmlBlock ? '' : 'md:rdcfe-grid-cols-2'} rdcfe-gap-4`}>
                          <div>
                            <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                              Label{!isHtmlBlock && <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]"> *</span>}
                              {isHtmlBlock && <span className="rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-text-[12px] rdcfe-ml-1 rdcfe-font-normal">(optional, only shown if "Show field label" is on)</span>}
                            </label>
                            <Input
                              value={field.label}
                              onChange={(e) => handleMetaFieldLabelChange(field.id, e.target.value)}
                              placeholder={isHtmlBlock ? 'e.g. Help Text, Notice' : 'e.g. Your Name, Email Address'}
                              error={isField && !isHtmlBlock && !field.label?.trim()}
                            />
                            {isField && !isHtmlBlock && !field.label?.trim() && (
                              <p className="rdcfe-mt-1 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                                Label is required
                              </p>
                            )}
                          </div>
                          {!isHtmlBlock && (
                            <div>
                              <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                Name/ID <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>
                              </label>
                              <Input
                                value={field.name}
                                onChange={(e) => updateMetaField(field.id, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                placeholder="your_name"
                                className="rdcfe-font-mono"
                                error={isField && !field.name?.trim()}
                              />
                              {isField && !field.name?.trim() && (
                                <p className="rdcfe-mt-1 rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-destructive))]">
                                  Name/ID is required
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Tab Layout - Only for Tab */}
                        {isTab && (
                          <div>
                            <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                              Tab Layout
                            </label>
                            <div className="rdcfe-flex rdcfe-gap-3">
                              {tabLayoutOptions.map(opt => (
                                <label key={opt.value} className="rdcfe-flex-1 rdcfe-cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`layout_${field.id}`}
                                    value={opt.value}
                                    checked={(field.layout || 'horizontal') === opt.value}
                                    onChange={() => updateMetaField(field.id, 'layout', opt.value)}
                                    className="rdcfe-sr-only"
                                  />
                                  <div className={`rdcfe-p-3 rdcfe-rounded-xl rdcfe-border-2 rdcfe-text-center rdcfe-transition-all ${
                                    (field.layout || 'horizontal') === opt.value
                                      ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]'
                                      : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                                  }`}>
                                    <span className={`rdcfe-text-[14px] rdcfe-font-medium ${(field.layout || 'horizontal') === opt.value ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]' : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'}`}>
                                      {opt.label}
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Field Settings - Only for Field type */}
                        {isField && (
                          <>
                            {/* Field Type & Width */}
                            <div className={`rdcfe-grid rdcfe-grid-cols-1 ${showFieldWidth ? 'md:rdcfe-grid-cols-2' : ''} rdcfe-gap-4`}>
                              <FieldTypeSelector 
                                value={field.type} 
                                onChange={(value) => updateMetaField(field.id, 'type', value)} 
                              />
                              
                              {showFieldWidth && (
                                <div>
                                  <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Field Width
                                  </label>
                                  <Select
                                    options={fieldWidthOptions}
                                    value={field.field_width || '100%'}
                                    onChange={(e) => updateMetaField(field.id, 'field_width', e.target.value)}
                                  />
                                </div>
                              )}
                            </div>

                            {/* HTML Field — display-only block (Pro) */}
                            {field.type === 'html' && (
                              <div className="rdcfe-space-y-3 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
                                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-1">
                                  <Code2 className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                                  <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                    HTML Content
                                  </span>
                                  <ProBadge size="sm" />
                                </div>
                                <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                                  This block displays static HTML inside the metabox / options page. It does not store any value. Content is filtered through <code className="rdcfe-text-[11px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-px-1 rdcfe-rounded">wp_kses_post</code> on the server.
                                </p>
                                <textarea
                                  value={field.html_content || ''}
                                  onChange={(e) => updateMetaField(field.id, 'html_content', e.target.value)}
                                  placeholder={'<p>Enter your HTML here. You can use headings, lists, links, images, etc.</p>'}
                                  rows={6}
                                  className="rdcfe-w-full rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-4 rdcfe-py-3 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-all focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)] rdcfe-font-mono rdcfe-resize-y"
                                />
                                <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.show_label || false}
                                    onChange={(e) => updateMetaField(field.id, 'show_label', e.target.checked)}
                                    className="rdcfe-sr-only"
                                  />
                                  <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.show_label ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                    <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.show_label ? 'rdcfe-translate-x-4' : ''}`} />
                                  </div>
                                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                    Show field label above HTML
                                  </span>
                                </label>
                              </div>
                            )}

                            {/* Select/Checkbox/Radio options */}
                            {['select', 'checkbox', 'radio'].includes(field.type) && (
                              <div className="rdcfe-space-y-4 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
                                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-3">
                                  <List className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                                  <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                    {field.type === 'select' ? 'Select' : field.type === 'checkbox' ? 'Checkbox' : 'Radio'} Options
                                  </span>
                                </div>
                                
                                <div>
                                  <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Source
                                  </label>
                                  <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-block rdcfe-mb-2">
                                    Select source to get field options from
                                  </span>
                                  <Select
                                    options={optionsSourceOptions}
                                    value={field.options_source || 'manual'}
                                    onChange={(e) => updateMetaField(field.id, 'options_source', e.target.value)}
                                  />
                                </div>

                                {(field.options_source || 'manual') === 'manual' && (
                                  <div>
                                    <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Bulk Options
                                    </label>
                                    <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-block rdcfe-mb-2">
                                      One option per line. Format: <code className="rdcfe-text-[11px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-px-1 rdcfe-rounded">value:Label</code>
                                    </span>
                                    <textarea
                                      value={field._bulkOptionsText !== undefined ? field._bulkOptionsText : (field.options || []).map(opt => {
                                        if (opt.checked) return `${opt.value}:${opt.label}:checked`;
                                        if (opt.value !== opt.label) return `${opt.value}:${opt.label}`;
                                        return opt.value;
                                      }).join('\n')}
                                      onChange={(e) => {
                                        const text = e.target.value;
                                        updateMetaField(field.id, '_bulkOptionsText', text);
                                        const lines = text.split('\n').filter(line => line.trim());
                                        const parsedOptions = lines.map(line => {
                                          const parts = line.split(':');
                                          if (parts.length >= 3 && parts[2].trim().toLowerCase() === 'checked') {
                                            return { value: parts[0].trim(), label: parts[1].trim(), checked: true };
                                          } else if (parts.length >= 2) {
                                            return { value: parts[0].trim(), label: parts[1].trim() };
                                          }
                                          return { value: line.trim(), label: line.trim() };
                                        });
                                        updateMetaField(field.id, 'options', parsedOptions);
                                      }}
                                      onBlur={() => {
                                        updateMetaField(field.id, '_bulkOptionsText', undefined);
                                      }}
                                      placeholder={`red:Red\nblue:Blue\ngreen:Green`}
                                      rows={5}
                                      className="rdcfe-w-full rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-4 rdcfe-py-3 rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-all focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)] rdcfe-font-mono rdcfe-resize-y"
                                    />
                                  </div>
                                )}

                                {field.options_source === 'query_builder' && (
                                  <div className="rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-rounded-lg rdcfe-text-center">
                                    <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                                      Query Builder - Coming Soon
                                    </span>
                                  </div>
                                )}

                                {field.type === 'select' && (
                                  <div>
                                    <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Multiple
                                    </label>
                                    <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={field.multiple || false}
                                        onChange={(e) => updateMetaField(field.id, 'multiple', e.target.checked)}
                                        className="rdcfe-sr-only"
                                      />
                                      <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.multiple ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                        <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.multiple ? 'rdcfe-translate-x-4' : ''}`} />
                                      </div>
                                      <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                        {field.multiple ? 'Yes' : 'No'}
                                      </span>
                                    </label>
                                  </div>
                                )}

                                {['checkbox', 'radio'].includes(field.type) && (
                                  <div>
                                    <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Layout
                                    </label>
                                    <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={field.options_layout === 'horizontal'}
                                        onChange={(e) => updateMetaField(field.id, 'options_layout', e.target.checked ? 'horizontal' : 'vertical')}
                                        className="rdcfe-sr-only"
                                      />
                                      <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.options_layout === 'horizontal' ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                        <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.options_layout === 'horizontal' ? 'rdcfe-translate-x-4' : ''}`} />
                                      </div>
                                      <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                        {field.options_layout === 'horizontal' ? 'Horizontal' : 'Vertical'}
                                      </span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Image/File Return Format + (Image only) Multiple-images toggle */}
                            {['image', 'file'].includes(field.type) && (
                              <div className="rdcfe-space-y-4 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
                                {/* Multiple Images toggle (Image field only).
                                    When ON, the WP media picker opens in
                                    multi-select mode and the field stores
                                    a CSV of attachment IDs instead of a
                                    single ID. */}
                                {field.type === 'image' && (
                                  <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-gap-4">
                                    <div>
                                      <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-block">
                                        Multiple Images
                                      </label>
                                      <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                                        Allow selecting multiple images at once. Stored as comma-separated attachment IDs.
                                      </p>
                                    </div>
                                    <label className="rdcfe-flex rdcfe-items-center rdcfe-cursor-pointer rdcfe-flex-shrink-0">
                                      <input
                                        type="checkbox"
                                        checked={!!field.multiple}
                                        onChange={(e) => updateMetaField(field.id, 'multiple', e.target.checked)}
                                        className="rdcfe-sr-only"
                                      />
                                      <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.multiple ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                        <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.multiple ? 'rdcfe-translate-x-4' : ''}`} />
                                      </div>
                                    </label>
                                  </div>
                                )}

                                <div>
                                  <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Return Format
                                  </label>
                                  <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-4">
                                    {['array', 'url', 'id'].map(format => (
                                      <label key={format} className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`return_format_${field.id}`}
                                          checked={field.return_format === format || (!field.return_format && format === 'array')}
                                          onChange={() => updateMetaField(field.id, 'return_format', format)}
                                          className="rdcfe-w-4 rdcfe-h-4"
                                        />
                                        <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-capitalize">
                                          {format === 'array' ? `${field.type} Array with ID and URL` : format === 'url' ? `${field.type} URL` : `${field.type} ID`}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Group/Repeater Sub-fields (Pro) */}
                            {['group', 'repeater'].includes(field.type) && (
                              <div className="rdcfe-space-y-4 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-primary)/0.2)]">
                                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                                  <Layers className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                                  <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                    Sub Fields
                                  </span>
                                  <ProBadge size="sm" />
                                </div>

                                {/* Repeater specific settings */}
                                {field.type === 'repeater' && (
                                  <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 lg:rdcfe-grid-cols-4 rdcfe-gap-4">
                                    <div>
                                      <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                        Min Rows
                                      </label>
                                      <Input
                                        type="number"
                                        value={field.min || ''}
                                        onChange={(e) => updateMetaField(field.id, 'min', e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="0"
                                        className="rdcfe-h-9 rdcfe-text-[13px]"
                                      />
                                    </div>
                                    <div>
                                      <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                        Max Rows
                                      </label>
                                      <Input
                                        type="number"
                                        value={field.max || ''}
                                        onChange={(e) => updateMetaField(field.id, 'max', e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="Unlimited"
                                        className="rdcfe-h-9 rdcfe-text-[13px]"
                                      />
                                    </div>
                                    <div>
                                      <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                        Button Label
                                      </label>
                                      <Input
                                        value={field.button_label || ''}
                                        onChange={(e) => updateMetaField(field.id, 'button_label', e.target.value)}
                                        placeholder="Add Row"
                                        className="rdcfe-h-9 rdcfe-text-[13px]"
                                      />
                                    </div>
                                    {/* Layout — default 'block' stacks each
                                        sub-field full width and activates the
                                        per-sub-field Width selector so authors
                                        can mix 100/50/33 columns inside a row.
                                        Inline keeps fields on a single flex
                                        line; Table renders each row as a single
                                        table line (each cell forced to
                                        width:100%, sub-field widths ignored). */}
                                    <div>
                                      <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                        Layout
                                      </label>
                                      <select
                                        value={field.layout || 'block'}
                                        onChange={(e) => updateMetaField(field.id, 'layout', e.target.value as MetaField['layout'])}
                                        className="rdcfe-h-9 rdcfe-px-2 rdcfe-text-[13px] rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-w-full"
                                        title="Choose how each row renders. Block/Inline enables sub-field widths."
                                      >
                                        <option value="block">Block</option>
                                        {/* Stored as 'row' to keep RepeaterField.php
                                            backward compatible; the user-facing
                                            label is 'Inline' to mirror Group's
                                            radio control. */}
                                        <option value="row">Inline</option>
                                        <option value="table">Table</option>
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {/* Group specific layout — Block stacks fields
                                    and respects per-sub-field widths (50/50, etc.);
                                    Inline (stored as 'row' for back-compat with
                                    GroupField.php which checks for 'row') keeps
                                    them on one flex line with equal sizing
                                    (widths are ignored in Inline mode). Rendered
                                    as a tile-radio to match the existing Tab
                                    Layout control above. */}
                                {field.type === 'group' && (() => {
                                  const groupLayoutOptions: Array<{ value: 'block' | 'row'; label: string }> = [
                                    { value: 'block', label: 'Block' },
                                    { value: 'row', label: 'Inline' },
                                  ];
                                  const currentLayout = (field.layout as 'block' | 'row') || 'block';
                                  return (
                                    <div>
                                      <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                        Layout
                                      </label>
                                      <div className="rdcfe-flex rdcfe-gap-3">
                                        {groupLayoutOptions.map(opt => (
                                          <label key={opt.value} className="rdcfe-flex-1 rdcfe-cursor-pointer">
                                            <input
                                              type="radio"
                                              name={`group_layout_${field.id}`}
                                              value={opt.value}
                                              checked={currentLayout === opt.value}
                                              onChange={() => updateMetaField(field.id, 'layout', opt.value as MetaField['layout'])}
                                              className="rdcfe-sr-only"
                                            />
                                            <div className={`rdcfe-p-3 rdcfe-rounded-xl rdcfe-border-2 rdcfe-text-center rdcfe-transition-all ${
                                              currentLayout === opt.value
                                                ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]'
                                                : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                                            }`}>
                                              <span className={`rdcfe-text-[14px] rdcfe-font-medium ${
                                                currentLayout === opt.value
                                                  ? 'rdcfe-text-[hsl(var(--rdcfe-primary))]'
                                                  : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'
                                              }`}>
                                                {opt.label}
                                              </span>
                                            </div>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Sub-fields list */}
                                {(field.sub_fields && field.sub_fields.length > 0) ? (
                                  <div className="rdcfe-space-y-2">
                                    {field.sub_fields.map((subField, subIndex) => {
                                      const subFieldTypeInfo = fieldTypes.find(ft => ft.value === subField.type);
                                      const SubIcon = subFieldTypeInfo?.icon || Type;
                                      const isChoiceType = ['select', 'multiselect', 'checkbox', 'radio'].includes(subField.type);
                                      const isExpanded = subField._expanded !== false; // Default to expanded for new fields
                                      
                                      // Helper to update a sub-field property
                                      const updateSubField = (property: string, value: unknown) => {
                                        const newSubFields = [...(field.sub_fields || [])];
                                        newSubFields[subIndex] = { ...newSubFields[subIndex], [property]: value };
                                        updateMetaField(field.id, 'sub_fields', newSubFields);
                                      };
                                      
                                      // Generate options text from options array (don't use saved _bulkOptionsText)
                                      const optionsText = (subField.options || []).map(opt => {
                                        if (opt.checked) return `${opt.value}:${opt.label}:checked`;
                                        if (opt.value !== opt.label) return `${opt.value}:${opt.label}`;
                                        return opt.value;
                                      }).join('\n');
                                      
                                      const isSubDragging = !!subFieldDrag && subFieldDrag.parentId === field.id && subFieldDrag.fromIndex === subIndex;
                                      const isSubDragOver = !!subFieldDrag && subFieldDrag.parentId === field.id && subFieldDrag.overIndex === subIndex && subFieldDrag.fromIndex !== subIndex;

                                      return (
                                        <div 
                                          key={subField.id}
                                          onDragOver={(e) => handleSubFieldDragOver(e, field.id, subIndex)}
                                          onDragEnd={() => handleSubFieldDragEnd(field.id)}
                                          onDragLeave={handleSubFieldDragLeave}
                                          className={`rdcfe-bg-white rdcfe-rounded-lg rdcfe-border rdcfe-transition-all ${
                                            isSubDragging ? 'rdcfe-opacity-50 rdcfe-scale-[0.98]' : ''
                                          } ${
                                            isSubDragOver ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-border-2 rdcfe-border-dashed' : 'rdcfe-border-[hsl(var(--rdcfe-border))]'
                                          }`}
                                        >
                                          {/* Sub-field header row */}
                                          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-p-2">
                                            {/* Drag handle — same pattern as the
                                                parent-field list. The handle
                                                itself is the only `draggable`
                                                element so clicking inside the
                                                Label input or Type select doesn't
                                                accidentally start a drag. */}
                                            <div
                                              draggable
                                              onDragStart={(e) => {
                                                e.stopPropagation();
                                                // Some browsers refuse to start the
                                                // drag without setData; the parent
                                                // <div> doesn't need it because the
                                                // outer field list also relies on a
                                                // sibling drag handle.
                                                e.dataTransfer.effectAllowed = 'move';
                                                try { e.dataTransfer.setData('text/plain', String(subIndex)); } catch {/* ignore */}
                                                handleSubFieldDragStart(field.id, subIndex);
                                              }}
                                              className="rdcfe-cursor-grab active:rdcfe-cursor-grabbing rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-colors rdcfe-p-1 rdcfe-rounded hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-flex-shrink-0"
                                              title="Drag to reorder"
                                            >
                                              <GripVertical className="rdcfe-w-4 rdcfe-h-4" />
                                            </div>

                                            {/* Collapse toggle for choice types */}
                                            {isChoiceType && (
                                              <button
                                                type="button"
                                                onClick={() => updateSubField('_expanded', !isExpanded)}
                                                className="rdcfe-p-1 rdcfe-rounded rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors"
                                                title={isExpanded ? 'Collapse' : 'Expand'}
                                              >
                                                {isExpanded ? (
                                                  <ChevronDown className="rdcfe-w-4 rdcfe-h-4" />
                                                ) : (
                                                  <ChevronRight className="rdcfe-w-4 rdcfe-h-4" />
                                                )}
                                              </button>
                                            )}
                                            <SubIcon className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-flex-shrink-0" />
                                            <Input
                                              value={subField.label}
                                              onChange={(e) => {
                                                const newSubFields = [...(field.sub_fields || [])];
                                                newSubFields[subIndex] = {
                                                  ...newSubFields[subIndex],
                                                  label: e.target.value,
                                                  name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
                                                };
                                                updateMetaField(field.id, 'sub_fields', newSubFields);
                                              }}
                                              placeholder="Sub field label"
                                              className="rdcfe-h-8 rdcfe-text-[13px] rdcfe-flex-1"
                                            />
                                            <select
                                              value={subField.type}
                                              onChange={(e) => {
                                                const newSubFields = [...(field.sub_fields || [])];
                                                const newType = e.target.value;
                                                const wasChoice = ['select', 'multiselect', 'checkbox', 'radio'].includes(subField.type);
                                                const isChoice = ['select', 'multiselect', 'checkbox', 'radio'].includes(newType);
                                                newSubFields[subIndex] = { 
                                                  ...newSubFields[subIndex], 
                                                  type: newType,
                                                  options: (wasChoice && isChoice) ? newSubFields[subIndex].options : undefined,
                                                  _expanded: isChoice ? true : undefined,
                                                };
                                                updateMetaField(field.id, 'sub_fields', newSubFields);
                                              }}
                                              className="rdcfe-h-8 rdcfe-px-2 rdcfe-text-[13px] rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white"
                                            >
                                              {fieldTypes
                                                .filter(ft => !['group', 'repeater', 'gallery'].includes(ft.value))
                                                .map(ft => (
                                                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                                                ))}
                                            </select>
                                            {/* Width selector — mirrors the
                                                parent field's Field Width control
                                                so authors can lay sub-fields out
                                                inline (e.g. 50% / 50%). For the
                                                Repeater "table" layout the PHP
                                                renderer forces width:100% per
                                                cell; the value still persists so
                                                switching to Block/Row layout
                                                later picks it up automatically. */}
                                            <select
                                              value={subField.field_width || '100%'}
                                              onChange={(e) => updateSubField('field_width', e.target.value)}
                                              className="rdcfe-h-8 rdcfe-px-2 rdcfe-text-[13px] rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white"
                                              title="Field width"
                                            >
                                              {fieldWidthOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                              ))}
                                            </select>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newSubFields = (field.sub_fields || []).filter((_, i) => i !== subIndex);
                                                updateMetaField(field.id, 'sub_fields', newSubFields);
                                              }}
                                              className="rdcfe-p-1.5 rdcfe-rounded rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(var(--rdcfe-destructive)/0.1)] rdcfe-transition-colors"
                                              title="Remove sub-field"
                                            >
                                              <X className="rdcfe-w-4 rdcfe-h-4" />
                                            </button>
                                          </div>
                                          
                                          {/* Collapsible Options configuration for Select/Multiselect/Checkbox/Radio sub-fields */}
                                          {isChoiceType && isExpanded && (
                                            <div className="rdcfe-px-3 rdcfe-pb-3 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                                              <div className="rdcfe-pt-3">
                                                <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                                  Options
                                                </label>
                                                <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-block rdcfe-mb-2">
                                                  One per line: <code className="rdcfe-text-[10px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-px-1 rdcfe-rounded">value:Label</code>
                                                </span>
                                                <textarea
                                                  value={subField._bulkOptionsText !== undefined ? subField._bulkOptionsText : optionsText}
                                                  onChange={(e) => {
                                                    const text = e.target.value;
                                                    const lines = text.split('\n').filter(line => line.trim());
                                                    const parsedOptions = lines.map(line => {
                                                      const parts = line.split(':');
                                                      if (parts.length >= 3 && parts[2].trim().toLowerCase() === 'checked') {
                                                        return { value: parts[0].trim(), label: parts[1].trim(), checked: true };
                                                      } else if (parts.length >= 2) {
                                                        return { value: parts[0].trim(), label: parts[1].trim() };
                                                      }
                                                      return { value: parts[0].trim(), label: parts[0].trim() };
                                                    });
                                                    
                                                    const newSubFields = [...(field.sub_fields || [])];
                                                    newSubFields[subIndex] = { 
                                                      ...newSubFields[subIndex], 
                                                      _bulkOptionsText: text,
                                                      options: parsedOptions 
                                                    };
                                                    updateMetaField(field.id, 'sub_fields', newSubFields);
                                                  }}
                                                  placeholder={`red:Red\nblue:Blue\ngreen:Green`}
                                                  className="rdcfe-w-full rdcfe-min-h-[60px] rdcfe-p-2 rdcfe-text-[12px] rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-font-mono rdcfe-resize-y placeholder:rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]"
                                                  rows={3}
                                                />
                                              </div>
                                              
                                              <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-4 rdcfe-mt-3">
                                                {/* Checkbox/Radio layout option */}
                                                {['checkbox', 'radio'].includes(subField.type) && (
                                                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                                                    <label className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Layout:</label>
                                                    <select
                                                      value={subField.options_layout || 'vertical'}
                                                      onChange={(e) => updateSubField('options_layout', e.target.value)}
                                                      className="rdcfe-h-7 rdcfe-px-2 rdcfe-text-[12px] rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white"
                                                    >
                                                      <option value="vertical">Vertical</option>
                                                      <option value="horizontal">Horizontal</option>
                                                    </select>
                                                  </div>
                                                )}
                                                
                                                {/* Select multiple option */}
                                                {subField.type === 'select' && (
                                                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                                                    <input
                                                      type="checkbox"
                                                      id={`subfield-multiple-${subField.id}`}
                                                      checked={subField.multiple || false}
                                                      onChange={(e) => updateSubField('multiple', e.target.checked)}
                                                      className="rdcfe-w-4 rdcfe-h-4 rdcfe-rounded rdcfe-border-[hsl(var(--rdcfe-border))]"
                                                    />
                                                    <label 
                                                      htmlFor={`subfield-multiple-${subField.id}`}
                                                      className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))]"
                                                    >
                                                      Allow multiple
                                                    </label>
                                                  </div>
                                                )}

                                                {/* Image multiple option (sub-field) */}
                                                {subField.type === 'image' && (
                                                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                                                    <input
                                                      type="checkbox"
                                                      id={`subfield-image-multiple-${subField.id}`}
                                                      checked={!!subField.multiple}
                                                      onChange={(e) => updateSubField('multiple', e.target.checked)}
                                                      className="rdcfe-w-4 rdcfe-h-4 rdcfe-rounded rdcfe-border-[hsl(var(--rdcfe-border))]"
                                                    />
                                                    <label
                                                      htmlFor={`subfield-image-multiple-${subField.id}`}
                                                      className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))]"
                                                    >
                                                      Multiple Images
                                                    </label>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* Collapsed indicator for choice types */}
                                          {isChoiceType && !isExpanded && subField.options && subField.options.length > 0 && (
                                            <div className="rdcfe-px-3 rdcfe-pb-2 rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                                              {subField.options.length} option{subField.options.length !== 1 ? 's' : ''} configured
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="rdcfe-p-6 rdcfe-text-center rdcfe-bg-white rdcfe-rounded-lg rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))]">
                                    <Layers className="rdcfe-w-8 rdcfe-h-8 rdcfe-mx-auto rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-2" />
                                    <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                                      No sub-fields added yet
                                    </p>
                                  </div>
                                )}
                                
                                {/* Add Sub Field button at bottom */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSubField: MetaField = {
                                      id: `subfield_${Date.now()}`,
                                      label: '',
                                      name: '',
                                      object_type: 'field',
                                      type: 'text',
                                      description: '',
                                      placeholder: '',
                                      default_value: '',
                                      field_width: '100%',
                                      character_limit: null,
                                      required: false,
                                      quick_edit: false,
                                      revision_support: false,
                                      show_in_rest: false,
                                      conditional_logic: null,
                                      validation_pattern: '',
                                      validation_message: '',
                                    };
                                    const currentSubFields = field.sub_fields || [];
                                    updateMetaField(field.id, 'sub_fields', [...currentSubFields, newSubField]);
                                  }}
                                  className="rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-1.5 rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-border-2 rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-text-[13px] rdcfe-font-medium hover:rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.5)] rdcfe-transition-colors"
                                >
                                  <Plus className="rdcfe-w-4 rdcfe-h-4" />
                                  Add Sub Field
                                </button>
                              </div>
                            )}

                            {/* Gallery Settings (Pro) */}
                            {field.type === 'gallery' && (
                              <div className="rdcfe-space-y-4 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-primary)/0.2)]">
                                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-3">
                                  <GalleryHorizontal className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                                  <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                    Gallery Settings
                                  </span>
                                  <ProBadge size="sm" />
                                </div>
                                <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-4">
                                  <div>
                                    <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                      Min Images
                                    </label>
                                    <Input
                                      type="number"
                                      value={field.min || ''}
                                      onChange={(e) => updateMetaField(field.id, 'min', e.target.value ? parseInt(e.target.value) : undefined)}
                                      placeholder="0"
                                      className="rdcfe-h-9 rdcfe-text-[13px]"
                                    />
                                  </div>
                                  <div>
                                    <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                      Max Images
                                    </label>
                                    <Input
                                      type="number"
                                      value={field.max || ''}
                                      onChange={(e) => updateMetaField(field.id, 'max', e.target.value ? parseInt(e.target.value) : undefined)}
                                      placeholder="Unlimited"
                                      className="rdcfe-h-9 rdcfe-text-[13px]"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                    Return Format
                                  </label>
                                  <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-3">
                                    {['array', 'url', 'id'].map(format => (
                                      <label key={format} className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`gallery_return_format_${field.id}`}
                                          checked={field.return_format === format || (!field.return_format && format === 'array')}
                                          onChange={() => updateMetaField(field.id, 'return_format', format)}
                                          className="rdcfe-w-4 rdcfe-h-4"
                                        />
                                        <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-capitalize">
                                          {format === 'array' ? 'Image Array' : format === 'url' ? 'Image URLs' : 'Image IDs'}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Relationship Field Settings (Pro) */}
                            {field.type === 'relationship' && (
                              <div className="rdcfe-space-y-4 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-primary)/0.2)]">
                                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-1">
                                  <Network className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                                  <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                    Relationship Settings
                                  </span>
                                  <ProBadge size="sm" />
                                </div>
                                <MultiSelectDropdown
                                  label="Post Type(s)"
                                  description="Select one or more post types to search from"
                                  selectedValues={Array.isArray(field.post_type) ? field.post_type : (field.post_type ? [field.post_type] : ['post'])}
                                  availableOptions={availablePostTypes}
                                  onChange={(newPts) => updateMetaField(field.id, 'post_type', newPts)}
                                  placeholder="Select post types..."
                                  defaultValue="post"
                                />
                                <div>
                                  <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Multiple
                                  </label>
                                  <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer rdcfe-mt-2">
                                    <input
                                      type="checkbox"
                                      checked={field.multiple || false}
                                      onChange={(e) => updateMetaField(field.id, 'multiple', e.target.checked)}
                                      className="rdcfe-sr-only"
                                    />
                                    <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.multiple ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                      <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.multiple ? 'rdcfe-translate-x-4' : ''}`} />
                                    </div>
                                    <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                      {field.multiple ? 'Allow multiple' : 'Single selection'}
                                    </span>
                                  </label>
                                </div>
                                {field.multiple && (
                                  <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-4">
                                    <div>
                                      <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                        Min Selections
                                      </label>
                                      <Input
                                        type="number"
                                        value={field.min || ''}
                                        onChange={(e) => updateMetaField(field.id, 'min', e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="0"
                                        className="rdcfe-h-9 rdcfe-text-[13px]"
                                      />
                                    </div>
                                    <div>
                                      <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                        Max Selections
                                      </label>
                                      <Input
                                        type="number"
                                        value={field.max || ''}
                                        onChange={(e) => updateMetaField(field.id, 'max', e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="Unlimited"
                                        className="rdcfe-h-9 rdcfe-text-[13px]"
                                      />
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                    Return Format
                                  </label>
                                  <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-3">
                                    {['id', 'object'].map(format => (
                                      <label key={format} className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`rel_return_format_${field.id}`}
                                          checked={field.return_format === format || (!field.return_format && format === 'id')}
                                          onChange={() => updateMetaField(field.id, 'return_format', format)}
                                          className="rdcfe-w-4 rdcfe-h-4"
                                        />
                                        <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-capitalize">
                                          {format === 'id' ? 'Post IDs' : 'Post Objects'}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Taxonomy Picker Field Settings (Pro) */}
                            {field.type === 'taxonomy' && (
                              <div className="rdcfe-space-y-4 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-primary)/0.2)]">
                                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-1">
                                  <Tags className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                                  <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                    Taxonomy Picker Settings
                                  </span>
                                  <ProBadge size="sm" />
                                </div>
                                <MultiSelectDropdown
                                  label="Taxonomy"
                                  description="Select a taxonomy to pick terms from"
                                  selectedValues={field.taxonomy ? [field.taxonomy] : ['category']}
                                  availableOptions={availableTaxonomies}
                                  onChange={(values) => updateMetaField(field.id, 'taxonomy', values[0] || 'category')}
                                  placeholder="Select taxonomy..."
                                  singleSelect={true}
                                  defaultValue="category"
                                />
                                <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-4">
                                  <div>
                                    <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Multiple
                                    </label>
                                    <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={field.multiple || false}
                                        onChange={(e) => updateMetaField(field.id, 'multiple', e.target.checked)}
                                        className="rdcfe-sr-only"
                                      />
                                      <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.multiple ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                        <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.multiple ? 'rdcfe-translate-x-4' : ''}`} />
                                      </div>
                                      <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                        {field.multiple ? 'Allow multiple' : 'Single selection'}
                                      </span>
                                    </label>
                                  </div>
                                  <div>
                                    <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Allow Add New
                                    </label>
                                    <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={field.add_new || false}
                                        onChange={(e) => updateMetaField(field.id, 'add_new', e.target.checked)}
                                        className="rdcfe-sr-only"
                                      />
                                      <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.add_new ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                        <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.add_new ? 'rdcfe-translate-x-4' : ''}`} />
                                      </div>
                                      <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                        {field.add_new ? 'Yes' : 'No'}
                                      </span>
                                    </label>
                                  </div>
                                </div>
                                <div>
                                  <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                    Return Format
                                  </label>
                                  <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-3">
                                    {['id', 'object'].map(format => (
                                      <label key={format} className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`tax_return_format_${field.id}`}
                                          checked={field.return_format === format || (!field.return_format && format === 'id')}
                                          onChange={() => updateMetaField(field.id, 'return_format', format)}
                                          className="rdcfe-w-4 rdcfe-h-4"
                                        />
                                        <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-capitalize">
                                          {format === 'id' ? 'Term IDs' : 'Term Objects'}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* User Picker Field Settings (Pro) */}
                            {field.type === 'user' && (
                              <div className="rdcfe-space-y-4 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-primary)/0.2)]">
                                <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-1">
                                  <Users className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
                                  <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                    User Picker Settings
                                  </span>
                                  <ProBadge size="sm" />
                                </div>
                                <MultiSelectDropdown
                                  label="Filter by Roles"
                                  description="Select roles to filter users (leave empty for all)"
                                  selectedValues={Array.isArray(field.roles) ? field.roles : (field.roles ? [field.roles] : [])}
                                  availableOptions={availableRoles}
                                  onChange={(values) => updateMetaField(field.id, 'roles', values)}
                                  placeholder="All Roles (no filter)"
                                  allowEmpty={true}
                                  showSlug={false}
                                />
                                <div>
                                  <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Multiple
                                  </label>
                                  <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer rdcfe-mt-2">
                                    <input
                                      type="checkbox"
                                      checked={field.multiple || false}
                                      onChange={(e) => updateMetaField(field.id, 'multiple', e.target.checked)}
                                      className="rdcfe-sr-only"
                                    />
                                    <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.multiple ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                      <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.multiple ? 'rdcfe-translate-x-4' : ''}`} />
                                    </div>
                                    <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                      {field.multiple ? 'Allow multiple' : 'Single selection'}
                                    </span>
                                  </label>
                                </div>
                                <div>
                                  <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1 rdcfe-block">
                                    Return Format
                                  </label>
                                  <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-3">
                                    {['id', 'object'].map(format => (
                                      <label key={format} className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`user_return_format_${field.id}`}
                                          checked={field.return_format === format || (!field.return_format && format === 'id')}
                                          onChange={() => updateMetaField(field.id, 'return_format', format)}
                                          className="rdcfe-w-4 rdcfe-h-4"
                                        />
                                        <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-capitalize">
                                          {format === 'id' ? 'User IDs' : 'User Objects'}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Placeholder & Default */}
                            {!['select', 'radio', 'checkbox', 'image', 'file', 'group', 'repeater', 'gallery', 'relationship', 'taxonomy', 'user'].includes(field.type) && (
                              <div
                                className={`rdcfe-grid rdcfe-grid-cols-1 rdcfe-gap-4 ${
                                  !META_FIELD_TYPES_WITHOUT_DEFAULT_INPUT.includes(field.type) ? 'md:rdcfe-grid-cols-2' : ''
                                }`}
                              >
                                <div>
                                  <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Placeholder
                                  </label>
                                  <Input
                                    value={field.placeholder || ''}
                                    onChange={(e) => updateMetaField(field.id, 'placeholder', e.target.value)}
                                    placeholder="Placeholder text..."
                                  />
                                </div>
                                {!META_FIELD_TYPES_WITHOUT_DEFAULT_INPUT.includes(field.type) && (
                                  <div>
                                    <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                      Default Value
                                    </label>
                                    <Input
                                      value={field.default_value || ''}
                                      onChange={(e) => updateMetaField(field.id, 'default_value', e.target.value)}
                                      placeholder="Optional default..."
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Description & Character Limit */}
                            <div className={`rdcfe-grid rdcfe-grid-cols-1 ${['text', 'textarea'].includes(field.type) ? 'md:rdcfe-grid-cols-3' : ''} rdcfe-gap-4`}>
                              <div className={['text', 'textarea'].includes(field.type) ? 'md:rdcfe-col-span-2' : ''}>
                                <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                  Description
                                </label>
                                <Input
                                  value={field.description || ''}
                                  onChange={(e) => updateMetaField(field.id, 'description', e.target.value)}
                                  placeholder="Help text for this field..."
                                />
                              </div>
                              {['text', 'textarea'].includes(field.type) && (
                                <div>
                                  <label className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Max Characters
                                  </label>
                                  <Input
                                    type="number"
                                    value={field.character_limit || ''}
                                    onChange={(e) => updateMetaField(field.id, 'character_limit', e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder="No limit"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Toggle Options */}
                            <div className="rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-rounded-xl">
                              <div className="rdcfe-grid rdcfe-grid-cols-2 md:rdcfe-grid-cols-4 rdcfe-gap-4">
                                <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateMetaField(field.id, 'required', e.target.checked)}
                                    className="rdcfe-sr-only"
                                  />
                                  <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.required ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                    <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.required ? 'rdcfe-translate-x-4' : ''}`} />
                                  </div>
                                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Required</span>
                                </label>
                                
                                <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.show_in_rest}
                                    onChange={(e) => updateMetaField(field.id, 'show_in_rest', e.target.checked)}
                                    className="rdcfe-sr-only"
                                  />
                                  <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.show_in_rest ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                    <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.show_in_rest ? 'rdcfe-translate-x-4' : ''}`} />
                                  </div>
                                  <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">REST API</span>
                                </label>

                                <ProSettingWrapper feature="quick_edit" featureName="Quick Edit">
                                  <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.quick_edit}
                                      onChange={(e) => updateMetaField(field.id, 'quick_edit', e.target.checked)}
                                      className="rdcfe-sr-only"
                                    />
                                    <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.quick_edit ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                      <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.quick_edit ? 'rdcfe-translate-x-4' : ''}`} />
                                    </div>
                                    <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Quick Edit</span>
                                  </label>
                                </ProSettingWrapper>
                                
                                <ProSettingWrapper feature="revisions" featureName="Revisions">
                                  <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.revision_support}
                                      onChange={(e) => updateMetaField(field.id, 'revision_support', e.target.checked)}
                                      className="rdcfe-sr-only"
                                    />
                                    <div className={`rdcfe-w-10 rdcfe-h-6 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative rdcfe-flex-shrink-0 ${field.revision_support ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-border))]'}`}>
                                      <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-4 rdcfe-h-4 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-sm rdcfe-transition-transform ${field.revision_support ? 'rdcfe-translate-x-4' : ''}`} />
                                    </div>
                                    <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">Revisions</span>
                                  </label>
                                </ProSettingWrapper>
                                
                              </div>
                            </div>
                          </>
                        )}

                        {/* Conditional Logic */}
                        {!isEndpoint && (
                          <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
                            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
                              <GitBranch className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                                <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))]">Conditional Logic</span>
                                <ProBadge />
                                {/* ProBadge auto-hides when isPro is true */}
                                {field.conditional_logic?.enabled && field.conditional_logic.rules.length > 0 && (
                                  <span className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                                    {field.conditional_logic.rules.length} rule(s)
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => field.conditional_logic ? openConditionalModal(field.id) : initializeConditionalLogic(field.id)}
                              className={`rdcfe-px-4 rdcfe-py-2 rdcfe-rounded-lg rdcfe-text-[13px] rdcfe-font-medium rdcfe-transition-colors ${
                                field.conditional_logic?.enabled 
                                  ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-text-white hover:rdcfe-bg-[hsl(var(--rdcfe-primary)/0.9)]' 
                                  : 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))]'
                              }`}
                            >
                              {field.conditional_logic?.enabled ? 'Edit Rules' : 'Add Rules'}
                            </button>
                          </div>
                        )}

                        {/* Regex Validation (Pro). Only shown for text-style
                            inputs where a pattern actually applies — multi-
                            value / picker types use their own validation. */}
                        {!isEndpoint && ['text', 'textarea', 'number', 'email', 'url'].includes(field.type) && (
                          <ProSettingWrapper feature="regex_validation" featureName="Regex Validation">
                            <div className="rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border)/0.5)] rdcfe-space-y-3">
                              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                                <Code2 className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                                <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))]">Pattern Validation</span>
                                <ProBadge />
                              </div>
                              <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-2 rdcfe-gap-3">
                                <div>
                                  <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Regex Pattern
                                  </label>
                                  <Input
                                    value={field.validation_pattern || ''}
                                    onChange={(e) => updateMetaField(field.id, 'validation_pattern', e.target.value)}
                                    placeholder="e.g. ^[A-Z]{2}\\d{4}$"
                                  />
                                  <p className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
                                    PCRE syntax. Bare patterns are auto-wrapped in <code>/.../</code>.
                                  </p>
                                </div>
                                <div>
                                  <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">
                                    Error Message
                                  </label>
                                  <Input
                                    value={field.validation_message || ''}
                                    onChange={(e) => updateMetaField(field.id, 'validation_message', e.target.value)}
                                    placeholder="Shown when the pattern fails"
                                  />
                                </div>
                              </div>
                            </div>
                          </ProSettingWrapper>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Add Field Button */}
              <button
                type="button"
                onClick={addMetaField}
                className="rdcfe-w-full rdcfe-py-4 rdcfe-border-2 rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-rounded-xl rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-transition-colors rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2"
              >
                <Plus className="rdcfe-w-4 rdcfe-h-4" />
                Add Another Field
              </button>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Conditional Logic Modal */}
      {conditionalModalOpen && (
        <div className="rdcfe-fixed rdcfe-inset-0 rdcfe-z-50 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-bg-black/50">
          <div className="rdcfe-bg-white rdcfe-rounded-2xl rdcfe-shadow-2xl rdcfe-w-full rdcfe-max-w-xl rdcfe-max-h-[80vh] rdcfe-overflow-hidden">
            {(() => {
              const field = metaFields.find(f => f.id === conditionalModalOpen);
              if (!field) return null;
              
              return (
                <>
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-6 rdcfe-py-4 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))]">
                    <h3 className="rdcfe-text-[16px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                      Conditional Logic for <span className="rdcfe-text-[hsl(var(--rdcfe-primary))]">{field.label || 'Untitled'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={closeConditionalModal}
                      className="rdcfe-p-2 rdcfe-rounded-lg rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-colors"
                    >
                      <X className="rdcfe-w-5 rdcfe-h-5" />
                    </button>
                  </div>
                  
                  <div className="rdcfe-p-6 rdcfe-space-y-5 rdcfe-overflow-y-auto rdcfe-max-h-[60vh]">
                    <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between">
                      <div>
                        <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                          Enable Conditional Logic
                        </label>
                        <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                          Toggle this option to set display rules.
                        </p>
                      </div>
                      <label className="rdcfe-cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.conditional_logic?.enabled ?? false}
                          onChange={(e) => toggleConditionalLogic(field.id, e.target.checked)}
                          className="rdcfe-sr-only"
                        />
                        <div className={`rdcfe-w-12 rdcfe-h-7 rdcfe-rounded-full rdcfe-transition-colors rdcfe-relative ${field.conditional_logic?.enabled ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))]' : 'rdcfe-bg-[hsl(var(--rdcfe-muted))]'}`}>
                          <div className={`rdcfe-absolute rdcfe-top-1 rdcfe-left-1 rdcfe-w-5 rdcfe-h-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow rdcfe-transition-transform ${field.conditional_logic?.enabled ? 'rdcfe-translate-x-5' : ''}`} />
                        </div>
                      </label>
                    </div>

                    {field.conditional_logic?.enabled && (() => {
                      // Storable controlling-field candidates only —
                      // exclude the field being configured (self-reference
                      // would be a loop), layout markers (tab/accordion/
                      // endpoint), and the html block (display-only, no
                      // value to compare).
                      const candidateFields = metaFields.filter(f =>
                        f.id !== field.id
                        && f.name
                        && f.object_type === 'field'
                        && f.type !== 'html'
                      );
                      const summary = buildConditionalSummary(field);

                      return (
                        <>
                          {summary && (
                            <div className="rdcfe-p-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-primary)/0.08)] rdcfe-border rdcfe-border-[hsl(var(--rdcfe-primary)/0.25)] rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-leading-relaxed">
                              <span className="rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-mr-1">Preview:</span>
                              {summary}
                            </div>
                          )}

                          {candidateFields.length === 0 && (
                            <div className="rdcfe-p-3 rdcfe-rounded-lg rdcfe-bg-[hsl(45_100%_95%)] rdcfe-border rdcfe-border-[hsl(45_90%_60%)] rdcfe-text-[12px] rdcfe-text-[hsl(45_30%_20%)]">
                              You need at least one other field with a name set before you can write a rule. Add a field, give it a label, then come back here.
                            </div>
                          )}

                          <div className="rdcfe-space-y-3">
                            {field.conditional_logic.rules.map((rule, ruleIndex) => {
                              const meta = getControlMeta(rule.field);
                              const isValueLess = ['empty', 'not_empty'].includes(rule.operator) || meta.valueInput === 'none';
                              const optionsMissing = meta.valueInput === 'option-select' && meta.options.length === 0;

                              return (
                                <div key={rule.id} className="rdcfe-p-4 rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]">
                                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-3">
                                    <GripVertical className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]" />
                                    <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                      Rule {ruleIndex + 1}
                                    </span>
                                    <div className="rdcfe-flex-1" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newRule = { ...rule, id: `rule_${Date.now()}` };
                                        setMetaFields(fields => fields.map(f => {
                                          if (f.id === field.id && f.conditional_logic) {
                                            return {
                                              ...f,
                                              conditional_logic: {
                                                ...f.conditional_logic,
                                                rules: [...f.conditional_logic.rules, newRule],
                                              },
                                            };
                                          }
                                          return f;
                                        }));
                                      }}
                                      className="rdcfe-p-1.5 rdcfe-rounded rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))]"
                                    >
                                      <Copy className="rdcfe-w-4 rdcfe-h-4" />
                                    </button>
                                    {(field.conditional_logic?.rules?.length ?? 0) > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeConditionalRule(field.id, rule.id)}
                                        className="rdcfe-p-1.5 rdcfe-rounded rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(0_84%_50%)] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                                      >
                                        <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
                                      </button>
                                    )}
                                  </div>

                                  <div className="rdcfe-space-y-3">
                                    <div>
                                      <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">Field</label>
                                      <select
                                        value={rule.field}
                                        onChange={(e) => handleConditionalRuleField(field.id, rule.id, e.target.value)}
                                        className="rdcfe-h-10 rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-3 rdcfe-text-[13px]"
                                      >
                                        <option value="">Select field...</option>
                                        {candidateFields.map(f => (
                                          <option key={f.id} value={f.name}>
                                            {(f.label || f.name) + ' (' + f.type + ')'}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">Operator</label>
                                      <Select
                                        options={meta.operators}
                                        value={rule.operator}
                                        onChange={(e) => handleConditionalRuleOperator(field.id, rule.id, e.target.value)}
                                      />
                                    </div>
                                    {!isValueLess && (
                                      <div>
                                        <label className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-1.5 rdcfe-block">Value</label>
                                        {meta.valueInput === 'option-select' ? (
                                          optionsMissing ? (
                                            <div className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-italic">
                                              The selected field has no options yet. Add options to it first.
                                            </div>
                                          ) : (
                                            <Select
                                              options={[{ value: '', label: 'Select value...' }, ...meta.options]}
                                              value={rule.value}
                                              onChange={(e) => updateConditionalRule(field.id, rule.id, 'value', e.target.value)}
                                            />
                                          )
                                        ) : meta.valueInput === 'number' ? (
                                          <Input
                                            type="number"
                                            value={rule.value}
                                            onChange={(e) => updateConditionalRule(field.id, rule.id, 'value', e.target.value)}
                                            placeholder="Enter a number..."
                                          />
                                        ) : meta.valueInput === 'date' ? (
                                          <Input
                                            type="date"
                                            value={rule.value}
                                            onChange={(e) => updateConditionalRule(field.id, rule.id, 'value', e.target.value)}
                                          />
                                        ) : meta.valueInput === 'datetime' ? (
                                          <Input
                                            type="datetime-local"
                                            value={rule.value}
                                            onChange={(e) => updateConditionalRule(field.id, rule.id, 'value', e.target.value)}
                                          />
                                        ) : (
                                          <Input
                                            value={rule.value}
                                            onChange={(e) => updateConditionalRule(field.id, rule.id, 'value', e.target.value)}
                                            placeholder="Enter value..."
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => addConditionalRule(field.id)}
                            className="rdcfe-btn rdcfe-btn-primary rdcfe-text-[13px] rdcfe-py-2"
                            disabled={candidateFields.length === 0}
                          >
                            <Plus className="rdcfe-w-4 rdcfe-h-4" />
                            New Rule
                          </button>

                          {(field.conditional_logic?.rules?.length ?? 0) > 1 && (
                            <div className="rdcfe-pt-4 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                              <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between">
                                <div>
                                  <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                                    Relation
                                  </label>
                                  <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                                    The logical relationship between rules.
                                  </p>
                                </div>
                                <div className="rdcfe-w-32">
                                  <select
                                    value={field.conditional_logic.relation}
                                    onChange={(e) => updateConditionalRelation(field.id, e.target.value as 'and' | 'or')}
                                    className="rdcfe-h-10 rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-3 rdcfe-text-[13px]"
                                  >
                                    <option value="and">And</option>
                                    <option value="or">Or</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-gap-3 rdcfe-px-6 rdcfe-py-4 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]">
                    <p className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      Rules save when you click <strong>Update</strong> on the post type form.
                    </p>
                    <button
                      type="button"
                      onClick={closeConditionalModal}
                      className="rdcfe-btn rdcfe-btn-primary"
                    >
                      Done
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <UpgradeModal
        open={showObjectTypeUpgrade}
        onOpenChange={setShowObjectTypeUpgrade}
        feature={objectTypeUpgradeLabel}
        featureCategory="field_type"
      />
    </>
  );
}
                                