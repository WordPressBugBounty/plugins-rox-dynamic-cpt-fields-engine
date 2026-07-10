/**
 * Page Canvas Preview — Full-Width Builder Surface.
 *
 * Extended version of `CanvasPreview` for single_page / archive_page
 * listing types. Renders the server-side preview HTML inside a
 * simulated "page shell" (header/footer chrome) at full width instead
 * of the card-constrained size used for card templates.
 *
 * Reuses the same `CanvasPreview` internally — this component wraps it
 * with a page-shell chrome (simulated header/footer bars) and forces
 * the layout to 100% width.
 */

import { CanvasPreview } from './CanvasPreview';
import type { CanvasPanelProps } from './shared';
import type { ListingComponentDescriptor, ListingConfigData } from '../../services/api';

interface PageCanvasPreviewProps extends CanvasPanelProps {
  onCommit?: () => void;
  emptyStateSlot?: React.ReactNode;
  descriptors?: ListingComponentDescriptor[];
  listingType: ListingConfigData['listing_type'];
}

export function PageCanvasPreview({
  data,
  setData,
  selectedComponentId,
  setSelectedComponentId,
  onCommit,
  emptyStateSlot,
  descriptors,
  listingType,
}: PageCanvasPreviewProps) {
  const isArchive = listingType === 'archive_page';

  return (
    <div className="rdcfe-page-canvas-wrap">
      {/* Simulated header chrome */}
      <div className="rdcfe-page-shell__header">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-px-5 rdcfe-py-3 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-rounded-t-xl">
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
            <div className="rdcfe-w-3 rdcfe-h-3 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-muted-foreground)/0.15)]" />
            <div className="rdcfe-w-3 rdcfe-h-3 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-muted-foreground)/0.15)]" />
            <div className="rdcfe-w-3 rdcfe-h-3 rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-muted-foreground)/0.15)]" />
          </div>
          <div className="rdcfe-flex-1 rdcfe-mx-8">
            <div className="rdcfe-bg-white rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-rounded-md rdcfe-px-3 rdcfe-py-1 rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {isArchive ? 'yoursite.com/post-type/' : 'yoursite.com/post-type/sample-post/'}
            </div>
          </div>
        </div>
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-6 rdcfe-px-6 rdcfe-py-2.5 rdcfe-bg-white rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))]">
          <div className="rdcfe-w-20 rdcfe-h-4 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-muted)/0.6)]" />
          <div className="rdcfe-flex rdcfe-gap-4">
            {[60, 48, 56, 40].map((w, i) => (
              <div
                key={i}
                className="rdcfe-h-2.5 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-muted)/0.4)]"
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* The actual canvas — full-width mode */}
      <div className="rdcfe-page-canvas-body">
        <CanvasPreview
          data={data}
          setData={setData}
          selectedComponentId={selectedComponentId}
          setSelectedComponentId={setSelectedComponentId}
          onCommit={onCommit}
          emptyStateSlot={emptyStateSlot}
          descriptors={descriptors}
        />
      </div>

      {/* Simulated footer chrome */}
      <div className="rdcfe-page-shell__footer">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-6 rdcfe-py-3 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)] rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-rounded-b-xl">
          <div className="rdcfe-flex rdcfe-gap-3">
            {[40, 56, 48].map((w, i) => (
              <div
                key={i}
                className="rdcfe-h-2 rdcfe-rounded rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)]"
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
          <div className="rdcfe-text-[10px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground)/0.5)]">
            Simulated page shell
          </div>
        </div>
      </div>
    </div>
  );
}
