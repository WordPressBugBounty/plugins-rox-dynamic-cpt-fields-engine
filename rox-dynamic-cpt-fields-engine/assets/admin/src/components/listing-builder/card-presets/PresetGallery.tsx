/**
 * Quick-start preset gallery.
 *
 * Renders a grid of card-preset previews. Picking one calls
 * `applyPreset` against the live component descriptor list and hands
 * the result back to the parent through `onPick`.
 *
 * The gallery is intentionally framework-agnostic about *where* the
 * resulting node list goes — the parent decides whether to drop it
 * onto an empty canvas (no confirm) or to replace an existing layout
 * (confirm). Two render contexts: a roomy 2-column variant for the
 * empty canvas, and a compact 1-column variant for a future "Insert
 * preset" menu.
 */

import { useState } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import type {
  ListingComponentDescriptor,
  ListingComponentNode,
} from '../../../services/api';
import { CARD_PRESETS } from './cards';
import { applyPreset } from './applyPreset';
import type { CardPreset } from './types';

interface PresetGalleryProps {
  /** Descriptor catalogue from `/listings/components`. */
  descriptors: ListingComponentDescriptor[];
  /** Called with the freshly-built component list when a preset is picked. */
  onPick: (preset: CardPreset, nodes: ListingComponentNode[]) => void;
  /**
   * Whether the current canvas already has components — picking a
   * preset in this state shows a confirm dialog because applying
   * replaces the layout.
   */
  hasExistingLayout?: boolean;
  /** Visual density. */
  variant?: 'roomy' | 'compact';
}

export function PresetGallery({
  descriptors,
  onPick,
  hasExistingLayout = false,
  variant = 'roomy',
}: PresetGalleryProps) {
  const [confirming, setConfirming] = useState<CardPreset | null>(null);

  const handlePick = (preset: CardPreset) => {
    if (hasExistingLayout) {
      setConfirming(preset);
      return;
    }
    commit(preset);
  };

  const commit = (preset: CardPreset) => {
    const nodes = applyPreset(preset, descriptors);
    if (nodes.length === 0) {
      // Component types missing from the descriptor list — nothing
      // we can build. Surface a hint instead of silently failing.
      window.alert(
        'No components from this preset are available right now. Make sure the Pro plugin is active.'
      );
      return;
    }
    onPick(preset, nodes);
    setConfirming(null);
  };

  return (
    <div>
      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-mb-3">
        <Sparkles className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-[hsl(var(--rdcfe-primary))]" />
        <span className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-foreground))]">
          Quick-start presets
        </span>
        <span className="rdcfe-flex-1 rdcfe-h-px rdcfe-bg-[hsl(var(--rdcfe-border))]" />
        <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
          {CARD_PRESETS.length} layouts
        </span>
      </div>

      <div
        className={`rdcfe-grid rdcfe-gap-3 ${
          variant === 'roomy'
            ? 'rdcfe-grid-cols-1 sm:rdcfe-grid-cols-2 lg:rdcfe-grid-cols-3'
            : 'rdcfe-grid-cols-1'
        }`}
      >
        {CARD_PRESETS.map((preset) => (
          <PresetCard key={preset.id} preset={preset} onPick={handlePick} />
        ))}
      </div>

      {confirming && (
        <ReplaceConfirmDialog
          preset={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={() => commit(confirming)}
        />
      )}
    </div>
  );
}

interface PresetCardProps {
  preset: CardPreset;
  onPick: (preset: CardPreset) => void;
}

function PresetCard({ preset, onPick }: PresetCardProps) {
  return (
    <button
      type="button"
      onClick={() => onPick(preset)}
      className="rdcfe-group rdcfe-relative rdcfe-flex rdcfe-flex-col rdcfe-items-stretch rdcfe-text-left rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-overflow-hidden hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-shadow-md rdcfe-transition-all"
    >
      <div className="rdcfe-h-32 rdcfe-bg-gradient-to-br rdcfe-from-[hsl(var(--rdcfe-primary)/0.06)] rdcfe-to-[hsl(var(--rdcfe-muted)/0.6)] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-px-4">
        <PresetThumbnail preset={preset} />
      </div>
      <div className="rdcfe-p-3 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mb-1">
          <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
            {preset.label}
          </span>
          <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            {preset.nodes.length} blocks
          </span>
        </div>
        <p className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-snug">
          {preset.description}
        </p>
      </div>
    </button>
  );
}

/**
 * Lightweight wireframe rendering of the preset's node list. We don't
 * hit the preview REST endpoint here — six requests on first paint
 * would be wasteful, and the wireframe communicates layout without
 * needing real data.
 */
function PresetThumbnail({ preset }: { preset: CardPreset }) {
  return (
    <div className="rdcfe-w-full rdcfe-flex rdcfe-flex-col rdcfe-gap-1.5">
      {preset.nodes.map((node, idx) => (
        <PresetThumbnailRow key={`${node.type}-${idx}`} type={node.type} />
      ))}
    </div>
  );
}

function PresetThumbnailRow({ type }: { type: string }) {
  if (type === 'dynamic_image') {
    return <div className="rdcfe-h-6 rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-primary)/0.18)]" />;
  }
  if (type === 'dynamic_link') {
    return (
      <div className="rdcfe-flex rdcfe-justify-start">
        <div className="rdcfe-h-3 rdcfe-w-12 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary)/0.5)]" />
      </div>
    );
  }
  if (type === 'term_badges') {
    return (
      <div className="rdcfe-flex rdcfe-gap-1">
        <div className="rdcfe-h-2 rdcfe-w-8 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary)/0.35)]" />
        <div className="rdcfe-h-2 rdcfe-w-6 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary)/0.35)]" />
      </div>
    );
  }
  if (type === 'dynamic_meta') {
    return <div className="rdcfe-h-1.5 rdcfe-w-1/2 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-muted-foreground)/0.35)]" />;
  }
  if (type === 'dynamic_text') {
    return <div className="rdcfe-h-2.5 rdcfe-w-3/4 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-foreground)/0.65)]" />;
  }
  return <div className="rdcfe-h-2 rdcfe-w-2/3 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-muted-foreground)/0.4)]" />;
}

interface ReplaceConfirmDialogProps {
  preset: CardPreset;
  onCancel: () => void;
  onConfirm: () => void;
}

function ReplaceConfirmDialog({ preset, onCancel, onConfirm }: ReplaceConfirmDialogProps) {
  return (
    <div
      className="rdcfe-fixed rdcfe-inset-0 rdcfe-z-[60] rdcfe-bg-black/40 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-p-4"
      onClick={onCancel}
    >
      <div
        className="rdcfe-bg-white rdcfe-rounded-xl rdcfe-shadow-xl rdcfe-max-w-md rdcfe-w-full rdcfe-p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3 rdcfe-mb-3">
          <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-[hsl(38_92%_50%/0.12)] rdcfe-text-[hsl(38_92%_45%)] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-flex-shrink-0">
            <AlertTriangle className="rdcfe-w-4 rdcfe-h-4" />
          </div>
          <div>
            <div className="rdcfe-text-[15px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
              Replace current layout?
            </div>
            <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-1">
              Applying the <strong>{preset.label}</strong> preset removes every component on
              the canvas and drops in {preset.nodes.length} new ones. You can undo this with{' '}
              <kbd className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-text-[11px] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]">
                Ctrl/Cmd+Z
              </kbd>
              .
            </p>
          </div>
        </div>
        <div className="rdcfe-flex rdcfe-justify-end rdcfe-gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[12px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[12px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-text-white hover:rdcfe-bg-[hsl(var(--rdcfe-primary)/0.9)] rdcfe-transition-colors"
          >
            Replace layout
          </button>
        </div>
      </div>
    </div>
  );
}
