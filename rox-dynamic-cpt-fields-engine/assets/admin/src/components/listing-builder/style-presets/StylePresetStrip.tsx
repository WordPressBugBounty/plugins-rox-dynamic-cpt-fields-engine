/**
 * Style preset strip — horizontal chip row at the top of the Style tab.
 *
 * Renders one chip per registered preset for the active component
 * type. The active chip (matching the current `style` blob) gets a
 * filled treatment so authors see at a glance which preset (if any)
 * they're on.
 */

import { Sparkles } from 'lucide-react';
import type { ListingComponentType } from '../../../services/api';
import type { ListingComponentStyle } from '../components/StyleControls';
import { STYLE_PRESETS, detectActiveStylePreset, type StylePreset } from './index';

interface StylePresetStripProps {
  type: ListingComponentType;
  style: ListingComponentStyle | undefined;
  onApply: (preset: StylePreset) => void;
}

export function StylePresetStrip({ type, style, onApply }: StylePresetStripProps) {
  const presets = STYLE_PRESETS[type] ?? [];
  if (presets.length === 0) return null;

  const activeId = detectActiveStylePreset(type, style);

  return (
    <div className="rdcfe-mb-3">
      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-mb-1.5">
        <Sparkles className="rdcfe-w-3 rdcfe-h-3 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
        <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
          Presets
        </span>
      </div>
      <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-1.5">
        {presets.map((preset) => {
          const isActive = preset.id === activeId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApply(preset)}
              title={preset.description ?? preset.label}
              className={`rdcfe-px-2.5 rdcfe-py-1 rdcfe-rounded-full rdcfe-text-[11px] rdcfe-font-semibold rdcfe-border rdcfe-transition-colors ${
                isActive
                  ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.12)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-border-[hsl(var(--rdcfe-primary)/0.4)]'
                  : 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-text-[hsl(var(--rdcfe-primary))]'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
