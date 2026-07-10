/**
 * Listing component — Style tab.
 *
 * Shared inspector controls every component renders inside its "Style"
 * tab. Mirrors the Phase 1 + Phase 2 surface accepted by the PHP
 * `AbstractComponent::build_inline_style()`:
 *
 *   - Colors (Default | Hover sub-tabs): text + background, hover text +
 *     hover background
 *   - Typography: size+unit, weight, line-height, letter-spacing,
 *                 family, transform, style, decoration, alignment
 *   - Background, padding, margin, width (Auto/Full), border radius
 *   - Dynamic Meta only: `meta_flow` (`''` | `'inline'`) — not CSS;
 *     groups consecutive inline metas into one row server-side.
 *
 * Author input is mirrored 1:1 onto `settings.style.<key>`, so the PHP
 * renderer is the single source of truth for what actually paints.
 * Anything the renderer rejects (unknown unit, unsafe value) is silently
 * dropped server-side — the UI never has to mirror that whitelist
 * twice.
 */

import { useCallback, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  CaseUpper,
  CaseLower,
  CaseSensitive,
  Type,
  MousePointer2,
} from 'lucide-react';
import { Input, Select, type SelectOption } from '../../ui';
import { InspectorRow } from '../shared';
import { SpacingControl } from './SpacingControl';
import { NumberSliderInput } from './NumberSliderInput';

/** Author-supplied style blob. Every key is optional. */
export interface ListingComponentStyle {
  // Phase 1 — typography.
  color?: string;
  font_size?: string | number;
  font_size_unit?: 'px' | 'em' | 'rem' | 'vw';
  font_weight?: '' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  text_align?: '' | 'left' | 'center' | 'right' | 'justify';
  text_transform?: '' | 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  font_style?: '' | 'normal' | 'italic';
  text_decoration?: '' | 'none' | 'underline' | 'line-through';
  line_height?: string;
  letter_spacing?: string;
  font_family?: string;
  // Phase 2 — box.
  background?: string;
  padding?: string;
  margin?: string;
  width?: 'auto' | 'full';
  hover_color?: string;
  /** Hover fill — emitted as `--rdcfe-listing-hover-bg` on the component. */
  hover_background?: string;
  border_radius?: string;
  /**
   * Dynamic Meta only — groups with adjacent siblings that also use
   * `inline` into one horizontal row (PHP + `.rdcfe-listing__meta-inline-row`).
   */
  meta_flow?: '' | 'inline';
}

interface StyleControlsProps {
  style: ListingComponentStyle;
  onChange: (patch: Partial<ListingComponentStyle>) => void;
  /**
   * Hide Phase 2 controls (background, padding, margin, width, hover,
   * border radius) — not every host component benefits from them.
   * Defaults to `false` (show everything).
   */
  hideBoxControls?: boolean;
  /** Dynamic Meta — show "Inline row" layout control in the Style tab. */
  showMetaFlow?: boolean;
}

const FONT_WEIGHT_OPTIONS: SelectOption[] = [
  { value: '', label: 'Default' },
  { value: '300', label: '300 — Light' },
  { value: '400', label: '400 — Regular' },
  { value: '500', label: '500 — Medium' },
  { value: '600', label: '600 — Semibold' },
  { value: '700', label: '700 — Bold' },
  { value: '800', label: '800 — Extra Bold' },
  { value: '900', label: '900 — Black' },
];

const FONT_SIZE_UNITS: SelectOption[] = [
  { value: 'px', label: 'PX' },
  { value: 'em', label: 'EM' },
  { value: 'rem', label: 'REM' },
  { value: 'vw', label: 'VW' },
];

const META_FLOW_OPTIONS: SelectOption[] = [
  { value: '', label: 'Stack (default)' },
  {
    value: 'inline',
    label: 'Inline row',
  },
];

/** Curated swatch palette — same hues used elsewhere in the plugin. */
const COLOR_SWATCHES: string[] = [
  '#000000',
  '#1f2937',
  '#6b7280',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#675dd8',
  '#a855f7',
  '#ec4899',
  '#ffffff',
];

type ColorStateTab = 'default' | 'hover';

export function StyleControls({ style, onChange, hideBoxControls, showMetaFlow }: StyleControlsProps) {
  const [colorTab, setColorTab] = useState<ColorStateTab>('default');

  const set = useCallback(
    <K extends keyof ListingComponentStyle>(key: K, value: ListingComponentStyle[K]) => {
      onChange({ [key]: value } as Partial<ListingComponentStyle>);
    },
    [onChange]
  );

  return (
    <div>
      {showMetaFlow && (
        <>
          <SectionHeading label="Layout" />
          <InspectorRow
            label="Dynamic Meta flow"
            hint='Use "Inline row" on each meta you want on the same line (e.g. date + author). They must be next to each other in the canvas.'
          >
            <Select
              options={META_FLOW_OPTIONS}
              value={style.meta_flow ?? ''}
              onChange={(e) => set('meta_flow', e.target.value as ListingComponentStyle['meta_flow'])}
            />
          </InspectorRow>
        </>
      )}

      <SectionHeading label="Colors" />

      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-mb-3 rdcfe-p-0.5 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))]">
        <button
          type="button"
          onClick={() => setColorTab('default')}
          className={`rdcfe-flex-1 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-1.5 rdcfe-py-1.5 rdcfe-px-2 rdcfe-rounded-md rdcfe-text-[12px] rdcfe-font-medium rdcfe-transition-colors ${
            colorTab === 'default'
              ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
              : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
          }`}
        >
          <Type className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-opacity-80" />
          Default
        </button>
        <button
          type="button"
          onClick={() => setColorTab('hover')}
          className={`rdcfe-flex-1 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-1.5 rdcfe-py-1.5 rdcfe-px-2 rdcfe-rounded-md rdcfe-text-[12px] rdcfe-font-medium rdcfe-transition-colors ${
            colorTab === 'hover'
              ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm'
              : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
          }`}
        >
          <MousePointer2 className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-opacity-80" />
          Hover
        </button>
      </div>

      {colorTab === 'default' && (
        <>
          <InspectorRow label="Text Color" hint="Pick a swatch or type any CSS color value.">
            <ColorPicker value={style.color ?? ''} onChange={(value) => set('color', value)} />
          </InspectorRow>
          {!hideBoxControls && (
            <InspectorRow label="Background" hint="Fills the component box.">
              <ColorPicker value={style.background ?? ''} onChange={(value) => set('background', value)} />
            </InspectorRow>
          )}
        </>
      )}

      {colorTab === 'hover' && (
        <>
          <InspectorRow
            label="Text Color"
            hint="Color when the visitor hovers the listing card area (or this component)."
          >
            <ColorPicker value={style.hover_color ?? ''} onChange={(value) => set('hover_color', value)} />
          </InspectorRow>
          {!hideBoxControls && (
            <InspectorRow label="Background" hint="Background on hover only. Leave empty to keep the default background.">
              <ColorPicker
                value={style.hover_background ?? ''}
                onChange={(value) => set('hover_background', value)}
              />
            </InspectorRow>
          )}
        </>
      )}

      {/* ── Typography ───────────────────────────────────────────── */}
      <SectionHeading label="Typography" />

      <InspectorRow label="Size">
        <SizeWithUnit
          value={String(style.font_size ?? '')}
          unit={style.font_size_unit ?? 'px'}
          onValueChange={(value) => set('font_size', value)}
          onUnitChange={(unit) => set('font_size_unit', unit as ListingComponentStyle['font_size_unit'])}
          placeholder="14"
        />
      </InspectorRow>

      <InspectorRow label="Weight">
        <Select
          options={FONT_WEIGHT_OPTIONS}
          value={style.font_weight ?? ''}
          onChange={(e) => set('font_weight', e.target.value as ListingComponentStyle['font_weight'])}
        />
      </InspectorRow>

      <InspectorRow label="Alignment">
        <SegmentedGroup
          value={style.text_align ?? ''}
          onChange={(value) => set('text_align', value as ListingComponentStyle['text_align'])}
          options={[
            { value: '', label: 'Default', icon: <Type className="rdcfe-w-3.5 rdcfe-h-3.5" /> },
            { value: 'left', icon: <AlignLeft className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'Left' },
            { value: 'center', icon: <AlignCenter className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'Center' },
            { value: 'right', icon: <AlignRight className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'Right' },
            { value: 'justify', icon: <AlignJustify className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'Justify' },
          ]}
        />
      </InspectorRow>

      <InspectorRow label="Transform">
        <SegmentedGroup
          value={style.text_transform ?? ''}
          onChange={(value) => set('text_transform', value as ListingComponentStyle['text_transform'])}
          options={[
            { value: '', label: 'Default' },
            { value: 'none', label: 'None' },
            { value: 'uppercase', icon: <CaseUpper className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'UPPERCASE' },
            { value: 'lowercase', icon: <CaseLower className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'lowercase' },
            { value: 'capitalize', icon: <CaseSensitive className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'Capitalize' },
          ]}
        />
      </InspectorRow>

      <InspectorRow label="Style & Decoration">
        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-2">
          <SegmentedGroup
            value={style.font_weight === '700' ? '700' : ''}
            onChange={(value) => set('font_weight', value === '700' ? '700' : '')}
            options={[{ value: '700', icon: <Bold className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'Bold' }]}
          />
          <SegmentedGroup
            value={style.font_style ?? ''}
            onChange={(value) => set('font_style', value as ListingComponentStyle['font_style'])}
            options={[{ value: 'italic', icon: <Italic className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'Italic' }]}
          />
          <SegmentedGroup
            value={style.text_decoration ?? ''}
            onChange={(value) => set('text_decoration', value as ListingComponentStyle['text_decoration'])}
            options={[
              { value: 'underline', icon: <Underline className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'Underline' },
              { value: 'line-through', icon: <Strikethrough className="rdcfe-w-3.5 rdcfe-h-3.5" />, title: 'Strikethrough' },
            ]}
          />
        </div>
      </InspectorRow>

      <InspectorRow label="Line Height" hint="Unitless multiplier of the font size.">
        <NumberSliderInput
          value={style.line_height ?? ''}
          onChange={(next) => set('line_height', next)}
          min={0.8}
          max={3}
          step={0.05}
          placeholder={1.4}
        />
      </InspectorRow>

      <InspectorRow label="Letter Spacing" hint="Pixels — negative tightens, positive loosens.">
        <NumberSliderInput
          value={style.letter_spacing ?? ''}
          onChange={(next) => set('letter_spacing', next)}
          min={-2}
          max={10}
          step={0.1}
          unit="px"
          placeholder={0}
        />
      </InspectorRow>

      <InspectorRow label="Font Family" hint="System or Google fonts (theme must register the family).">
        <Input
          value={style.font_family ?? ''}
          onChange={(e) => set('font_family', e.target.value)}
          placeholder="Default"
        />
      </InspectorRow>

      {!hideBoxControls && (
        <>
          {/* ── Box ──────────────────────────────────────────────── */}
          <SectionHeading label="Box" />

          <InspectorRow label="Padding" hint="Pixels per side. Lock to keep all sides in sync.">
            <SpacingControl
              value={style.padding ?? ''}
              onChange={(next) => set('padding', next)}
            />
          </InspectorRow>

          <InspectorRow label="Margin" hint="Pixels per side. Negative values allowed.">
            <SpacingControl
              value={style.margin ?? ''}
              onChange={(next) => set('margin', next)}
              allowNegative
            />
          </InspectorRow>

          {/*
            Border-radius shares padding/margin's `[a, b, c, d]`
            shorthand collapse rules — same parser/serializer works
            for both. Only the per-side labels change: corners (TL,
            TR, BR, BL) instead of edges (TOP, RIGHT, BOTTOM, LEFT).
          */}
          <InspectorRow label="Border Radius" hint="Pixels per corner. Lock for a uniform pill / circle.">
            <SpacingControl
              value={style.border_radius ?? ''}
              onChange={(next) => set('border_radius', next)}
              sideLabels={['TL', 'TR', 'BR', 'BL']}
            />
          </InspectorRow>

          <InspectorRow label="Width">
            <SegmentedGroup
              value={style.width ?? 'auto'}
              onChange={(value) => set('width', value as ListingComponentStyle['width'])}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'full', label: 'Fullwidth' },
              ]}
            />
          </InspectorRow>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="rdcfe-mt-4 rdcfe-mb-2 rdcfe-pb-1.5 rdcfe-text-[10px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border)/0.6)] first:rdcfe-mt-0">
      {label}
    </div>
  );
}

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="rdcfe-space-y-2">
      <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-1.5">
        {COLOR_SWATCHES.map((swatch) => {
          const isActive = value.toLowerCase() === swatch.toLowerCase();
          return (
            <button
              key={swatch}
              type="button"
              onClick={() => onChange(swatch)}
              title={swatch}
              className={`rdcfe-w-6 rdcfe-h-6 rdcfe-rounded-full rdcfe-border rdcfe-transition-all ${
                isActive
                  ? 'rdcfe-ring-2 rdcfe-ring-offset-1 rdcfe-ring-[hsl(var(--rdcfe-primary))] rdcfe-border-white'
                  : 'rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-scale-110'
              }`}
              style={{ backgroundColor: swatch }}
            />
          );
        })}
        <button
          type="button"
          onClick={() => onChange('')}
          title="Clear"
          className={`rdcfe-w-6 rdcfe-h-6 rdcfe-rounded-full rdcfe-border rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[10px] rdcfe-font-bold rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(var(--rdcfe-destructive)/0.1)] ${
            !value
              ? 'rdcfe-ring-2 rdcfe-ring-offset-1 rdcfe-ring-[hsl(var(--rdcfe-primary))] rdcfe-border-white'
              : 'rdcfe-border-[hsl(var(--rdcfe-border))]'
          }`}
        >
          ✕
        </button>
      </div>
      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
        <input
          type="color"
          value={isHex(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-cursor-pointer rdcfe-bg-white rdcfe-p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000 / rgb(...) / inherit"
          className="rdcfe-flex-1 rdcfe-h-9 rdcfe-px-2 rdcfe-text-[12px] rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-outline-none focus:rdcfe-border-[hsl(var(--rdcfe-primary))]"
        />
      </div>
    </div>
  );
}

function isHex(s: string): boolean {
  return /^#(?:[0-9a-f]{3,4}){1,2}$/i.test(s.trim());
}

interface SizeWithUnitProps {
  value: string;
  unit: NonNullable<ListingComponentStyle['font_size_unit']>;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  placeholder?: string;
}

function SizeWithUnit({ value, unit, onValueChange, onUnitChange, placeholder }: SizeWithUnitProps) {
  return (
    <div className="rdcfe-flex rdcfe-items-stretch rdcfe-gap-2">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="rdcfe-flex-1"
      />
      <SegmentedGroup
        value={unit}
        onChange={(next) => onUnitChange(next)}
        options={FONT_SIZE_UNITS.map((u) => ({ value: u.value, label: u.label }))}
        compact
      />
    </div>
  );
}

interface SegmentedOption {
  value: string;
  label?: string;
  icon?: React.ReactNode;
  title?: string;
}

interface SegmentedGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: SegmentedOption[];
  /** Smaller px values, intended for unit toggles inside numeric inputs. */
  compact?: boolean;
}

function SegmentedGroup({ value, onChange, options, compact }: SegmentedGroupProps) {
  return (
    <div className="rdcfe-inline-flex rdcfe-items-stretch rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-overflow-hidden">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value || '__default'}
            type="button"
            onClick={() => onChange(isActive ? '' : option.value)}
            title={option.title ?? option.label}
            className={`rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-1 rdcfe-border-r rdcfe-border-[hsl(var(--rdcfe-border))] last:rdcfe-border-r-0 rdcfe-transition-colors ${
              compact ? 'rdcfe-px-2 rdcfe-py-1.5 rdcfe-text-[11px]' : 'rdcfe-px-2.5 rdcfe-py-1.5 rdcfe-text-[12px]'
            } ${
              isActive
                ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.12)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-font-semibold'
                : 'rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]'
            }`}
          >
            {option.icon}
            {option.label && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
