/**
 * Pro Feature Gate Components
 *
 * Components for gating Pro-only features in the UI.
 * Shows Pro badges and upgrade modals for Free users.
 *
 * @package DynamicCPTFieldsEngine
 */

import * as React from 'react';
import { useState } from 'react';
import { UpgradeModal } from './upgrade-modal';
import { ProBadge, ProTag } from './pro-badge';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { useProContext } from '@/contexts/ProContext';
import type { FeatureCategory } from '@/lib/pro-features';

interface ProFeatureGateProps {
  /** The feature identifier */
  feature: string;
  /** Feature category */
  featureCategory?: FeatureCategory;
  /** Human-readable feature name for modal */
  featureName?: string;
  /** Content to render */
  children: React.ReactNode;
  /** Whether to show badge (default: true) */
  showBadge?: boolean;
  /** Badge size */
  badgeSize?: 'sm' | 'md' | 'lg';
  /** Whether to show lock overlay on hover (default: false) */
  showLockOverlay?: boolean;
  /** Custom className */
  className?: string;
  /** Render as specific element type */
  as?: 'div' | 'span' | 'button' | 'li';
  /** Callback when gated feature is clicked */
  onGatedClick?: () => void;
  /** Whether the feature is disabled in Free (prevents interaction) */
  disableInFree?: boolean;
}

/**
 * ProFeatureGate - Wrapper component for Pro-only features
 *
 * Behavior:
 * - If Pro: renders children normally, no badge
 * - If Free: renders children with Pro badge, click shows upgrade modal
 *
 * Usage:
 * ```tsx
 * <ProFeatureGate feature="repeater" featureCategory="field_type">
 *   <FieldTypeOption type="repeater" label="Repeater" />
 * </ProFeatureGate>
 * ```
 */
export function ProFeatureGate({
  feature,
  featureCategory = 'field_type',
  featureName,
  children,
  showBadge = true,
  badgeSize = 'sm',
  showLockOverlay = false,
  className,
  as: Component = 'div',
  onGatedClick,
  disableInFree = false,
}: ProFeatureGateProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isPro, isProFeature } = useProContext();

  // Check if this feature is Pro-only
  const isFeaturePro = isProFeature(feature, featureCategory);

  // If Pro is active or feature is not Pro-only, render normally
  if (isPro || !isFeaturePro) {
    return <>{children}</>;
  }

  // Free user viewing Pro feature
  const handleClick = (e: React.MouseEvent) => {
    if (disableInFree) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowUpgradeModal(true);
    onGatedClick?.();
  };

  const displayName =
    featureName ||
    feature.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <>
      <Component
        className={cn(
          'rdcfe-relative rdcfe-cursor-pointer',
          disableInFree && 'rdcfe-opacity-75',
          showLockOverlay && 'rdcfe-group',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowUpgradeModal(true);
          }
        }}
      >
        {children}

        {showBadge && (
          <ProBadge size={badgeSize} className="rdcfe-ml-1.5 rdcfe-shrink-0" />
        )}

        {showLockOverlay && (
          <div className="rdcfe-absolute rdcfe-inset-0 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-bg-black/50 rdcfe-opacity-0 rdcfe-transition-opacity group-hover:rdcfe-opacity-100 rdcfe-rounded">
            <Lock className="rdcfe-h-5 rdcfe-w-5 rdcfe-text-white" />
          </div>
        )}
      </Component>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature={displayName}
        featureCategory={featureCategory}
      />
    </>
  );
}

/**
 * ProSettingWrapper - Wrapper for Pro-only settings in forms
 * Shows setting but disabled with Pro tag
 */
interface ProSettingWrapperProps {
  feature: string;
  featureName?: string;
  children: React.ReactNode;
  className?: string;
}

export function ProSettingWrapper({
  feature,
  featureName,
  children,
  className,
}: ProSettingWrapperProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isPro, isProFeature } = useProContext();

  const isFeaturePro = isProFeature(feature, 'setting');

  if (isPro || !isFeaturePro) {
    return <>{children}</>;
  }

  const displayName =
    featureName ||
    feature.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <>
      <div
        className={cn(
          'rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-opacity-60 rdcfe-cursor-pointer',
          className
        )}
        onClick={() => setShowUpgradeModal(true)}
      >
        <div className="rdcfe-pointer-events-none">{children}</div>
        <ProTag />
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature={displayName}
        featureCategory="setting"
      />
    </>
  );
}

/**
 * ProModuleGate - Gate entire Pro modules (Query Builder, Listings, etc.)
 * Shows blurred overlay with upgrade prompt
 */
interface ProModuleGateProps {
  module: string;
  moduleName?: string;
  children: React.ReactNode;
  className?: string;
}

export function ProModuleGate({
  module,
  moduleName,
  children,
  className,
}: ProModuleGateProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isPro, isProFeature } = useProContext();

  const isModulePro = isProFeature(module, 'module');

  if (isPro || !isModulePro) {
    return <>{children}</>;
  }

  const displayName =
    moduleName ||
    module.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <>
      <div className={cn('rdcfe-relative', className)}>
        {/* Blurred content */}
        <div className="rdcfe-blur-sm rdcfe-pointer-events-none rdcfe-select-none">
          {children}
        </div>

        {/* Overlay */}
        <div
          className="rdcfe-absolute rdcfe-inset-0 rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-justify-center rdcfe-bg-white/80 dark:rdcfe-bg-gray-900/80 rdcfe-cursor-pointer"
          onClick={() => setShowUpgradeModal(true)}
        >
          <div className="rdcfe-text-center rdcfe-p-6 rdcfe-max-w-md">
            <Lock className="rdcfe-h-12 rdcfe-w-12 rdcfe-mx-auto rdcfe-mb-4 rdcfe-text-amber-500" />
            <h3 className="rdcfe-text-xl rdcfe-font-bold rdcfe-mb-2">
              {displayName} is a Pro Feature
            </h3>
            <p className="rdcfe-text-gray-600 dark:rdcfe-text-gray-400 rdcfe-mb-4">
              Upgrade to Pro to unlock {displayName} and other advanced
              features.
            </p>
            <button
              className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-6 rdcfe-py-3 rdcfe-bg-gradient-to-r rdcfe-from-amber-500 rdcfe-to-orange-500 rdcfe-text-white hover:rdcfe-text-white rdcfe-font-semibold rdcfe-rounded-lg hover:rdcfe-from-amber-600 hover:rdcfe-to-orange-600 rdcfe-transition-all rdcfe-shadow-lg hover:rdcfe-shadow-xl"
              onClick={(e) => {
                e.stopPropagation();
                setShowUpgradeModal(true);
              }}
            >
              <Lock className="rdcfe-h-4 rdcfe-w-4" />
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature={displayName}
        featureCategory="module"
      />
    </>
  );
}

/**
 * Re-export useProStatus for backward compatibility
 * @deprecated Use useProStatus from '@/hooks/use-pro-status' instead
 */
export { useProStatus } from '@/hooks/use-pro-status';

export default ProFeatureGate;
