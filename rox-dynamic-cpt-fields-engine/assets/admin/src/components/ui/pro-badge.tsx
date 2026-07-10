import * as React from 'react';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import { ProContext } from '@/contexts/ProContext';

interface ProBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Show crown icon */
  showIcon?: boolean;
  /** Badge text (default: "PRO") */
  text?: string;
  /**
   * Render even when Pro is active. Defaults to `false` so badges
   * disappear automatically once the user has Pro — keeps the admin UI
   * free of upsell chrome for paying customers. Set `true` only for
   * neutral context where the badge represents a category label, not
   * an upsell hint (rare).
   */
  forceShow?: boolean;
}

/**
 * ProBadge - Shows "PRO" badge for Pro-only features
 *
 * Usage:
 * - Add next to Pro-only field types in picker
 * - Add next to Pro-only menu items
 * - Add next to Pro-only settings
 *
 * Self-gating: when Pro is active the component renders `null`, so
 * callsites do NOT need to wrap each usage in `{!isPro && ...}`. This
 * matches the original component contract ("When Pro is active, this
 * component should NOT be rendered") but enforces it from inside the
 * component instead of relying on every consumer to remember.
 */
const ProBadge = React.forwardRef<HTMLSpanElement, ProBadgeProps>(
  ({ className, size = 'sm', showIcon = false, text = 'PRO', forceShow = false, ...props }, ref) => {
    // Use raw context (not the strict `useProContext` hook) so the
    // badge degrades gracefully in isolated test environments and any
    // legacy mount points that render outside `ProProvider`.
    const proContext = React.useContext(ProContext);
    const isPro = proContext?.isPro ?? false;

    if (isPro && !forceShow) {
      return null;
    }

    const sizeClasses = {
      sm: 'rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-text-[10px]',
      md: 'rdcfe-px-2 rdcfe-py-0.5 rdcfe-text-xs',
      lg: 'rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-sm',
    };

    const iconSizes = {
      sm: 'rdcfe-h-2.5 rdcfe-w-2.5',
      md: 'rdcfe-h-3 rdcfe-w-3',
      lg: 'rdcfe-h-3.5 rdcfe-w-3.5',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-rounded-full rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wide',
          'rdcfe-bg-gradient-to-r rdcfe-from-amber-500 rdcfe-to-orange-500 rdcfe-text-white',
          'rdcfe-shadow-sm rdcfe-select-none',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showIcon && <Crown className={iconSizes[size]} />}
        {text}
      </span>
    );
  }
);
ProBadge.displayName = 'ProBadge';

/**
 * ProTag - Smaller inline tag for settings/options
 */
const ProTag = React.forwardRef<HTMLSpanElement, Omit<ProBadgeProps, 'size'>>(
  ({ className, ...props }, ref) => (
    <ProBadge
      ref={ref}
      size="sm"
      className={cn('rdcfe-ml-1.5 rdcfe-align-middle', className)}
      {...props}
    />
  )
);
ProTag.displayName = 'ProTag';

export { ProBadge, ProTag };

