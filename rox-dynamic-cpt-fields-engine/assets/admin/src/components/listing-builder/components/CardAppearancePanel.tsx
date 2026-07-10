/**
 * Card Appearance Panel.
 *
 * Shown in the inspector rail when no component is selected. Controls
 * the card wrapper styles (padding, border, shadow, hover effects, etc.)
 * via boolean toggles stored in `ListingConfigData.card_style`.
 *
 * Also offers one-click presets (Elevated, Flat, Outlined, Minimal) so
 * authors can switch the card chrome in a single click.
 */

import { useState } from 'react';
import {
  CreditCard,
  Box,
  Layers,
  MousePointerClick,
  Radius,
  ZoomIn,
  Sparkles,
  ChevronDown,
  Square,
} from 'lucide-react';
import type { ListingCardStyle, ListingConfigData } from '../../../services/api';
import { DEFAULT_CARD_STYLE } from '../../../services/api';

interface CardAppearancePanelProps {
  data: ListingConfigData;
  setData: (updater: (prev: ListingConfigData) => ListingConfigData) => void;
}

interface CardStylePreset {
  id: string;
  label: string;
  description: string;
  style: ListingCardStyle;
}

const CARD_PRESETS: CardStylePreset[] = [
  {
    id: 'elevated',
    label: 'Elevated',
    description: 'Full card chrome with shadow, border, and hover lift',
    style: {
      padding: true,
      border: true,
      shadow: true,
      hover_lift: true,
      border_radius: true,
      image_hover_zoom: true,
    },
  },
  {
    id: 'flat',
    label: 'Flat',
    description: 'Border and padding, no shadow or hover effects',
    style: {
      padding: true,
      border: true,
      shadow: false,
      hover_lift: false,
      border_radius: true,
      image_hover_zoom: false,
    },
  },
  {
    id: 'outlined',
    label: 'Outlined',
    description: 'Border only — no padding, content goes edge-to-edge',
    style: {
      padding: false,
      border: true,
      shadow: false,
      hover_lift: false,
      border_radius: true,
      image_hover_zoom: false,
    },
  },
  {
    id: 'shadow-only',
    label: 'Shadow',
    description: 'Floating card — shadow without border',
    style: {
      padding: true,
      border: false,
      shadow: true,
      hover_lift: true,
      border_radius: true,
      image_hover_zoom: true,
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'No card chrome at all — raw content only',
    style: {
      padding: false,
      border: false,
      shadow: false,
      hover_lift: false,
      border_radius: false,
      image_hover_zoom: false,
    },
  },
];

function resolveCardStyle(data: ListingConfigData): ListingCardStyle {
  return { ...DEFAULT_CARD_STYLE, ...(data.card_style ?? {}) };
}

function detectActivePreset(style: ListingCardStyle): string | null {
  for (const preset of CARD_PRESETS) {
    const keys = Object.keys(preset.style) as (keyof ListingCardStyle)[];
    if (keys.every((k) => style[k] === preset.style[k])) {
      return preset.id;
    }
  }
  return null;
}

interface ToggleTileProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onChange: (active: boolean) => void;
}

function ToggleTile({ label, icon, active, onChange }: ToggleTileProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      title={`${active ? 'Disable' : 'Enable'} ${label}`}
      className={`rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-gap-1 rdcfe-px-2 rdcfe-py-2 rdcfe-rounded-lg rdcfe-border rdcfe-transition-all rdcfe-text-center ${
        active
          ? 'rdcfe-border-[hsl(var(--rdcfe-primary)/0.4)] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.06)] rdcfe-text-[hsl(var(--rdcfe-primary))]'
          : 'rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-border-[hsl(var(--rdcfe-muted-foreground)/0.4)]'
      }`}
    >
      {icon}
      <span className="rdcfe-text-[10px] rdcfe-font-medium rdcfe-leading-tight">{label}</span>
    </button>
  );
}

export function CardAppearancePanel({ data, setData }: CardAppearancePanelProps) {
  const style = resolveCardStyle(data);
  const activePreset = detectActivePreset(style);
  const [showFine, setShowFine] = useState(false);

  const updateStyle = (patch: Partial<ListingCardStyle>) => {
    setData((prev) => ({
      ...prev,
      card_style: { ...resolveCardStyle(prev), ...patch },
    }));
  };

  const applyPreset = (preset: CardStylePreset) => {
    setData((prev) => ({
      ...prev,
      card_style: { ...preset.style },
    }));
  };

  return (
    <div className="rdcfe-card rdcfe-overflow-visible">
      {/* Header */}
      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2.5 rdcfe-px-5 rdcfe-py-3 rdcfe-bg-gradient-to-r rdcfe-from-[hsl(var(--rdcfe-primary)/0.08)] rdcfe-to-transparent rdcfe-rounded-t-xl">
        <div className="rdcfe-w-7 rdcfe-h-7 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0">
          <CreditCard className="rdcfe-w-3.5 rdcfe-h-3.5" />
        </div>
        <div className="rdcfe-min-w-0">
          <div className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
            Card Appearance
          </div>
          <p className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-tight">
            Control the card wrapper styles
          </p>
        </div>
      </div>

      {/* Presets strip — always visible */}
      <div className="rdcfe-px-5 rdcfe-pt-4 rdcfe-pb-3 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-mb-2.5">
          <Sparkles className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
          <span className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            Presets
          </span>
        </div>
        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-1.5">
          {CARD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className={`rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[11px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-border rdcfe-transition-all ${
                activePreset === preset.id
                  ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-text-white rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-shadow-sm'
                  : 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.5)] hover:rdcfe-text-[hsl(var(--rdcfe-primary))]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fine-tune — collapsible icon grid */}
      <div className="rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
        <button
          type="button"
          onClick={() => setShowFine((v) => !v)}
          className="rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-5 rdcfe-py-2.5 rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-colors"
        >
          <span className="rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
            <Square className="rdcfe-w-3 rdcfe-h-3" />
            Fine-tune
          </span>
          <ChevronDown
            className={`rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-transition-transform rdcfe-duration-200 ${
              showFine ? 'rdcfe-rotate-180' : ''
            }`}
          />
        </button>

        {showFine && (
          <div className="rdcfe-px-5 rdcfe-pb-4 rdcfe-grid rdcfe-grid-cols-3 rdcfe-gap-2">
            <ToggleTile
              label="Padding"
              icon={<Box className="rdcfe-w-4 rdcfe-h-4" />}
              active={style.padding}
              onChange={(v) => updateStyle({ padding: v })}
            />
            <ToggleTile
              label="Border"
              icon={<Square className="rdcfe-w-4 rdcfe-h-4" />}
              active={style.border}
              onChange={(v) => updateStyle({ border: v })}
            />
            <ToggleTile
              label="Shadow"
              icon={<Layers className="rdcfe-w-4 rdcfe-h-4" />}
              active={style.shadow}
              onChange={(v) => updateStyle({ shadow: v })}
            />
            <ToggleTile
              label="Hover Lift"
              icon={<MousePointerClick className="rdcfe-w-4 rdcfe-h-4" />}
              active={style.hover_lift}
              onChange={(v) => updateStyle({ hover_lift: v })}
            />
            <ToggleTile
              label="Radius"
              icon={<Radius className="rdcfe-w-4 rdcfe-h-4" />}
              active={style.border_radius}
              onChange={(v) => updateStyle({ border_radius: v })}
            />
            <ToggleTile
              label="Img Zoom"
              icon={<ZoomIn className="rdcfe-w-4 rdcfe-h-4" />}
              active={style.image_hover_zoom}
              onChange={(v) => updateStyle({ image_hover_zoom: v })}
            />
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="rdcfe-px-5 rdcfe-py-2.5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-rounded-b-xl rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
        Click a component on the canvas to edit its settings.
      </div>
    </div>
  );
}
