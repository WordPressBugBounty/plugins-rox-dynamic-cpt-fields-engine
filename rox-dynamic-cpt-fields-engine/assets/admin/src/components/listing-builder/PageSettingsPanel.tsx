/**
 * Page Settings Panel.
 *
 * Sidebar panel for single_page / archive_page listing types. Replaces
 * the card style toggles with page-specific settings:
 *
 *   - **Placement** — how the template is injected (full override,
 *     replace content only, before/after content).
 *   - **Canvas Mode** — full width, theme default, or blank canvas.
 *   - **Preview Post** — (single page only) pick a sample post whose
 *     data is used in the canvas preview.
 */

import { Settings2 } from 'lucide-react';
import { CollapsibleSection } from './shared';
import type { ListingConfigData, ListingPlacement, ListingCanvasMode } from '../../services/api';

interface PageSettingsPanelProps {
  data: ListingConfigData;
  setData: (updater: (prev: ListingConfigData) => ListingConfigData) => void;
}

const PLACEMENT_OPTIONS: { value: ListingPlacement; label: string; description: string }[] = [
  {
    value: 'template_include',
    label: 'Full Page Override',
    description: 'Replaces the entire page output (header/footer from your theme still render).',
  },
  {
    value: 'replace_content',
    label: 'Replace Content Only',
    description: 'Replaces only the_content area, keeping theme layout intact.',
  },
  {
    value: 'before_content',
    label: 'Before Content',
    description: 'Inserts this template before the_content.',
  },
  {
    value: 'after_content',
    label: 'After Content',
    description: 'Inserts this template after the_content.',
  },
];

const CANVAS_MODE_OPTIONS: { value: ListingCanvasMode; label: string; description: string }[] = [
  {
    value: 'full_width',
    label: 'Full Width',
    description: 'Stretches edge-to-edge (no sidebar, no container max-width).',
  },
  {
    value: 'default',
    label: 'Theme Default',
    description: 'Uses the theme\'s default page template width.',
  },
  {
    value: 'canvas',
    label: 'Blank Canvas',
    description: 'Renders with no header, footer, or theme styling.',
  },
];

export function PageSettingsPanel({ data, setData }: PageSettingsPanelProps) {
  const placement = data.placement ?? 'template_include';
  const canvasMode = data.canvas_mode ?? 'full_width';
  const isSingle = data.listing_type === 'single_page';
  const showCanvasMode = placement === 'template_include';

  return (
    <CollapsibleSection
      title="Page Settings"
      icon={<Settings2 className="rdcfe-w-4 rdcfe-h-4" />}
    >
      <div className="rdcfe-space-y-5">
        {/* Placement */}
        <div>
          <label className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-2.5 rdcfe-block">
            Placement
          </label>
          <div className="rdcfe-space-y-1.5">
            {PLACEMENT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`rdcfe-flex rdcfe-items-start rdcfe-gap-2.5 rdcfe-p-2.5 rdcfe-rounded-lg rdcfe-border rdcfe-cursor-pointer rdcfe-transition-all ${
                  placement === opt.value
                    ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.04)]'
                    : 'rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                }`}
              >
                <input
                  type="radio"
                  name="rdcfe-placement"
                  value={opt.value}
                  checked={placement === opt.value}
                  onChange={() =>
                    setData((prev) => ({ ...prev, placement: opt.value }))
                  }
                  className="rdcfe-mt-0.5 rdcfe-accent-[hsl(var(--rdcfe-primary))]"
                />
                <div>
                  <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                    {opt.label}
                  </span>
                  <p className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-0.5 rdcfe-leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Canvas Mode — only visible when placement is Full Page Override */}
        {showCanvasMode && (
          <div>
            <label className="rdcfe-text-[12px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-2.5 rdcfe-block">
              Canvas Mode
            </label>
            <div className="rdcfe-space-y-1.5">
              {CANVAS_MODE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`rdcfe-flex rdcfe-items-start rdcfe-gap-2.5 rdcfe-p-2.5 rdcfe-rounded-lg rdcfe-border rdcfe-cursor-pointer rdcfe-transition-all ${
                    canvasMode === opt.value
                      ? 'rdcfe-border-[hsl(var(--rdcfe-primary))] rdcfe-bg-[hsl(var(--rdcfe-primary)/0.04)]'
                      : 'rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.3)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="rdcfe-canvas-mode"
                    value={opt.value}
                    checked={canvasMode === opt.value}
                    onChange={() =>
                      setData((prev) => ({ ...prev, canvas_mode: opt.value }))
                    }
                    className="rdcfe-mt-0.5 rdcfe-accent-[hsl(var(--rdcfe-primary))]"
                  />
                  <div>
                    <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                      {opt.label}
                    </span>
                    <p className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-0.5 rdcfe-leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Info hint */}
        <div className="rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)] rdcfe-px-3 rdcfe-py-2.5 rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
          {isSingle
            ? 'This template will override the single post page for the targeted post types. Pick a sample post in the canvas toolbar to preview real data.'
            : 'This template will override the archive page for the targeted post types. The listing grid component renders the main query loop.'}
        </div>
      </div>
    </CollapsibleSection>
  );
}
