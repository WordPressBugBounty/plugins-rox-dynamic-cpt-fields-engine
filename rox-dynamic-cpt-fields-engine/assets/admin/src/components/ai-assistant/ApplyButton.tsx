/**
 * ApplyButton - The big green "Apply Schema" CTA + status helpers.
 *
 * The button is intentionally aggressive about its disabled state —
 * applying a half-valid schema is a foot-gun (creates partial CPTs
 * that registration manager rolls back, snapshots that point to
 * nothing, etc.). Only enables when:
 *   - schema has at least one item, AND
 *   - validation has no errors, AND
 *   - every gating warning code has been acknowledged.
 *
 * @package DynamicCPTFieldsEngine
 */

import { Loader2, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApplyButtonProps {
  onApply: () => void;
  isApplying?: boolean;
  disabledReason?: string | null;
  itemCount?: number;
}

export function ApplyButton({
  onApply,
  isApplying = false,
  disabledReason = null,
  itemCount = 0,
}: ApplyButtonProps) {
  const isDisabled = Boolean(disabledReason) || isApplying;

  return (
    <div className="rdcfe-flex rdcfe-flex-col rdcfe-items-end rdcfe-gap-1.5">
      <button
        type="button"
        onClick={onApply}
        disabled={isDisabled}
        className={cn(
          'rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-xl rdcfe-px-5 rdcfe-py-2.5 rdcfe-text-sm rdcfe-font-semibold rdcfe-transition-all',
          isDisabled
            ? 'rdcfe-cursor-not-allowed rdcfe-bg-gray-100 rdcfe-text-gray-400'
            : 'rdcfe-bg-emerald-500 rdcfe-text-white rdcfe-shadow-sm hover:rdcfe-bg-emerald-600 hover:rdcfe-shadow-md'
        )}
      >
        {isApplying ? (
          <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
        ) : (
          <PlayCircle className="rdcfe-h-4 rdcfe-w-4" />
        )}
        {isApplying ? 'Applying…' : `Apply Schema${itemCount ? ` (${itemCount})` : ''}`}
      </button>
      {disabledReason && !isApplying && (
        <p className="rdcfe-text-xs rdcfe-text-gray-500">{disabledReason}</p>
      )}
    </div>
  );
}

export default ApplyButton;
